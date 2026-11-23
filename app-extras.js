(function() {
  if (window.__pixelGitHubCoreSuiteV1) return;
  window.__pixelGitHubCoreSuiteV1 = true;

  // Remove any old brightness dim overlay from live patch
  const oldDim = document.getElementById('psSavedBrightnessOverlay');
  if (oldDim) oldDim.remove();

  // =========================================================
  // 1. PER-USER CLOUD & LOCAL SETTINGS (STRICTLY ISOLATED BY UID)
  // =========================================================
  let currentSettingsUid = null;
  let saveSettingsTimer = null;

  function getLocalSettingsKey(uid) {
    return 'ps_user_settings_' + (uid || 'guest');
  }

  function applyUserSettingsLocally(settings) {
    if (!settings || typeof settings !== 'object') return;
    if (typeof settings.brightness === 'number' && !Number.isNaN(settings.brightness)) {
      const rangeInputs = Array.from(document.querySelectorAll('input[type="range"]'));
      rangeInputs.forEach((slider) => {
        const hint = ((slider.id || '') + ' ' + (slider.name || '') + ' ' + (slider.getAttribute('aria-label') || '') + ' ' + (slider.closest('div, label')?.innerText || '')).toLowerCase();
        if (hint.includes('bright') || hint.includes('ब्राइट') || hint.includes('dim')) {
          if (document.activeElement !== slider && Number(slider.value) !== settings.brightness) {
            slider.value = settings.brightness;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            slider.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    }
  }

  async function syncMySettingsToCloud(partialData) {
    const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
    const key = getLocalSettingsKey(uid);
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    const merged = { ...existing, ...partialData, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(merged));

    // Only write to authenticated user's own node: users/{uid}/settings
    if (uid && typeof db !== 'undefined' && db) {
      try {
        await db.ref('users/' + uid + '/settings').update(merged);
      } catch (e) {}
    }
  }

  async function loadMySettingsFromCloud(user) {
    if (!user || typeof db === 'undefined' || !db) return;
    currentSettingsUid = user.uid;
    const key = getLocalSettingsKey(user.uid);
    const localSaved = JSON.parse(localStorage.getItem(key) || 'null');
    if (localSaved) applyUserSettingsLocally(localSaved);

    try {
      const snap = await db.ref('users/' + user.uid + '/settings').get();
      if (snap.exists() && snap.val()) {
        const cloudSettings = snap.val();
        localStorage.setItem(key, JSON.stringify(cloudSettings));
        applyUserSettingsLocally(cloudSettings);
      }
    } catch (e) {}
  }

  function bindPerUserSettingListeners() {
    const rangeInputs = Array.from(document.querySelectorAll('input[type="range"]'));
    rangeInputs.forEach((slider) => {
      if (slider.__psPerUserBound) return;
      slider.__psPerUserBound = true;
      const hint = ((slider.id || '') + ' ' + (slider.name || '') + ' ' + (slider.getAttribute('aria-label') || '') + ' ' + (slider.closest('div, label')?.innerText || '')).toLowerCase();
      if (hint.includes('bright') || hint.includes('ब्राइट') || hint.includes('dim')) {
        const handler = () => {
          clearTimeout(saveSettingsTimer);
          saveSettingsTimer = setTimeout(() => {
            syncMySettingsToCloud({ brightness: Number(slider.value) });
          }, 250);
        };
        slider.addEventListener('change', handler);
      }
    });
  }

  // =========================================================
  // 2. TOP BAR CHAT BUTTON (NO BOTTOM DOCK OVERLAP)
  // =========================================================
  const strayDockBtn = document.getElementById('btn-tab-chat');
  if (strayDockBtn) strayDockBtn.remove();

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

  // =========================================================
  // 3. FULL-SCREEN CHAT + PERMANENT USERNAME + + FRIEND + ALERTS
  // =========================================================
  const oldModal = document.getElementById('liveChatOverlay');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'liveChatOverlay';
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    z-index: 2200; padding: 0; width: 100vw; height: 100vh; max-width: 100vw;
    overflow: hidden; background: rgba(6, 8, 13, 0.96); backdrop-filter: blur(28px);
  `;
  modal.innerHTML = `
    <div style="width:100%; height:100%; max-width:520px; margin:0 auto; display:flex; flex-direction:column; position:relative;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(12,15,23,0.85); flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <button class="icon-btn" id="chatBackToListBtn" style="display:none; width:34px; height:34px;" onclick="showFriendsListView()" aria-label="Back">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style="min-width:0;">
            <div id="fullChatHeaderTitle" style="font-size:17px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Chats</div>
            <div id="fullChatHeaderSub" style="font-size:11.5px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Sign in to start</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          <button class="icon-btn" onclick="openAddFriendPopup()" aria-label="Add Friend" title="Add Username">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="icon-btn" onclick="closeLiveChatModal()" aria-label="Close Chat">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div id="addFriendSheet" style="display:none; padding:14px 16px; background:rgba(18,22,34,0.98); border-bottom:1px solid rgba(255,255,255,0.14); flex-shrink:0;">
        <div class="section-label" style="margin-bottom:8px;">Add Friend by Username</div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" id="addFriendUsernameInput" placeholder="Enter friend's username..." style="flex:1; padding:12px 14px; border-radius:16px; border:1px solid var(--btn-border); background:rgba(0,0,0,0.4); color:var(--text-primary); font-size:14px; outline:none;">
          <button class="btn" style="width:auto; padding:12px 16px;" onclick="saveFriendUsername()">Add</button>
          <button class="btn" style="width:auto; padding:12px 12px;" onclick="closeAddFriendPopup()">✕</button>
        </div>
      </div>

      <div id="usernameSetupBox" style="display:none; padding:24px 18px; margin:auto 16px; border-radius:24px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14);">
        <div class="section-label" style="text-align:center;">One-Time Permanent Username</div>
        <p style="font-size:13px; color:var(--text-secondary); text-align:center; margin:0 0 14px 0;">
          Apna username ek baar likhein. Yeh aapke Google account ke saath hamesha ke liye save ho jayega.
        </p>
        <div class="input-wrap">
          <input type="text" id="newPermanentUsernameInput" placeholder="e.g. rehan_star" maxlength="20" style="padding-left:14px; padding-right:14px;">
        </div>
        <button class="btn" onclick="claimPermanentUsername()">
          <span>Save Username Forever</span>
        </button>
      </div>

      <div id="friendsListView" style="display:none; flex:1; overflow-y:auto; padding:14px 16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div class="section-label" style="margin:0;">Saved Friends List</div>
          <button class="btn" style="width:auto; padding:7px 12px; font-size:11.5px;" onclick="enableChatNotifications()">Alerts On/Off</button>
        </div>
        <div id="friendsListContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
      </div>

      <div id="conversationView" style="display:none; flex:1; flex-direction:column; min-height:0;">
        <div id="chatMessagesBox" style="flex:1; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:10px;"></div>
        <div style="padding:10px 14px 16px 14px; background:linear-gradient(to top, rgba(6,8,13,0.98) 70%, rgba(6,8,13,0)); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:8px; padding:6px 8px 6px 14px; border-radius:26px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); backdrop-filter:blur(20px);">
            <input type="text" id="chatMessageInput" placeholder="Message likhein..." style="flex:1; background:transparent; border:none; color:var(--text-primary); font-size:14px; padding:10px 4px; outline:none;" onkeydown="if(event.key==='Enter') sendLiveChatMessage()">
            <button class="btn" style="width:auto; padding:11px 16px; border-radius:20px; font-size:13px;" onclick="sendLiveChatMessage()">Send</button>
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
  const seenNotifIds = new Set();

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
    const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : 'guest';
    return 'ps_chat_friends_' + uid;
  }

  async function loadFriendsList() {
    const localArr = JSON.parse(localStorage.getItem(getFriendsKey()) || '[]');
    friendsList = Array.isArray(localArr) ? localArr : [];
    const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
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
    const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
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
    if (!currentUser) return showToast('Sign in first');
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
    activeFriend = '';
    currentRoomId = null;
    if (activeChatRef) { activeChatRef.off(); activeChatRef = null; }
    document.getElementById('chatBackToListBtn').style.display = 'none';
    document.getElementById('conversationView').style.display = 'none';
    document.getElementById('friendsListView').style.display = 'block';
    document.getElementById('fullChatHeaderTitle').textContent = 'Chats';
    document.getElementById('fullChatHeaderSub').textContent = myPermanentUsername ? `You: @${myPermanentUsername}` : '';
    renderFriendsList();
  };

  window.openConversationWith = function(targetRaw) {
    const target = cleanUsername(targetRaw);
    if (!target || !myPermanentUsername) return;
    activeFriend = target;
    currentRoomId = [myPermanentUsername, target].sort().join('__');
    closeAddFriendPopup();
    document.getElementById('friendsListView').style.display = 'none';
    document.getElementById('conversationView').style.display = 'flex';
    document.getElementById('chatBackToListBtn').style.display = 'flex';
    document.getElementById('fullChatHeaderTitle').textContent = '@' + target;
    document.getElementById('fullChatHeaderSub').textContent = `Logged in as @${myPermanentUsername}`;
    if (activeChatRef) activeChatRef.off();
    activeChatRef = db.ref('chats/' + currentRoomId + '/messages').limitToLast(80);
    const box = document.getElementById('chatMessagesBox');
    box.innerHTML = '<div style="color:var(--text-secondary); font-size:12.5px; text-align:center; margin:auto;">Loading messages...</div>';
    activeChatRef.on('value', (snap) => {
      box.innerHTML = '';
      if (!snap.exists()) {
        box.innerHTML = `<div style="color:var(--text-secondary); font-size:12.5px; text-align:center; margin:auto;">@${target} se baat shuru karein</div>`;
        return;
      }
      snap.forEach((child) => {
        const msg = child.val();
        const isMe = msg.sender === myPermanentUsername;
        const bubble = document.createElement('div');
        bubble.style.cssText = `max-width:80%; padding:10px 14px; border-radius:18px; font-size:13.5px; line-height:1.45; align-self:${isMe ? 'flex-end' : 'flex-start'}; background:${isMe ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}; border:1px solid rgba(255,255,255,0.14); color:var(--text-primary); word-break:break-word;`;
        bubble.innerHTML = `<div style="font-size:10.5px; opacity:0.68; margin-bottom:2px;">@${msg.sender}</div><div>${(msg.text || '').replace(/</g, '&lt;')}</div>`;
        box.appendChild(bubble);
      });
      box.scrollTop = box.scrollHeight;
    });
    setTimeout(() => document.getElementById('chatMessageInput').focus(), 100);
  };

  window.sendLiveChatMessage = async function() {
    if (!currentUser || !myPermanentUsername || !activeFriend || !currentRoomId) return showToast('Pehle kisi friend ko open karein');
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
    if (!currentUser) return showToast('Sign in first');
    const chosen = cleanUsername(document.getElementById('newPermanentUsernameInput').value);
    if (!chosen || chosen.length < 3) return showToast('Username kam se kam 3 letter ka ho');
    try {
      const existing = await db.ref('usernames/' + chosen).get();
      if (existing.exists() && existing.val().uid !== currentUser.uid) return showToast('Yeh username pehle se liya ja chuka hai');
      await db.ref('usernames/' + chosen).set({ uid: currentUser.uid, email: currentUser.email || '', createdAt: Date.now() });
      await db.ref('users/' + currentUser.uid + '/username').set(chosen);
      myPermanentUsername = chosen;
      localStorage.setItem('ps_perm_uname_' + currentUser.uid, chosen);
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
    if (!currentUser) {
      showToast('Sign in first to open Chat');
      if (typeof openAccount === 'function') openAccount();
      return;
    }
    const dot = document.getElementById('chatUnreadDot');
    if (dot) dot.style.display = 'none';
    document.getElementById('liveChatOverlay').classList.add('open');
    await loadMyPermanentUsername(currentUser);
    await loadFriendsList();
    if (!myPermanentUsername) {
      document.getElementById('friendsListView').style.display = 'none';
      document.getElementById('conversationView').style.display = 'none';
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
  // 4. 3D TUTORIAL ON SLOW SINGLE CLICK OF PIXEL STUDIO
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
        <button type="button" class="tut-pill" onclick="switchGuide3DStep(4)" style="padding:7px 11px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:var(--text-secondary); font-size:11.5px; font-weight:600; white-space:nowrap; cursor:pointer;">Chat</button>
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
    { counter: 'Tutorial 5 / 5', badge: 'CHAT • PERMANENT USERNAME CHAT', title: 'Chat option kaise use karein', desc: '1. Upar <b>Chat</b> icon kholein aur pehli baar apna <b>permanent username</b> save karein.<br>2. Upar <b>+</b> daba kar friend ka username add karein.<br>3. List se friend par tap karke neeche bar se live message bhejein.', bg: 'radial-gradient(circle at top left, rgba(52,211,153,0.25), rgba(15,23,42,0.92))', accent: '#6ee7b7' }
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
  bindPerUserSettingListeners();
  if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        loadMyPermanentUsername(user);
        loadFriendsList();
        loadMySettingsFromCloud(user);
      } else {
        myPermanentUsername = '';
        friendsList = [];
        currentSettingsUid = null;
        if (inboxListenerRef) inboxListenerRef.off();
      }
    });
  }
  if (typeof currentUser !== 'undefined' && currentUser) {
    loadMyPermanentUsername(currentUser);
    loadFriendsList();
    loadMySettingsFromCloud(currentUser);
  }
})();
