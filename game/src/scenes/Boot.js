import Phaser from 'phaser';

// Dueño: frente expediente. Pantalla de carga con progreso REAL (eventos del loader).
export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const barra = this.add.rectangle(180, 270, 0, 16, 0xffd166).setOrigin(0, 0.5);
    const texto = this.add.text(480, 240, 'Cargando 0%', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5);
    this.load.on('progress', (p) => { barra.width = 600 * p; texto.setText(`Cargando ${Math.round(p * 100)}%`); });
    // TODO(frente arte/expediente): this.load.image(...) / this.load.spritesheet(...) con los assets reales
  }

  create() { this.scene.start('Menu'); }
}
