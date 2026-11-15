// Dueño: frente expediente. Minimapa del mundo en pixel art para «Descubrir»: proyección equirectangular simple, una celda
// de la máscara (mapa_tierra.js, Natural Earth 1:110m) = un cuadro de `celda` px. Un punto por sitio con lat/lon de
// data/sites: amarillo = tiene nivel (jugable), cian = solo catálogo, gris = oculto por el filtro; el elegido lleva marco blanco.
// Los puntos no son botones (en México se enciman): un toque en el mapa elige el sitio visible más cercano al toque.
import { MAPA_TIERRA } from './mapa_tierra.js';
import { decodificarMascara, proyectar } from './descubrir.js';

const OCEANO = 0x101a48;
const OCEANO_RETICULA = 0x26346e;
const TIERRA = 0x8a6a3a;
const TIERRA_OSCURA = 0x6b4f2a;
const COSTA = 0xc89a5a;
const NEGRO = 0x0b0d17;
const COLOR_PUNTO = { jugable: 0xffd166, catalogo: 0x80e0dc, oculto: 0x6c7393 };

let mascara = null;
const tierra = () => (mascara ??= decodificarMascara(MAPA_TIERRA));

/** Caja del mapa a partir de su esquina (x, y) y el tamaño de celda: { x, y, w, h }. */
export function cajaMapa(x, y, celda = 4) {
  return { x, y, w: MAPA_TIERRA.ancho * celda, h: MAPA_TIERRA.alto * celda, celda };
}

/** Posición de un sitio en la caja (o null si no tiene coordenadas). */
export function enMapa(s, caja) {
  return proyectar(s?.lat, s?.lon, caja, { lon: MAPA_TIERRA.lon, lat: MAPA_TIERRA.lat });
}

/**
 * Dibuja el mapa y los puntos. `sitios`: todos los del destino; `visibles`: Set de ids que pasan el filtro;
 * `jugable(s)`; `seleccion`: id elegido; `alElegir(s)`: toque en el mapa. Devuelve la lista de objetos creados.
 */
export function dibujarMapa(scene, caja, { sitios, visibles, jugable, seleccion, alElegir }) {
  const { x, y, w, h, celda } = caja;
  const g = scene.add.graphics();
  g.fillStyle(NEGRO, 1).fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle(OCEANO, 1).fillRect(x, y, w, h);
  // Retícula cada 30° (en cuadros alternos, como el mapa de Mauricio).
  const { lon: [l0, l1], lat: [a0, a1] } = MAPA_TIERRA;
  g.fillStyle(OCEANO_RETICULA, 1);
  for (let lon = Math.ceil(l0 / 30) * 30; lon <= l1; lon += 30) {
    const px = Math.round(x + ((lon - l0) / (l1 - l0)) * w);
    for (let py = y; py < y + h; py += 4) g.fillRect(px, py, 1, 2);
  }
  for (let lat = Math.ceil(a1 / 30) * 30; lat <= a0; lat += 30) {
    const py = Math.round(y + ((lat - a0) / (a1 - a0)) * h);
    for (let px = x; px < x + w; px += 4) g.fillRect(px, py, 2, 1);
  }
  const m = tierra();
  m.forEach((fila, r) => fila.forEach((t, c) => {
    if (!t) return;
    const costa = !m[r - 1]?.[c] || !m[r + 1]?.[c] || !fila[c - 1] || !fila[c + 1];
    // Tramado de 2 tonos en el interior (pixel art), color claro en la costa.
    g.fillStyle(costa ? COSTA : (r + c) % 3 === 0 ? TIERRA_OSCURA : TIERRA, 1).fillRect(x + c * celda, y + r * celda, celda, celda);
  }));
  const objs = [g];
  // Puntos: primero los ocultos (abajo), luego catálogo, luego jugables; el elegido al final.
  const pts = sitios.map((s) => ({ s, p: enMapa(s, caja) })).filter((o) => o.p);
  const capa = (o) => (o.s.id === seleccion ? 3 : !visibles.has(o.s.id) ? 0 : jugable(o.s) ? 2 : 1);
  pts.sort((a, b) => capa(a) - capa(b));
  const p = scene.add.graphics();
  for (const o of pts) {
    const k = capa(o);
    const px = Math.round(o.p.x);
    const py = Math.round(o.p.y);
    if (k === 0) { p.fillStyle(COLOR_PUNTO.oculto, 1).fillRect(px - 1, py - 1, 3, 3); continue; }
    const color = jugable(o.s) ? COLOR_PUNTO.jugable : COLOR_PUNTO.catalogo;
    const r = k === 3 ? 4 : 3;
    p.fillStyle(NEGRO, 1).fillRect(px - r - 1, py - r - 1, 2 * r + 3, 2 * r + 3);
    p.fillStyle(color, 1).fillRect(px - r, py - r, 2 * r + 1, 2 * r + 1);
    if (k === 3) {
      p.lineStyle(2, 0xffffff, 1).strokeRect(px - r - 4, py - r - 4, 2 * r + 9, 2 * r + 9);
    }
  }
  objs.push(p);
  // Zona táctil: todo el mapa. El toque elige el sitio visible más cercano (a ≤ 40 px).
  const zona = scene.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
  zona.on('pointerdown', (ptr) => {
    let mejor = null;
    for (const o of pts) {
      if (!visibles.has(o.s.id)) continue;
      const d = Math.hypot(o.p.x - ptr.x, o.p.y - ptr.y);
      if (d <= 40 && (!mejor || d < mejor.d)) mejor = { s: o.s, d };
    }
    if (mejor) alElegir(mejor.s);
  });
  objs.push(zona);
  return objs;
}
