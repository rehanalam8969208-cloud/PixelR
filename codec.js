// --- IMAGE <-> NUMBER (.TXT) CODEC ---
const LUT = Array.from({ length: 256 }, (_, i) => i.toString().padStart(3, '0'));

function photoToNumbers() {
  if (!imgLoaded) return showToast('Select an image first');
  setLoading(true);

  canvas.toBlob(async (blob) => {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const out = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = LUT[bytes[i]];

    const txtBlob = new Blob([out.join('')], { type: 'text/plain' });
    const sizeMB = (txtBlob.size / (1024 * 1024)).toFixed(2);
    const link = document.createElement('a');
    link.download = `pixel_codec_${Date.now()}.txt`;
    link.href = URL.createObjectURL(txtBlob);
    link.click();
    setLoading(false);
    showToast(`Encoded (${sizeMB} MB)`);
  }, 'image/webp', 0.8);
}

document.getElementById('txtInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setLoading(true);

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const text = ev.target.result.trim();
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
