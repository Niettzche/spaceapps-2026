// Íconos 16 × 16 de las 12 piezas del taller: assets/iconos/<id>.png (ids de game/src/content/parts.json).
// Dibujo dentro de 14 × 14 y contorno automático de 1 px. Luz desde arriba a la izquierda.
import { tira, BASE, hex } from './comun.mjs';

const C = Object.fromEntries(Object.entries(BASE).map(([k, v]) => [k, hex(v)]));
const D = 'iconos/';

/** Pinta por función: f(x, y) devuelve una letra de BASE o null. */
const pinta = (p, f) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = f(x, y); if (k) p.px(x, y, C[k]); } };

function rueda(p, { grosor, tacos = false, ancha = false }) {
  const cx = 7.5, cy = 7.5, R = tacos ? 6.0 : 6.5;
  pinta(p, (x, y) => {
    const dx = x + 0.5 - cx - 0.5, dy = y + 0.5 - cy - 0.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const luz = dx + dy < 0;
    if (tacos && r <= R + 1.2 && r > R - 0.2) return Math.cos(a * 8) > 0.35 ? (luz ? 'T' : 't') : null; // tacos en el borde
    if (r > R) return null;
    if (r > R - grosor) {
      if (ancha && Math.cos(a * 10) > 0.6 && r > R - grosor + 0.8) return 'g';                       // surcos para arena
      return luz ? 'T' : 't';
    }
    if (r < 1.3) return 'o';                                                                          // cubo
    if (r < 2.2) return 'h';
    if (Math.abs(Math.sin(a * 2)) < 0.28) return luz ? 'h' : 'l';                                     // rayos plateados
    return luz ? 'l' : 'm';
  });
}

/**
 * Rueda ancha en vista de 3/4: se ve el ancho de la banda de rodadura con sus tacos detrás de la cara,
 * llanta negra gruesa y cubo amarillo arena (el mismo código de color que el sprite del robot).
 */
function ruedaAncha(p) {
  const fx = 6.2, fy = 7.5, rx = 5.4, ry = 6.6, fondo = 3.6;                    // cara y desplazamiento de la banda
  const enElipse = (x, y, cx) => ((x - cx) / rx) ** 2 + ((y - fy) / ry) ** 2;
  pinta(p, (x, y) => {
    const px = x + 0.5, py = y + 0.5, e = enElipse(px, py, fx);
    if (e <= 1) {
      const r = Math.sqrt(e), a = Math.atan2((py - fy) / ry, (px - fx) / rx), luz = px - fx + py - fy < 0;
      if (r > 0.55) return luz ? 'T' : 't';                                      // llanta gruesa
      if (r > 0.5) return 'g';
      if (r < 0.2) return Math.abs(a + 2.2) < 0.6 && r > 0.08 ? 'k' : 'O';       // centro del cubo y marca
      return luz ? 'Y' : 'y';                                                    // cubo amarillo
    }
    // banda de rodadura (entre la cara y su copia desplazada): tacos alternos
    for (let k = 0.5; k <= fondo; k += 0.5) if (enElipse(px - k, py, fx) <= 1) return Math.floor(py) % 3 === 0 ? 'g' : (py < fy ? 'T' : 't');
    return null;
  });
}

function chasis(p, reforzado) {
  pinta(p, (x, y) => {
    if (x < 1 || x > 14) return null;
    const top = reforzado ? 4 : 6, bot = reforzado ? 11 : 9;
    if (y < top || y > bot) return null;
    if (y === top) return 'h';
    if (y === bot) return 'd';
    if (reforzado) {
      if ((x === 3 || x === 12) && (y === top + 2 || y === bot - 2)) return 'k';                     // remaches
      if (y === top + 1) return x < 4 ? 'c' : 'l';
      return x % 5 === 0 ? 'd' : 'm';                                                                 // placas
    }
    if (y === top + 1) return x < 3 ? 'c' : 'l';
    return (x % 3 === 1) ? 'k' : 'm';                                                                 // perforaciones (ligero)
  });
  if (!reforzado) p.px(14, 6, C.y);
}

function bateria(p, grande) {
  const x0 = grande ? 2 : 4, x1 = grande ? 13 : 11, y0 = grande ? 3 : 5, y1 = 13;
  pinta(p, (x, y) => {
    if (y === y0 - 1 && x >= (x0 + x1) / 2 - 1.5 && x <= (x0 + x1) / 2 + 1.5) return 'l';            // borne
    if (x < x0 || x > x1 || y < y0 || y > y1) return null;
    if (y === y0) return 'h';
    if (x === x0 || x === x1) return x === x0 ? 'l' : 'm';
    const nivel = grande ? y0 + 3 : y0 + 4;
    if (y >= nivel && y < y1) return y === nivel ? 'e' : 'E';                                         // carga verde
    return y === y1 ? 'd' : 'g';
  });
  if (grande) { p.px(5, 1, C.l); p.px(10, 1, C.l); }
}

function motor(p, potente) {
  pinta(p, (x, y) => {
    // carcasa cilíndrica con aletas y eje a la derecha
    if (x >= 2 && x <= 10 && y >= 4 && y <= 11) {
      if (y === 4) return 'h';
      if (y === 11) return 'd';
      if (x % 2 === 0 && x > 2) return 'm';                                                           // aletas
      return y < 7 ? 'l' : 'm';
    }
    if (x >= 11 && x <= 13 && y >= 7 && y <= 8) return y === 7 ? 'h' : 'l';                           // eje
    if (x >= 3 && x <= 9 && y === 12) return 'd';                                                     // base
    return null;
  });
  if (potente) {
    // rayo rojo y naranja: más potencia, más consumo
    for (const [x, y, k] of [[6, 5, 'Y'], [5, 6, 'y'], [6, 7, 'o'], [7, 7, 'o'], [6, 8, 'o'], [5, 9, 'r'], [6, 6, 'y']]) p.px(x, y, C[k]);
  } else {
    // hoja turquesa: eficiente
    for (const [x, y, k] of [[6, 6, 'c'], [7, 6, 'c'], [5, 7, 'c'], [6, 7, 'C'], [7, 7, 'c'], [5, 8, 'C'], [6, 8, 'c']]) p.px(x, y, C[k]);
  }
}

function soporte(p, amortiguado) {
  pinta(p, (x, y) => {
    // bandeja en U con la carga adentro
    const base = amortiguado ? 9 : 11;
    if (y === base && x >= 2 && x <= 13) return 'm';
    if (y === base + 1 && x >= 2 && x <= 13) return 'd';
    if ((x === 2 || x === 13) && y >= base - 4 && y < base) return x === 2 ? 'l' : 'm';
    if (x >= 5 && x <= 10 && y >= base - 4 && y < base) {                                              // carga
      if (y === base - 4) return 'h';
      return x === 7 || y === base - 2 ? 'o' : 'h';
    }
    if (amortiguado && y >= base + 2 && y <= 13 && (x === 4 || x === 11)) return (y % 2) ? 'y' : 'O';  // resortes
    if (amortiguado && y === 14 && x >= 2 && x <= 13) return 'd';
    return null;
  });
}

function panel(p) {
  pinta(p, (x, y) => {
    // panel inclinado (el borde de arriba sube hacia la izquierda) sobre un poste
    const top = 2 + Math.floor((x - 1) / 5), bot = top + 7;
    if (x >= 1 && x <= 14 && y >= top && y <= bot) {
      if (y === top) return 'h';                                   // marco iluminado
      if (y === bot || x === 14) return 'm';
      if (x === 1) return 'l';
      const cx = (x - 2) % 4, cy = (y - top - 1) % 3;
      if (cx === 3 || cy === 2) return 'v';                        // rejilla entre celdas
      return cx === 0 && cy === 0 ? 'S' : 's';                     // celda con brillo arriba a la izquierda
    }
    if (x === 8 && y > 9 && y <= 13) return y === 10 ? 'd' : 'm';
    if (y === 14 && x >= 6 && x <= 10) return 'd';
    return null;
  });
}

export function generar() {
  const lista = {
    rueda_estandar: (p) => rueda(p, { grosor: 1.6 }),
    rueda_ancha: (p) => ruedaAncha(p),
    rueda_tacos: (p) => rueda(p, { grosor: 2, tacos: true }),
    chasis_ligero: (p) => chasis(p, false),
    chasis_reforzado: (p) => chasis(p, true),
    bateria_chica: (p) => bateria(p, false),
    bateria_grande: (p) => bateria(p, true),
    motor_eficiente: (p) => motor(p, false),
    motor_potente: (p) => motor(p, true),
    soporte_basico: (p) => soporte(p, false),
    soporte_amortiguado: (p) => soporte(p, true),
    panel_solar: (p) => panel(p),
  };
  for (const [id, f] of Object.entries(lista)) tira(D + id + '.png', 16, 16, 1, (p) => f(p));
}
