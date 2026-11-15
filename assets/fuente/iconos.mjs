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

function bateria(p, grande, mediana = false) {
  const x0 = grande ? 2 : mediana ? 3 : 4, x1 = grande ? 13 : mediana ? 12 : 11, y0 = grande ? 3 : mediana ? 4 : 5, y1 = 13;
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

function motor(p, potente, equilibrado = false) {
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
  if (equilibrado) {
    // círculo partido: mitad turquesa (eficiencia) y mitad naranja (fuerza), con la raya blanca de en medio
    for (const [x, y, k] of [[5, 6, 'c'], [5, 7, 'C'], [5, 8, 'c'], [6, 5, 'c'], [6, 6, 'C'], [6, 7, 'c'], [6, 8, 'C'], [6, 9, 'c'],
      [7, 5, 'w'], [7, 6, 'w'], [7, 7, 'w'], [7, 8, 'w'], [7, 9, 'w'],
      [8, 5, 'y'], [8, 6, 'o'], [8, 7, 'y'], [8, 8, 'o'], [8, 9, 'O'], [9, 6, 'o'], [9, 7, 'O'], [9, 8, 'o']]) p.px(x, y, C[k]);
  } else if (potente) {
    // rayo rojo y naranja: más potencia, más consumo
    for (const [x, y, k] of [[6, 5, 'Y'], [5, 6, 'y'], [6, 7, 'o'], [7, 7, 'o'], [6, 8, 'o'], [5, 9, 'r'], [6, 6, 'y']]) p.px(x, y, C[k]);
  } else {
    // hoja turquesa: eficiente
    for (const [x, y, k] of [[6, 6, 'c'], [7, 6, 'c'], [5, 7, 'c'], [6, 7, 'C'], [7, 7, 'c'], [5, 8, 'C'], [6, 8, 'c']]) p.px(x, y, C[k]);
  }
}

function soporte(p, amortiguado, correas = false) {
  pinta(p, (x, y) => {
    // bandeja en U con la carga adentro
    const base = amortiguado ? 9 : 11;
    if (y === base && x >= 2 && x <= 13) return 'm';
    if (y === base + 1 && x >= 2 && x <= 13) return 'd';
    if ((x === 2 || x === 13) && y >= base - 4 && y < base) return x === 2 ? 'l' : 'm';
    if (correas && y >= base - 6 && y < base - 4 && (x === 2 || x === 13)) return x === 2 ? 'l' : 'm';  // paredes más altas
    if (correas && y >= base - 6 && y < base && x > 2 && x < 13 && Math.abs((x - 7.5) - (y - (base - 3)) * 1.6) < 0.8) return 'y'; // correas cruzadas
    if (correas && y >= base - 6 && y < base && x > 2 && x < 13 && Math.abs((x - 7.5) + (y - (base - 3)) * 1.6) < 0.8) return 'Y';
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

/** Rueda de malla de acero tejida (LRV de Apolo): llanta ancha en cuadrícula plateada con huecos, chevrones de titanio, cubo de aluminio. */
function ruedaMalla(p) {
  const c = 7.5;
  pinta(p, (x, y) => {
    const dx = x + 0.5 - c - 0.5, dy = y + 0.5 - c - 0.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), luz = dx + dy < 0;
    if (r > 6.6) return null;
    if (r > 3.6) {
      if (r > 5.9) return luz ? 'h' : 'l';                                  // borde de la malla
      if (Math.cos(a * 6) > 0.86 && r > 4.2) return 'd';                    // chevrones de titanio
      return (x + y) % 2 ? (luz ? 'h' : 'l') : 'g';                         // tejido abierto: hilo y hueco
    }
    if (r > 3) return 'm';
    if (r < 1.2) return 'd';
    return luz ? 'h' : 'l';                                                 // cubo de aluminio
  });
}


/** Calentador de batería: placa con resistencia en serpentín naranja y ondas de calor arriba. */
function calentador(p) {
  pinta(p, (x, y) => {
    if (x >= 2 && x <= 13 && y >= 7 && y <= 13) {
      if (y === 7) return 'h';
      if (y === 13) return 'd';
      if (x === 2 || x === 13) return x === 2 ? 'l' : 'm';
      const fila = y - 8;                                                   // serpentín: filas 8, 10 y 12, unidas en los extremos
      if (fila % 2 === 0 && x >= 4 && x <= 11) return fila === 0 ? 'Y' : 'o';
      if ((fila === 1 && x === 11) || (fila === 3 && x === 4)) return 'o';
      return 'g';
    }
    for (const bx of [4, 8, 12]) if (y >= 1 && y <= 5 && x === bx + (y % 2 ? 0 : -1)) return y < 3 ? 'r' : 'o'; // ondas de calor
    return null;
  });
}

/** Radiador: bloque de aletas verticales con el tubo de refrigerante turquesa entrando por la izquierda. */
function radiador(p) {
  pinta(p, (x, y) => {
    if (x >= 4 && x <= 13 && y >= 3 && y <= 12) {
      if (y === 3) return 'h';
      if (y === 12) return 'd';
      return x % 2 ? (x === 13 ? 'm' : 'h') : 'd';                          // aletas
    }
    if (x >= 1 && x <= 3 && (y === 5 || y === 10)) return y === 5 ? 'c' : 'C'; // tubos de entrada y salida
    if (x === 1 && y > 5 && y < 10) return 'C';
    return null;
  });
}

/** Panel solar grande: dos módulos lado a lado, menos inclinado y más alto que el panel normal. */
function panelGrande(p) {
  pinta(p, (x, y) => {
    const top = 1 + Math.floor((x - 1) / 7), bot = top + 9;
    if (x >= 1 && x <= 14 && y >= top && y <= bot) {
      if (y === top) return 'h';
      if (y === bot || x === 14) return 'm';
      if (x === 1) return 'l';
      if (x === 8) return 'm';                                              // unión de los dos módulos
      const cx = (x - 2) % 3, cy = (y - top - 1) % 3;
      if (cx === 2 || cy === 2) return 'v';
      return cx === 0 && cy === 0 ? 'S' : 's';
    }
    if ((x === 5 || x === 11) && y > 11 && y <= 13) return 'm';
    if (y === 14 && x >= 3 && x <= 13) return 'd';
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
    motor_equilibrado: (p) => motor(p, false, true),
    soporte_basico: (p) => soporte(p, false),
    soporte_amortiguado: (p) => soporte(p, true),
    soporte_correas: (p) => soporte(p, false, true),
    panel_solar: (p) => panel(p),
    // piezas nuevas (ids provisionales)
    rueda_malla: (p) => ruedaMalla(p),
    bateria_mediana: (p) => bateria(p, false, true),
    panel_solar_grande: (p) => panelGrande(p),
    calentador_bateria: (p) => calentador(p),
    radiador: (p) => radiador(p),
  };
  for (const [id, f] of Object.entries(lista)) tira(D + id + '.png', 16, 16, 1, (p) => f(p));
}
