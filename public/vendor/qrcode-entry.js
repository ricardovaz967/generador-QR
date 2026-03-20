// Entry para generar un bundle de la librería `qrcode` para usarla en navegador.
// La librería `qrcode` (npm) exporta un objeto con `toString`/`toDataURL`, etc.
// En el bundle lo exponemos globalmente como `window.QRCode` para que `app.js` funcione sin cambios.
const QRCode = require('qrcode');

// eslint-disable-next-line no-undef
window.QRCode = QRCode;

