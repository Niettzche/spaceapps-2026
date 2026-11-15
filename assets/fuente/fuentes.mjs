// Fuentes bitmap de MARSCEPTION en formato BMFont (XML) para Phaser (this.load.bitmapFont(clave, png, xml)):
//   fuentes/pixel.png + pixel.xml               cuerpo: glifos blancos de 5 × 7 (mayúsculas), se tiñen con setTint y se dibujan × 2
//   fuentes/pixel_titulo.png + pixel_titulo.xml  títulos: mismos glifos con el estilo del logo (degradado blanco → lavanda →
//                                                morado, contorno oscuro y sombra morada); colores fijos, se dibujan × 3
// Celda de 11 filas: 2 para acentos, 7 de mayúscula (la línea base queda bajo la fila 8) y 2 de descendentes.
// Mayúsculas y números: fuente "big" de pixelfx (MIT, © 2026 Patch y Hugo Duprez). Minúsculas, acentos y símbolos: propios.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFrame, guardar, hex, core } from './comun.mjs';
import { PALETAS } from './paletas.mjs';

const ASSETS = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALTO = 11, BASE_Y = 9, TOPE_MAY = 2, TOPE_MIN = 4;

// ---------------------------------------------------------------- glifos: [filas, fila donde empiezan]
const M = TOPE_MAY, m = TOPE_MIN;
const PROPIOS = {
  // números redibujados: el 6 de 'big' se confundía con la G («2G7.2 m»); el 6 y el 9 llevan el trazo en diagonal
  // y la panza cerrada, para que no se parezcan a G ni a g (el 0 ya se distingue de la O por su diagonal)
  6: ['...#.|..#..|.#...|####.|#...#|#...#|.###.', M], 9: ['.###.|#...#|#...#|.####|...#.|..#..|.#...', M],
  // minúsculas (altura x de 5; ascendentes desde la fila 2; descendentes hasta la 10)
  a: ['.###.|....#|.####|#...#|.####', m], b: ['#....|#....|####.|#...#|#...#|#...#|####.', M],
  c: ['.###.|#....|#....|#....|.###.', m], d: ['....#|....#|.####|#...#|#...#|#...#|.####', M],
  e: ['.###.|#...#|#####|#....|.###.', m], f: ['..##|.#..|####|.#..|.#..|.#..|.#..', M],
  g: ['.####|#...#|#...#|#...#|.####|....#|.###.', m], h: ['#....|#....|####.|#...#|#...#|#...#|#...#', M],
  i: ['#|.|#|#|#|#|#', M], j: ['..#|...|..#|..#|..#|..#|..#|#.#|.#.', M],
  k: ['#...|#...|#..#|#.#.|##..|#.#.|#..#', M], l: ['#.|#.|#.|#.|#.|#.|.#', M],
  m: ['##.#.|#.#.#|#.#.#|#.#.#|#.#.#', m], n: ['####.|#...#|#...#|#...#|#...#', m],
  o: ['.###.|#...#|#...#|#...#|.###.', m], p: ['####.|#...#|#...#|#...#|####.|#....|#....', m],
  q: ['.####|#...#|#...#|#...#|.####|....#|....#', m], r: ['#.##|##..|#...|#...|#...', m],
  s: ['.####|#....|.###.|....#|####.', m], t: ['.#..|.#..|####|.#..|.#..|.#..|..##', M],
  u: ['#...#|#...#|#...#|#...#|.####', m], v: ['#...#|#...#|#...#|.#.#.|..#..', m],
  w: ['#...#|#.#.#|#.#.#|#.#.#|.#.#.', m], x: ['#...#|.#.#.|..#..|.#.#.|#...#', m],
  y: ['#...#|#...#|#...#|#...#|.####|....#|.###.', m], z: ['#####|...#.|..#..|.#...|#####', m],
  'ı': ['#|#|#|#|#', m],                                                     // i sin punto (base de í)
  // puntuación
  '.': ['#', 8], ',': ['.#|#.', 8], ':': ['#|.|.|.|#', m], ';': ['.#|..|..|..|.#|#.', m],
  '!': ['#|#|#|#|#|.|#', M], '?': ['.###.|#...#|....#|...#.|..#..|.....|..#..', M],
  '¡': ['#|.|#|#|#|#|#', m], '¿': ['..#..|.....|..#..|.#...|#....|#...#|.###.', m],
  "'": ['#|#', M], '"': ['#.#|#.#', M], '`': ['#.|.#', M], '^': ['.#.|#.#', M], '~': ['.#.#|#.#.', m],
  '(': ['.#|#.|#.|#.|#.|#.|.#', M], ')': ['#.|.#|.#|.#|.#|.#|#.', M],
  '[': ['##|#.|#.|#.|#.|#.|##', M], ']': ['##|.#|.#|.#|.#|.#|##', M],
  '{': ['..#|.#.|.#.|#..|.#.|.#.|..#', M], '}': ['#..|.#.|.#.|..#|.#.|.#.|#..', M],
  '-': ['####', 5], '_': ['#####', 9], '+': ['..#..|..#..|#####|..#..|..#..', 3], '=': ['####|....|####', m],
  '/': ['....#|...#.|...#.|..#..|.#...|.#...|#....', M], '\\': ['#....|.#...|.#...|..#..|...#.|...#.|....#', M],
  '*': ['..#..|#.#.#|.###.|#.#.#|..#..', 3], '#': ['.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.', M],
  '%': ['##..#|##..#|...#.|..#..|.#...|#..##|#..##', M], '&': ['.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#', M],
  '@': ['.###.|#...#|#.###|#.#.#|#.###|#....|.###.', M], '$': ['..#..|.####|#.#..|.###.|..#.#|####.|..#..', M],
  '<': ['..#|.#.|#..|.#.|..#', 3], '>': ['#..|.#.|..#|.#.|#..', 3], '|': ['#|#|#|#|#|#|#|#|#', M],
  '«': ['..#.#|.#.#.|#.#..|.#.#.|..#.#', 3], '»': ['#.#..|.#.#.|..#.#|.#.#.|#.#..', 3],
  '‹': ['..#|.#.|#..|.#.|..#', 3], '›': ['#..|.#.|..#|.#.|#..', 3],
  '“': ['#.#|#.#', M], '”': ['#.#|#.#', M], '‘': ['#|#', M], '’': ['#|#', M],
  '–': ['#####', 5], '—': ['#######', 5], '−': ['#####', 5], '…': ['#.#.#', 8],
  // símbolos del juego
  '·': ['##|##', 5], '°': ['.#.|#.#|.#.', M], '²': ['##.|..#|.#.|###', M], '×': ['#.#|.#.|#.#', m + 1],
  '→': ['..#..|...#.|#####|...#.|..#..', 3], '←': ['..#..|.#...|#####|.#...|..#..', 3],
  '↑': ['..#..|.###.|#.#.#|..#..|..#..|..#..|..#..', M], '↓': ['..#..|..#..|..#..|..#..|#.#.#|.###.|..#..', M],
  '↗': ['..###|...##|..#.#|.#...|#....', 3], '⏎': ['....#|....#|..#.#|.##.#|#####|.##..|..#..', M],
  '★': ['...#...|...#...|#######|.#####.|..###..|.##.##.|.#...#.', M],
  '☆': ['...#...|..#.#..|###.###|#.....#|.#...#.|.#.#.#.|##...##', M],
  '●': ['.###.|#####|#####|#####|.###.', 3], '○': ['.###.|#...#|#...#|#...#|.###.', 3],
  '✓': ['....#|...##|#.##.|###..|.#...', 3], '✕': ['#...#|.#.#.|..#..|.#.#.|#...#', 3],
  '⚠': ['...#...|..#.#..|..#.#..|.#.#.#.|.#.#.#.|#.....#|#..#..#|#######', 1],
  '∠': ['....#|...#.|..##.|.#..#|#####', m], '≥': ['#..|.#.|..#|.#.|#..|###', 3], '≤': ['..#|.#.|#..|.#.|..#|###', 3],
  'φ': ['..#..|.###.|#.#.#|#.#.#|.###.|..#..|..#..', m],
};
// acentos: [filas, fila para minúsculas, fila para mayúsculas]
const ACENTOS = { agudo: ['.#|#.', 2, 0], dieresis: ['#.#', 3, 1], tilde: ['.#.#|#.#.', 2, 0] };
const COMPUESTOS = {
  'á': ['a', 'agudo'], 'é': ['e', 'agudo'], 'í': ['ı', 'agudo'], 'ó': ['o', 'agudo'], 'ú': ['u', 'agudo'], 'ü': ['u', 'dieresis'], 'ñ': ['n', 'tilde'],
  'Á': ['A', 'agudo'], 'É': ['E', 'agudo'], 'Í': ['I', 'agudo'], 'Ó': ['O', 'agudo'], 'Ú': ['U', 'agudo'], 'Ü': ['U', 'dieresis'], 'Ñ': ['N', 'tilde'],
};

/** Glifo → { w, px: Set de "x,y" en la celda de 11 filas } */
function construir() {
  const G = {};
  const poner = (ch, filas, tope) => {
    const rows = filas.split('|'), w = Math.max(...rows.map((r) => r.length)), px = new Set();
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') px.add(`${x},${tope + y}`); }));
    G[ch] = { w, px };
  };
  // mayúsculas y números de "big" (7 filas, desde la fila 2)
  for (const [ch, g] of Object.entries(core.FONTS.big.glyphs)) {
    if (!/^[A-Z0-9]$/.test(ch)) continue;
    poner(ch, g.rows.map((r) => r.map((b) => (b ? '#' : '.')).join('')).join('|'), M);
  }
  for (const [ch, [filas, tope]] of Object.entries(PROPIOS)) poner(ch, filas, tope);
  for (const [ch, [base, acento]] of Object.entries(COMPUESTOS)) {
    const b = G[base], [filas, yMin, yMay] = ACENTOS[acento], rows = filas.split('|'), aw = rows[0].length;
    const w = Math.max(b.w, aw), dx = Math.floor((w - b.w) / 2), ax = Math.floor((w - aw) / 2) + (acento === 'agudo' && b.w > 2 ? 1 : 0);
    const px = new Set([...b.px].map((s) => { const [x, y] = s.split(',').map(Number); return `${x + dx},${y}`; }));
    const y0 = /[A-ZÁÉÍÓÚÜÑ]/.test(ch) ? yMay : yMin;
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') px.add(`${Math.min(w - 1, x + ax)},${y0 + y}`); }));
    G[ch] = { w, px };
  }
  return G;
}

/**
 * Empaca los glifos en una imagen y escribe el PNG y el XML de BMFont.
 * pinta(frame, ox, oy, glifo) dibuja un glifo con su celda (w × ALTO) en (ox, oy); margen = px extra alrededor (contorno, sombra).
 */
function exportar(nombre, G, { pinta, margen = [0, 0, 0, 0], espacio = 3, separacion = 1 }) {
  const [mi, ma, md, mb] = margen;                         // izquierda, arriba, derecha, abajo
  const chars = Object.keys(G).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  const ANCHO = 256, celdaH = ALTO + ma + mb;
  let x = 1, y = 1;
  const pos = {};
  for (const ch of chars) {
    const w = G[ch].w + mi + md;
    if (x + w + 1 > ANCHO) { x = 1; y += celdaH + 1; }
    pos[ch] = [x, y, w];
    x += w + 1;
  }
  const H = y + celdaH + 1, f = createFrame(ANCHO, H);
  for (const ch of chars) pinta(f, pos[ch][0] + mi, pos[ch][1] + ma, G[ch]);
  guardar(`fuentes/${nombre}.png`, f);
  const lineas = [
    '<?xml version="1.0"?>',
    '<font>',
    `  <info face="${nombre}" size="${ALTO}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="1" padding="0,0,0,0" spacing="1,1"/>`,
    `  <common lineHeight="${ALTO + 1 + (ma + mb > 0 ? 2 : 0)}" base="${BASE_Y}" scaleW="${ANCHO}" scaleH="${H}" pages="1" packed="0"/>`,
    '  <pages>',
    `    <page id="0" file="${nombre}.png"/>`,
    '  </pages>',
    `  <chars count="${chars.length + 1}">`,
    `    <char id="32" x="0" y="0" width="0" height="0" xoffset="0" yoffset="0" xadvance="${espacio + separacion}" page="0" chnl="15"/>`,
    ...chars.map((ch) => {
      const [cx, cy, w] = pos[ch];
      return `    <char id="${ch.codePointAt(0)}" x="${cx}" y="${cy}" width="${w}" height="${celdaH}" xoffset="${-mi}" yoffset="${-ma}" xadvance="${G[ch].w + separacion}" page="0" chnl="15"/>`;
    }),
    '  </chars>',
    '</font>',
    '',
  ];
  const ruta = join(ASSETS, 'fuentes', `${nombre}.xml`);
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, lineas.join('\n'));
  console.log(`  fuentes/${nombre}.xml  ${chars.length + 1} caracteres`);
  return { chars, pos };
}

export function generar() {
  const G = construir();
  const BLANCO = hex('#ffffff');
  // cuerpo: blanco puro (se tiñe con setTint en Phaser)
  exportar('pixel', G, {
    pinta: (f, ox, oy, g) => { for (const s of g.px) { const [x, y] = s.split(',').map(Number); f.color[(oy + y) * f.w + ox + x] = BLANCO; } },
  });
  // títulos: degradado del logo por fila de la mayúscula, contorno de 1 px (8 vecinos) y sombra morada 1 px abajo
  const T = PALETAS.titulo, R = T.logo.map(hex), K = hex('#0d051c'), SOMBRA = hex('#2e0d6b');
  exportar('pixel_titulo', G, {
    margen: [1, 1, 1, 2],
    pinta: (f, ox, oy, g) => {
      const tinta = (x, y) => g.px.has(`${x},${y}`);
      const puesto = (x, y, c) => { f.color[(oy + y) * f.w + ox + x] = c; };
      for (const s of g.px) { const [x, y] = s.split(',').map(Number); puesto(x, y + 1, SOMBRA); }
      for (let y = -1; y <= ALTO + 1; y++) for (let x = -1; x <= g.w; x++) {
        if (tinta(x, y)) continue;
        let borde = false;
        for (let dy = -1; dy <= 1 && !borde; dy++) for (let dx = -1; dx <= 1; dx++) if (tinta(x + dx, y + dy)) { borde = true; break; }
        if (borde) puesto(x, y, K);
      }
      for (const s of g.px) {
        const [x, y] = s.split(',').map(Number), t = Math.min(1, Math.max(0, (y - M) / 6));
        puesto(x, y, R[Math.min(R.length - 1, Math.floor(t * R.length))]);
      }
    },
    margen: [1, 1, 1, 2],
  });
}

export { construir as glifos, ALTO, BASE_Y };
