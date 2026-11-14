import Phaser from 'phaser';
import { titulo, boton, nota } from './ui.js';
import { SITIOS } from '../data.js';
import { partida } from '../main.js';

// Dueño: frente expediente. Comparación 1 a 1: sitio terrestre (izq.) vs destino (der.), misma variable y unidad.
export default class Expediente extends Phaser.Scene {
  constructor() { super('Expediente'); }

  create() {
    titulo(this, 'Expediente', 'Plantilla — frente expediente');
    // Datos disponibles: SITIOS y DESTINOS (ver ../data.js)
    SITIOS.forEach((s, i) => {
      boton(this, 480, 170 + i * 40, `${s.nombre} (${s.estado})`, () => { partida.sitio = s; });
    });
    boton(this, 480, 440, 'Continuar', () => this.scene.start('Taller'));
    nota(this, 'Comparación 1 a 1: sitio terrestre (izq.) vs destino (der.), misma variable y unidad.');
  }
}
