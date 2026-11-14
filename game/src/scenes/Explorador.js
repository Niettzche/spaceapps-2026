import Phaser from 'phaser';
import { titulo, boton, nota } from './ui.js';

// Dueño: frente expediente. Consulta de coordenadas → POST /score → proponer sitio (POST /submit).
export default class Explorador extends Phaser.Scene {
  constructor() { super('Explorador'); }

  create() {
    titulo(this, 'Explorador', 'Plantilla — frente expediente');
    boton(this, 480, 440, 'Continuar', () => this.scene.start('Menu'));
    nota(this, 'Consulta de coordenadas → POST /score → proponer sitio (POST /submit).');
  }
}
