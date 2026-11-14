import Phaser from 'phaser';
import { titulo, boton, nota } from './ui.js';
import { GRAVEDAD, ESCALA_GRAVEDAD } from '../config/world.js';
import { partida } from '../main.js';

// Dueño: frente juego. Prueba terrestre: perfil de elevación real del sitio + obstáculos de recreación.
export default class Prueba extends Phaser.Scene {
  constructor() { super('Prueba'); }

  create() {
    titulo(this, 'Prueba terrestre', partida.sitio ? partida.sitio.nombre : 'Sitio sin elegir');
    // Gravedad TERRESTRE en las pruebas (el análogo no simula la gravedad del destino).
    this.matter.world.setGravity(0, GRAVEDAD.tierra * ESCALA_GRAVEDAD);
    this.matter.world.setBounds(0, 0, 960, 540);
    // TODO: reemplazar este suelo plano por el perfil_elevacion_m real del sitio (data/sites/*.json → nivel).
    this.matter.add.rectangle(480, 470, 960, 40, { isStatic: true });
    // TODO(frente taller/juego): construir el robot a partir de partida.diseno (piezas de parts.json).
    this.matter.add.rectangle(200, 300, 80, 30, { friction: 0.4 });
    boton(this, 860, 60, 'Lanzar misión', () => this.scene.start('Mision'));
    nota(this, 'Plantilla: suelo y robot provisionales. Obstáculos agregados para jugar = recreación.');
  }
}
