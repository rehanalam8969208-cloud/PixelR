(function() {
  if (window.__pixelGitHubCoreSuiteV3) return;
  window.__pixelGitHubCoreSuiteV3 = true;

  // Remove any old brightness dim overlay from live patch
  const oldDim = document.getElementById('psSavedBrightnessOverlay');
  if (oldDim) oldDim.remove();

  // =========================================================
  // 1. INSTANT + PER-USER CLOUD SETTINGS (ZERO STARTUP DELAY)
  // =========================================================
  let settingsSyncTimer = null;
  let applyingCloudSettingsFlag = false;

  function getActiveUid() {
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) {
      return currentUser.uid;
    }
    if (typeof auth !== 'undefined' && auth && auth.currentUser && auth.currentUser.uid) {
      return auth.currentUser.uid;
    }
    try {
      const cachedUid = localStorage.getItem('ps_last_auth_uid');
      if (cachedUid) return cachedUid;
    } catch (e) {}
    return null;
  }

  function getSettingsLocalKey(uid) {
    return 'ps_cloud_settings_' + (uid || 'guest');
  }

  function collectCurrentSettingsSnapshot() {
    const snapData = {};
    const fields = Array.from(document.querySelectorAll('input, select, textarea'));

    fields.forEach((el, idx) => {
      if (
        el.closest('#liveChatOverlay') ||
        el.closest('#pixel3DGuideOverlay') ||
        el.closest('#secretStudioOverlay') ||
        el.closest('.secret-overlay')
      ) {
        return;
      }
      if (el.type === 'password' || el.type === 'file') return;

      const key = el.id || el.name || ('field_' + el.tagName.toLowerCase() + '_' + idx);
      if (el.type === 'checkbox') {
        snapData[key] = { kind: 'checkbox', checked: Boolean(el.checked) };
      } else if (el.type === 'radio') {
        if (el.checked) {
          const groupKey = el.name || key;
          snapData[groupKey] = { kind: 'radio', value: el.value };
        }
      } else {
        snapData[key] = { kind: 'value', value: el.value };
      }
    });

    return snapData;
  }

  function applySettingsSnapshotToUI(snapData) {
    if (!snapData || typeof snapData !== 'object') return;
    applyingCloudSettingsFlag = true;

    const fields = Array.from(document.querySelectorAll('input, select, textarea'));
    fields.forEach((el, idx) => {
      if (
        el.closest('#liveChatOverlay') ||
        el.closest('#pixel3DGuideOverlay') ||
        el.closest('#secretStudioOverlay') ||
        el.closest('.secret-overlay')
      ) {
        return;
      }
      if (el.type === 'password' || el.type === 'file') return;

      const key = el.id || el.name || ('field_' + el.tagName.toLowerCase() + '_' + idx);
      if (el.type === 'checkbox' && snapData[key] && snapData[key].kind === 'checkbox') {
        const targetChecked = Boolean(snapData[key].checked);
        if (el.checked !== targetChecked) {
          el.checked = targetChecked;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else if (el.type === 'radio') {
        const groupKey = el.name || key;
        if (snapData[groupKey] && snapData[groupKey].kind === 'radio' && el.value === snapData[groupKey].value) {
          if (!el.checked) {
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      } else if (snapData[key] && snapData[key].kind === 'value') {
        if (document.activeElement !== el && String(el.value) !== String(snapData[key].value)) {
          el.value = snapData[key].value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    setTimeout(() => {
      applyingCloudSettingsFlag = false;
    }, 80);
  }

  function applyLocalSettingsInstant() {
    const uid = getActiveUid();
    const raw = localStorage.getItem(getSettingsLocalKey(uid)) || localStorage.getItem(getSettingsLocalKey(null));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.items) {
        applySettingsSnapshotToUI(parsed.items);
      }
    } catch (e) {}
  }

  async function saveUserSettingsToFirebase() {
    if (applyingCloudSettingsFlag) return;
    const uid = getActiveUid();
    const snapshot = collectCurrentSettingsSnapshot();
    const payload = { items: snapshot, updatedAt: Date.now() };

    localStorage.setItem(getSettingsLocalKey(uid), JSON.stringify(payload));
    if (!uid) {
      localStorage.setItem(getSettingsLocalKey(null), JSON.stringify(payload));
    }

    if (uid && typeof db !== 'undefined' && db) {
      try {
        await db.ref('users/' + uid + '/settings').set(payload);
      } catch (e) {}
    }
  }

  async function loadUserSettingsFromFirebase(user) {
    const uid = (user && user.uid) ? user.uid : getActiveUid();
    if (!uid) return;
    try { localStorage.setItem('ps_last_auth_uid', uid); } catch (e) {}

    applyLocalSettingsInstant();

    if (typeof db !== 'undefined' && db) {
      try {
        const snap = await db.ref('users/' + uid + '/settings').get();
        if (snap.exists() && snap.val() && snap.val().items) {
          const cloudPayload = snap.val();
          localStorage.setItem(getSettingsLocalKey(uid), JSON.stringify(cloudPayload));
          applySettingsSnapshotToUI(cloudPayload.items);
        }
      } catch (e) {}
    }
  }

  function scheduleSettingsSave() {
    if (applyingCloudSettingsFlag) return;
    clearTimeout(settingsSyncTimer);
    settingsSyncTimer = setTimeout(() => {
      saveUserSettingsToFirebase();
    }, 150);
  }

  function attachUniversalSettingsListeners() {
    document.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.__psCloudBound) return;
      el.__psCloudBound = true;
      el.addEventListener('input', scheduleSettingsSave);
      el.addEventListener('change', scheduleSettingsSave);
    });
  }

  // Run immediately without waiting
  applyLocalSettingsInstant();
  attachUniversalSettingsListeners();
  document.addEventListener('DOMContentLoaded', () => {
    applyLocalSettingsInstant();
    attachUniversalSettingsListeners();
  });

  const universalObserver = new MutationObserver(() => {
    attachUniversalSettingsListeners();
    applyLocalSettingsInstant();
  });
  universalObserver.observe(document.documentElement, { childList: true, subtree: true });

  // =========================================================
  // 2. TOP BAR CHAT BUTTON (NO BOTTOM DOCK OVERLAP)
  // =========================================================
  const strayDockBtn = document.getElementById('btn-tab-chat');
  if (strayDockBtn) strayDockBtn.remove();

  function ensureTopChatButton() {
    const topBar = document.querySelector('.top-bar, .app-header, header') ||
                   document.querySelector('.icon-btn')?.parentElement;
    if (topBar && !document.getElementById('btn-header-chat')) {
      const headerChatBtn = document.createElement('button');
      headerChatBtn.className = 'icon-btn';
      headerChatBtn.id = 'btn-header-chat';
      headerChatBtn.style.position = 'relative';
      headerChatBtn.setAttribute('aria-label', 'Chat');
      headerChatBtn.innerHTML = `
        <span id="chatUnreadDot" style="display:none; position:absolute; top:5px; right:5px; width:8px; height:8px; border-radius:50%; background:#38bdf8; box-shadow:0 0 8px #38bdf8;"></span>
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      `;
      headerChatBtn.onclick = () => window.openLiveChatModal && window.openLiveChatModal();
      topBar.insertBefore(headerChatBtn, topBar.firstChild);
    }
  }
  ensureTopChatButton();

  // =========================================================
  // 3. FULL-SCREEN CHAT + 8MB PHOTO (5-MIN / DOWNLOAD FIREBASE DELETE) + LOCAL AI MODE
  // =========================================================
  const oldModal = document.getElementById('liveChatOverlay');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'liveChatOverlay';
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    z-index: 2200; padding: 0; width: 100vw; height: 100vh; max-width: 100vw;
    overflow: hidden; background: rgba(6, 8, 13, 0.97); backdrop-filter: blur(28px);
  `;
  modal.innerHTML = `
    <div style="width:100%; height:100%; max-width:520px; margin:0 auto; display:flex; flex-direction:column; position:relative;">

      <!-- TOP HEADER WITH AI MODE + + (ADD FRIEND) + CLOSE -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(12,15,23,0.9); flex-shrink:0; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <button class="icon-btn" id="chatBackToListBtn" style="display:none; width:34px; height:34px;" onclick="showFriendsListView()" aria-label="Back">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style="min-width:0;">
            <div id="fullChatHeaderTitle" style="font-size:16.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Chats</div>
            <div id="fullChatHeaderSub" style="font-size:11px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Sign in to start</div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          <button type="button" id="aiModeToggleBtn" onclick="toggleChatAIMode()" style="
            padding:7px 11px; border-radius:14px; border:1px solid rgba(56,189,248,0.45);
            background:rgba(56,189,248,0.14); color:#7dd3fc; font-size:11.5px; font-weight:700; cursor:pointer;
          ">AI Mode</button>
          <button class="icon-btn" id="addFriendTopBtn" onclick="openAddFriendPopup()" aria-label="Add Friend" title="Add Username">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="icon-btn" onclick="closeLiveChatModal()" aria-label="Close Chat">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- ADD FRIEND POPUP SHEET -->
      <div id="addFriendSheet" style="display:none; padding:14px 16px; background:rgba(18,22,34,0.98); border-bottom:1px solid rgba(255,255,255,0.14); flex-shrink:0;">
        <div class="section-label" style="margin-bottom:8px;">Add Friend by Username</div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" id="addFriendUsernameInput" placeholder="Enter friend's username..." style="flex:1; padding:12px 14px; border-radius:16px; border:1px solid var(--btn-border); background:rgba(0,0,0,0.4); color:var(--text-primary); font-size:14px; outline:none;">
          <button class="btn" style="width:auto; padding:12px 16px;" onclick="saveFriendUsername()">Add</button>
          <button class="btn" style="width:auto; padding:12px 12px;" onclick="closeAddFriendPopup()">✕</button>
        </div>
      </div>

      <!-- ONE-TIME PERMANENT USERNAME SETUP -->
      <div id="usernameSetupBox" style="display:none; padding:24px 18px; margin:auto 16px; border-radius:24px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14);">
        <div class="section-label" style="text-align:center;">One-Time Permanent Username</div>
        <p style="font-size:13px; color:var(--text-secondary); text-align:center; margin:0 0 14px 0;">
          Apna username ek baar likhein. Yeh aapke account ke saath hamesha ke liye save ho jayega.
        </p>
        <div class="input-wrap">
          <input type="text" id="newPermanentUsernameInput" placeholder="e.g. rehan_star" maxlength="20" style="padding-left:14px; padding-right:14px;">
        </div>
        <button class="btn" onclick="claimPermanentUsername()">
          <span>Save Username Forever</span>
        </button>
      </div>

      <!-- VIEW 1: FRIENDS LIST SCREEN -->
      <div id="friendsListView" style="display:none; flex:1; overflow-y:auto; padding:14px 16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div class="section-label" style="margin:0;">Saved Friends List</div>
          <button class="btn" style="width:auto; padding:7px 12px; font-size:11.5px;" onclick="enableChatNotifications()">Alerts On/Off</button>
        </div>
        <div id="friendsListContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
      </div>

      <!-- VIEW 2: FULL-SCREEN FRIEND CONVERSATION (WITH 8MB PHOTO + 5-MIN / DOWNLOAD FIREBASE DELETE) -->
      <div id="conversationView" style="display:none; flex:1; flex-direction:column; min-height:0;">
        <div style="padding:6px 16px; font-size:11px; color:var(--text-secondary); background:rgba(255,255,255,0.03); border-bottom:1px solid rgba(255,255,255,0.06); text-align:center;">
          Photos (up to 8 MB) auto-delete from Firebase in 5 mins or right after download.
        </div>
        <div id="chatMessagesBox" style="flex:1; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:10px;"></div>

        <input type="file" id="chatPhotoFileInput" accept="image/*" style="display:none;" onchange="handleChatPhotoSelected(event)">

        <div style="padding:10px 14px 16px 14px; background:linear-gradient(to top, rgba(6,8,13,0.98) 70%, rgba(6,8,13,0)); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:8px; padding:6px 8px 6px 10px; border-radius:26px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); backdrop-filter:blur(20px);">
            <button type="button" onclick="triggerChatPhotoPicker()" aria-label="Send Photo" title="Send Photo (Max 8MB)" style="
              width:36px; height:36px; border-radius:50%; border:1px solid rgba(255,255,255,0.16);
              background:rgba(255,255,255,0.1); color:#fff; font-size:16px; cursor:pointer; flex-shrink:0;
            ">📷</button>
            <input type="text" id="chatMessageInput" placeholder="Message likhein..." style="flex:1; background:transparent; border:none; color:var(--text-primary); font-size:14px; padding:10px 4px; outline:none;" onkeydown="if(event.key==='Enter') sendLiveChatMessage()">
            <button class="btn" style="width:auto; padding:11px 16px; border-radius:20px; font-size:13px;" onclick="sendLiveChatMessage()">Send</button>
          </div>
        </div>
      </div>

      <!-- VIEW 3: LOCAL AI MODE (CHAT + IMAGE GENERATION, 100% LOCAL STORAGE) -->
      <div id="localAIModeView" style="display:none; flex:1; flex-direction:column; min-height:0;">
        <div style="padding:8px 14px; display:flex; align-items:center; justify-content:space-between; gap:8px; background:rgba(56,189,248,0.07); border-bottom:1px solid rgba(255,255,255,0.09); flex-shrink:0;">
          <div style="font-size:11px; color:#7dd3fc;">
            Local-Only AI (Saved on device only • Never in Firebase)
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" onclick="generateLocalAIImagePrompt()" style="padding:5px 10px; border-radius:10px; border:1px solid rgba(168,85,247,0.45); background:rgba(168,85,247,0.18); color:#e9d5ff; font-size:11px; font-weight:600; cursor:pointer;">🎨 Make Photo</button>
            <button type="button" onclick="clearLocalAIHistory()" style="padding:5px 9px; border-radius:10px; border:1px solid rgba(255,255,255,0.14); background:rgba(255,255,255,0.06); color:var(--text-secondary); font-size:11px; cursor:pointer;">Clear</button>
          </div>
        </div>

        <div id="localAIMessagesBox" style="flex:1; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:10px;"></div>

        <div style="padding:10px 14px 16px 14px; background:linear-gradient(to top, rgba(6,8,13,0.98) 70%, rgba(6,8,13,0)); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:8px; padding:6px 8px 6px 14px; border-radius:26px; background:rgba(255,255,255,0.08); border:1px solid rgba(56,189,248,0.32); backdrop-filter:blur(20px);">
            <input type="text" id="localAIInput" placeholder="AI se baat karein ya photo prompt likhein..." style="flex:1; background:transparent; border:none; color:var(--text-primary); font-size:14px; padding:10px 4px; outline:none;" onkeydown="if(event.key==='Enter') sendLocalAIMessage()">
            <button class="btn" style="width:auto; padding:11px 16px; border-radius:20px; font-size:13px;" onclick="sendLocalAIMessage()">Ask</button>
          </div>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(modal);

  let myPermanentUsername = '';
  let friendsList = [];
  let activeFriend = '';
  let activeChatRef = null;
  let currentRoomId = null;
  let inboxListenerRef = null;
  let isAIModeActive = false;
  const seenNotifIds = new Set();
  const PHOTO_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

  function cleanUsername(raw) {
    return (raw || '').toLowerCase().trim().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 20);
  }

  function playMessageBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  }

  window.enableChatNotifications = async function() {
    if (!('Notification' in window)) return showToast('In-app alert active');
    const perm = await Notification.requestPermission();
    showToast(perm === 'granted' ? 'Notifications enabled!' : 'In-app sound & dot active');
  };

  function triggerIncomingAlert(fromUser, text) {
    const isOpen = document.getElementById('liveChatOverlay').classList.contains('open');
    const dot = document.getElementById('chatUnreadDot');
    if (dot && !isOpen) dot.style.display = 'block';
    if (fromUser && !friendsList.includes(fromUser)) addFriendToStorage(fromUser);
    playMessageBeep();
    if (typeof showToast === 'function') showToast(`@${fromUser}: ${text.slice(0, 32)}`);
    if ('Notification' in window && Notification.permission === 'granted' && (document.hidden || !isOpen)) {
      try { new Notification(`Message from @${fromUser}`, { body: text }); } catch (e) {}
    }
  }

  function startInboxWatcher(username) {
    if (!username || typeof db === 'undefined') return;
    if (inboxListenerRef) inboxListenerRef.off();
    const startTime = Date.now() - 3000;
    inboxListenerRef = db.ref('inbox/' + username).limitToLast(10);
    inboxListenerRef.on('child_added', (snap) => {
      const data = snap.val();
      if (!data || seenNotifIds.has(snap.key)) return;
      seenNotifIds.add(snap.key);
      if ((data.createdAt || 0) >= startTime && data.from && data.from !== username) {
        triggerIncomingAlert(data.from, data.text || 'New message');
      }
    });
  }

  function getFriendsKey() {
    const uid = getActiveUid() || 'guest';
    return 'ps_chat_friends_' + uid;
  }

  async function loadFriendsList() {
    const localArr = JSON.parse(localStorage.getItem(getFriendsKey()) || '[]');
    friendsList = Array.isArray(localArr) ? localArr : [];
    const uid = getActiveUid();
    if (uid && typeof db !== 'undefined') {
      try {
        const snap = await db.ref('users/' + uid + '/friends').get();
        if (snap.exists() && snap.val()) {
          const cloudList = Object.keys(snap.val()).map(cleanUsername).filter(Boolean);
          friendsList = Array.from(new Set([...friendsList, ...cloudList]));
          localStorage.setItem(getFriendsKey(), JSON.stringify(friendsList));
        }
      } catch (e) {}
    }
    renderFriendsList();
  }

  async function addFriendToStorage(uname) {
    const clean = cleanUsername(uname);
    if (!clean || clean === myPermanentUsername) return;
    if (!friendsList.includes(clean)) {
      friendsList.unshift(clean);
      localStorage.setItem(getFriendsKey(), JSON.stringify(friendsList));
    }
    const uid = getActiveUid();
    if (uid && typeof db !== 'undefined') {
      try { await db.ref('users/' + uid + '/friends/' + clean).set(true); } catch (e) {}
    }
    renderFriendsList();
  }

  function renderFriendsList() {
    const box = document.getElementById('friendsListContainer');
    if (!box) return;
    if (!friendsList.length) {
      box.innerHTML = `<div style="color:var(--text-secondary); font-size:13px; text-align:center; padding:34px 12px;">Koi friend add nahi hai. Upar <strong>+</strong> button daba kar username add karein.</div>`;
      return;
    }
    box.innerHTML = '';
    friendsList.forEach((uname) => {
      const card = document.createElement('div');
      card.style.cssText = `display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-radius:18px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); cursor:pointer;`;
      card.innerHTML = `<div style="display:flex; align-items:center; gap:12px;"><div style="width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.14); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px;">${uname.charAt(0).toUpperCase()}</div><div><div style="font-size:14.5px; font-weight:600;">@${uname}</div><div style="font-size:11.5px; color:var(--text-secondary);">Tap to chat</div></div></div><span style="font-size:12px; color:var(--text-secondary);">Chat →</span>`;
      card.onclick = () => openConversationWith(uname);
      box.appendChild(card);
    });
  }

  window.openAddFriendPopup = function() {
    if (!getActiveUid()) return showToast('Sign in first');
    if (!myPermanentUsername) return showToast('Set your permanent username first');
    const sheet = document.getElementById('addFriendSheet');
    sheet.style.display = sheet.style.display === 'none' ? 'block' : 'none';
    if (sheet.style.display === 'block') setTimeout(() => document.getElementById('addFriendUsernameInput').focus(), 80);
  };

  window.closeAddFriendPopup = function() {
    document.getElementById('addFriendSheet').style.display = 'none';
  };

  window.saveFriendUsername = async function() {
    const inp = document.getElementById('addFriendUsernameInput');
    const target = cleanUsername(inp.value);
    if (!target || target.length < 2) return showToast('Valid username likhein');
    if (target === myPermanentUsername) return showToast('Apna khud ka username add na karein');
    await addFriendToStorage(target);
    inp.value = '';
    closeAddFriendPopup();
    showToast(`@${target} added to list`);
    openConversationWith(target);
  };

  window.showFriendsListView = function() {
    isAIModeActive = false;
    activeFriend = '';
    currentRoomId = null;
    if (activeChatRef) { activeChatRef.off(); activeChatRef = null; }
    document.getElementById('aiModeToggleBtn').style.background = 'rgba(56,189,248,0.14)';
    document.getElementById('localAIModeView').style.display = 'none';
    document.getElementById('chatBackToListBtn').style.display = 'none';
    document.getElementById('conversationView').style.display = 'none';
    document.getElementById('friendsListView').style.display = 'block';
    document.getElementById('fullChatHeaderTitle').textContent = 'Chats';
    document.getElementById('fullChatHeaderSub').textContent = myPermanentUsername ? `You: @${myPermanentUsername}` : '';
    renderFriendsList();
  };

  async function deleteExpiredOrDownloadedPhoto(msgKey, msg) {
    if (!currentRoomId || !msgKey || !msg || !msg.hasPhoto) return;
    const now = Date.now();
    const isExpired = msg.expiresAt && now >= msg.expiresAt;
    const isDownloaded = Boolean(msg.downloaded);
    if ((isExpired || isDownloaded) && typeof db !== 'undefined' && db) {
      try {
        await db.ref('chats/' + currentRoomId + '/messages/' + msgKey + '/photoData').remove();
        await db.ref('chats/' + currentRoomId + '/messages/' + msgKey + '/photoRemoved').set(true);
      } catch (e) {}
    }
  }

  window.downloadChatPhotoAndWipeFirebase = function(msgKey, dataUrl, fileName) {
    if (!dataUrl || !currentRoomId || !msgKey) return;
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName || ('pixel_chat_' + Date.now() + '.jpg');
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Saved to device! Removing from Firebase...');
    } catch (e) {}

    // Delete photo payload from Firebase after download (keeps local device copy)
    if (typeof db !== 'undefined' && db) {
      db.ref('chats/' + currentRoomId + '/messages/' + msgKey + '/photoData').remove().catch(() => {});
      db.ref('chats/' + currentRoomId + '/messages/' + msgKey + '/downloaded').set(true).catch(() => {});
      db.ref('chats/' + currentRoomId + '/messages/' + msgKey + '/photoRemoved').set(true).catch(() => {});
    }
  };

  window.triggerChatPhotoPicker = function() {
    if (!getActiveUid() || !myPermanentUsername || !activeFriend || !currentRoomId) {
      return showToast('Pehle kisi friend ki chat kholein');
    }
    const picker = document.getElementById('chatPhotoFileInput');
    if (picker) picker.click();
  };

  function compressImageToFit(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          const maxDim = 960;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.68);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  window.handleChatPhotoSelected = async function(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      return showToast('Photo size 8 MB se kam hona chahiye');
    }

    showToast('Photo bheji ja rahi hai (5 min auto-delete)...');
    try {
      const compressedDataUrl = await compressImageToFit(file);
      const now = Date.now();
      const expiresAt = now + PHOTO_TTL_MS;

      await db.ref('chats/' + currentRoomId + '/messages').push({
        sender: myPermanentUsername,
        text: file.name || 'Photo',
        hasPhoto: true,
        photoData: compressedDataUrl,
        photoName: file.name || 'photo.jpg',
        createdAt: now,
        expiresAt: expiresAt,
        downloaded: false,
        photoRemoved: false
      });

      await db.ref('inbox/' + activeFriend).push({
        from: myPermanentUsername,
        text: '📷 Sent a photo (5m auto-delete)',
        createdAt: now
      });

      // Schedule auto-delete from Firebase after 5 minutes
      setTimeout(() => {
        if (currentRoomId && typeof db !== 'undefined') {
          db.ref('chats/' + currentRoomId + '/messages')
            .orderByChild('expiresAt')
            .endAt(Date.now())
            .once('value')
            .then((snap) => {
              snap.forEach((child) => {
                if (child.val() && child.val().hasPhoto) {
                  child.ref.child('photoData').remove().catch(() => {});
                  child.ref.child('photoRemoved').set(true).catch(() => {});
                }
              });
            })
            .catch(() => {});
        }
      }, PHOTO_TTL_MS + 1500);
    } catch (e) {
      showToast('Photo nahi bhej paye');
    }
  };

  window.openConversationWith = function(targetRaw) {
    const target = cleanUsername(targetRaw);
    if (!target || !myPermanentUsername) return;
    isAIModeActive = false;
    activeFriend = target;
    currentRoomId = [myPermanentUsername, target].sort().join('__');

    closeAddFriendPopup();
    document.getElementById('localAIModeView').style.display = 'none';
    document.getElementById('friendsListView').style.display = 'none';
    document.getElementById('conversationView').style.display = 'flex';
    document.getElementById('chatBackToListBtn').style.display = 'flex';
    document.getElementById('fullChatHeaderTitle').textContent = '@' + target;
    document.getElementById('fullChatHeaderSub').textContent = `Logged in as @${myPermanentUsername}`;

    if (activeChatRef) activeChatRef.off();
    activeChatRef = db.ref('chats/' + currentRoomId + '/messages').limitToLast(60);
    const box = document.getElementById('chatMessagesBox');
    box.innerHTML = '<div style="color:var(--text-secondary); font-size:12.5px; text-align:center; margin:auto;">Loading messages...</div>';

    activeChatRef.on('value', (snap) => {
      box.innerHTML = '';
      if (!snap.exists()) {
        box.innerHTML = `<div style="color:var(--text-secondary); font-size:12.5px; text-align:center; margin:auto;">@${target} se baat shuru karein</div>`;
        return;
      }

      snap.forEach((child) => {
        const msgKey = child.key;
        const msg = child.val();
        deleteExpiredOrDownloadedPhoto(msgKey, msg);

        const isMe = msg.sender === myPermanentUsername;
        const bubble = document.createElement('div');
        bubble.style.cssText = `max-width:82%; padding:10px 14px; border-radius:18px; font-size:13.5px; line-height:1.45; align-self:${isMe ? 'flex-end' : 'flex-start'}; background:${isMe ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}; border:1px solid rgba(255,255,255,0.14); color:var(--text-primary); word-break:break-word;`;

        let bodyHtml = `<div>${(msg.text || '').replace(/</g, '&lt;')}</div>`;
        if (msg.hasPhoto) {
          const expiredNow = msg.expiresAt && Date.now() >= msg.expiresAt;
          if (msg.photoData && !msg.photoRemoved && !expiredNow) {
            const safeName = encodeURIComponent(msg.photoName || 'photo.jpg');
            bodyHtml = `
              <img src="${msg.photoData}" alt="Shared photo" style="max-width:210px; max-height:240px; border-radius:12px; display:block; margin-bottom:6px; object-fit:cover;">
              <button type="button" onclick="downloadChatPhotoAndWipeFirebase('${msgKey}', this.previousElementSibling.src, decodeURIComponent('${safeName}'))" style="
                padding:6px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.22);
                background:rgba(56,189,248,0.22); color:#fff; font-size:11.5px; font-weight:600; cursor:pointer;
              ">⬇ Download (Deletes from Cloud)</button>
            `;
          } else {
            bodyHtml = `<div style="font-size:11.5px; opacity:0.75; font-style:italic;">📷 Photo removed from Firebase (5-min expiry or downloaded).</div>`;
          }
        }

        bubble.innerHTML = `<div style="font-size:10.5px; opacity:0.68; margin-bottom:3px;">@${msg.sender}</div>${bodyHtml}`;
        box.appendChild(bubble);
      });
      box.scrollTop = box.scrollHeight;
    });

    setTimeout(() => document.getElementById('chatMessageInput').focus(), 100);
  };

  window.sendLiveChatMessage = async function() {
    if (!getActiveUid() || !myPermanentUsername || !activeFriend || !currentRoomId) return showToast('Pehle kisi friend ko open karein');
    const inp = document.getElementById('chatMessageInput');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    const now = Date.now();
    try {
      await db.ref('chats/' + currentRoomId + '/messages').push({ sender: myPermanentUsername, text, createdAt: now });
      await db.ref('inbox/' + activeFriend).push({ from: myPermanentUsername, text, createdAt: now });
    } catch (e) {
      showToast('Message nahi bhej paye');
    }
  };

  // =========================================================
  // 4. LOCAL-ONLY AI MODE (FREE CHAT + FREE IMAGE GEN, NO FIREBASE)
  // =========================================================
  function getLocalAIKey() {
    const uid = getActiveUid() || 'guest';
    return 'ps_local_ai_chat_v1_' + uid;
  }

  function loadLocalAIMessages() {
    try {
      return JSON.parse(localStorage.getItem(getLocalAIKey()) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalAIMessages(list) {
    try {
      localStorage.setItem(getLocalAIKey(), JSON.stringify(list.slice(-50)));
    } catch (e) {}
  }

  function renderLocalAIMessages() {
    const box = document.getElementById('localAIMessagesBox');
    if (!box) return;
    const list = loadLocalAIMessages();
    if (!list.length) {
      box.innerHTML = `<div style="color:var(--text-secondary); font-size:12.5px; text-align:center; margin:auto; line-height:1.5;">
        AI Mode active hai. Kuch bhi poochein ya <strong>🎨 Make Photo</strong> se image banayein.<br>
        Data sirf aapke phone ke local storage mein rehta hai.
      </div>`;
      return;
    }

    box.innerHTML = '';
    list.forEach((m) => {
      const isUser = m.role === 'user';
      const bubble = document.createElement('div');
      bubble.style.cssText = `max-width:84%; padding:10px 14px; border-radius:18px; font-size:13.5px; line-height:1.45; align-self:${isUser ? 'flex-end' : 'flex-start'}; background:${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(56,189,248,0.12)'}; border:1px solid ${isUser ? 'rgba(255,255,255,0.16)' : 'rgba(56,189,248,0.28)'}; color:var(--text-primary); word-break:break-word;`;
      let extra = '';
      if (m.imageUrl) {
        extra = `<img src="${m.imageUrl}" alt="AI Generated" style="max-width:220px; border-radius:12px; display:block; margin-top:8px;">`;
      }
      bubble.innerHTML = `<div style="font-size:10.5px; opacity:0.7; margin-bottom:2px;">${isUser ? 'You (Local)' : 'AI (Local)'}</div><div>${(m.text || '').replace(/</g, '&lt;')}</div>${extra}`;
      box.appendChild(bubble);
    });
    box.scrollTop = box.scrollHeight;
  }

  window.toggleChatAIMode = function() {
    isAIModeActive = !isAIModeActive;
    const btn = document.getElementById('aiModeToggleBtn');
    if (isAIModeActive) {
      if (activeChatRef) { activeChatRef.off(); activeChatRef = null; }
      btn.style.background = 'rgba(56,189,248,0.34)';
      document.getElementById('friendsListView').style.display = 'none';
      document.getElementById('conversationView').style.display = 'none';
      document.getElementById('localAIModeView').style.display = 'flex';
      document.getElementById('chatBackToListBtn').style.display = 'flex';
      document.getElementById('fullChatHeaderTitle').textContent = 'AI Mode';
      document.getElementById('fullChatHeaderSub').textContent = '100% Local Storage • Free Chat & Photo';
      renderLocalAIMessages();
      setTimeout(() => document.getElementById('localAIInput').focus(), 100);
    } else {
      showFriendsListView();
    }
  };

  window.clearLocalAIHistory = function() {
    localStorage.removeItem(getLocalAIKey());
    renderLocalAIMessages();
    showToast('Local AI history cleared');
  };

  window.generateLocalAIImagePrompt = function() {
    const inp = document.getElementById('localAIInput');
    const prompt = (inp.value || '').trim() || 'futuristic neon city at night, 4k digital art';
    inp.value = '';
    const list = loadLocalAIMessages();
    list.push({ role: 'user', text: 'Generate image: ' + prompt });
    const seed = Math.floor(Math.random() * 999999);
    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true`;
    list.push({ role: 'ai', text: 'Local AI Image generated:', imageUrl: imgUrl });
    saveLocalAIMessages(list);
    renderLocalAIMessages();
  };

  window.sendLocalAIMessage = async function() {
    const inp = document.getElementById('localAIInput');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';

    const list = loadLocalAIMessages();
    list.push({ role: 'user', text: text });
    saveLocalAIMessages(list);
    renderLocalAIMessages();

    try {
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}`);
      const replyText = await res.text();
      const updated = loadLocalAIMessages();
      updated.push({ role: 'ai', text: (replyText || 'No response').trim() });
      saveLocalAIMessages(updated);
      renderLocalAIMessages();
    } catch (e) {
      const updated = loadLocalAIMessages();
      updated.push({ role: 'ai', text: 'Free AI server reachable nahi hai abhi. Try 🎨 Make Photo ya thodi der baad try karein.' });
      saveLocalAIMessages(updated);
      renderLocalAIMessages();
    }
  };

  // =========================================================
  // 5. USERNAME & MODAL CONTROLS
  // =========================================================
  async function loadMyPermanentUsername(user) {
    if (!user) return '';
    const cacheKey = 'ps_perm_uname_' + user.uid;
    const cached = cleanUsername(localStorage.getItem(cacheKey));
    if (cached) {
      myPermanentUsername = cached;
      startInboxWatcher(myPermanentUsername);
      return myPermanentUsername;
    }
    try {
      const snap = await db.ref('users/' + user.uid + '/username').get();
      if (snap.exists() && snap.val()) {
        myPermanentUsername = cleanUsername(snap.val());
        localStorage.setItem(cacheKey, myPermanentUsername);
        startInboxWatcher(myPermanentUsername);
        return myPermanentUsername;
      }
    } catch (e) {}
    return '';
  }

  window.claimPermanentUsername = async function() {
    const uid = getActiveUid();
    if (!uid) return showToast('Sign in first');
    const chosen = cleanUsername(document.getElementById('newPermanentUsernameInput').value);
    if (!chosen || chosen.length < 3) return showToast('Username kam se kam 3 letter ka ho');
    try {
      const existing = await db.ref('usernames/' + chosen).get();
      if (existing.exists() && existing.val().uid !== uid) return showToast('Yeh username pehle se liya ja chuka hai');
      const email = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : '';
      await db.ref('usernames/' + chosen).set({ uid, email, createdAt: Date.now() });
      await db.ref('users/' + uid + '/username').set(chosen);
      myPermanentUsername = chosen;
      localStorage.setItem('ps_perm_uname_' + uid, chosen);
      startInboxWatcher(chosen);
      enableChatNotifications();
      document.getElementById('usernameSetupBox').style.display = 'none';
      await loadFriendsList();
      showFriendsListView();
      showToast('Username hamesha ke liye save: @' + chosen);
    } catch (e) {
      showToast('Username save nahi ho paya');
    }
  };

  window.openLiveChatModal = async function() {
    const uid = getActiveUid();
    if (!uid) {
      showToast('Sign in first to open Chat');
      if (typeof openAccount === 'function') openAccount();
      return;
    }
    const dot = document.getElementById('chatUnreadDot');
    if (dot) dot.style.display = 'none';
    document.getElementById('liveChatOverlay').classList.add('open');

    if (isAIModeActive) {
      document.getElementById('localAIModeView').style.display = 'flex';
      renderLocalAIMessages();
      return;
    }

    const userObj = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : { uid };
    await loadMyPermanentUsername(userObj);
    await loadFriendsList();
    if (!myPermanentUsername) {
      document.getElementById('friendsListView').style.display = 'none';
      document.getElementById('conversationView').style.display = 'none';
      document.getElementById('localAIModeView').style.display = 'none';
      document.getElementById('usernameSetupBox').style.display = 'block';
      document.getElementById('fullChatHeaderTitle').textContent = 'Welcome';
      document.getElementById('fullChatHeaderSub').textContent = 'Set permanent username';
    } else {
      document.getElementById('usernameSetupBox').style.display = 'none';
      showFriendsListView();
    }
  };

  window.closeLiveChatModal = function() {
    closeAddFriendPopup();
    document.getElementById('liveChatOverlay').classList.remove('open');
  };

  // =========================================================
  // 6. 3D TUTORIAL ON SLOW SINGLE CLICK OF PIXEL STUDIO
  // =========================================================
  const oldGuide = document.getElementById('pixel3DGuideOverlay');
  if (oldGuide) oldGuide.remove();

  const guideModal = document.createElement('div');
  guideModal.id = 'pixel3DGuideOverlay';
  guideModal.className = 'modal-overlay';
  guideModal.style.cssText = `z-index:2300; padding:14px; background:rgba(5,8,15,0.94); backdrop-filter:blur(28px);`;
  guideModal.innerHTML = `
    <div id="guide3DShell" style="width:100%; max-width:470px; margin:auto; border-radius:26px; padding:18px; background:linear-gradient(150deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03)); border:1px solid rgba(255,255,255,0.18); box-shadow:0 26px 65px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.2); transform-style:preserve-3d; perspective:1000px; transition:transform 0.25s ease;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <button type="button" onclick="cycle3DTutorialStep()" aria-label="3 Line Tutorial Step Switcher" style="display:flex; flex-direction:column; justify-content:center; gap:4px; width:38px; height:38px; padding:8px; border-radius:12px; background:rgba(255,255,255,0.09); border:1px solid rgba(255,255,255,0.16); cursor:pointer;">
            <span style="width:100%; height:2px; border-radius:4px; background:#38bdf8;"></span>
            <span style="width:75%; height:2px; border-radius:4px; background:#a855f7;"></span>
            <span style="width:100%; height:2px; border-radius:4px; background:#34d399;"></span>
          </button>
          <div>
            <div style="font-size:16px; font-weight:700;">App Tutorial (3D Guide)</div>
            <div id="guide3DCounter" style="font-size:11.5px; color:var(--text-secondary);">Tutorial 1 / 5</div>
          </div>
        </div>
        <button class="icon-btn" onclick="closePixel3DGuide()" aria-label="Close Tutorial">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:12px;">
        <button type="button" class="tut-pill" onclick="switchGuide3DStep(0)" style="padding:7px 11px; border-radius:12px; border:1px solid rgba(255,255,255,0.25); background:rgba(255,255,255,0.16); color:#fff; font-size:11.5px; font-weight:600; white-space:nowrap; cursor:pointer;">Photo → Code</button>
        <button type="button" class="tut-pill" onclick="switchGuide3DStep(1)" style="padding:7px 11px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:var(--text-secondary); font-size:11.5px; font-weight:600; white-space:nowrap; cursor:pointer;">Code → Photo</button>
        <button type="button" class="tut-pill" onclick="switchGuide3DStep(2)" style="padding:7px 11px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:var(--text-secondary); font-size:11.5px; font-weight:600; white-space:nowrap; cursor:pointer;">Pixel Glitch & Fix</button>
        <button type="button" class="tut-pill" onclick="switchGuide3DStep(3)" style="padding:7px 11px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:var(--text-secondary); font-size:11.5px; font-weight:600; white-space:nowrap; cursor:pointer;">Share</button>
        <button type="button" class="tut-pill" onclick="switchGuide3DStep(4)" style="padding:7px 11px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:var(--text-secondary); font-size:11.5px; font-weight:600; white-space:nowrap; cursor:pointer;">Chat & AI</button>
      </div>

      <div id="guide3DStageCard" onclick="tiltAndNextTutorial()" style="position:relative; min-height:235px; border-radius:22px; padding:18px; background:radial-gradient(circle at top left, rgba(56,189,248,0.24), rgba(15,23,42,0.92)); border:1px solid rgba(255,255,255,0.18); box-shadow:0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.16); transform:rotateX(5deg) rotateY(-5deg) translateZ(14px); transition:transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), background 0.35s ease; cursor:pointer; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div id="guide3DBadge" style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; background:rgba(56,189,248,0.22); color:#7dd3fc; margin-bottom:10px;">ENCODE • PHOTO TO TEXT CODE</div>
          <div id="guide3DTitle" style="font-size:18px; font-weight:700; margin-bottom:10px;">Photo ko Text Code mein kaise badlein</div>
          <div id="guide3DDesc" style="font-size:13px; line-height:1.6; color:rgba(255,255,255,0.9);">1. Pehle <b>Codec</b> tab kholein.<br>2. Apni <b>Photo select</b> karein.<br>3. <b>Encode</b> button dabayein—photo ek <b>Text Code</b> mein badal jayegi.</div>
        </div>
        <div style="margin-top:14px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:space-between; font-size:11.5px; color:var(--text-secondary);">
          <span>Card par tap karein → 3D tilt + Agla tutorial</span>
          <span style="color:#fff; font-weight:600;">Next →</span>
        </div>
      </div>

      <div style="margin-top:12px; font-size:11.5px; color:var(--text-secondary); text-align:center;">1 Slow Click = 3D Tutorial • 5 Fast Taps = Secret Studio</div>
    </div>
  `;
  document.body.appendChild(guideModal);

  const tutorialCards = [
    { counter: 'Tutorial 1 / 5', badge: 'ENCODE • PHOTO TO TEXT CODE', title: 'Photo ko Text Code mein kaise badlein', desc: '1. <b>Codec</b> tab par jayein.<br>2. Apni <b>Photo chunein</b>.<br>3. <b>Encode</b> dabayein—photo ek <b>Text Code</b> mein convert ho jayegi.', bg: 'radial-gradient(circle at top left, rgba(56,189,248,0.25), rgba(15,23,42,0.92))', accent: '#7dd3fc' },
    { counter: 'Tutorial 2 / 5', badge: 'DECODE • TEXT CODE TO PHOTO', title: 'Text Code se Photo wapas kaise nikalein', desc: '1. <b>Codec</b> tab mein jayein.<br>2. Wahi <b>Text Code</b> paste karein.<br>3. <b>Decode</b> button dabayein—aapki <b>asli photo wapas</b> aa jayegi.', bg: 'radial-gradient(circle at top left, rgba(168,85,247,0.25), rgba(15,23,42,0.92))', accent: '#d8b4fe' },
    { counter: 'Tutorial 3 / 5', badge: 'LOCK • PIXEL GLITCH & RESTORE', title: 'Photo ke Pixel bigaadna aur wapas sudharna', desc: '1. <b>Lock</b> tab kholein aur photo select karein.<br>2. <b>Key</b> daal kar <b>Glitch / Scramble</b> dabayein.<br>3. Wapas sahi karne ke liye wahi <b>Key</b> daal kar <b>Restore</b> dabayein.', bg: 'radial-gradient(circle at top left, rgba(244,114,182,0.25), rgba(15,23,42,0.92))', accent: '#f9a8d4' },
    { counter: 'Tutorial 4 / 5', badge: 'SHARE • 5-MINUTE CODE SHARE', title: 'Share option se file/code kaise bhejein', desc: '1. <b>Share</b> tab mein jayein aur file/code select karein.<br>2. <b>6-digit code</b> banayein.<br>3. Dusre device mein code daal kar download karein.', bg: 'radial-gradient(circle at top left, rgba(251,191,36,0.24), rgba(15,23,42,0.92))', accent: '#fde047' },
    { counter: 'Tutorial 5 / 5', badge: 'CHAT & AI • 8MB PHOTO + LOCAL AI', title: 'Chat photo aur Local AI kaise chalayein', desc: '1. Chat mein <b>📷</b> se 8MB tak photo bhejein (5 min ya download par Firebase se delete).<br>2. Upar <b>AI Mode</b> se free chat aur photo banayein (100% local storage mein).', bg: 'radial-gradient(circle at top left, rgba(52,211,153,0.25), rgba(15,23,42,0.92))', accent: '#6ee7b7' }
  ];

  let currentTutIdx = 0;
  let singleClickTimer = null;

  window.switchGuide3DStep = function(index) {
    currentTutIdx = ((index % tutorialCards.length) + tutorialCards.length) % tutorialCards.length;
    const item = tutorialCards[currentTutIdx];
    document.getElementById('guide3DCounter').textContent = item.counter;
    document.getElementById('guide3DBadge').textContent = item.badge;
    document.getElementById('guide3DBadge').style.color = item.accent;
    document.getElementById('guide3DTitle').textContent = item.title;
    document.getElementById('guide3DDesc').innerHTML = item.desc;
    const card = document.getElementById('guide3DStageCard');
    card.style.background = item.bg;
    card.style.transform = 'rotateX(10deg) rotateY(10deg) translateZ(20px) scale(1.015)';
    setTimeout(() => { card.style.transform = 'rotateX(4deg) rotateY(-4deg) translateZ(12px) scale(1)'; }, 260);
    document.querySelectorAll('.tut-pill').forEach((pill, i) => {
      pill.style.background = i === currentTutIdx ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)';
      pill.style.color = i === currentTutIdx ? '#ffffff' : 'var(--text-secondary)';
      pill.style.borderColor = i === currentTutIdx ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)';
    });
  };

  window.cycle3DTutorialStep = function() { switchGuide3DStep(currentTutIdx + 1); };
  window.tiltAndNextTutorial = function() {
    const card = document.getElementById('guide3DStageCard');
    card.style.transform = 'rotateX(-11deg) rotateY(14deg) translateZ(24px)';
    setTimeout(() => switchGuide3DStep(currentTutIdx + 1), 220);
  };
  window.openPixel3DGuide = function() {
    switchGuide3DStep(0);
    document.getElementById('pixel3DGuideOverlay').classList.add('open');
  };
  window.closePixel3DGuide = function() {
    document.getElementById('pixel3DGuideOverlay').classList.remove('open');
  };

  const triggerEl = document.getElementById('secretTrigger') || document.querySelector('.brand-title');
  if (triggerEl && !triggerEl.__has3DTutorialClick) {
    triggerEl.__has3DTutorialClick = true;
    triggerEl.addEventListener('click', () => {
      clearTimeout(singleClickTimer);
      singleClickTimer = setTimeout(() => {
        if (!document.querySelector('.modal-overlay.open')) window.openPixel3DGuide();
      }, 360);
    });
  }

  // Auth hook for per-user settings & chat
  if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged((user) => {
      ensureTopChatButton();
      if (user) {
        loadMyPermanentUsername(user);
        loadFriendsList();
        loadUserSettingsFromFirebase(user);
      } else {
        myPermanentUsername = '';
        friendsList = [];
        if (inboxListenerRef) inboxListenerRef.off();
      }
    });
  }
  if (typeof currentUser !== 'undefined' && currentUser) {
    loadMyPermanentUsername(currentUser);
    loadFriendsList();
    loadUserSettingsFromFirebase(currentUser);
  }
})();
