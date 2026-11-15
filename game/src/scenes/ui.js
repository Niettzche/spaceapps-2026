// Utilidades mínimas de interfaz compartidas (provisionales; el frente de arte las reemplaza).
export function titulo(scene, texto, sub) {
  scene.add.text(480, 58, texto, { fontFamily: 'monospace', fontSize: '38px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
  if (sub) scene.add.text(480, 100, sub, { fontFamily: 'monospace', fontSize: '16px', color: '#9aa4c7' }).setOrigin(0.5);
}
export function boton(scene, x, y, texto, alPulsar) {
  const b = scene.add.text(x, y, `[ ${texto} ]`, { fontFamily: 'monospace', fontSize: '18px', color: '#ffd166' })
    .setOrigin(0.5).setInteractive({ useHandCursor: true });
  b.on('pointerdown', alPulsar);
  return b;
}
export function nota(scene, texto) {
  scene.add.text(480, 510, texto, { fontFamily: 'monospace', fontSize: '12px', color: '#6c7393', align: 'center', wordWrap: { width: 900 } }).setOrigin(0.5);
}

// Una sola transición a la vez; Phaser limpia el fundido al reiniciar la cámara.
export function irA(escena, destino, datos) {
  const camera = escena.cameras.main;
  if (camera.fadeEffect.isRunning) return;
  camera.once('camerafadeoutcomplete', () => escena.scene.start(destino, datos));
  camera.fadeOut(180, 0, 0, 0);
}
