const $ = (id) => document.getElementById(id);

const form = $('qr-form');
const urlInput = $('url-input');
const formatSelect = $('format-select');
const sizeSelect = $('size-select');
const statusEl = $('status');
const qrImg = $('qr-img');
const downloadLink = $('download-link');
const generateBtn = $('generate-btn');

let currentObjectUrl = null;

function setStatus(message, { kind = 'neutral' } = {}) {
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.classList.toggle('error', kind === 'error');
  statusEl.classList.toggle('success', kind === 'success');
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.textContent = isLoading ? 'Generando...' : 'Generar QR';
}

function cleanPreviousImage() {
  qrImg.removeAttribute('src');
  qrImg.removeAttribute('srcset');
  qrImg.style.display = 'none';
  qrImg.alt = '';
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  downloadLink.style.display = 'none';
  downloadLink.href = '#';
  downloadLink.textContent = 'Guardar imagen';
}

function normalizeUrlForQr(maybeUrl) {
  const raw = typeof maybeUrl === 'string' ? maybeUrl.trim() : '';
  if (!raw) return null;

  // Si el usuario no pone esquema (https://), lo asumimos como https://.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw);
  const candidate = hasScheme ? raw : `https://${raw}`;

  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

function clampQrWidth(sizePx) {
  const n = Number(sizePx);
  const safe = Number.isFinite(n) ? n : 256;
  return Math.min(Math.max(safe, 100), 2048);
}

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl).split(',');
  const header = parts[0] || '';
  const base64 = parts[1] || '';

  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function guessDownloadName(format) {
  const ext = format === 'svg' ? 'svg' : 'png';
  return `qr-${Date.now()}.${ext}`;
}

async function generateQrObjectUrl({ url, format, size }) {
  const qrPayload = normalizeUrlForQr(url);
  if (!qrPayload) throw new Error('URL inválida.');

  const width = clampQrWidth(size);

  if (format === 'svg') {
    const svg = await QRCode.toString(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width,
      type: 'svg',
    });

    const blob = new Blob([svg], { type: 'image/svg+xml; charset=utf-8' });
    return URL.createObjectURL(blob);
  }

  // PNG
  const dataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width,
    type: 'image/png',
  });

  const blob = dataUrlToBlob(dataUrl);
  return URL.createObjectURL(blob);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  cleanPreviousImage();

  const url = urlInput.value.trim();
  const format = formatSelect.value;
  const size = Number(sizeSelect.value);

  if (!url) {
    setStatus('Ingresa una URL válida.', { kind: 'error' });
    return;
  }

  setLoading(true);
  try {
    setStatus('Generando QR...', { kind: 'neutral' });
    currentObjectUrl = await generateQrObjectUrl({ url, format, size });

    qrImg.src = currentObjectUrl;
    qrImg.alt = 'QR generado';
    qrImg.style.display = 'block';

    downloadLink.href = currentObjectUrl;
    downloadLink.download = guessDownloadName(format);
    downloadLink.style.display = 'inline-flex';

    setStatus('✓ QR generado correctamente.', { kind: 'success' });
  } catch (err) {
    cleanPreviousImage();
    const details = String(err?.message || err);
    setStatus(`No se pudo generar el QR. ${details ? `(${details})` : ''}`, { kind: 'error' });
  } finally {
    setLoading(false);
  }
});

// Estado inicial: mantenemos el mensaje de la vista como "success".
if (statusEl) setStatus(statusEl.textContent.trim(), { kind: 'success' });

