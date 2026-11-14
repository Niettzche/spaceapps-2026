import Phaser from 'phaser';
import Boot from './scenes/Boot.js';
import Menu from './scenes/Menu.js';
import Expediente from './scenes/Expediente.js';
import Explorador from './scenes/Explorador.js';
import Taller from './scenes/Taller.js';
import Prueba from './scenes/Prueba.js';
import Mision from './scenes/Mision.js';
import Resultados from './scenes/Resultados.js';

// Estado compartido de la partida (persistencia en el navegador la implementa el frente correspondiente).
export const partida = { destino: 'jezero', presupuesto: 1000, tickets: 3, diseno: [], sitio: null, resultados: [] };

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b0d17',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
  physics: { default: 'matter', matter: { gravity: { y: 1 }, debug: false } },
  scene: [Boot, Menu, Expediente, Explorador, Taller, Prueba, Mision, Resultados],
});
