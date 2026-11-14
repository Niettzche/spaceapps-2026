import Phaser from 'phaser';
import { titulo, boton, nota } from './ui.js';
import { PIEZAS } from '../data.js';
import { partida } from '../main.js';

// Dueño: frente taller. Armado con ranuras fijas, presupuesto visible, validación del diseño.
export default class Taller extends Phaser.Scene {
  constructor() { super('Taller'); }

  create() {
    titulo(this, 'Taller', 'Plantilla — frente taller');
    this.add.text(480, 140, `Presupuesto: ${partida.presupuesto} créditos · Piezas en catálogo: ${PIEZAS.length}`,
      { fontFamily: 'monospace', fontSize: '14px', color: '#cfd6ff' }).setOrigin(0.5);
    boton(this, 480, 440, 'Continuar', () => this.scene.start('Prueba'));
    nota(this, 'Armado con ranuras fijas, presupuesto visible, validación del diseño.');
  }
}
