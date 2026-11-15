// Dueño: frente expediente. Piezas visuales del Expediente (chips, barras de similitud, íconos de tickets).
// Paleta local de docs/juego/DISENO.md §2.5 (no se toca interfaz.js: ahí otro frente cambia COLOR en paralelo).
import Phaser from 'phaser';
import { textoPixel } from '../comun/fuente.js';

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

/** Texto con la fuente pixel del juego (comun/fuente.js; respaldo monospace). */
export function txt(scene, x, y, contenido, { size = 16, color = P.texto, origen = [0, 0], ancho, estilo = 'normal', interlineado = 0, alinear = 'left', titulo = false } = {}) {
  return textoPixel(scene, x, y, contenido, { size, color, origen, ancho, estilo, interlineado, alinear, titulo });
}

const webgl = (scene) => scene.sys.game.renderer?.type === Phaser.WEBGL;
/** 9-slice de arte a escala entera; null si falta la textura o no hay WebGL (respaldo: figuras). */
function nueve(scene, clave, x, y, w, h, corte, escala) {
  if (!webgl(scene) || !scene.textures.exists(clave)) return null;
  const aw = Math.max(2 * corte + 1, Math.round(w / escala));
  const ah = Math.max(2 * corte + 1, Math.round(h / escala));
  return scene.add.nineslice(x, y, clave, undefined, aw, ah, corte, corte, corte, corte).setOrigin(0, 0).setScale(escala);
}

/**
 * Chip: etiqueta corta dentro de una caja. Rojo (riesgo/límite) y cian (dato medido) usan el arte de Mauricio
 * (ui_chip_rojo / ui_chip_cian, 9-slice 8 × 8 ×2, el mismo chip de comun/pixel.js); otro color, caja con borde.
 * Devuelve { objs, ancho, alto }. `relleno`: color de fondo (número) o null.
 */
export function chip(scene, x, y, etiqueta, { color = P.sec, relleno = null, size = 14, pad = 8 } = {}) {
  const t = txt(scene, x + pad, y + 5, etiqueta, { size, color });
  const ancho = Math.ceil(t.width) + pad * 2;
  const alto = Math.ceil(t.height) + 10;
  const tipo = color === P.riesgo ? 'rojo' : color === P.dato ? 'cian' : null;
  let caja = tipo ? nueve(scene, `ui/ui_chip_${tipo}`, x, y, ancho, alto, 3, 2) : null;
  if (!caja) {
    caja = scene.add.rectangle(x, y, ancho, alto, relleno ?? 0x0b0d17, relleno == null ? 0.85 : 1)
      .setOrigin(0, 0).setStrokeStyle(2, num(color), 0.9);
  }
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
        const dx = cx - ch.objs[0].x, dy = cy - ch.objs[0].y;
        ch.objs.forEach((o) => o.setPosition(o.x + dx, o.y + dy));
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

/**
 * Barra 0–100 % con el marco de arte (ui_marco_barra ×2) y relleno de arte (ui_barra_relleno_<amarillo|verde|rojo>)
 * para los 3 colores con significado fijo; respaldo: fondo + rectángulo. `frac` null → solo el marco/fondo.
 */
export function barra(scene, x, y, w, h, frac, color) {
  const alto = Math.max(h, 10);
  const marco = nueve(scene, 'ui/ui_marco_barra', x, y - Math.round((alto - h) / 2), w, alto, 2, 2);
  const objs = [];
  let ix = x, iy = y, iw = w, ih = h;
  if (marco) { objs.push(marco); ix = x + 4; iy = marco.y + 4; iw = w - 8; ih = marco.displayHeight - 8; }
  else objs.push(scene.add.rectangle(x, y, w, h, P.barraFondo).setOrigin(0, 0));
  if (typeof frac === 'number' && Number.isFinite(frac)) {
    const f = Math.max(0, Math.min(1, frac));
    const ancho = Math.max(2, Math.round(iw * f));
    const ARTE = { [P.accion]: 'amarillo', [P.bien]: 'verde', [P.riesgo]: 'rojo' };
    const clave = ARTE[color] ? `ui/ui_barra_relleno_${ARTE[color]}` : null;
    if (f > 0) {
      objs.push(marco && clave && scene.textures.exists(clave)
        ? scene.add.image(ix, iy, clave).setOrigin(0, 0).setDisplaySize(ancho, Math.max(2, ih))
        : scene.add.rectangle(ix, iy, ancho, Math.max(2, ih), num(color)).setOrigin(0, 0));
    }
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
