import Phaser from 'phaser';
import { titulo, boton, nota } from './ui.js';

// Dueño: frente juego. Puntuación visible + recomendaciones (reglas; LLM opcional) + reintentar.
export default class Resultados extends Phaser.Scene {
  constructor() { super('Resultados'); }

  create() {
    titulo(this, 'Resultados', 'Plantilla — frente juego');
    boton(this, 480, 440, 'Continuar', () => this.scene.start('Menu'));
    nota(this, 'Puntuación visible + recomendaciones (reglas; LLM opcional) + reintentar.');
  }
}
