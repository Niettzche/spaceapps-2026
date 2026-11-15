// Surcos de las ruedas: la marca que deja cada rueda en el suelo blando (arena, regolito). Solo visual, sin física.
// La profundidad dibujada sale del hundimiento de Bekker que ya calcula la física 2 (robot.js, w.z): una rueda angosta
// que se hunde 8 cm deja un surco más hondo que una ancha que se hunde 5 cm. Con física 1 (sin hundimiento) se dibuja
// una huella mínima en la arena. La exageración visual (EXAGERA) es valor de juego (P): 1 cm real no se vería en pantalla.
import { PX_POR_M, ZOOM_ARTE } from './escala.js';
import { COLOR_SUPERFICIE } from './terreno.js';

const PX = ZOOM_ARTE; // 1 px de arte
const PASO_M = 0.3; // separación entre marcas (m)
const EXAGERA = 2; // px de pantalla por cm de hundimiento (P)
const MAX_MARCAS = 1400; // tope: al pasarlo se redibuja solo lo reciente
const BLANDOS = new Set(['arena']); // en roca y suelo compacto la rueda no deja surco visible a esta escala

const oscurecer = (c, f) => {
  const r = ((c >> 16) & 255) * f, g = ((c >> 8) & 255) * f, b = (c & 255) * f;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
};

export class Huellas {
  /** @param {object} o mundo, robot, ySuelo(xMundo) → y de pantalla de la superficie */
  constructor(scene, { mundo, robot, ySuelo }) {
    this.robot = robot;
    this.ySuelo = ySuelo;
    const base = COLOR_SUPERFICIE[mundo]?.arena ?? 0xd9b26f;
    this.cSurco = oscurecer(base, 0.62);
    this.cFondo = oscurecer(base, 0.45);
    this.cBorde = oscurecer(base, 0.82);
    this.g = scene.add.graphics().setDepth(2); // sobre el terreno, detrás de obstáculos (3) y del robot (10)
    this.marcas = [];
    this.ultimaX = robot.ruedas.map(() => -Infinity);
  }

  actualizar() {
    this.robot.ruedas.forEach((w, i) => {
      const enSuelo = this.robot.t - (w.ultimoContacto ?? -1) < 0.1; // robot.js limpia `tocando` al final de su paso
      if (!enSuelo || !BLANDOS.has(w.superficie)) return;
      const x = w.cuerpo.position.x;
      if (Math.abs(x - this.ultimaX[i]) < PASO_M * PX_POR_M) return;
      this.ultimaX[i] = x;
      const zCm = (w.z ?? 0) * 100;
      const alto = Math.max(2 * PX, Math.round((zCm * EXAGERA) / PX) * PX); // múltiplo de 1 px de arte
      const marca = { x: Math.round(x / PX) * PX, y: this.ySuelo(x), alto, ancho: Math.max(2 * PX, Math.round(PASO_M * PX_POR_M / PX) * PX) };
      this.marcas.push(marca);
      if (this.marcas.length > MAX_MARCAS) {
        this.marcas = this.marcas.slice(-Math.floor(MAX_MARCAS * 0.75));
        this.g.clear();
        this.marcas.forEach((m) => this._dibujar(m));
      } else this._dibujar(marca);
    });
  }

  _dibujar({ x, y, alto, ancho }) {
    const y0 = Math.round(y / PX) * PX;
    this.g.fillStyle(this.cBorde, 1).fillRect(x - ancho / 2, y0 - PX, ancho, PX); // bordo de arena empujada
    this.g.fillStyle(this.cSurco, 1).fillRect(x - ancho / 2, y0, ancho, alto);
    if (alto > 2 * PX) this.g.fillStyle(this.cFondo, 1).fillRect(x - ancho / 2, y0 + alto - PX, ancho, PX); // fondo en sombra
  }

  destruir() { this.g?.destroy(); }
}
