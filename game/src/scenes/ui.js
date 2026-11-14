// Utilidades mínimas de interfaz compartidas (provisionales; el frente de arte las reemplaza).
export function titulo(scene, texto, sub) {
  scene.add.text(480, 60, texto, { fontFamily: 'monospace', fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
  if (sub) scene.add.text(480, 100, sub, { fontFamily: 'monospace', fontSize: '14px', color: '#9aa4c7' }).setOrigin(0.5);
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
