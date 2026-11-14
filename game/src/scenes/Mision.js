import Phaser from 'phaser';
import { titulo, boton, nota } from './ui.js';
import { ESCALA_GRAVEDAD } from '../config/world.js';
import { DESTINOS } from '../data.js';
import { partida } from '../main.js';

// Dueño: frente juego. Misión en el destino con gravedad real; entregar el suministro al astronauta.
export default class Mision extends Phaser.Scene {
  constructor() { super('Mision'); }

  create() {
    const destino = DESTINOS[partida.destino];
    titulo(this, 'Misión', `${destino.nombre} · gravedad ${destino.gravedad_ms2} m/s²`);
    this.matter.world.setGravity(0, destino.gravedad_ms2 * ESCALA_GRAVEDAD);
    this.matter.world.setBounds(0, 0, 960, 540);
    this.matter.add.rectangle(480, 470, 960, 40, { isStatic: true });
    this.matter.add.rectangle(200, 300, 80, 30, { friction: 0.4 });
    // TODO: terreno del destino (MOLA/LOLA), zona de entrega, condición de victoria (integridad ≥ UMBRAL_INTEGRIDAD, detenido 2 s).
    boton(this, 860, 60, 'Ver resultados', () => this.scene.start('Resultados'));
    nota(this, 'Plantilla: la gravedad del destino se aplica solo aquí.');
  }
}
