import Phaser from 'phaser';
import { titulo, boton, nota } from './ui.js';

// Dueño: frente expediente. Menú: nueva partida, continuar, explorador, ¿de dónde salen los números?
export default class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    titulo(this, 'Menu', 'Plantilla — frente expediente');
    boton(this, 480, 380, 'Nueva partida', () => this.scene.start('Expediente'));
    boton(this, 480, 430, 'Explorador libre', () => this.scene.start('Explorador'));
    nota(this, 'Menú: nueva partida, continuar, explorador, ¿de dónde salen los números?');
  }
}
