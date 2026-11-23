// --- FIREBASE AUTH, 5-MIN AUTO-DELETE SHARE & EASY SECRET LIVE STUDIO ---
const firebaseConfig = {
  apiKey: "AIzaSyCe9PY5mGrSOlzLOKByFrii_7_Vjlvv0AM",
  authDomain: "pixel-8e2df.firebaseapp.com",
  databaseURL: "https://pixel-8e2df-default-rtdb.firebaseio.com",
  projectId: "pixel-8e2df",
  storageBucket: "pixel-8e2df.firebasestorage.app",
  messagingSenderId: "905163536146",
  appId: "1:905163536146:web:d21f3ea2c65729a4f5a5cb",
  measurementId: "G-DT9E32T5ZR"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
let currentUser = null;

const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
let activeShareCode = null;
let countdownInterval = null;

const DEFAULT_SECRET_PASS = "7860";
let secretUnlocked = false;

function getSecretPass() {
  return localStorage.getItem("ps_secret_pass") || DEFAULT_SECRET_PASS;
}

// --- 1. LIVE REMOTE CODE ENGINE (HTML + CSS + JS) ---
const liveStyleEl = document.createElement('style');
liveStyleEl.id = 'liveRemoteStyle';
document.head.appendChild(liveStyleEl);

const liveHtmlHost = document.createElement('div');
liveHtmlHost.id = 'liveRemoteHtmlHost';
liveHtmlHost.style.display = 'none';
document.body.appendChild(liveHtmlHost);

let lastAppliedJsHash = '';
let injectedOptionNodes = [];

function clearInjectedLiveNodes() {
  injectedOptionNodes.forEach(el => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  injectedOptionNodes = [];
  liveHtmlHost.innerHTML = '';
}

function mountHtmlIntoTarget(htmlString, targetSelector) {
  if (!htmlString || !htmlString.trim()) return;
  const temp = document.createElement('div');
  temp.innerHTML = htmlString.trim();
  const target = (targetSelector && document.querySelector(targetSelector)) || document.body;

  Array.from(temp.children).forEach(child => {
    target.appendChild(child);
    injectedOptionNodes.push(child);
  });
}

db.ref('live_update').on('value', (snap) => {
  clearInjectedLiveNodes();
  if (!snap.exists()) {
    liveStyleEl.textContent = '';
    document.getElementById('liveCssBox').value = '';
    document.getElementById('liveHtmlBox').value = '';
    document.getElementById('liveJsBox').value = '';
    return;
  }
  const val = snap.val();
  if (typeof val.css === 'string') {
    liveStyleEl.textContent = val.css;
    document.getElementById('liveCssBox').value = val.css;
  }
  if (typeof val.html === 'string') {
    document.getElementById('liveHtmlBox').value = val.html;
    mountHtmlIntoTarget(val.html, val.target || 'body');
  }
  if (typeof val.js === 'string') {
    document.getElementById('liveJsBox').value = val.js;
    if (val.js.trim() && val.js !== lastAppliedJsHash) {
      lastAppliedJsHash = val.js;
      try { new Function(val.js)(); } catch (e) { console.error(e); }
    }
  }
});

// Secret 5-Tap Trigger on "Pixel Studio" Title
let secretTaps = 0;
let secretTapTimer = null;
document.getElementById('secretTrigger').addEventListener('click', () => {
  secretTaps++;
  clearTimeout(secretTapTimer);
  secretTapTimer = setTimeout(() => { secretTaps = 0; }, 1500);
  if (secretTaps >= 5) {
    secretTaps = 0;
    openSecret();
  }
});

// Custom Dark Password Popup (No White Browser Prompt)
function openSecret() {
  if (secretUnlocked) {
    showSecretModal();
    return;
  }
  const inp = document.getElementById("customPassInput");
  inp.value = "";
  document.getElementById("customPassModal").classList.add("open");
  setTimeout(() => inp.focus(), 100);
}

function closePassPopup() {
  document.getElementById("customPassModal").classList.remove("open");
}

function verifyPassPopup() {
  const entered = document.getElementById("customPassInput").value.trim();
  if (entered !== getSecretPass()) {
    showToast("Wrong Password!");
    return;
  }
  secretUnlocked = true;
  closePassPopup();
  showSecretModal();
}

function showSecretModal() {
  document.getElementById("newSecretPassInput").value = getSecretPass();
  document.getElementById("adminStatusEmail").textContent =
    currentUser ? `Signed in: ${currentUser.email}` : 'Sign in with Admin Gmail first';
  document.getElementById("secretOverlay").classList.add("open");
}

function closeSecret() {
  secretUnlocked = false;
  document.getElementById("secretOverlay").classList.remove("open");
}

function switchSecretTab(tab) {
  ['add', 'style', 'code', 'pass'].forEach(t => {
    document.getElementById('sbtn-' + t).classList.toggle('active', t === tab);
    document.getElementById('stab-' + t).classList.toggle('active', t === tab);
  });
}

function saveSecretPass() {
  const val = document.getElementById("newSecretPassInput").value.trim();
  if (!val || val.length < 3) return showToast("Password min 3 chars");
  localStorage.setItem("ps_secret_pass", val);
  showToast("Secret password updated!");
}

function applyQuickPopupTheme() {
  const bg = document.getElementById('quickPopupBg').value;
  const accent = document.getElementById('quickPopupAccent').value;
  const cssBox = document.getElementById('liveCssBox');
  const popupRule = `\n#passPopupCard { background: ${bg} !important; border-color: ${accent} !important; }\n#passPopupCard .btn { border-color: ${accent} !important; color: ${accent} !important; }`;
  cssBox.value = (cssBox.value.replace(/\n?#passPopupCard[\s\S]*?#passPopupCard \.btn[\s\S]*?\}\n?/g, '') + popupRule).trim();
  liveStyleEl.textContent = cssBox.value;
}

async function addQuickOptionLive() {
  if (!currentUser) return showToast('Sign in with Admin account first');
  const target = document.getElementById('newOptionTarget').value;
  const label = document.getElementById('newOptionLabel').value.trim();
  const actionCode = document.getElementById('newOptionAction').value.trim();

  if (!label) return showToast('Enter button / option name');

  const btnId = 'liveOpt_' + Date.now();
  const btnHtml = `<button class="btn mb-10" id="${btnId}">${label}</button>`;
  const bindJs = actionCode
    ? `document.getElementById('${btnId}').onclick = function() { ${actionCode} };`
    : `document.getElementById('${btnId}').onclick = function() { showToast('${label}'); };`;

  const htmlBox = document.getElementById('liveHtmlBox');
  const jsBox = document.getElementById('liveJsBox');

  htmlBox.value = (htmlBox.value + '\n' + btnHtml).trim();
  jsBox.value = (jsBox.value + '\n' + bindJs).trim();

  try {
    await db.ref('live_update').set({
      css: document.getElementById('liveCssBox').value,
      html: htmlBox.value,
      target: target,
      js: jsBox.value,
      updatedAt: Date.now()
    });
    lastAppliedJsHash = '';
    document.getElementById('newOptionLabel').value = '';
    document.getElementById('newOptionAction').value = '';
    showToast(`Added "${label}" live!`);
  } catch (e) {
    showToast('Access Denied (Admin Only)');
  }
}

async function publishLiveCode() {
  if (!currentUser) return showToast('Sign in with Admin account first');
  try {
    const jsVal = document.getElementById('liveJsBox').value;
    lastAppliedJsHash = '';
    await db.ref('live_update').set({
      css: document.getElementById('liveCssBox').value,
      html: document.getElementById('liveHtmlBox').value,
      target: document.getElementById('newOptionTarget').value || 'body',
      js: jsVal,
      updatedAt: Date.now()
    });
    showToast('Published live to all users!');
    closeSecret();
  } catch (e) {
    showToast('Access Denied (Admin Only)');
  }
}

async function clearLiveCode() {
  if (!currentUser) return showToast('Sign in first');
  try {
    await db.ref('live_update').remove();
    lastAppliedJsHash = '';
    clearInjectedLiveNodes();
    showToast('Live patch cleared');
  } catch (e) {
    showToast('Access Denied');
  }
}

// --- 2. AUTO-SWEEP EXPIRED SHARES (> 5 MINS) ---
async function cleanupExpiredShares() {
  try {
    const snap = await db.ref('shares').get();
    if (!snap.exists()) return;
    const now = Date.now();
    const promises = [];
    snap.forEach((child) => {
      const data = child.val();
      const exp = data.expiresAt || ((data.createdAt || 0) + EXPIRY_MS);
      if (now >= exp) {
        promises.push(child.ref.remove());
      }
    });
    if (promises.length) await Promise.all(promises);
  } catch (e) {}
}

// --- 3. AUTHENTICATION & CLOUD BACKUP ---
auth.onAuthStateChanged((user) => {
  currentUser = user;
  const dot = document.getElementById('authDot');
  const loggedOut = document.getElementById('authLoggedOut');
  const loggedIn = document.getElementById('authLoggedIn');
  const shareLocked = document.getElementById('shareLockedBox');
  const shareMain = document.getElementById('shareMainBox');

  if (user) {
    dot.classList.add('online');
    loggedOut.style.display = 'none';
    loggedIn.style.display = 'block';
    document.getElementById('userEmailLabel').textContent = user.email;
    shareLocked.style.display = 'none';
    shareMain.style.display = 'block';
    cleanupExpiredShares();
    restorePendingShare();
  } else {
    dot.classList.remove('online');
    loggedOut.style.display = 'block';
    loggedIn.style.display = 'none';
    shareLocked.style.display = 'block';
    shareMain.style.display = 'none';
  }
});

function openAccount() { document.getElementById('accountOverlay').classList.add('open'); }
function closeAccount() { document.getElementById('accountOverlay').classList.remove('open'); }

async function doLogin() {
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value;
  if (!email || !pass) return showToast('Enter email & password');
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    showToast('Signed in');
    closeAccount();
  } catch (e) {
    showToast(e.message.split('.')[0]);
  }
}

async function doSignup() {
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value;
  if (!email || pass.length < 6) return showToast('Password min 6 chars');
  try {
    await auth.createUserWithEmailAndPassword(email, pass);
    showToast('Account created');
    closeAccount();
  } catch (e) {
    showToast(e.message.split('.')[0]);
  }
}

async function doLogout() {
  await auth.signOut();
  showToast('Signed out');
  closeAccount();
}

async function syncThemesToCloud() {
  if (!currentUser) return showToast('Sign in first');
  try {
    await db.ref('users/' + currentUser.uid + '/themes').set({
      folders: themeFolders,
      active: activeFolderName,
      updatedAt: Date.now()
    });
    showToast('Themes saved to cloud');
  } catch (e) {
    showToast('Cloud save failed');
  }
}

async function loadThemesFromCloud() {
  if (!currentUser) return showToast('Sign in first');
  try {
    const snap = await db.ref('users/' + currentUser.uid + '/themes').get();
    if (!snap.exists()) return showToast('No cloud backup found');
    const val = snap.val();
    if (val.folders) {
      themeFolders = val.folders;
      activeFolderName = val.active || Object.keys(themeFolders)[0];
      currentTheme = clone(themeFolders[activeFolderName] || BASE_THEME);
      localStorage.setItem('ps_v2_folders', JSON.stringify(themeFolders));
      localStorage.setItem('ps_v2_active', activeFolderName);
      applyTheme(currentTheme);
      renderFolders();
      buildColorUI();
      showToast('Themes restored from cloud');
    }
  } catch (e) {
    showToast('Cloud load failed');
  }
}

// --- 4. 5-MINUTE AUTO-DELETE FILE SHARE ---
let selectedShareFile = null;

document.getElementById('shareFileInput').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 4.5 * 1024 * 1024) {
    showToast('File too large (Max 4.5 MB)');
    selectedShareFile = null;
    return;
  }
  selectedShareFile = f;
  const sizeKB = (f.size / 1024).toFixed(0);
  document.getElementById('shareFileName').textContent = `${f.name} (${sizeKB} KB)`;
});

function startShareCountdown(code, expiresAt) {
  activeShareCode = code;
  localStorage.setItem('ps_pending_share', JSON.stringify({ code, expiresAt }));
  document.getElementById('shareCodeNum').textContent = code;
  document.getElementById('shareCodeBox').classList.add('show');

  clearInterval(countdownInterval);
  const tick = async () => {
    const left = expiresAt - Date.now();
    if (left <= 0) {
      clearInterval(countdownInterval);
      document.getElementById('shareCodeBox').classList.remove('show');
      localStorage.removeItem('ps_pending_share');
      try { await db.ref('shares/' + code).remove(); } catch {}
      activeShareCode = null;
      showToast('5 mins up — file auto-deleted');
      return;
    }
    const mins = Math.floor(left / 60000).toString().padStart(2, '0');
    const secs = Math.floor((left % 60000) / 1000).toString().padStart(2, '0');
    document.getElementById('shareTimerText').textContent = `${mins}:${secs}`;
  };
  tick();
  countdownInterval = setInterval(tick, 1000);
}

async function restorePendingShare() {
  const saved = JSON.parse(localStorage.getItem('ps_pending_share') || 'null');
  if (!saved) return;
  if (Date.now() >= saved.expiresAt) {
    localStorage.removeItem('ps_pending_share');
    try { await db.ref('shares/' + saved.code).remove(); } catch {}
    return;
  }
  const snap = await db.ref('shares/' + saved.code).get();
  if (snap.exists()) {
    startShareCountdown(saved.code, saved.expiresAt);
  } else {
    localStorage.removeItem('ps_pending_share');
  }
}

async function deleteActiveShareNow() {
  if (!activeShareCode) return;
  clearInterval(countdownInterval);
  try { await db.ref('shares/' + activeShareCode).remove(); } catch {}
  localStorage.removeItem('ps_pending_share');
  document.getElementById('shareCodeBox').classList.remove('show');
  activeShareCode = null;
  showToast('Deleted from Firebase');
}

function uploadShareFile() {
  if (!currentUser) return showToast('Sign in first');
  if (!selectedShareFile) return showToast('Select a file first');

  const btn = document.getElementById('btnSendShare');
  btn.style.opacity = '0.5';
  showToast('Uploading to cloud...');

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      await cleanupExpiredShares();
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const now = Date.now();
      const expiresAt = now + EXPIRY_MS;

      await db.ref('shares/' + code).set({
        name: selectedShareFile.name,
        type: selectedShareFile.type || 'application/octet-stream',
        data: ev.target.result,
        createdAt: now,
        expiresAt: expiresAt
      });

      startShareCountdown(code, expiresAt);
      showToast(`Code ready (5 min timer): ${code}`);
    } catch (err) {
      showToast('Upload failed');
    } finally {
      btn.style.opacity = '1';
    }
  };
  reader.readAsDataURL(selectedShareFile);
}

function copyShareCode() {
  const code = document.getElementById('shareCodeNum').textContent;
  navigator.clipboard.writeText(code).then(() => showToast('Code copied'));
}

async function receiveShareFile() {
  if (!currentUser) return showToast('Sign in first');
  const code = document.getElementById('receiveCodeInput').value.trim();
  if (code.length !== 6) return showToast('Enter 6-digit code');

  showToast('Checking cloud...');
  try {
    const ref = db.ref('shares/' + code);
    const snap = await ref.get();
    if (!snap.exists()) return showToast('Invalid or expired code');

    const fileObj = snap.val();
    const exp = fileObj.expiresAt || ((fileObj.createdAt || 0) + EXPIRY_MS);

    if (Date.now() >= exp) {
      await ref.remove();
      return showToast('Code expired & deleted');
    }

    const link = document.createElement('a');
    link.href = fileObj.data;
    link.download = fileObj.name || ('shared_' + code);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await ref.remove();
    document.getElementById('receiveCodeInput').value = '';
    showToast('Downloaded & deleted from cloud');
  } catch (err) {
    showToast('Download failed');
  }
}
