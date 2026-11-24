// --- 100% OFFLINE IMAGE <-> TEXT CODE (WITH 5-MIN AUTO-CLEAR) ---
const LUT = Array.from({ length: 256 }, (_, i) => i.toString().padStart(3, '0'));
const OFFLINE_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let offlineCodeTimer = null;

function getCodeBox() {
  return document.getElementById('offlineCodecBox');
}

function getCodeStatus() {
  return document.getElementById('offlineCodecStatus');
}

function startCodeAutoClear(expiresAt) {
  clearTimeout(offlineCodeTimer);
  const box = getCodeBox();
  const status = getCodeStatus();

  const tick = () => {
    const left = expiresAt - Date.now();
    if (left <= 0) {
      if (box) box.value = '';
      if (status) status.textContent = '5 min poore — code auto-clear ho gaya (0 DB save)';
      return;
    }
    const mins = Math.floor(left / 60000);
    const secs = Math.floor((left % 60000) / 1000);
    if (status) {
      status.textContent = `Offline Code ready • Auto-clear in ${mins}:${String(secs).padStart(2, '0')}`;
    }
    offlineCodeTimer = setTimeout(tick, 1000);
  };

  tick();
}

function bytesToBase64(bytes) {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64.trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

// Photo se text code banakar box mein dikhana (100% Offline, Firebase mein kuch nahi jayega)
function photoToNumbers() {
  if (!imgLoaded) return showToast('Pehle photo select karein');
  setLoading(true);

  const workCanvas = document.createElement('canvas');
  const maxDim = 640;
  let w = canvas.width;
  let h = canvas.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }
  workCanvas.width = w;
  workCanvas.height = h;
  workCanvas.getContext('2d').drawImage(canvas, 0, 0, w, h);

  workCanvas.toBlob(async (blob) => {
    try {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const codeText = 'PX1:' + bytesToBase64(bytes);

      const box = getCodeBox();
      if (box) box.value = codeText;

      startCodeAutoClear(Date.now() + OFFLINE_CODE_TTL_MS);
      setLoading(false);
      showToast('Code box mein aa gaya (100% Offline)');
    } catch (e) {
      setLoading(false);
      showToast('Code generate nahi ho paya');
    }
  }, 'image/jpeg', 0.65);
}

// Box mein paste kiye gaye code se photo wapas dikhana (100% Offline)
function decodeCodeFromBox() {
  const box = getCodeBox();
  const raw = (box ? box.value : '').trim();
  if (!raw) return showToast('Pehle box mein code paste karein');

  setLoading(true);
  try {
    const cleanB64 = raw.startsWith('PX1:') ? raw.slice(4) : raw;
    const bytes = base64ToBytes(cleanB64);
    const imgBlob = new Blob([bytes], { type: 'image/jpeg' });
    const url = URL.createObjectURL(imgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      showCanvas(img.width, img.height);
      URL.revokeObjectURL(url);
      setLoading(false);
      showToast('Photo decode ho gayi!');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setLoading(false);
      showToast('Invalid code');
    };
    img.src = url;
  } catch (e) {
    setLoading(false);
    showToast('Invalid code format');
  }
}

function copyOfflineCodeBox() {
  const box = getCodeBox();
  const val = (box ? box.value : '').trim();
  if (!val) return showToast('Pehle code banayein');
  navigator.clipboard.writeText(val)
    .then(() => showToast('Code copy ho gaya!'))
    .catch(() => {
      if (box) {
        box.select();
        document.execCommand('copy');
      }
      showToast('Code copy ho gaya!');
    });
}

function clearOfflineCodeBoxNow() {
  clearTimeout(offlineCodeTimer);
  const box = getCodeBox();
  const status = getCodeStatus();
  if (box) box.value = '';
  if (status) status.textContent = 'Box clear kar diya gaya • 100% Offline';
  showToast('Box clear ho gaya');
}

// .txt file decoder bhi offline kaam karega
const txtInputEl = document.getElementById('txtInput');
if (txtInputEl) {
  txtInputEl.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result.trim();
        if (text.startsWith('PX1:')) {
          const box = getCodeBox();
          if (box) box.value = text;
          decodeCodeFromBox();
          return;
        }
        if (text.length % 3 !== 0) throw new Error();

        const len = text.length / 3;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = parseInt(text.substr(i * 3, 3), 10);
        }

        const imgBlob = new Blob([bytes], { type: 'image/webp' });
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          showCanvas(img.width, img.height);
          setLoading(false);
          showToast('Image decoded');
        };
        img.onerror = () => {
          setLoading(false);
          showToast('Invalid number file');
        };
        img.src = URL.createObjectURL(imgBlob);
      } catch {
        setLoading(false);
        showToast('Invalid number file');
      }
    };
    reader.readAsText(file);
  });
}
