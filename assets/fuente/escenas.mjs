// Escenas compuestas con el arte ya generado (sprites, fondos, tiles, efectos e íconos de /assets):
//   tutorial/tutorial_1..4.png  viñetas de 96 × 64 para la pantalla "Cómo jugar" (sin texto: el texto lo pone el juego)
//   ../docs/media/web_portada_960x960.png  imagen principal de la página web (escena de 120 × 120 × 8, sin texto).
//     Va en docs/media y no en assets/, porque el Boot del juego precarga todas las imágenes de assets/.
// Correr después de los demás grupos: lee sus PNG del disco.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFrame, guardar, rampa, tramado, clamp, hex, BASE } from './comun.mjs';
import { PALETAS } from './paletas.mjs';

const ASSETS = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const K = hex(BASE.k);

// ---------------------------------------------------------------- lectura y pegado de PNG (RGBA de 8 bits, como los escribe pixelfx)
const cache = {};
function leer(ruta) {
  if (cache[ruta]) return cache[ruta];
  const b = readFileSync(join(ASSETS, ruta));
  let o = 8, w = 0, h = 0;
  const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), tipo = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (tipo === 'IHDR') {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4);
      if (d[8] !== 8 || d[9] !== 6) throw new Error(`${ruta}: solo RGBA de 8 bits`);
    } else if (tipo === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), st = w * 4, px = Buffer.alloc(st * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)], src = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1)), cur = px.subarray(y * st, (y + 1) * st);
    const prev = y ? px.subarray((y - 1) * st, y * st) : Buffer.alloc(st);
    for (let x = 0; x < st; x++) {
      const a = x >= 4 ? cur[x - 4] : 0, up = prev[x], c = x >= 4 ? prev[x - 4] : 0;
      let v = src[x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      cur[x] = v & 255;
    }
  }
  const color = new Uint32Array(w * h);
  for (let i = 0; i < w * h; i++) color[i] = px[i * 4 + 3] ? ((px[i * 4 + 3] << 24) | (px[i * 4 + 2] << 16) | (px[i * 4 + 1] << 8) | px[i * 4]) >>> 0 : 0;
  return (cache[ruta] = { w, h, color });
}

/** Pega la región (sx, sy, w, h) de una imagen en el cuadro, saltando lo transparente. */
function pegar(f, img, x, y, { sx = 0, sy = 0, w = img.w, h = img.h, espejo = false } = {}) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const c = img.color[(sy + yy) * img.w + sx + (espejo ? w - 1 - xx : xx)];
    const X = x + xx, Y = y + yy;
    if (c >>> 24 && X >= 0 && Y >= 0 && X < f.w && Y < f.h) f.color[Y * f.w + X] = mezclar(f.color[Y * f.w + X], c);
  }
}
/** c (con su alfa) encima de d; el resultado queda opaco si d lo era. */
function mezclar(d, c) {
  const a = (c >>> 24) / 255;
  if (a >= 1 || !(d >>> 24)) return c;
  const ch = (s) => Math.round(((c >>> s) & 255) * a + ((d >>> s) & 255) * (1 - a));
  return ((Math.max(d >>> 24, c >>> 24) << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
}
/** Cuadro i de una tira horizontal de cuadros de ancho w. */
const cuadro = (f, ruta, i, w, x, y) => { const img = leer(ruta); pegar(f, img, x, y, { sx: i * w, w, h: img.h }); };
/** Cuadro i de una hoja de pixelfx (JSON de Aseprite), con el origen del efecto en (x, y). */
function efecto(f, nombre, i, x, y, origen) {
  const img = leer(`fx/${nombre}.png`), j = JSON.parse(readFileSync(join(ASSETS, `fx/${nombre}.json`), 'utf8'));
  const r = j.frames[Math.min(i, j.frames.length - 1)].frame;
  const [ox, oy] = origen ?? [r.w >> 1, r.h >> 1];
  pegar(f, img, x - ox, y - oy, { sx: r.x, sy: r.y, w: r.w, h: r.h });
}
/** Las 3 capas de un fondo, recortadas desde (sx, sy). */
function fondo(f, clave, sx, sy, x = 0, y = 0, w = f.w, h = f.h) {
  for (const n of [1, 2, 3]) pegar(f, leer(`fondos/fondo_${clave}_${n}.png`), x, y, { sx, sy, w, h });
}
/** Suelo de tiles: borde de 16 × 4 encima y tile de 16 × 16 debajo, de y hasta abajo. */
function suelo(f, tile, y) {
  const t = leer(`terreno/${tile}.png`), b = leer(`terreno/${tile}_borde.png`);
  for (let x = 0; x < f.w; x += 16) {
    for (let yy = y + 4; yy < f.h; yy += 16) pegar(f, t, x, yy);
    pegar(f, b, x, y);
  }
}
/**
 * Robot armado como en el juego: chasis 24 × 6, dos ruedas, soporte y carga encima; suelo = y donde apoyan las ruedas.
 * Devuelve dónde quedaron la rueda trasera y la carga (para poner efectos).
 */
function robot(f, x, suelo_, { rueda = 'rueda_estandar', chasis = 'chasis_ligero', giro = 0, conCarga = true, decos = [] } = {}) {
  const r = leer(`entidades/${rueda}.png`), rw = r.h, top = suelo_ - 10;
  cuadro(f, `entidades/${chasis}.png`, 0, 24, x, top);
  for (const d of decos) pegar(f, leer(`entidades/${d[0]}.png`), x + d[1], top + d[2]);
  cuadro(f, `entidades/${rueda}.png`, giro % 4, rw, x + 1, suelo_ - rw);
  cuadro(f, `entidades/${rueda}.png`, (giro + 1) % 4, rw, x + 23 - rw, suelo_ - rw);
  if (conCarga) {
    pegar(f, leer('entidades/soporte_basico.png'), x + 7, top - 4);
    cuadro(f, 'entidades/carga.png', 0, 7, x + 8, top - 8);
  }
  return { trasera: [x + 1 + (rw >> 1), suelo_], carga: [x + 11, top - 6] };
}
/** Panel 9-slice de 16 × 16 con borde de 3 px (ui_panel). */
function panel(f, x, y, w, h) {
  const p = leer('ui/ui_panel.png'), B = 3;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const sx = xx < B ? xx : xx >= w - B ? 16 - (w - xx) : B + ((xx - B) % (16 - 2 * B));
    const sy = yy < B ? yy : yy >= h - B ? 16 - (h - yy) : B + ((yy - B) % (16 - 2 * B));
    const c = p.color[sy * 16 + sx];
    if (c >>> 24) f.color[(y + yy) * f.w + x + xx] = c;
  }
}
/** Marco de la viñeta: contorno de 1 px y brillo lavanda por dentro arriba y a la izquierda. */
function marco(f) {
  const L = hex(PALETAS.titulo.lavanda), S = hex(PALETAS.titulo.espacio[3]);
  for (let x = 0; x < f.w; x++) { f.color[x] = K; f.color[(f.h - 1) * f.w + x] = K; }
  for (let y = 0; y < f.h; y++) { f.color[y * f.w] = K; f.color[y * f.w + f.w - 1] = K; }
  for (let x = 1; x < f.w - 1; x++) { f.color[f.w + x] = L; f.color[(f.h - 2) * f.w + x] = S; }
  for (let y = 1; y < f.h - 1; y++) { f.color[y * f.w + 1] = L; f.color[y * f.w + f.w - 2] = S; }
}
/** Recorre el rectángulo y pinta lo que devuelva fn(x, y) (0 = nada). */
function pintar(f, x0, y0, w, h, fn) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const c = fn(x, y);
    if (c && x >= 0 && y >= 0 && x < f.w && y < f.h) f.color[y * f.w + x] = c;
  }
}
const disco = (f, cx, cy, r, color) => pintar(f, cx - r - 1, cy - r - 1, 2 * r + 3, 2 * r + 3, (x, y) => {
  const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy) / r;
  return d <= 1 ? color(dx / r, dy / r, d, x, y) : 0;
});
function cielo(f, pal, y0, y1) {
  const C = rampa(pal);
  pintar(f, 0, y0, f.w, y1 - y0, (x, y) => tramado(C, clamp((y - y0) / (y1 - y0), 0, 1) * 0.9, x, y));
}

export function generar() {
  tutorial1();
  tutorial2();
  tutorial3();
  tutorial4();
  portadaWeb();
}

// ---------------------------------------------------------------- 1. elige un análogo: la Tierra y la Luna/Marte lado a lado
function tutorial1() {
  const f = createFrame(96, 64), T = PALETAS.titulo;
  cielo(f, T.espacio.slice(0, 5), 0, 64);
  for (const [x, y] of [[8, 6], [30, 3], [70, 5], [88, 11], [50, 60], [6, 50], [91, 56]]) f.color[y * 96 + x] = hex(T.estrella);
  // dos fichas
  panel(f, 6, 14, 36, 42);
  panel(f, 54, 14, 36, 42);
  // vistas de un cráter: Tierra (arena y roca cálidas) y Luna (gris)
  const vista = (x0, pal, sombra) => {
    const C = rampa(pal);
    pintar(f, x0, 19, 26, 26, (x, y) => {
      const dx = (x + 0.5 - (x0 + 13)) / 9, dy = (y + 0.5 - 32) / 7, d = Math.hypot(dx, dy);
      let t = 0.55 + ((x * 7 + y * 13) % 5) * 0.03;
      if (d < 1) t = 0.25 + (dx > 0 ? 0.45 : 0) * (1 - d) + (d > 0.8 ? 0.3 : 0);   // hondo, con la pared derecha iluminada
      else if (d < 1.25) t = dx < 0 ? 0.85 : 0.6;                                 // borde
      return tramado(C, clamp(t, 0, 1), x, y);
    });
    for (let i = 0; i < 26; i++) { f.color[18 * 96 + x0 + i] = K; f.color[45 * 96 + x0 + i] = K; f.color[(19 + i) * 96 + x0 - 1] = K; f.color[(19 + i) * 96 + x0 + 26] = K; }
  };
  vista(11, PALETAS.tierra.arena, 0);
  vista(59, PALETAS.luna.roca.slice(1), 0);
  // insignias: Tierra a la izquierda; Luna y Marte a la derecha
  disco(f, 24, 10, 5, (u, v, d, x, y) => (d > 0.82 ? K : (x * 3 + y * 5) % 7 < 3 && u < 0.3 ? hex('#3ec466') : u + v < -0.5 ? hex('#7cc8ff') : hex('#2550d0')));
  disco(f, 67, 10, 5, (u, v, d) => (d > 0.82 ? K : u + v < -0.4 ? hex('#e8e8f0') : u + v < 0.4 ? hex('#b4b4c0') : hex('#7c7c8a')));
  disco(f, 79, 10, 5, (u, v, d) => (d > 0.82 ? K : u + v < -0.4 ? hex('#e8a068') : u + v < 0.4 ? hex('#b05630') : hex('#5e2616')));
  // flechas de ida y vuelta entre las fichas
  const L = hex(T.lavanda), W = hex('#ffffff');
  const flecha = (y, dir) => {
    for (let x = 44; x <= 51; x++) f.color[y * 96 + x] = L;
    const p = dir > 0 ? 51 : 44;
    f.color[(y - 1) * 96 + p - dir] = L; f.color[(y + 1) * 96 + p - dir] = L; f.color[y * 96 + p + dir] = W;
  };
  flecha(31, 1);
  flecha(36, -1);
  // marcador de sitio sobre el cráter terrestre
  const pin = ['.rrr.', 'rRwRr', 'rRRRr', '.rRr.', '..r..'];
  pin.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') f.color[(22 + y) * 96 + 26 + x] = hex(BASE[ch]); }));
  marco(f);
  guardar('tutorial/tutorial_1.png', f);
}

// ---------------------------------------------------------------- 2. arma tu robot: el robot en el taller con piezas alrededor
function tutorial2() {
  const f = createFrame(96, 64), M = rampa(PALETAS.base.metal);
  // pared del taller: placas de metal oscuro con agujeros, y piso
  pintar(f, 0, 0, 96, 64, (x, y) => {
    if (y >= 50) return y === 50 ? M[2] : (x + y) % 8 < 4 ? M[1] : M[0];
    if (x % 6 === 3 && y % 6 === 3) return hex('#1c2030');
    if (y % 24 === 0 || x % 32 === 0) return hex('#1c2030');
    return tramado([hex('#262c3e'), M[0]], 0.35 + (y / 50) * 0.3, x, y);
  });
  // plataforma de armado con franjas de seguridad
  for (let x = 30; x < 66; x++) for (let y = 47; y < 50; y++) f.color[y * 96 + x] = y === 47 ? M[3] : (x + y) % 6 < 3 ? hex(BASE.y) : K;
  const r = robot(f, 36, 47, { rueda: 'rueda_ancha', decos: [['deco_motor_potente', 0, 1], ['deco_bateria_grande', 18, 1]] });
  // luz de trabajo
  pintar(f, 34, 4, 28, 2, (x, y) => (y === 4 ? K : hex('#fff08a')));
  // piezas (íconos del taller) alrededor, con líneas punteadas hacia el robot
  const L = hex(PALETAS.titulo.lavanda);
  const piezas = [['rueda_ancha', 4, 30], ['motor_potente', 5, 8], ['bateria_grande', 75, 8], ['panel_solar', 76, 30]];
  for (const [id, x, y] of piezas) {
    const cx = x + 8, cy = y + 8, [tx, ty] = [r.carga[0], r.carga[1] + 6];
    const n = Math.max(Math.abs(tx - cx), Math.abs(ty - cy));
    for (let i = 10; i < n - 6; i += 3) { const px = Math.round(cx + ((tx - cx) * i) / n), py = Math.round(cy + ((ty - cy) * i) / n); f.color[py * 96 + px] = L; }
    panel(f, x - 1, y - 1, 18, 18);
    pegar(f, leer(`iconos/${id}.png`), x, y);
  }
  marco(f);
  guardar('tutorial/tutorial_2.png', f);
}

// ---------------------------------------------------------------- 3. pruébalo en la Tierra: el robot en las dunas, levantando arena
function tutorial3() {
  const f = createFrame(96, 64);
  fondo(f, 'dunas', 196, 92);
  suelo(f, 'tierra_arena', 50);
  const r = robot(f, 40, 52, { rueda: 'rueda_estandar', giro: 1 });
  // arena que salta detrás de las ruedas (el polvo fluye a la izquierda) y patinaje
  efecto(f, 'fx_polvo_tierra_arena', 3, r.trasera[0], r.trasera[1], [12, 14]);
  efecto(f, 'fx_polvo_tierra_arena', 6, r.trasera[0] + 15, r.trasera[1], [12, 14]);
  efecto(f, 'fx_patinaje', 4, r.trasera[0] - 2, r.trasera[1], [28, 25]);
  // granos de arena que saltan en arco detrás de cada rueda
  const A = PALETAS.tierra.arena;
  for (const [dx, dy, c] of [[-4, -5, 5], [-7, -8, 4], [-10, -9, 5], [-13, -7, 3], [-6, -11, 5], [-9, -4, 4], [-16, -4, 3], [-3, -9, 4]]) {
    for (const w of [r.trasera[0], r.trasera[0] + 15]) {
      f.color[(r.trasera[1] + dy) * 96 + w + dx] = c === 5 ? hex('#fff4d4') : hex(A[5]);
      if (c === 5) f.color[(r.trasera[1] + dy + 1) * 96 + w + dx] = hex(A[3]);   // sombra del grano
    }
  }
  // líneas de velocidad
  const W = hex('#f6d698');
  for (const [x, y, n] of [[14, 38, 6], [10, 43, 9], [18, 47, 4]]) for (let i = 0; i < n; i++) if (i % 3 < 2) f.color[y * 96 + x + i] = W;
  marco(f);
  guardar('tutorial/tutorial_3.png', f);
}

// ---------------------------------------------------------------- 4. misión: el robot entrega la caja al astronauta junto a la base
function tutorial4() {
  const f = createFrame(96, 64);
  fondo(f, 'marte', 30, 92);
  suelo(f, 'marte_arena', 52);
  pegar(f, leer('entidades/base.png'), 54, 52 - 24);
  pegar(f, leer('entidades/zona_entrega.png'), 34, 52);
  cuadro(f, 'entidades/baliza.png', 1, 4, 88, 44);
  cuadro(f, 'entidades/astronauta.png', 5, 10, 46, 52 - 17);       // saluda
  const r = robot(f, 14, 54, { rueda: 'rueda_ancha' });
  efecto(f, 'fx_entrega', 5, r.carga[0] + 1, r.carga[1]);
  marco(f);
  guardar('tutorial/tutorial_4.png', f);
}

// ---------------------------------------------------------------- imagen principal de la web: el robot llegando a la base en Marte
function portadaWeb() {
  const S = 120, f = createFrame(S, S);
  fondo(f, 'marte', 44, 36);
  suelo(f, 'marte_arena', 98);
  pegar(f, leer('entidades/base.png'), 76, 98 - 24);
  pegar(f, leer('entidades/zona_entrega.png'), 58, 98);
  cuadro(f, 'entidades/astronauta.png', 5, 10, 64, 98 - 17);
  const r = robot(f, 22, 100, { rueda: 'rueda_ancha', giro: 2, decos: [['deco_motor_eficiente', 0, 1], ['deco_panel_solar', 7, -2]] });
  efecto(f, 'fx_polvo_marte_arena', 4, r.trasera[0], r.trasera[1], [12, 14]);
  // obstáculos de recreación en el camino
  pegar(f, leer('obstaculos/obstaculo_roca_marte_2.png'), 4, 100 - 4);
  pegar(f, leer('obstaculos/obstaculo_roca_marte_1.png'), 50, 100 - 3);
  guardar('../docs/media/web_portada_960x960.png', escalar(f, 8));
}

function escalar(f, k) {
  const g = createFrame(f.w * k, f.h * k);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) g.color[y * g.w + x] = f.color[((y / k) | 0) * f.w + ((x / k) | 0)];
  return g;
}
