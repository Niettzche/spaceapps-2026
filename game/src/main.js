import Phaser from 'phaser';
import { PRESUPUESTO_INICIAL, TICKETS_POR_PARTIDA } from './config/world.js';
import Boot from './scenes/Boot.js';
import Menu from './scenes/Menu.js';
import Expediente from './scenes/Expediente.js';
import Explorador from './scenes/Explorador.js';
import Taller from './scenes/Taller.js';
import Prueba from './scenes/Prueba.js';
import Mision from './scenes/Mision.js';
import Resultados from './scenes/Resultados.js';

// Estado compartido de la partida (persistencia en el navegador la implementa el frente correspondiente).
const estadoInicial = () => ({ destino: 'jezero', presupuesto: PRESUPUESTO_INICIAL, tickets: TICKETS_POR_PARTIDA, diseno: [], sitio: null, resultados: [] });
export const partida = estadoInicial();
export function reiniciarPartida() {
  // Mantener la identidad del objeto importado y eliminar también telemetría de la partida anterior.
  for (const key of Object.keys(partida)) delete partida[key];
  Object.assign(partida, estadoInicial());
  return partida;
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b0d17',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
  physics: { default: 'matter', matter: { runner: { isFixed: true }, gravity: { y: 1 }, debug: false } },
  scene: [Boot, Menu, Expediente, Explorador, Taller, Prueba, Mision, Resultados],
});
