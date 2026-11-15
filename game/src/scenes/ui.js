// Utilidades mínimas de interfaz compartidas, con la fuente pixel (comun/fuente.js; respaldo monospace).
import { textoPixel } from './comun/fuente.js';

export function titulo(scene, texto, sub) {
  textoPixel(scene, 480, 58, texto, { size: 38, titulo: true, origen: [0.5, 0.5] });
  if (sub) textoPixel(scene, 480, 100, sub, { size: 16, color: '#a3abcc', origen: [0.5, 0.5] });
}
export function boton(scene, x, y, texto, alPulsar) {
  const b = textoPixel(scene, x, y, `[ ${texto} ]`, { size: 18, color: '#ffd166', origen: [0.5, 0.5] }).setInteractive({ useHandCursor: true });
  b.on('pointerdown', alPulsar);
  return b;
}
export function nota(scene, texto) {
  textoPixel(scene, 480, 514, texto, { size: 14, color: '#a3abcc', alinear: 'center', ancho: 900, origen: [0.5, 0.5] });
}

// Una sola transición a la vez; Phaser limpia el fundido al reiniciar la cámara.
export function irA(escena, destino, datos) {
  const camera = escena.cameras.main;
  if (camera.fadeEffect.isRunning) return;
  camera.once('camerafadeoutcomplete', () => escena.scene.start(destino, datos));
  camera.fadeOut(180, 0, 0, 0);
}
