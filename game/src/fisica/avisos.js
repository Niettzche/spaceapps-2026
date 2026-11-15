// Avisos de obstáculo: la primera vez que el robot se acerca a cada tipo de obstáculo del nivel sale un cartel corto
// («⚠ Eyecta», «⚠ Lava aa: frena»…) arriba al centro, debajo del HUD. Uno por tipo y por partida; se van solos.
// puntosDeAviso y tiposCercanos son puras (pruebas en fisica.test.mjs); Avisos dibuja con la fuente pixel (scenes/comun/fuente.js,
// textoPixel), que se le pasa al crearla para que este módulo no cargue la fuente (PNG) en las pruebas de Node.
import { tr } from '../i18n.js';

export const DISTANCIA_AVISO_M = 9; // el cartel sale cuando el obstáculo está a ≤ 9 m delante del robot (P)
const DURA_MS = 2600;

const TEXTOS = {
  roca: ['⚠ Rocas: pásalas despacio', '⚠ Rocks: cross them slowly'],
  roca_mision: ['⚠ Campo de rocas: el robot frena solo', '⚠ Rock field: the robot slows itself'],
  toba: ['⚠ Bloques de toba', '⚠ Tuff blocks'],
  arena_blanda: ['⚠ Arena blanda', '⚠ Soft sand'],
  crater: ['⚠ Cráter pequeño', '⚠ Small crater'],
  eyecta: ['⚠ Eyecta: bloques del cráter', '⚠ Ejecta: crater blocks'],
  lava_aa: ['⚠ Lava aa: frena', '⚠ Aa lava: slow down'],
  bomba: ['⚠ Bombas volcánicas', '⚠ Volcanic bombs'],
  toba_parche: ['⚠ Lapilli suelto', '⚠ Loose lapilli'],
  talud: ['⚠ Talud suelto', '⚠ Loose talus'],
  nieve: ['⚠ Nieve: las ruedas se hunden', '⚠ Snow: wheels sink'],
  hielo: ['⚠ Hielo: patina', '⚠ Ice: slippery'],
  sal: ['⚠ Costra de sal: patina', '⚠ Salt crust: slippery'],
  lodo: ['⚠ Lodo blando', '⚠ Soft mud'],
  desprendimiento: ['⚠ ¡Piedras rodando!', '⚠ Rolling stones!'],
  remolino: ['⚠ Remolino de polvo: tapa el sol', '⚠ Dust devil: it shades the panel'],
};

/** Texto del aviso de un tipo (o null si no tiene). */
export const textoAviso = (clave) => (TEXTOS[clave] ? tr(...TEXTOS[clave]) : null);

/**
 * Puntos de aviso del nivel: [{ clave, desde_m }] con la primera aparición de cada tipo (obstáculos + elementos destacados).
 * Las rizaduras y el matorral son solo dibujo: no avisan.
 */
export function puntosDeAviso(obstaculos = [], elementos = [], { modo = 'prueba' } = {}) {
  const lista = [];
  for (const o of obstaculos) {
    if (o.visual) continue;
    const clave = o.tipo === 'roca' ? (o.clase === 'toba' ? 'toba' : modo === 'mision' ? 'roca_mision' : 'roca') : o.tipo;
    const desde = o.desde_m ?? (o.tipo === 'crater' ? o.x_m - o.diametro_m / 2 : o.x_m - (o.radio_m ?? 0));
    lista.push({ clave, desde_m: desde });
  }
  for (const e of elementos) {
    const clave = e.tipo === 'parche' && e.clase === 'toba' ? 'toba_parche' : e.clase;
    lista.push({ clave, desde_m: e.desde_m ?? e.x_m - (e.radio_m ?? 0) });
  }
  const primeros = new Map();
  for (const p of lista) if (TEXTOS[p.clave] && (!primeros.has(p.clave) || p.desde_m < primeros.get(p.clave))) primeros.set(p.clave, p.desde_m);
  return [...primeros].map(([clave, desde_m]) => ({ clave, desde_m })).sort((a, b) => a.desde_m - b.desde_m);
}

/** Claves que tocan avisar con el frente del robot en x_m (y que no se han mostrado). Pura. */
export function tiposCercanos(puntos, x_m, vistos, distancia = DISTANCIA_AVISO_M) {
  return puntos.filter((p) => !vistos.has(p.clave) && p.desde_m - x_m <= distancia && p.desde_m - x_m > -3).map((p) => p.clave);
}

export class Avisos {
  constructor(scene, puntos, { textoPixel, y = 150, profundidad = 92 } = {}) {
    this.scene = scene;
    this.textoPixel = textoPixel;
    this.puntos = puntos;
    this.vistos = new Set();
    this.cola = [];
    this.y = y;
    this.profundidad = profundidad;
    this.actual = null;
  }

  /** Avisa a mano (p. ej. eventos dinámicos: piedras que ruedan). */
  forzar(clave) {
    if (this.vistos.has(clave) || !TEXTOS[clave]) return;
    this.vistos.add(clave);
    this.cola.push(clave);
  }

  actualizar(xFrente_m) {
    for (const c of tiposCercanos(this.puntos, xFrente_m, this.vistos)) { this.vistos.add(c); this.cola.push(c); }
    if (!this.actual && this.cola.length) this._mostrar(this.cola.shift());
  }

  _mostrar(clave) {
    const sc = this.scene;
    // La fuente pixel no trae «⚠»: el triángulo se dibuja (pixel art, 1 px de arte = 3 px) a la izquierda del texto.
    const t = this.textoPixel(sc, 480 + 15, this.y, textoAviso(clave).replace(/^⚠\s*/, ''), { size: 16, color: '#ffd166', origen: [0.5, 0], borde: true })
      .setScrollFactor(0).setDepth(this.profundidad + 0.1);
    const ancho = t.width + 54;
    const caja = sc.add.rectangle(480, this.y - 6, ancho, Math.max(30, t.height + 12), 0x0b0d17, 0.88).setOrigin(0.5, 0)
      .setStrokeStyle(2, 0xffd166, 0.9).setScrollFactor(0).setDepth(this.profundidad);
    const g = sc.add.graphics().setScrollFactor(0).setDepth(this.profundidad + 0.1);
    const x0 = Math.round(480 - ancho / 2 + 10);
    const y0 = Math.round(this.y - 6 + (Math.max(30, t.height + 12) - 18) / 2);
    g.fillStyle(0xffd166, 1);
    for (let k = 0; k < 6; k++) g.fillRect(x0 + 15 - (k * 2 + 1) * 1.5, y0 + k * 3, (k * 2 + 1) * 3, 3); // triángulo de 6 filas
    g.fillStyle(0x0b0d17, 1).fillRect(x0 + 15 - 1.5, y0 + 6, 3, 6).fillRect(x0 + 15 - 1.5, y0 + 15, 3, 3); // «!»
    this.actual = [caja, t, g];
    sc.time.delayedCall(DURA_MS, () => {
      for (const o of this.actual ?? []) o.destroy();
      this.actual = null;
    });
  }

  destruir() {
    for (const o of this.actual ?? []) o.destroy();
    this.actual = null;
  }
}
