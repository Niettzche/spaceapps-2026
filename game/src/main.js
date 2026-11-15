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
import { DESTINOS } from './data.js';
import { musica, pistaDeEscena } from './fisica/musica.js';

// Estado compartido de la partida (persistencia en el navegador la implementa el frente correspondiente).
const estadoInicial = () => ({ destino: 'jezero', presupuesto: PRESUPUESTO_INICIAL, tickets: TICKETS_POR_PARTIDA, diseno: [], sitio: null, resultados: [] });
export const partida = estadoInicial();
export function reiniciarPartida() {
  // Mantener la identidad del objeto importado y eliminar también telemetría de la partida anterior.
  for (const key of Object.keys(partida)) delete partida[key];
  Object.assign(partida, estadoInicial());
  return partida;
}

// Texto nítido: Phaser dibuja cada texto a resolución 1 (si no se indica) y luego el lienzo se agranda para llenar la
// pantalla (Scale.FIT), así que las letras se ven borrosas. Se dibujan al doble (o según la densidad de la pantalla).
const RESOLUCION_TEXTO = Math.min(3, Math.max(2, Math.ceil(globalThis.devicePixelRatio || 1)));
const setStyleOriginal = Phaser.GameObjects.TextStyle.prototype.setStyle;
Phaser.GameObjects.TextStyle.prototype.setStyle = function (style, updateText, setDefaults) {
  const r = setStyleOriginal.call(this, style, updateText, setDefaults);
  if (!this.resolution) this.resolution = RESOLUCION_TEXTO;
  return r;
};

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b0d17',
  pixelArt: true,
  // Matter usa paso fijo: limitar también los updates en monitores de 120/144 Hz.
  fps: { target: 60, limit: 60 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
  physics: { default: 'matter', matter: { runner: { isFixed: true }, gravity: { y: 1 }, debug: false } },
  scene: [Boot, Menu, Expediente, Explorador, Taller, Prueba, Mision, Resultados],
});

// Música (fisica/musica.js, docs/juego/MUSICA.md): cada escena pide su pista al crearse. Prueba = Tierra, Misión = Marte o
// Luna según el destino, Expediente/Explorador/Taller = menú; Resultados no cambia nada (la canción del nivel sigue).
// El Menú pide la suya en Menu.mostrar (no en la pantalla de inicio, donde suena la voz del título).
juego.events.once('ready', () => {
  for (const escena of juego.scene.scenes) {
    escena.sys.events.on('create', () => {
      const mundo = DESTINOS[partida.destino]?.mundo;
      const pista = pistaDeEscena(escena.scene.key, mundo);
      if (pista) musica(pista);
    });
  }
});
