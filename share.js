// --- FIREBASE AUTH, 5-MIN AUTO-DELETE SHARE & NO-CODE FUTURISTIC SECRET STUDIO ---
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

// --- 1. NO-CODE FUTURISTIC SECRET STUDIO ENGINE ---
const STUDIO_STATE_KEY = 'ps_nocode_studio_v2';

const STUDIO_THEMES = {
  "Neon Cyber": {
    colors: { bgBase: "#050816", cardColor: "#0ea5e9", borderColor: "#22d3ee", textPrimary: "#f0f9ff", textSecondary: "#7dd3fc" },
    buttons: { btnBg: "rgba(14,165,233,0.12)", btnBorder: "#22d3ee", btnText: "#67e8f9", btnActiveBg: "#22d3ee", btnActiveText: "#050816" },
    glass: { cardAlpha: 0.14, glassBlur: 26, borderAlpha: 0.35, bgDim: 0.45, radius: 24 },
    dock: { dockBg: "rgba(5,8,22,0.82)", dockPillBg: "#22d3ee", dockPillText: "#050816", toastBg: "rgba(8,15,35,0.92)", toastDot: "#22d3ee" }
  },
  "Aurora Glass": {
    colors: { bgBase: "#09071a", cardColor: "#a855f7", borderColor: "#34d399", textPrimary: "#faf5ff", textSecondary: "#c4b5fd" },
    buttons: { btnBg: "rgba(168,85,247,0.12)", btnBorder: "#c084fc", btnText: "#f3e8ff", btnActiveBg: "#34d399", btnActiveText: "#052e16" },
    glass: { cardAlpha: 0.16, glassBlur: 30, borderAlpha: 0.32, bgDim: 0.4, radius: 28 },
    dock: { dockBg: "rgba(12,9,28,0.8)", dockPillBg: "#c084fc", dockPillText: "#09071a", toastBg: "rgba(18,12,42,0.92)", toastDot: "#34d399" }
  },
  "Royal Gold": {
    colors: { bgBase: "#0c0904", cardColor: "#f59e0b", borderColor: "#fbbf24", textPrimary: "#fffbeb", textSecondary: "#fcd34d" },
    buttons: { btnBg: "rgba(245,158,11,0.1)", btnBorder: "#fbbf24", btnText: "#fde68a", btnActiveBg: "#fbbf24", btnActiveText: "#1c1202" },
    glass: { cardAlpha: 0.12, glassBlur: 24, borderAlpha: 0.3, bgDim: 0.48, radius: 22 },
    dock: { dockBg: "rgba(16,12,5,0.84)", dockPillBg: "#fbbf24", dockPillText: "#1c1202", toastBg: "rgba(22,16,6,0.94)", toastDot: "#fbbf24" }
  },
  "Rose Quartz": {
    colors: { bgBase: "#14060d", cardColor: "#f43f5e", borderColor: "#fb7185", textPrimary: "#fff1f2", textSecondary: "#fda4af" },
    buttons: { btnBg: "rgba(244,63,94,0.12)", btnBorder: "#fb7185", btnText: "#ffe4e6", btnActiveBg: "#fb7185", btnActiveText: "#1f050c" },
    glass: { cardAlpha: 0.14, glassBlur: 26, borderAlpha: 0.3, bgDim: 0.45, radius: 28 },
    dock: { dockBg: "rgba(22,7,14,0.82)", dockPillBg: "#fb7185", dockPillText: "#1f050c", toastBg: "rgba(28,8,18,0.92)", toastDot: "#fb7185" }
  },
  "Emerald Matrix": {
    colors: { bgBase: "#030d08", cardColor: "#10b981", borderColor: "#34d399", textPrimary: "#ecfdf5", textSecondary: "#6ee7b7" },
    buttons: { btnBg: "rgba(16,185,129,0.12)", btnBorder: "#34d399", btnText: "#a7f3d0", btnActiveBg: "#34d399", btnActiveText: "#022c22" },
    glass: { cardAlpha: 0.13, glassBlur: 22, borderAlpha: 0.32, bgDim: 0.5, radius: 18 },
    dock: { dockBg: "rgba(4,16,10,0.85)", dockPillBg: "#34d399", dockPillText: "#022c22", toastBg: "rgba(5,20,13,0.94)", toastDot: "#34d399" }
  },
  "Arctic Frost": {
    colors: { bgBase: "#07131f", cardColor: "#38bdf8", borderColor: "#bae6fd", textPrimary: "#f0f9ff", textSecondary: "#7dd3fc" },
    buttons: { btnBg: "rgba(186,230,253,0.12)", btnBorder: "#7dd3fc", btnText: "#e0f2fe", btnActiveBg: "#e0f2fe", btnActiveText: "#07131f" },
    glass: { cardAlpha: 0.18, glassBlur: 34, borderAlpha: 0.34, bgDim: 0.35, radius: 30 },
    dock: { dockBg: "rgba(8,20,33,0.78)", dockPillBg: "#7dd3fc", dockPillText: "#07131f", toastBg: "rgba(9,24,40,0.92)", toastDot: "#7dd3fc" }
  },
  "Sunset Ember": {
    colors: { bgBase: "#140704", cardColor: "#f97316", borderColor: "#fb923c", textPrimary: "#fff7ed", textSecondary: "#fdba74" },
    buttons: { btnBg: "rgba(249,115,22,0.12)", btnBorder: "#fb923c", btnText: "#ffedd5", btnActiveBg: "#fb923c", btnActiveText: "#1c0802" },
    glass: { cardAlpha: 0.14, glassBlur: 24, borderAlpha: 0.3, bgDim: 0.45, radius: 24 },
    dock: { dockBg: "rgba(22,9,5,0.82)", dockPillBg: "#fb923c", dockPillText: "#1c0802", toastBg: "rgba(28,11,6,0.92)", toastDot: "#fb923c" }
  },
  "Cosmic Violet": {
    colors: { bgBase: "#0b0518", cardColor: "#8b5cf6", borderColor: "#a78bfa", textPrimary: "#f5f3ff", textSecondary: "#c4b5fd" },
    buttons: { btnBg: "rgba(139,92,246,0.14)", btnBorder: "#a78bfa", btnText: "#ede9fe", btnActiveBg: "#a78bfa", btnActiveText: "#0b0518" },
    glass: { cardAlpha: 0.15, glassBlur: 28, borderAlpha: 0.28, bgDim: 0.44, radius: 26 },
    dock: { dockBg: "rgba(14,7,28,0.82)", dockPillBg: "#a78bfa", dockPillText: "#0b0518", toastBg: "rgba(18,9,36,0.92)", toastDot: "#a78bfa" }
  },
  "AMOLED Stealth": {
    colors: { bgBase: "#000000", cardColor: "#ffffff", borderColor: "#52525b", textPrimary: "#ffffff", textSecondary: "#a1a1aa" },
    buttons: { btnBg: "transparent", btnBorder: "#3f3f46", btnText: "#e4e4e7", btnActiveBg: "#ffffff", btnActiveText: "#000000" },
    glass: { cardAlpha: 0.06, glassBlur: 20, borderAlpha: 0.2, bgDim: 0.65, radius: 20 },
    dock: { dockBg: "rgba(0,0,0,0.9)", dockPillBg: "#ffffff", dockPillText: "#000000", toastBg: "rgba(10,10,10,0.95)", toastDot: "#ffffff" }
  },
  "Pure Glass": clone(BASE_THEME)
};

// Readymade ON/OFF options — zero typing needed!
const READYMADE_OPTIONS_CATALOG = [
  { key: 'btn_clear_key', label: 'Clear Secret Key Button', sub: 'Lock Tab mein key clear karne ka button' },
  { key: 'btn_clear_canvas', label: 'Reset / Clear Photo Button', sub: 'Lock Tab mein loaded photo hatane ka button' },
  { key: 'btn_quick_chat', label: 'Quick Chat Shortcut Button', sub: 'Lock Tab mein seedha Chat kholne ka button' },
  { key: 'btn_quick_settings', label: 'Quick Settings Button', sub: 'Lock Tab mein Settings kholne ka button' },
  { key: 'btn_scroll_top', label: 'Scroll To Top Button', sub: 'Main screen par upar scroll karne ka button' },
  { key: 'btn_copy_codec', label: 'Quick Copy Codec Button', sub: 'Codec Tab mein extra copy shortcut' },
  { key: 'hud_badge', label: 'Future HUD Corner Badge', sub: 'Screen ke top-right par FUTURE HUD badge' },
  { key: 'cyber_grid', label: 'Cyber Grid Background Overlay', sub: 'Background par futuristic grid lines' },
  { key: 'pulse_glow', label: 'Live Neon Pulse Border', sub: 'Cards par halka breathing glow effect' },
  { key: 'live_clock_pill', label: 'Live Digital Clock Pill', sub: 'Top-left mein live time badge' },
  { key: 'compact_cards', label: 'Ultra Compact Card Spacing', sub: 'Cards ke beech kam gap (compact look)' },
  { key: 'hide_meta_pill', label: 'Hide Image Size Pill (0x0)', sub: 'Preview photo ke neeche size tag chhupayein' }
];

let studioState = JSON.parse(localStorage.getItem(STUDIO_STATE_KEY) || 'null') || {
  activeTheme: "Pure Glass",
  glowPx: 18,
  fontScale: 100,
  glassOverride: {
    cardAlpha: 0.08,
    glassBlur: 24,
    borderAlpha: 0.16,
    bgDim: 0.45,
    radius: 26
  },
  toggles: {
    btn_clear_key: false,
    btn_clear_canvas: false,
    btn_quick_chat: false,
    btn_quick_settings: false,
    btn_scroll_top: false,
    btn_copy_codec: false,
    hud_badge: false,
    cyber_grid: false,
    pulse_glow: false,
    live_clock_pill: false,
    compact_cards: false,
    hide_meta_pill: false
  },
  bgPhotoUrl: "",
  broadcastBg: true,
  watermarkText: "",
  highlightColor: "#facc15",
  highlightTextColor: "#06070a",
  highlightPhrase: "",
  highlightEnabled: false
};

if (!studioState.toggles) studioState.toggles = {};
if (!studioState.glassOverride) {
  studioState.glassOverride = { cardAlpha: 0.08, glassBlur: 24, borderAlpha: 0.16, bgDim: 0.45, radius: 26 };
}

const studioStyleEl = document.createElement('style');
studioStyleEl.id = 'studioDynamicStyle';
document.head.appendChild(studioStyleEl);

const studioWatermarkEl = document.createElement('div');
studioWatermarkEl.id = 'studioBgWatermark';
studioWatermarkEl.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;display:none;align-items:center;justify-content:center;font-size:30px;font-weight:800;letter-spacing:3px;color:rgba(255,255,255,0.14);text-transform:uppercase;user-select:none;text-align:center;padding:16px;';
document.body.appendChild(studioWatermarkEl);

const studioHudBadgeEl = document.createElement('div');
studioHudBadgeEl.id = 'studioHudBadge';
studioHudBadgeEl.style.cssText = 'position:fixed;top:64px;right:16px;z-index:90;display:none;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:1px;background:rgba(0,0,0,0.65);border:1px solid var(--btn-border);color:var(--btn-text);pointer-events:none;';
studioHudBadgeEl.textContent = 'FUTURE HUD';
document.body.appendChild(studioHudBadgeEl);

const studioClockEl = document.createElement('div');
studioClockEl.id = 'studioClockPill';
studioClockEl.style.cssText = 'position:fixed;top:64px;left:16px;z-index:90;display:none;padding:4px 10px;border-radius:999px;font-size:10.5px;font-weight:700;background:rgba(0,0,0,0.65);border:1px solid var(--btn-border);color:var(--btn-text);pointer-events:none;';
document.body.appendChild(studioClockEl);

setInterval(() => {
  if (studioClockEl.style.display !== 'none') {
    const now = new Date();
    studioClockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}, 1000);

const studioCyberGridEl = document.createElement('div');
studioCyberGridEl.id = 'studioCyberGrid';
studioCyberGridEl.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;display:none;background-image:linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:28px 28px;';
document.body.appendChild(studioCyberGridEl);

let renderedReadymadeEls = [];
let originalHighlightedNodes = [];

function saveStudioLocal() {
  localStorage.setItem(STUDIO_STATE_KEY, JSON.stringify(studioState));
}

function renderStudioThemeButtons() {
  const grid = document.getElementById('studioThemesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.keys(STUDIO_THEMES).forEach((name) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'folder-chip' + (studioState.activeTheme === name ? ' selected' : '');
    chip.innerHTML = `<span>${name}</span><span>✦</span>`;
    chip.onclick = () => {
      studioState.activeTheme = name;
      currentTheme = clone(STUDIO_THEMES[name]);
      // Keep user's live glass & geometry sliders synced
      currentTheme.glass = { ...currentTheme.glass, ...studioState.glassOverride };
      applyTheme(currentTheme);
      saveStudioLocal();
      renderStudioThemeButtons();
      syncStudioInputsFromState();
      applyStudioVisuals();
      showToast(`Theme: ${name}`);
    };
    grid.appendChild(chip);
  });
}

function renderReadymadeOptionToggles() {
  const host = document.getElementById('readymadeOptionsToggles');
  if (!host) return;
  host.innerHTML = '';

  READYMADE_OPTIONS_CATALOG.forEach((item) => {
    const isOn = Boolean(studioState.toggles[item.key]);
    const row = document.createElement('label');
    row.className = 'color-row';
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <div style="padding-right:10px;">
        <div style="font-size:13px; font-weight:600;">${item.label}</div>
        <div style="font-size:10.5px; color:var(--text-secondary);">${item.sub}</div>
      </div>
      <input type="checkbox" ${isOn ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--btn-active-bg);">
    `;
    const chk = row.querySelector('input');
    chk.onchange = () => {
      studioState.toggles[item.key] = chk.checked;
      saveStudioLocal();
      applyReadymadeOptionsToUI();
      applyStudioVisuals();
      showToast(`${item.label}: ${chk.checked ? 'ON' : 'OFF'}`);
    };
    host.appendChild(row);
  });
}

function applyReadymadeOptionsToUI() {
  renderedReadymadeEls.forEach((el) => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  renderedReadymadeEls = [];

  const t = studioState.toggles || {};
  const lockTab = document.getElementById('tab-lock') || document.body;
  const codecTab = document.getElementById('tab-number') || document.body;

  const makeBtn = (parent, text, onClickFn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn mb-10';
    b.style.marginTop = '8px';
    b.innerHTML = `<span>${text}</span>`;
    b.onclick = onClickFn;
    parent.appendChild(b);
    renderedReadymadeEls.push(b);
  };

  if (t.btn_clear_key) {
    makeBtn(lockTab, 'Clear Secret Key', () => {
      const k = document.getElementById('keyInput');
      if (k) k.value = '';
      showToast('Secret key cleared');
    });
  }

  if (t.btn_clear_canvas) {
    makeBtn(lockTab, 'Reset / Clear Loaded Photo', () => {
      if (typeof canvas !== 'undefined' && typeof ctx !== 'undefined') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
        if (typeof emptyState !== 'undefined') emptyState.style.display = 'flex';
        if (typeof metaPill !== 'undefined') metaPill.style.display = 'none';
        if (typeof imgLoaded !== 'undefined') imgLoaded = false;
      }
      showToast('Photo cleared');
    });
  }

  if (t.btn_quick_chat) {
    makeBtn(lockTab, 'Open Live Chat', () => {
      if (typeof window.openLiveChatModal === 'function') window.openLiveChatModal();
    });
  }

  if (t.btn_quick_settings) {
    makeBtn(lockTab, 'Open Theme Settings', () => {
      if (typeof openSettings === 'function') openSettings();
    });
  }

  if (t.btn_copy_codec) {
    makeBtn(codecTab, 'Quick Copy Offline Code', () => {
      if (typeof copyOfflineCodeBox === 'function') copyOfflineCodeBox();
    });
  }

  if (t.btn_scroll_top) {
    makeBtn(document.body, '↑ Scroll To Top', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function onStudioGlassChange() {
  const alpha = Number(document.getElementById('slStudioAlpha').value) / 100;
  const blur = Number(document.getElementById('slStudioBlur').value);
  const border = Number(document.getElementById('slStudioBorder').value) / 100;
  const dim = Number(document.getElementById('slStudioDim').value) / 100;
  const radius = Number(document.getElementById('slStudioRadius').value);

  studioState.glassOverride = {
    cardAlpha: alpha,
    glassBlur: blur,
    borderAlpha: border,
    bgDim: dim,
    radius: radius
  };

  currentTheme.glass = { ...studioState.glassOverride };
  applyTheme(currentTheme);
  syncStudioInputsFromState();
  saveStudioLocal();
}

function clearTextHighlighter() {
  studioState.highlightEnabled = false;
  studioState.highlightPhrase = '';
  const inp = document.getElementById('studioHighlightPhrase');
  if (inp) inp.value = '';
  saveStudioLocal();
  applyStudioVisuals();
  showToast('Highlighter clear ho gaya');
}

function toggleTextHighlighter() {
  studioState.highlightEnabled = !studioState.highlightEnabled;
  saveStudioLocal();
  applyStudioVisuals();
  showToast(studioState.highlightEnabled ? 'Highlighter ON' : 'Highlighter OFF');
}

function applyTextHighlightInDOM(phrase, bgColor, textColor, enabled) {
  originalHighlightedNodes.forEach(({ span, parent }) => {
    if (span && parent && span.parentNode === parent) {
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize();
    }
  });
  originalHighlightedNodes = [];

  if (!enabled || !phrase || phrase.trim().length < 2) return;
  const targetWord = phrase.trim().toLowerCase();
  const skipIds = new Set(['secretOverlay', 'customPassModal', 'liveChatOverlay', 'pixel3DGuideOverlay']);

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'MARK'].includes(p.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      for (const id of skipIds) {
        if (p.closest('#' + id)) return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue.toLowerCase().includes(targetWord)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    }
  });

  const matches = [];
  while (walker.nextNode()) matches.push(walker.currentNode);

  matches.forEach((textNode) => {
    const raw = textNode.nodeValue;
    const idx = raw.toLowerCase().indexOf(targetWord);
    if (idx === -1 || !textNode.parentNode) return;

    const before = raw.slice(0, idx);
    const matched = raw.slice(idx, idx + targetWord.length);
    const after = raw.slice(idx + targetWord.length);

    const mark = document.createElement('mark');
    mark.textContent = matched;
    mark.style.cssText = `background:${bgColor};color:${textColor};padding:1px 5px;border-radius:6px;font-weight:700;`;

    const parent = textNode.parentNode;
    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    frag.appendChild(mark);
    if (after) frag.appendChild(document.createTextNode(after));

    parent.replaceChild(frag, textNode);
    originalHighlightedNodes.push({ span: mark, parent });
  });
}

function applyStudioVisuals() {
  const glowEl = document.getElementById('slStudioGlow');
  const fontEl = document.getElementById('slStudioFont');
  const wmEl = document.getElementById('studioBgWatermarkText');
  const bcEl = document.getElementById('studioBroadcastBgToggle');
  const hcEl = document.getElementById('studioHighlightColor');
  const htcEl = document.getElementById('studioHighlightTextColor');
  const hpEl = document.getElementById('studioHighlightPhrase');

  if (glowEl) studioState.glowPx = Number(glowEl.value);
  if (fontEl) studioState.fontScale = Number(fontEl.value);
  if (wmEl) studioState.watermarkText = wmEl.value;
  if (bcEl) studioState.broadcastBg = Boolean(bcEl.checked);
  if (hcEl) studioState.highlightColor = hcEl.value;
  if (htcEl) studioState.highlightTextColor = htcEl.value;
  if (hpEl) studioState.highlightPhrase = hpEl.value;

  const gVal = document.getElementById('valStudioGlow');
  const fVal = document.getElementById('valStudioFont');
  if (gVal) gVal.textContent = studioState.glowPx + 'px';
  if (fVal) fVal.textContent = studioState.fontScale + '%';

  const t = studioState.toggles || {};
  const extraCss = `
    body { font-size: ${studioState.fontScale}% !important; }
    .panel-card, .stage-card, .btn {
      box-shadow: 0 0 ${studioState.glowPx}px color-mix(in srgb, var(--btn-border) 45%, transparent) !important;
    }
    ${t.pulse_glow ? `@keyframes psPulseGlow { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.12); } } .panel-card, .stage-card { animation: psPulseGlow 3.2s infinite ease-in-out; }` : ''}
    ${t.compact_cards ? `.stage-card { margin-bottom: 8px !important; padding: 8px !important; } .panel-card { padding: 12px !important; }` : ''}
    ${t.hide_meta_pill ? `#metaPill { display: none !important; }` : ''}
  `;
  studioStyleEl.textContent = extraCss;

  if (studioState.bgPhotoUrl) {
    wallpaperLayer.style.backgroundImage = `url(${studioState.bgPhotoUrl})`;
  }

  if (studioState.watermarkText && studioState.watermarkText.trim()) {
    studioWatermarkEl.textContent = studioState.watermarkText.trim();
    studioWatermarkEl.style.display = 'flex';
  } else {
    studioWatermarkEl.style.display = 'none';
  }

  studioHudBadgeEl.style.display = t.hud_badge ? 'block' : 'none';
  studioCyberGridEl.style.display = t.cyber_grid ? 'block' : 'none';
  studioClockEl.style.display = t.live_clock_pill ? 'block' : 'none';
  if (t.live_clock_pill) {
    studioClockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  applyTextHighlightInDOM(
    studioState.highlightPhrase,
    studioState.highlightColor,
    studioState.highlightTextColor,
    studioState.highlightEnabled
  );
  saveStudioLocal();
}

function handleStudioBgPhoto(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    const maxDim = 900;
    let w = img.width;
    let h = img.height;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    studioState.bgPhotoUrl = c.toDataURL('image/jpeg', 0.72);
    wallpaperLayer.style.backgroundImage = `url(${studioState.bgPhotoUrl})`;
    saveStudioLocal();
    showToast('Background photo set! Sabke liye bhejne ke liye Push dabayein');
  };
  img.src = URL.createObjectURL(file);
}

function clearStudioBgPhoto() {
  studioState.bgPhotoUrl = '';
  wallpaperLayer.style.backgroundImage = '';
  saveStudioLocal();
  showToast('Background photo hata diya gaya');
}

function resetStudioExtras() {
  studioState = {
    activeTheme: "Pure Glass",
    glowPx: 18,
    fontScale: 100,
    glassOverride: { cardAlpha: 0.08, glassBlur: 24, borderAlpha: 0.16, bgDim: 0.45, radius: 26 },
    toggles: {},
    bgPhotoUrl: "",
    broadcastBg: true,
    watermarkText: "",
    highlightColor: "#facc15",
    highlightTextColor: "#06070a",
    highlightPhrase: "",
    highlightEnabled: false
  };
  currentTheme = clone(BASE_THEME);
  applyTheme(currentTheme);
  wallpaperLayer.style.backgroundImage = '';
  saveStudioLocal();
  syncStudioInputsFromState();
  renderStudioThemeButtons();
  renderReadymadeOptionToggles();
  applyReadymadeOptionsToUI();
  applyStudioVisuals();
  showToast('Saare extras reset ho gaye');
}

function syncStudioInputsFromState() {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const setChk = (id, chk) => { const el = document.getElementById(id); if (el) el.checked = Boolean(chk); };

  const g = studioState.glassOverride || currentTheme.glass;
  setVal('slStudioAlpha', Math.round((g.cardAlpha ?? 0.08) * 100));
  setTxt('valStudioAlpha', Math.round((g.cardAlpha ?? 0.08) * 100) + '%');
  setVal('slStudioBlur', g.glassBlur ?? 24);
  setTxt('valStudioBlur', (g.glassBlur ?? 24) + 'px');
  setVal('slStudioBorder', Math.round((g.borderAlpha ?? 0.16) * 100));
  setTxt('valStudioBorder', Math.round((g.borderAlpha ?? 0.16) * 100) + '%');
  setVal('slStudioDim', Math.round((g.bgDim ?? 0.45) * 100));
  setTxt('valStudioDim', Math.round((g.bgDim ?? 0.45) * 100) + '%');
  setVal('slStudioRadius', g.radius ?? 26);
  setTxt('valStudioRadius', (g.radius ?? 26) + 'px');

  setVal('slStudioGlow', studioState.glowPx);
  setVal('slStudioFont', studioState.fontScale);
  setVal('studioBgWatermarkText', studioState.watermarkText || '');
  setChk('studioBroadcastBgToggle', studioState.broadcastBg);
  setVal('studioHighlightColor', studioState.highlightColor || '#facc15');
  setVal('studioHighlightTextColor', studioState.highlightTextColor || '#06070a');
  setVal('studioHighlightPhrase', studioState.highlightPhrase || '');
}

async function saveAndPublishStudio(closeAfter) {
  applyReadymadeOptionsToUI();
  applyStudioVisuals();
  if (currentUser) {
    try {
      await db.ref('live_update').set({
        studioState: {
          activeTheme: studioState.activeTheme,
          glowPx: studioState.glowPx,
          fontScale: studioState.fontScale,
          glassOverride: studioState.glassOverride,
          toggles: studioState.toggles,
          bgPhotoUrl: studioState.broadcastBg ? studioState.bgPhotoUrl : '',
          broadcastBg: studioState.broadcastBg,
          watermarkText: studioState.watermarkText,
          highlightColor: studioState.highlightColor,
          highlightTextColor: studioState.highlightTextColor,
          highlightPhrase: studioState.highlightPhrase,
          highlightEnabled: studioState.highlightEnabled
        },
        updatedAt: Date.now()
      });
      showToast('Sab users ke liye har jagah publish ho gaya!');
    } catch (e) {
      showToast('Local mein save ho gaya (Cloud rule check karein)');
    }
  } else {
    showToast('Local mein apply ho gaya! (Sign in karke push karein)');
  }
  if (closeAfter) closeSecret();
}

db.ref('live_update').on('value', (snap) => {
  if (!snap.exists()) return;
  const val = snap.val();
  if (val && val.studioState) {
    const remote = val.studioState;
    studioState = {
      ...studioState,
      ...remote,
      glassOverride: remote.glassOverride || studioState.glassOverride,
      toggles: { ...studioState.toggles, ...(remote.toggles || {}) },
      bgPhotoUrl: remote.broadcastBg === false ? studioState.bgPhotoUrl : (remote.bgPhotoUrl || '')
    };
    if (studioState.activeTheme && STUDIO_THEMES[studioState.activeTheme]) {
      currentTheme = clone(STUDIO_THEMES[studioState.activeTheme]);
    }
    if (studioState.glassOverride) {
      currentTheme.glass = { ...currentTheme.glass, ...studioState.glassOverride };
    }
    applyTheme(currentTheme);
    saveStudioLocal();
    syncStudioInputsFromState();
    renderStudioThemeButtons();
    renderReadymadeOptionToggles();
    applyReadymadeOptionsToUI();
    applyStudioVisuals();
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

// Custom Dark Password Popup
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
    currentUser ? `Signed in: ${currentUser.email}` : 'Local Mode (Sign in to push to all users)';
  syncStudioInputsFromState();
  renderStudioThemeButtons();
  renderReadymadeOptionToggles();
  document.getElementById("secretOverlay").classList.add("open");
}

function closeSecret() {
  secretUnlocked = false;
  document.getElementById("secretOverlay").classList.remove("open");
}

function switchSecretTab(tab) {
  ['themes', 'options', 'bg', 'pass'].forEach((t) => {
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

// Initial boot
syncStudioInputsFromState();
renderStudioThemeButtons();
renderReadymadeOptionToggles();
applyReadymadeOptionsToUI();
applyStudioVisuals();
