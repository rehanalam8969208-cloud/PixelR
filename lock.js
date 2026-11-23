// --- PIXEL SCRAMBLE & RESTORE ENGINE ---
function toggleKey() {
  const inp = document.getElementById('keyInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function hashKey(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function process(mode) {
  if (!imgLoaded) return showToast('Import an image first');
  const key = document.getElementById('keyInput').value.trim();
  if (!key) return showToast('Enter a secret key first');

  setLoading(true);
  setTimeout(() => {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const n = canvas.width * canvas.height;
    const indices = new Uint32Array(n);
    for (let i = 0; i < n; i++) indices[i] = i;

    const rand = mulberry32(hashKey(key));
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }

    const out = new Uint8ClampedArray(data.length);
    if (mode === 'scramble') {
      for (let i = 0; i < n; i++) {
        const src = indices[i] * 4, dst = i * 4;
        out[dst] = data[src]; out[dst+1] = data[src+1];
        out[dst+2] = data[src+2]; out[dst+3] = 255;
      }
      showToast('Pixels encrypted');
    } else {
      for (let i = 0; i < n; i++) {
        const src = i * 4, dst = indices[i] * 4;
        out[dst] = data[src]; out[dst+1] = data[src+1];
        out[dst+2] = data[src+2]; out[dst+3] = 255;
      }
      showToast('Pixels restored');
    }

    imgData.data.set(out);
    ctx.putImageData(imgData, 0, 0);
    setLoading(false);
  }, 60);
}
