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

// ---------------------------------------------------------------- íconos de keywords (chips del Expediente, instrucciones)
// ico_<palabra>.png, 16 × 16 con el mismo contorno y luz que los de piezas.
const linea = (p, x0, y0, x1, y1, k) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) p.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), C[k]);
};
const KEYWORDS = {
  // subida: perfil de montaña con flecha que sube
  ico_subida: (p) => {
    pinta(p, (x, y) => (y >= 13 - Math.max(0, Math.min(x - 1, 9)) * 0.8 && y <= 13 && x >= 1 && x <= 14 ? (y === 13 ? 'd' : x + y < 18 ? 'l' : 'm') : null));
    linea(p, 3, 9, 11, 2, 'y'); linea(p, 3, 10, 11, 3, 'o');
    for (const [x, y] of [[8, 2], [9, 2], [10, 2], [11, 2], [11, 3], [11, 4], [11, 5]]) p.px(x, y, C.Y);
  },
  // pendiente: triángulo rectángulo con el arco del ángulo
  ico_pendiente: (p) => {
    pinta(p, (x, y) => (x >= 2 && x <= 13 && y <= 13 && y >= 13 - (x - 2) * 0.8 ? (y === 13 ? 'd' : x === 13 ? 'm' : 'l') : null));
    linea(p, 2, 13, 13, 4, 'h');
    for (const [x, y] of [[6, 12], [6, 11], [5, 10]]) p.px(x, y, C.o);
    p.px(7, 12, C.y);
  },
  // suelo: capas de terreno con granos y piedras
  ico_suelo: (p) => pinta(p, (x, y) => {
    if (x < 1 || x > 14 || y < 5 || y > 13) return null;
    if (y === 5) return (x % 3) ? 'y' : 'o';                                   // superficie de arena
    if (y <= 8) return (x * 3 + y) % 5 === 0 ? 'O' : 'o';
    if (y <= 11) return (x + y) % 4 === 0 ? 'l' : 'm';                         // roca debajo
    return (x % 4 === 1) ? 'h' : 'd';
  }),
  // temperatura: termómetro con columna roja y marcas
  ico_temperatura: (p) => pinta(p, (x, y) => {
    const bulbo = Math.hypot(x - 6.5, y - 11.5);
    if (bulbo <= 3.2) return bulbo <= 2 ? (x + y < 17 ? 'r' : 'R') : 'h';
    if (x >= 5 && x <= 8 && y >= 1 && y <= 10) return x === 5 || x === 8 ? 'h' : y >= 5 ? 'r' : 'w';
    if (x >= 10 && x <= 12 && y % 3 === 2 && y <= 9) return 'l';               // escala
    return null;
  }),
  // aire: tres ráfagas de viento con remolino
  ico_aire: (p) => {
    for (const [y, x1, k] of [[4, 11, 'h'], [8, 13, 'V'], [12, 9, 'l']]) linea(p, 1, y, x1, y, k);
    for (const [x, y] of [[12, 3], [13, 4], [12, 5], [11, 5]]) p.px(x, y, C.h);
    for (const [x, y] of [[14, 7], [15, 8], [14, 9], [13, 9]]) p.px(x, y, C.V);
    for (const [x, y] of [[10, 11], [11, 12], [10, 13], [9, 13]]) p.px(x, y, C.l);
  },
  // luz: sol con rayos
  ico_luz: (p) => pinta(p, (x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5);
    if (d <= 3.6) return d <= 2 ? 'Y' : x + y < 15 ? 'y' : 'o';
    if (d >= 4.8 && d <= 7 && Math.abs(Math.sin(a * 4)) < 0.22) return d < 6 ? 'y' : 'o';
    return null;
  }),
  // gravedad: planeta con flecha hacia abajo y una manzana... solo la flecha y el planeta
  ico_gravedad: (p) => {
    pinta(p, (x, y) => {
      const d = Math.hypot(x - 7.5, y - 18);
      if (d <= 7.5 && y >= 11) return y === 11 || d > 6.8 ? 'h' : (x * 2 + y) % 5 ? 'o' : 'O';   // planeta abajo
      return null;
    });
    for (let y = 1; y <= 7; y++) { p.px(7, y, C.V); p.px(8, y, C.V); }
    for (const [x, y] of [[5, 6], [6, 7], [9, 7], [10, 6], [6, 8], [7, 8], [8, 8], [9, 8], [7, 9], [8, 9]]) p.px(x, y, C.V);
  },
  // presión: manómetro con aguja
  ico_presion: (p) => {
    pinta(p, (x, y) => {
      const d = Math.hypot(x - 7.5, y - 8);
      if (d <= 6.4) return d > 5.4 ? (x + y < 15 ? 'h' : 'm') : d > 4.6 && (x + y) % 3 === 0 ? 'k' : 'w';
      if (y >= 14 && x >= 5 && x <= 10) return 'd';
      return null;
    });
    linea(p, 8, 8, 11, 5, 'r');
    p.px(7, 8, C.k); p.px(8, 8, C.k);
  },
  // radiación: trébol amarillo y negro
  ico_radiacion: (p) => pinta(p, (x, y) => {
    const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (d > 7) return null;
    if (d <= 1.3) return 'k';
    if (d <= 2.1) return 'y';
    if (d <= 6.2 && Math.cos(3 * (a + Math.PI / 2)) > 0.5) return 'k';      // tres aspas
    return d > 6.2 ? 'O' : 'y';
  }),
  // similitud: dos círculos que se enciman (Tierra turquesa y destino naranja)
  ico_similitud: (p) => pinta(p, (x, y) => {
    const a = Math.hypot(x - 5.5, y - 7.5) <= 4.8, b = Math.hypot(x - 10, y - 7.5) <= 4.8;
    if (a && b) return 'w';
    if (a) return x + y < 12 ? 'c' : 'C';
    if (b) return x + y < 17 ? 'o' : 'O';
    return null;
  }),
  // ticket: boleto amarillo con muescas y perforación
  ico_ticket: (p) => pinta(p, (x, y) => {
    if (x < 1 || x > 14 || y < 4 || y > 11) return null;
    if ((x === 1 || x === 14) && y >= 7 && y <= 8) return null;                 // muescas
    if (x === 10) return y % 2 ? 'O' : null;                                    // perforación
    if (y === 4) return 'Y';
    if (y === 11) return 'O';
    if (x >= 3 && x <= 8 && y >= 6 && y <= 9) return y === 7 || y === 8 ? (x % 2 ? 'O' : 'y') : 'y';  // texto simulado
    return 'y';
  }),
};

// ---------------------------------------------------------------- íconos de las variables del Expediente
const VARIABLES = {
  // forma: cráter visto de lado (bordes altos, hondo al centro)
  ico_forma: (p) => pinta(p, (x, y) => {
    const u = Math.abs(x - 7.5) / 7.5, perfil = u > 0.8 ? 6 + (u - 0.8) * 25 : 11 - 5 * Math.pow(u / 0.8, 2);   // bordes altos (x≈1 y 14) y fondo hondo
    if (x < 0 || x > 15 || y > 13) return null;
    if (y < perfil) return null;
    if (y === Math.ceil(perfil)) return x < 7 ? 'h' : 'l';
    return y === 13 ? 'd' : (x + y) % 3 === 0 ? 'm' : 'l';
  }),
  // oscilación térmica: sol a la izquierda, luna a la derecha y un termómetro entre los dos
  ico_oscilacion: (p) => pinta(p, (x, y) => {
    if (Math.hypot(x - 3, y - 4) <= 2.6) return 'y';                                            // sol
    if (Math.hypot(x - 3, y - 4) <= 3.8 && (x + y) % 2 === 0) return 'o';
    const l = Math.hypot(x - 12.5, y - 4), c = Math.hypot(x - 13.8, y - 3.2);
    if (l <= 2.8 && c > 2.2) return 'h';                                                        // luna creciente
    const b = Math.hypot(x - 7.5, y - 12);
    if (b <= 2.4) return b <= 1.4 ? 'r' : 'h';                                                  // bulbo
    if (x >= 6.5 && x <= 8.5 && y >= 4 && y <= 10) return x === 7 || x === 8 ? (y >= 7 ? 'r' : 'w') : null;
    return null;
  }),
  // precipitación: gota
  ico_precipitacion: (p) => pinta(p, (x, y) => {
    const dy = y - 9.5, ancho = y < 9 ? (y - 2) * 0.62 : Math.sqrt(Math.max(0, 16 - dy * dy)) * 1.05;
    if (y < 2 || y > 14 || Math.abs(x - 7.5) > ancho) return null;
    if (x < 7 && y > 7 && y < 12 && x > 4) return 'S';                                          // brillo
    return x + y < 18 ? 'V' : 's';
  }),
  // vegetación: hoja con nervadura
  ico_vegetacion: (p) => pinta(p, (x, y) => {
    const u = (x - 7.5) * 0.7 + (y - 7.5) * 0.7, v = -(x - 7.5) * 0.7 + (y - 7.5) * 0.7;      // eje diagonal
    if ((u / 6.6) ** 2 + (v / 3.6) ** 2 > 1) return x <= 3 && y >= 12 && x + y >= 14 && x + y <= 16 ? 'E' : null; // tallo
    if (Math.abs(v) < 0.6) return 'E';                                                          // nervio central
    return u + v < 0 ? 'e' : 'E';
  }),
  // confianza: escudo con palomita
  ico_confianza: (p) => pinta(p, (x, y) => {
    const ancho = y < 9 ? 6 : 6 - (y - 8) * 0.95;
    if (y < 1 || y > 14 || Math.abs(x - 7.5) > ancho) return null;
    const borde = Math.abs(x - 7.5) > ancho - 1.1 || y === 1;
    if (borde) return 'C';
    const check = (x >= 4 && x <= 6 && y === x + 3) || (x >= 6 && x <= 11 && y === 15 - x - 2);
    if (check) return 'w';
    return x < 7.5 ? 'c' : 'C';
  }),
  // novedoso: estrella con un «+»
  ico_novedoso: (p) => {
    pinta(p, (x, y) => {
      const dx = x - 6.5, dy = y - 8.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + Math.PI / 2;
      const rr = 3 + 3.6 * Math.pow(Math.abs(Math.cos(a * 2.5)), 2);
      if (r > rr) return null;
      return dx + dy < 0 ? 'Y' : 'y';
    });
    for (const [x, y] of [[13, 1], [13, 2], [13, 3], [13, 4], [13, 5], [11, 3], [12, 3], [14, 3], [15, 3]]) p.px(x, y, C.c);
  },
  // misión: cohete inclinado con llama
  ico_mision: (p) => pinta(p, (x, y) => {
    const u = (x - y) * 0.707, v = (x + y - 15) * 0.707;                                       // eje a 45° (punta arriba a la derecha)
    if (v > -6.5 && v < 3 && Math.abs(u) < (v < -4 ? (v + 6.5) * 0.8 : 2.1)) return v < -4.5 ? 'r' : Math.abs(u) < 0.8 && v > -3 && v < -1 ? 'V' : u < 0 ? 'h' : 'l';
    if (v >= 1.5 && v < 4 && Math.abs(u) >= 2.1 && Math.abs(u) < 3.6) return 'r';             // aletas
    if (v >= 3 && v < 6.5 && Math.abs(u) < 1.6 - (v - 3) * 0.4) return v < 4.6 ? 'Y' : 'o';   // llama
    return null;
  }),
  // prueba: robot sobre la Tierra (arco verde y azul abajo)
  ico_prueba: (p) => pinta(p, (x, y) => {
    const tierra = Math.hypot(x - 7.5, y - 26);
    if (tierra <= 15.5) return tierra > 14.6 ? 'h' : (x * 2 + y) % 5 < 2 ? 'e' : 's';
    if (y >= 6 && y <= 8 && x >= 3 && x <= 12) return y === 6 ? 'h' : y === 7 ? (x < 6 ? 'c' : 'l') : 'd';   // chasis
    if (y >= 3 && y <= 5 && x >= 6 && x <= 9) return y === 3 ? 'h' : x === 7 && y === 4 ? 'o' : 'l';       // carga
    if (y >= 8 && y <= 10 && (Math.hypot(x - 4.5, y - 9.5) <= 1.6 || Math.hypot(x - 10.5, y - 9.5) <= 1.6)) return 'T';
    return null;
  }),
};

// ---------------------------------------------------------------- piezas nuevas (ids provisionales) y bloqueadas
const H = (h) => hex(h);
function chasisMaterial(p, { claro, medio, oscuro, patron }) {
  pinta(p, () => null);
  for (let y = 4; y <= 11; y++) for (let x = 1; x <= 14; x++) {
    let c;
    if (y === 4) c = claro;
    else if (y === 11) c = oscuro;
    else c = patron(x, y);
    p.px(x, y, H(c));
  }
  for (const [x, y] of [[3, 6], [12, 6], [3, 9], [12, 9]]) p.px(x, y, C.k);          // tornillos
  p.px(14, 5, C.y);
}
const PIEZAS_NUEVAS = {
  // titanio: placa gris azulada con vetas de cepillado
  chasis_titanio: (p) => chasisMaterial(p, { claro: '#e6eef6', oscuro: '#3a4658', patron: (x, y) => ((x * 3 + y * 7) % 11 === 0 ? '#8c9cb4' : y < 7 ? '#c4d0e0' : '#a6b4c8') }),
  // fibra de carbono: tejido negro en cuadros con brillo
  chasis_fibra_carbono: (p) => chasisMaterial(p, { claro: '#5a5a66', oscuro: '#08080c', patron: (x, y) => (((x >> 1) + (y >> 1)) % 2 ? '#1c1c24' : ((x + y) % 2 ? '#2e2e3a' : '#24242e')) }),
  // rueda de Nitinol: llanta de resortes (anillos en zigzag) plateados sobre un cubo
  rueda_nitinol: (p) => pinta(p, (x, y) => {
    const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), luz = dx + dy < 0;
    if (r > 6.8) return null;
    if (r > 3.4) {
      const resorte = Math.abs(((r - 3.4) * 1.6 + Math.sin(a * 14) * 0.8) % 2 - 1) < 0.45;    // espiras en zigzag
      return resorte ? (luz ? 'w' : 'h') : (r > 6 ? 'l' : 'g');
    }
    if (r > 2.6) return 'm';
    return r < 1.2 ? 'c' : luz ? 'h' : 'l';                                                   // cubo con centro turquesa
  }),
  // módulo de auto-rescate: caja con dos patas articuladas que se levantan (tipo VIPER), con ruedita en la punta
  modulo_autorescate: (p) => {
    pinta(p, (x, y) => {
      if (x >= 4 && x <= 11 && y >= 6 && y <= 11) return y === 6 ? 'h' : y === 11 ? 'd' : x === 4 ? 'l' : (x === 7 || x === 8) && y >= 8 && y <= 9 ? 'r' : 'm';
      return null;
    });
    for (const [x0, dir] of [[4, -1], [11, 1]]) {
      for (let i = 0; i < 4; i++) p.px(x0 + dir * i, 6 - i, C.l);                          // brazo hacia arriba
      for (let i = 0; i < 3; i++) p.px(x0 + dir * (3 + i), 3 + i * 2, C.m);               // antebrazo hacia abajo
      p.px(x0 + dir * 3, 2, C.y);                                                         // articulación
      p.px(x0 + dir * 5, 8, C.T); p.px(x0 + dir * 5, 9, C.t); p.px(x0 + dir * 4, 9, C.T);   // ruedita
    }
  },
  // sellos antipolvo: anillo de goma naranja con labios, polvo que queda afuera
  sellos_polvo: (p) => {
    pinta(p, (x, y) => {
      const r = Math.hypot(x - 7.5, y - 7.5);
      if (r > 6.2) return null;
      if (r > 4.8) return x + y < 15 ? 'o' : 'O';
      if (r > 4.1) return 'k';
      if (r > 2.8) return x + y < 15 ? 'O' : 'R';
      if (r > 1.8) return 'd';
      return null;
    });
    for (const [x, y] of [[1, 1], [14, 2], [0, 13], [15, 12], [2, 15]]) p.px(x, y, H('#b8844e'));   // polvo afuera
  },
  // candado para piezas bloqueadas
  candado: (p) => pinta(p, (x, y) => {
    const arco = Math.hypot(x - 7.5, y - 6);
    if (y <= 7 && arco <= 4.6 && arco >= 2.8) return x < 8 ? 'h' : 'l';
    if (x >= 3 && x <= 12 && y >= 7 && y <= 14) {
      if (y === 7) return 'Y';
      if (y === 14) return 'O';
      if (Math.hypot(x - 7.5, y - 10) <= 1.2 || (x >= 7 && x <= 8 && y >= 10 && y <= 12)) return 'k';   // cerradura
      return x < 5 ? 'Y' : 'y';
    }
    return null;
  }),
};
// siluetas grises de los robots bloqueados (orugas, patas, rotor, serpiente, rappel): sin detalle, para "próximamente"
const GRIS = (x, y) => ((x + y) % 2 ? 'm' : 'd');
const SILUETAS = {
  silueta_orugas: (p) => pinta(p, (x, y) => (y >= 5 && y <= 7 && x >= 3 && x <= 12) || (y >= 9 && y <= 13 && x >= 1 && x <= 14 && Math.hypot(Math.max(0, Math.abs(x - 7.5) - 4.5), y - 11) <= 2.5) ? GRIS(x, y) : null),
  silueta_patas: (p) => pinta(p, (x, y) => (y >= 4 && y <= 7 && x >= 3 && x <= 12) || ([2, 6, 9, 13].some((lx, i) => Math.abs(x - (lx + (y - 8) * (i < 2 ? -0.4 : 0.4))) < 0.8 && y >= 8 && y <= 14)) ? GRIS(x, y) : null),
  silueta_rotor: (p) => pinta(p, (x, y) => (y === 3 && x >= 1 && x <= 14) || (x >= 7 && x <= 8 && y >= 3 && y <= 6) || (y >= 6 && y <= 11 && Math.hypot(x - 7.5, y - 8.5) <= 3.4) || (y === 13 && x >= 4 && x <= 11) || ((x === 5 || x === 10) && y >= 11 && y <= 13) ? GRIS(x, y) : null),
  silueta_serpiente: (p) => pinta(p, (x, y) => { const c = 8 + Math.sin((x / 15) * Math.PI * 2) * 4; return Math.abs(y - c) <= 1.6 && x >= 1 && x <= 14 ? GRIS(x, y) : (x >= 13 && x <= 15 && Math.abs(y - (8 + Math.sin((14 / 15) * Math.PI * 2) * 4)) <= 2.2 ? GRIS(x, y) : null); }),
  silueta_rappel: (p) => pinta(p, (x, y) => (x === 7 && y <= 6) || (y >= 6 && y <= 11 && x >= 4 && x <= 11) || ((x === 4 || x === 11) && y >= 11 && y <= 13) ? GRIS(x, y) : null),
};

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
  for (const [id, f] of Object.entries(KEYWORDS)) tira(D + id + '.png', 16, 16, 1, (p) => f(p));
  for (const [id, f] of Object.entries({ ...VARIABLES, ...PIEZAS_NUEVAS, ...SILUETAS })) tira(D + id + '.png', 16, 16, 1, (p) => f(p));
}
