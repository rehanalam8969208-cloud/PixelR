// --- SHARED UI & MODULAR THEME ENGINE ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const emptyState = document.getElementById('emptyState');
const metaPill = document.getElementById('metaPill');
const loader = document.getElementById('loader');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const wallpaperLayer = document.getElementById('wallpaperLayer');
const stageCard = document.getElementById('stageCard');
let toastTimer = null;
let imgLoaded = false;

function showToast(msg) {
  toastText.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function setLoading(state) {
  loader.classList.toggle('active', state);
}

function switchTab(tab, idx) {
  document.querySelectorAll('.panel-card').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.dock-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('btn-tab-' + tab).classList.add('active');
  document.getElementById('dockIndicator').style.transform = `translateX(${idx * 100}%)`;
  stageCard.style.display = tab === 'share' ? 'none' : 'block';
}

function showCanvas(w, h) {
  emptyState.style.display = 'none';
  canvas.style.display = 'block';
  metaPill.style.display = 'block';
  metaPill.textContent = `${w} × ${h} px`;
  imgLoaded = true;
}

function loadImageFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    showCanvas(img.width, img.height);
    showToast('Image loaded');
  };
  img.src = URL.createObjectURL(file);
}

document.getElementById('fileInput').addEventListener('change', loadImageFile);
document.getElementById('fileInputNum').addEventListener('change', loadImageFile);

function saveImage() {
  if (!imgLoaded) return showToast('No image to export');
  const link = document.createElement('a');
  link.download = `pixel_studio_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('PNG exported');
}

// --- THEME FOLDERS ---
const BASE_THEME = {
  colors: {
    bgBase: "#06070a",
    cardColor: "#ffffff",
    borderColor: "#ffffff",
    textPrimary: "#ffffff",
    textSecondary: "#a1a1aa"
  },
  buttons: {
    btnBg: "transparent",
    btnBorder: "#ffffff38",
    btnText: "#ffffff",
    btnActiveBg: "#ffffff",
    btnActiveText: "#06070a"
  },
  glass: {
    cardAlpha: 0.08,
    glassBlur: 24,
    borderAlpha: 0.16,
    bgDim: 0.45,
    radius: 26
  },
  dock: {
    dockBg: "#0e0f14b8",
    dockPillBg: "#ffffff",
    dockPillText: "#06070a",
    toastBg: "#0c0e12e0",
    toastDot: "#ffffff"
  }
};

const clone = (o) => JSON.parse(JSON.stringify(o));

const DEFAULT_FOLDERS = {
  "Pure Glass": clone(BASE_THEME),
  "Crystal Clear": (() => {
    const t = clone(BASE_THEME);
    t.glass = { cardAlpha: 0.03, glassBlur: 12, borderAlpha: 0.24, bgDim: 0.25, radius: 28 };
    return t;
  })(),
  "Obsidian Matte": (() => {
    const t = clone(BASE_THEME);
    t.colors.bgBase = "#000000";
    t.glass = { cardAlpha: 0.16, glassBlur: 36, borderAlpha: 0.12, bgDim: 0.72, radius: 20 };
    return t;
  })(),
  "Frosted Ice": (() => {
    const t = clone(BASE_THEME);
    t.colors.bgBase = "#0c0f14";
    t.glass = { cardAlpha: 0.22, glassBlur: 32, borderAlpha: 0.28, bgDim: 0.35, radius: 30 };
    return t;
  })()
};

let themeFolders = JSON.parse(localStorage.getItem('ps_v2_folders') || 'null') || clone(DEFAULT_FOLDERS);
let activeFolderName = localStorage.getItem('ps_v2_active') || "Pure Glass";
let currentTheme = clone(themeFolders[activeFolderName] || BASE_THEME);
let activeConfigFile = 'colors';

const COLOR_FIELDS = {
  app: [
    { sec: 'colors', key: 'bgBase', label: 'Base Background' },
    { sec: 'colors', key: 'cardColor', label: 'Glass Card Tint' },
    { sec: 'colors', key: 'borderColor', label: 'Card Border' },
    { sec: 'colors', key: 'textPrimary', label: 'Primary Text' },
    { sec: 'colors', key: 'textSecondary', label: 'Secondary Text' }
  ],
  btn: [
    { sec: 'buttons', key: 'btnText', label: 'Button Text' },
    { sec: 'buttons', key: 'btnBorder', label: 'Button Border' },
    { sec: 'buttons', key: 'btnActiveBg', label: 'Click / Active Fill' },
    { sec: 'buttons', key: 'btnActiveText', label: 'Click / Active Text' }
  ],
  dock: [
    { sec: 'dock', key: 'dockPillBg', label: 'Dock Active Pill' },
    { sec: 'dock', key: 'dockPillText', label: 'Dock Active Text' },
    { sec: 'dock', key: 'toastDot', label: 'Toast Indicator Dot' }
  ]
};

function toHex6(val) {
  if (!val || val === 'transparent') return '#000000';
  return val.slice(0, 7);
}

function buildColorUI() {
  const renderList = (elId, items) => {
    const el = document.getElementById(elId);
    el.innerHTML = '';
    items.forEach(item => {
      const val = currentTheme[item.sec][item.key];
      const row = document.createElement('div');
      row.className = 'color-row';
      row.innerHTML = `
        <span>${item.label}</span>
        <div class="color-picker-wrap">
          <span class="hex-tag" id="hex-${item.key}">${val}</span>
          <input type="color" value="${toHex6(val)}" oninput="updateColor('${item.sec}','${item.key}', this.value)">
        </div>`;
      el.appendChild(row);
    });
  };
  renderList('colorListApp', COLOR_FIELDS.app);
  renderList('colorListBtn', COLOR_FIELDS.btn);
  renderList('colorListDock', COLOR_FIELDS.dock);
}

function updateColor(sec, key, val) {
  currentTheme[sec][key] = val;
  const tag = document.getElementById('hex-' + key);
  if (tag) tag.textContent = val;
  applyTheme(currentTheme);
}

function renderFolders() {
  const grid = document.getElementById('folderGrid');
  grid.innerHTML = '';
  Object.keys(themeFolders).forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'folder-chip' + (name === activeFolderName ? ' selected' : '');
    btn.innerHTML = `<span>${name}</span><svg viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    btn.onclick = () => {
      activeFolderName = name;
      currentTheme = clone(themeFolders[name]);
      localStorage.setItem('ps_v2_active', name);
      applyTheme(currentTheme);
      renderFolders();
      buildColorUI();
      showToast(`Folder: ${name}`);
    };
    grid.appendChild(btn);
  });
}

function applyTheme(t) {
  const r = document.documentElement.style;
  r.setProperty('--bg-base', t.colors.bgBase);
  r.setProperty('--card-color', t.colors.cardColor);
  r.setProperty('--border-color', t.colors.borderColor);
  r.setProperty('--text-primary', t.colors.textPrimary);
  r.setProperty('--text-secondary', t.colors.textSecondary);

  r.setProperty('--btn-bg', t.buttons.btnBg);
  r.setProperty('--btn-border', t.buttons.btnBorder);
  r.setProperty('--btn-text', t.buttons.btnText);
  r.setProperty('--btn-active-bg', t.buttons.btnActiveBg);
  r.setProperty('--btn-active-text', t.buttons.btnActiveText);

  r.setProperty('--card-alpha', t.glass.cardAlpha);
  r.setProperty('--glass-blur', t.glass.glassBlur + 'px');
  r.setProperty('--border-alpha', t.glass.borderAlpha);
  r.setProperty('--bg-dim', t.glass.bgDim);
  r.setProperty('--radius', t.glass.radius + 'px');

  r.setProperty('--dock-bg', t.dock.dockBg);
  r.setProperty('--dock-pill-bg', t.dock.dockPillBg);
  r.setProperty('--dock-pill-text', t.dock.dockPillText);
  r.setProperty('--toast-bg', t.dock.toastBg);
  r.setProperty('--toast-dot', t.dock.toastDot);

  document.getElementById('slAlpha').value = Math.round(t.glass.cardAlpha * 100);
  document.getElementById('valAlpha').textContent = Math.round(t.glass.cardAlpha * 100) + '%';
  document.getElementById('slBlur').value = t.glass.glassBlur;
  document.getElementById('valBlur').textContent = t.glass.glassBlur + 'px';
  document.getElementById('slBorder').value = Math.round(t.glass.borderAlpha * 100);
  document.getElementById('valBorder').textContent = Math.round(t.glass.borderAlpha * 100) + '%';
  document.getElementById('slDim').value = Math.round(t.glass.bgDim * 100);
  document.getElementById('valDim').textContent = Math.round(t.glass.bgDim * 100) + '%';
  document.getElementById('slRadius').value = t.glass.radius;
  document.getElementById('valRadius').textContent = t.glass.radius + 'px';

  syncCodeEditor();
}

function onSliderChange() {
  currentTheme.glass.cardAlpha = Number(document.getElementById('slAlpha').value) / 100;
  currentTheme.glass.glassBlur = Number(document.getElementById('slBlur').value);
  currentTheme.glass.borderAlpha = Number(document.getElementById('slBorder').value) / 100;
  currentTheme.glass.bgDim = Number(document.getElementById('slDim').value) / 100;
  currentTheme.glass.radius = Number(document.getElementById('slRadius').value);
  applyTheme(currentTheme);
}

function openConfigFile(fileKey) {
  activeConfigFile = fileKey;
  document.querySelectorAll('.file-pill').forEach(p => p.classList.remove('active'));
  document.getElementById('fp-' + fileKey).classList.add('active');
  syncCodeEditor();
}

function syncCodeEditor() {
  const box = document.getElementById('codeEditor');
  const data = activeConfigFile === 'all' ? currentTheme : currentTheme[activeConfigFile];
  box.value = JSON.stringify(data, null, 2);
}

function applyFileCode() {
  try {
    const parsed = JSON.parse(document.getElementById('codeEditor').value);
    if (activeConfigFile === 'all') {
      currentTheme = { ...currentTheme, ...parsed };
    } else {
      currentTheme[activeConfigFile] = { ...currentTheme[activeConfigFile], ...parsed };
    }
    applyTheme(currentTheme);
    buildColorUI();
    showToast(`${activeConfigFile}.json applied`);
  } catch {
    showToast('Invalid JSON syntax');
  }
}

function saveCurrentFolder() {
  themeFolders[activeFolderName] = clone(currentTheme);
  localStorage.setItem('ps_v2_folders', JSON.stringify(themeFolders));
  renderFolders();
  showToast(`Saved to "${activeFolderName}"`);
}

function resetDefaults() {
  themeFolders = clone(DEFAULT_FOLDERS);
  activeFolderName = "Pure Glass";
  currentTheme = clone(BASE_THEME);
  localStorage.removeItem('ps_v2_folders');
  localStorage.removeItem('ps_v2_active');
  applyTheme(currentTheme);
  renderFolders();
  buildColorUI();
  showToast('Reset to defaults');
}

document.getElementById('bgPhotoInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const maxDim = 1080;
    let w = img.width, h = img.height;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const dataUrl = c.toDataURL('image/jpeg', 0.78);
    try { localStorage.setItem('ps_wallpaper', dataUrl); } catch {}
    wallpaperLayer.style.backgroundImage = `url(${dataUrl})`;
    showToast('Wallpaper updated');
  };
  img.src = URL.createObjectURL(file);
});

function clearWallpaper() {
  localStorage.removeItem('ps_wallpaper');
  wallpaperLayer.style.backgroundImage = '';
  showToast('Wallpaper cleared');
}

function openSettings() {
  buildColorUI();
  syncCodeEditor();
  document.getElementById('settingsOverlay').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('open');
}

function switchCat(cat) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cat-page').forEach(p => p.classList.remove('active'));
  document.getElementById('cbtn-' + cat).classList.add('active');
  document.getElementById('cat-' + cat).classList.add('active');
  if (cat === 'files') syncCodeEditor();
}

const savedBg = localStorage.getItem('ps_wallpaper');
if (savedBg) wallpaperLayer.style.backgroundImage = `url(${savedBg})`;
renderFolders();
buildColorUI();
applyTheme(currentTheme);
