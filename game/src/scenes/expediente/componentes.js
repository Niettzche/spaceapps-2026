// Dueño: frente expediente. Piezas visuales del Expediente (chips, barras de similitud, íconos de tickets).
// Paleta local de docs/juego/DISENO.md §2.5 (no se toca interfaz.js: ahí otro frente cambia COLOR en paralelo).
import { FUENTE } from './interfaz.js';

export const P = {
  texto: '#ffffff',
  sec: '#a3abcc', // texto secundario (≥ 6.4:1 en todos los fondos)
  accion: '#ffd166', // amarillo: lo que puedes tocar
  bien: '#06d6a0', // verde
  riesgo: '#ff7a93', // rojo: riesgo / límite
  dato: '#80e0dc', // cian: dato medido
  panel: 0x141831,
  borde: 0x2a3160,
  fila: 0x1f2550,
  filaSel: 0x2b3470,
  barraFondo: 0x2a3160,
};

/** Color hexadecimal '#rrggbb' → número para rectángulos. */
export const num = (c) => parseInt(String(c).replace('#', ''), 16);

/** Color de una similitud (siempre acompañado del número escrito: nunca solo color). */
export function colorSimilitud(x) {
  if (typeof x !== 'number') return P.sec;
  return x >= 0.6 ? P.bien : x >= 0.3 ? P.accion : P.riesgo;
}

/** Texto con la fuente del juego. */
export function txt(scene, x, y, contenido, { size = 16, color = P.texto, origen = [0, 0], ancho, estilo = 'normal', interlineado = 0 } = {}) {
  const t = scene.add.text(x, y, contenido, {
    fontFamily: FUENTE, fontSize: `${size}px`, color, fontStyle: estilo, lineSpacing: interlineado,
    wordWrap: ancho ? { width: ancho, useAdvancedWrap: true } : undefined,
  });
  return t.setOrigin(origen[0], origen[1]);
}

/**
 * Chip: etiqueta corta dentro de una caja con borde. Devuelve { objs, ancho, alto }.
 * `relleno`: color de fondo (número) o null.
 */
export function chip(scene, x, y, etiqueta, { color = P.sec, relleno = null, size = 14, pad = 7 } = {}) {
  const t = txt(scene, x + pad, y + 3, etiqueta, { size, color });
  const ancho = Math.ceil(t.width) + pad * 2;
  const alto = Math.ceil(t.height) + 6;
  const caja = scene.add.rectangle(x, y, ancho, alto, relleno ?? 0x000000, relleno == null ? 0 : 1)
    .setOrigin(0, 0).setStrokeStyle(1, num(color), 0.9);
  return { objs: [caja, t], ancho, alto };
}

/**
 * Fila de chips de izquierda a derecha, sin pasar de `xMax`. Los que no caben no se dibujan
 * (su información debe estar también en el detalle). Devuelve { objs, alto, omitidos }.
 */
export function filaChips(scene, x, y, chips, xMax, { gap = 8, saltar = false, gapY = 6 } = {}) {
  const objs = [];
  let cx = x;
  let cy = y;
  let alto = 0;
  const omitidos = [];
  for (const c of chips) {
    const ch = chip(scene, cx, cy, c.texto, c);
    if (cx + ch.ancho > xMax && cx > x) {
      if (saltar) {
        cx = x; cy += alto + gapY;
        ch.objs[0].setPosition(cx, cy); ch.objs[1].setPosition(cx + (c.pad ?? 7), cy + 3);
      } else {
        ch.objs.forEach((o) => o.destroy());
        omitidos.push(c);
        continue;
      }
    }
    objs.push(...ch.objs);
    alto = Math.max(alto, ch.alto);
    cx += ch.ancho + gap;
  }
  return { objs, alto: cy - y + alto, omitidos };
}

/** Barra 0–100 % (fondo + relleno). `frac` null → solo el fondo. */
export function barra(scene, x, y, w, h, frac, color) {
  const fondo = scene.add.rectangle(x, y, w, h, P.barraFondo).setOrigin(0, 0);
  const objs = [fondo];
  if (typeof frac === 'number' && Number.isFinite(frac)) {
    const f = Math.max(0, Math.min(1, frac));
    if (f > 0) objs.push(scene.add.rectangle(x, y, Math.max(2, Math.round(w * f)), h, num(color)).setOrigin(0, 0));
  }
  return objs;
}

/** Tickets como íconos: círculo lleno = disponible, vacío = gastado (además del número n/total escrito). */
export function iconosTickets(scene, x, y, n, total, { r = 9, gap = 8, color = P.accion } = {}) {
  const objs = [];
  for (let i = 0; i < total; i++) {
    const cx = x + r + i * (2 * r + gap);
    const lleno = i < n;
    const c = scene.add.circle(cx, y, r, num(color), lleno ? 1 : 0).setStrokeStyle(2, num(lleno ? color : P.sec));
    objs.push(c);
  }
  return { objs, ancho: total * (2 * r + gap) - gap };
}
