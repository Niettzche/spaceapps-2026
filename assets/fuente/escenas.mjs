// Escenas compuestas con el arte ya generado (sprites, fondos, tiles, efectos e íconos de /assets):
//   tutorial/tutorial_1..4.png  viñetas de 96 × 64 para la pantalla "Cómo jugar" (sin texto: el texto lo pone el juego)
//   ../docs/media/web_portada_960x960.png  imagen principal de la página web (escena de 120 × 120 × 8, sin texto).
//   ../docs/media/og_1200x630.png  imagen para compartir el enlace (240 × 126 × 5), con título y lema
//   ../docs/media/proyecto_space_apps.png  imagen de la página del proyecto (320 × 180 × 6 = 1920 × 1080), con marca de arte con IA
//     Estas van en docs/media y no en assets/, porque el Boot del juego precarga todas las imágenes de assets/.
//   ui/favicon_32.png, ui/favicon_180.png (apple-touch, sin transparencia) y ui/favicon.svg: el robot con la carga en Marte
//   pantallas/menu_fondo.png y pantallas/taller_fondo.png (320 × 180, sin texto, se dibujan × 3)
//   pantallas/resultado_<motivo>.png (96 × 64): una viñeta por cada motivo de fin de Resultados.js
// Correr después de los demás grupos: lee sus PNG del disco.
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFrame, guardar, rampa, tramado, clamp, hex, BASE, core, tileFbm } from './comun.mjs';
import { PALETAS } from './paletas.mjs';
import { textoTitulo, lema } from './titulo.mjs';

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
/** Las 3 capas de un fondo, recortadas desde (sx, sy). Los fondos se repiten a lo ancho: si el recorte se pasa del borde, da la vuelta. */
function fondo(f, clave, sx, sy, x = 0, y = 0, w = f.w, h = f.h) {
  for (const n of [1, 2, 3]) {
    const img = leer(`fondos/fondo_${clave}_${n}.png`), a = Math.min(w, img.w - sx);
    pegar(f, img, x, y, { sx, sy, w: a, h });
    if (a < w) pegar(f, img, x + a, y, { sx: 0, sy, w: w - a, h });
  }
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
function robot(f, x, suelo_, { rueda = 'rueda_estandar', chasis = 'chasis_ligero', giro = 0, conCarga = true, decos = [], danado = false, carga = 0 } = {}) {
  const r = leer(`entidades/${rueda}.png`), rw = r.h, top = suelo_ - 10;
  cuadro(f, `entidades/${chasis}.png`, danado ? 1 : 0, 24, x, top);
  for (const d of decos) pegar(f, leer(`entidades/${d[0]}.png`), x + d[1], top + d[2]);
  cuadro(f, `entidades/${rueda}.png`, giro % 4, rw, x + 1, suelo_ - rw);
  cuadro(f, `entidades/${rueda}.png`, (giro + 1) % 4, rw, x + 23 - rw, suelo_ - rw);
  if (conCarga) {
    pegar(f, leer('entidades/soporte_basico.png'), x + 7, top - 4);
    cuadro(f, 'entidades/carga.png', carga, 7, x + 8, top - 8);
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
  imagenCompartir();
  imagenProyecto();
  favicons();
  pantallas();
}

const T = PALETAS.titulo, B = '#e8e2ff';
const LEMA_1 = [['TRAIN ON ', B], ['EARTH', T.tierra], ['. LAND ON THE ', B], ['MOON', T.luna], [' / ', B], ['MARS', T.rojo], ['.', B]];
const titulo = (f, y, scale, sombraDy) => textoTitulo(f, 'MARSCEPTION', f.w / 2, y, { scale, rampaTexto: T.logo, contorno: '#0d051c', sombra: '#2e0d6b', sombraDy });

/** Escena común: el robot con la carga llega a la base en Marte, con el astronauta, sobre el suelo en y = s. */
function llegada(f, s, xRobot, xBase) {
  suelo(f, 'marte_arena', s);
  pegar(f, leer('entidades/base.png'), xBase, s - 24);
  pegar(f, leer('entidades/zona_entrega.png'), xBase - 18, s);
  cuadro(f, 'entidades/baliza.png', 2, 4, xBase + 42, s - 8);
  cuadro(f, 'entidades/astronauta.png', 5, 10, xBase - 12, s - 17);
  const r = robot(f, xRobot, s + 2, { rueda: 'rueda_ancha', giro: 2, decos: [['deco_motor_eficiente', 0, 1], ['deco_panel_solar', 7, -2]] });
  efecto(f, 'fx_polvo_marte_arena', 4, r.trasera[0], r.trasera[1], [12, 14]);
  pegar(f, leer('obstaculos/obstaculo_roca_marte_2.png'), xRobot - 18, s + 2 - 4);
}

// ---------------------------------------------------------------- imagen para compartir (Open Graph, 1200 × 630)
function imagenCompartir() {
  const f = createFrame(240, 126);
  fondo(f, 'marte', 40, 58, 0, 0, 240, 126);
  llegada(f, 104, 70, 150);
  titulo(f, 14, 2, 2);
  lema(f, LEMA_1, 36);
  guardar('../docs/media/og_1200x630.png', escalar(f, 5));
}

// ---------------------------------------------------------------- imagen del proyecto en la plataforma de Space Apps (1920 × 1080)
function imagenProyecto() {
  const f = createFrame(320, 180);
  fondo(f, 'marte', 60, 0, 0, 0, 320, 180);   // el sol queda a la izquierda del título
  llegada(f, 152, 104, 214);
  titulo(f, 30, 3, 3);
  lema(f, LEMA_1, 64);
  lema(f, [['RUN IT ', B], ['ANYWHERE', T.lavanda], ['.', B]], 73);
  // marca visible de arte hecho con ayuda de IA (la plataforma pide marcar lo generado con IA)
  const marca = 'AI-ASSISTED PIXEL ART';
  lema(f, [[marca, T.lavanda]], 171, 320 - 4 - core.textWidth(marca, 'mini') / 2);
  guardar('../docs/media/proyecto_space_apps.png', escalar(f, 6));
}

// ---------------------------------------------------------------- favicons: el robot con la carga sobre suelo de Marte
function icono(n, redondeo) {
  const f = createFrame(n, n), ESP = T.espacio, A = PALETAS.marte.arena, m = (n - 24) >> 1, s = n - 5;
  pintar(f, 0, 0, n, n, (x, y) => {
    // esquinas redondeadas (transparentes) en el de 32; el de 180 va lleno (iOS lo redondea)
    if (redondeo) {
      const cx = Math.min(x, n - 1 - x), cy = Math.min(y, n - 1 - y);
      if (cx + cy < redondeo) return 0;
    }
    if (y >= s) return y === s ? hex(A[5]) : (x * 3 + y * 5) % 7 < 2 ? hex(A[2]) : hex(A[3]);
    return tramado(rampa(ESP.slice(1, 5)), 0.15 + (y / s) * 0.5, x, y);
  });
  for (const [x, y] of [[3, 3], [n - 6, 5], [n - 3, 11], [6, 9]]) f.color[y * n + x] = hex(T.estrella);
  robot(f, m, s + 1, { rueda: 'rueda_ancha' });
  return f;
}
function favicons() {
  const f32 = icono(32, 3);
  guardar('ui/favicon_32.png', f32);
  guardar('ui/favicon_180.png', escalar(icono(36, 0), 5));
  // SVG: un rectángulo por cada tramo horizontal del mismo color del ícono de 32 (nítido a cualquier tamaño)
  const rects = [];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32;) {
    const c = f32.color[y * 32 + x];
    let x2 = x + 1;
    while (x2 < 32 && f32.color[y * 32 + x2] === c) x2++;
    if (c >>> 24) rects.push(`<rect x="${x}" y="${y}" width="${x2 - x}" height="1" fill="#${[0, 8, 16].map((sh) => ((c >>> sh) & 255).toString(16).padStart(2, '0')).join('')}"/>`);
    x = x2;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${rects.join('')}</svg>
`;
  writeFileSync(join(ASSETS, 'ui/favicon.svg'), svg);
  console.log(`  ui/favicon.svg  32×32 (${rects.length} rectángulos)`);
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

// ---------------------------------------------------------------- fondos de pantallas y viñetas de resultado
function pantallas() {
  menuFondo();
  tallerFondo();
  resultados();
}

/** Esfera iluminada desde la izquierda: color(nx, ny, luz, x, y) → color; r en px. */
function planeta(f, cx, cy, r, color) {
  pintar(f, Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(2 * r + 4), Math.ceil(2 * r + 4), (x, y) => {
    const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r, d2 = nx * nx + ny * ny;
    if (d2 > 1) return d2 < (1 + 1.6 / r) ** 2 && nx < 0.2 ? hex(T.borde_luz[0]) : 0;   // halo del lado iluminado
    const nz = Math.sqrt(1 - d2), luz = clamp(-nx * 0.7 - ny * 0.35 + nz * 0.6, 0, 1);
    return color(nx, ny, luz, x, y);
  });
}

// Menú: la Tierra abajo a la izquierda y la Luna y Marte a la derecha, unidos por trayectorias punteadas
// ("entrena en la Tierra, aterriza en la Luna o Marte"). El centro queda libre para los botones.
function menuFondo() {
  const f = createFrame(320, 180), ESP = rampa(T.espacio);
  pintar(f, 0, 0, 320, 180, (x, y) => {
    const n = tileFbm(x / 70, y / 70, 0, 0, 301, 4), h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453, s = h - Math.floor(h);
    if (s > 0.992) return s > 0.997 ? hex('#ffffff') : hex(T.estrella);   // estrellas escasas
    return tramado(ESP.slice(0, 5), clamp(0.1 + (n + 0.25) * 0.5, 0, 0.85), x, y);
  });
  const OC = rampa(['#0c1a4a', '#16307e', '#2550d0', '#3f8cff', '#7cc8ff']), TI = rampa(['#173a1e', '#2f5a34', '#3ec466', '#9ad06a']);
  planeta(f, 38, 196, 84, (nx, ny, luz, x, y) => {
    const tierra = tileFbm(nx * 3 + 4, ny * 3, 0, 0, 303, 4) > 0.08, nube = tileFbm(nx * 5, ny * 9, 0, 0, 304, 3) > 0.28;
    if (nube && luz > 0.15) return tramado([hex('#b4c4e0'), hex('#ffffff')], luz, x, y);
    return tramado(tierra ? TI : OC, luz * 0.95, x, y);
  });
  const LU = rampa(PALETAS.luna.roca.slice(1)), MA = rampa(T.marte);
  planeta(f, 268, 40, 15, (nx, ny, luz, x, y) => tramado(LU, luz * 0.95 - (tileFbm(nx * 3, ny * 3, 0, 0, 305, 3) > 0.15 ? 0.15 : 0), x, y));
  planeta(f, 290, 116, 24, (nx, ny, luz, x, y) => tramado(MA, luz * 0.95 - (tileFbm(nx * 2.5, ny * 2.5, 0, 0, 306, 3) > 0.12 ? 0.18 : 0), x, y));
  // trayectorias: arcos punteados desde la Tierra hasta cada destino
  const L = hex(T.lavanda);
  const arco = (x0, y0, x1, y1, alto) => {
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * alto;
      if (i % 6 < 3) f.color[Math.round(y) * 320 + Math.round(x)] = L;
    }
  };
  arco(96, 132, 248, 46, 34);
  arco(108, 150, 262, 120, 20);
  guardar('pantallas/menu_fondo.png', f);
}

// Taller: pared de placas oscuras con tablero de herramientas, una ventana del hangar con Marte afuera y el piso con
// franjas de seguridad. Tonos bajos para que la interfaz del Taller se lea encima.
function tallerFondo() {
  const f = createFrame(320, 180), M = rampa(PALETAS.base.metal), PARED = [hex('#141826'), hex('#1c2132'), hex('#262c3e')];
  pintar(f, 0, 0, 320, 180, (x, y) => {
    if (y >= 150) {
      if (y < 153) return y === 150 ? M[2] : (x + y) % 10 < 5 ? hex('#c8a01c') : hex('#1a1a22');   // franja de seguridad
      return tramado([hex('#1a1d2a'), hex('#22263a'), M[0]], 0.3 + (y - 153) / 60 + ((x >> 4) % 2) * 0.1, x, y);
    }
    if (y % 40 === 0 || x % 64 === 0) return hex('#0e101a');                                             // juntas de placas
    if ((x % 64 === 2 || x % 64 === 61) && y % 40 === 4) return M[1];                                      // remaches
    return tramado(PARED, 0.35 + (y / 150) * 0.4, x, y);
  });
  // ventana del hangar con Marte afuera (paisaje del fondo de Marte, recortado)
  const win = { x: 128, y: 26, w: 64, h: 44 };
  for (const n of [1, 2, 3]) pegar(f, leer(`fondos/fondo_marte_${n}.png`), win.x, win.y, { sx: 40, sy: 96, w: win.w, h: win.h });
  pintar(f, win.x - 3, win.y - 3, win.w + 6, win.h + 6, (x, y) => {
    const dentro = x >= win.x && x < win.x + win.w && y >= win.y && y < win.y + win.h;
    if (dentro) return x === win.x + 32 || y === win.y + 22 ? M[0] : 0;                                    // marco en cruz
    return x === win.x - 3 || y === win.y - 3 ? M[3] : M[1];
  });
  // tableros perforados con siluetas de herramientas a los lados
  const tablero = (x0, y0) => {
    pintar(f, x0, y0, 56, 40, (x, y) => (x === x0 || y === y0 || x === x0 + 55 || y === y0 + 39 ? M[1] : (x - x0) % 4 === 2 && (y - y0) % 4 === 2 ? hex('#0e101a') : hex('#2a3046')));
    const H = M[2];
    for (let i = 0; i < 12; i++) { f.color[(y0 + 8 + i) * 320 + x0 + 10] = H; f.color[(y0 + 8 + i) * 320 + x0 + 11] = H; }   // destornillador
    for (const [dx, dy] of [[9, 6], [12, 6], [9, 7], [12, 7]]) f.color[(y0 + dy) * 320 + x0 + dx] = hex('#f2701f');
    for (let i = 0; i < 16; i++) f.color[(y0 + 10 + i) * 320 + x0 + 24 + (i >> 3)] = H;                                       // llave
    for (const [dx, dy] of [[22, 8], [23, 8], [26, 8], [27, 8], [22, 9], [27, 9]]) f.color[(y0 + dy) * 320 + x0 + dx] = H;
    pintar(f, x0 + 36, y0 + 10, 12, 8, () => M[2]);                                                                         // martillo
    for (let i = 0; i < 12; i++) f.color[(y0 + 18 + i) * 320 + x0 + 41] = hex('#8a5a36');
  };
  tablero(20, 40);
  tablero(244, 40);
  // banco de trabajo con una rueda y una batería encima
  pintar(f, 18, 120, 70, 4, (x, y) => (y === 120 ? M[3] : M[1]));
  pintar(f, 22, 124, 3, 26, () => M[0]); pintar(f, 81, 124, 3, 26, () => M[0]);
  pegar(f, leer('iconos/rueda_ancha.png'), 30, 104);
  pegar(f, leer('iconos/bateria_grande.png'), 56, 104);
  // lámparas colgantes
  for (const lx of [100, 220]) {
    pintar(f, lx, 0, 1, 10, () => M[0]);
    pintar(f, lx - 4, 10, 9, 3, (x, y) => (y === 12 ? hex('#fff08a') : M[1]));
  }
  guardar('pantallas/taller_fondo.png', f);
}

/** Pega un cuadro temporal girado (vecino más cercano) con su centro en (cx, cy). */
function girado(f, tmp, cx, cy, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), R = Math.ceil(Math.hypot(tmp.w, tmp.h) / 2);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const u = Math.round(c * x + s * y + tmp.w / 2 - 0.5), v = Math.round(-s * x + c * y + tmp.h / 2 - 0.5);
    if (u < 0 || v < 0 || u >= tmp.w || v >= tmp.h) continue;
    const col = tmp.color[v * tmp.w + u], X = cx + x, Y = cy + y;
    if (col >>> 24 && X >= 0 && Y >= 0 && X < f.w && Y < f.h) f.color[Y * f.w + X] = col;
  }
}
/** Robot dibujado aparte (32 × 24, suelo en y = 22) para girarlo. */
function robotSuelto(op) {
  const t = createFrame(32, 24);
  robot(t, 4, 22, op);
  return t;
}

// Una viñeta por motivo de fin (Resultados.js → MOTIVOS). Mismo marco que las del tutorial.
function resultados() {
  const V = (motivo, dibuja) => { const f = createFrame(96, 64); dibuja(f); marco(f); guardar(`pantallas/resultado_${motivo}.png`, f); };
  const W = hex('#ffffff');

  V('entrega', (f) => {
    fondo(f, 'marte', 30, 92); suelo(f, 'marte_arena', 52);
    pegar(f, leer('entidades/base.png'), 54, 28); pegar(f, leer('entidades/zona_entrega.png'), 34, 52);
    cuadro(f, 'entidades/astronauta.png', 10, 10, 44, 35);                       // celebra
    const r = robot(f, 12, 54, { rueda: 'rueda_ancha' });
    efecto(f, 'fx_entrega', 6, r.carga[0] + 1, r.carga[1]);
  });
  V('meta', (f) => {
    fondo(f, 'dunas', 196, 92); suelo(f, 'tierra_arena', 50);
    cuadro(f, 'entidades/meta.png', 1, 8, 58, 34);
    robot(f, 62, 52, { rueda: 'rueda_ancha' });
    efecto(f, 'fx_meta', 5, 62, 30);
  });
  V('chasis_destruido', (f) => {
    fondo(f, 'lava', 150, 92); suelo(f, 'tierra_roca', 50);
    robot(f, 36, 52, { danado: true, conCarga: false });
    cuadro(f, 'entidades/carga.png', 2, 7, 66, 45);
    efecto(f, 'fx_chasis_destruido', 6, 48, 40);
  });
  V('carga_perdida', (f) => {
    fondo(f, 'desierto', 120, 92); suelo(f, 'tierra_compacto', 50);
    robot(f, 50, 52, { conCarga: false });
    pegar(f, leer('entidades/soporte_basico.png'), 57, 38);
    cuadro(f, 'entidades/carga.png', 2, 7, 22, 45);                              // la caja quedó atrás, rota
    efecto(f, 'fx_carga_perdida', 7, 25, 47);
  });
  V('volcado', (f) => {
    fondo(f, 'marte', 120, 92); suelo(f, 'marte_roca', 52);
    girado(f, robotSuelto({ conCarga: false }), 48, 51, Math.PI);                // de cabeza, ruedas arriba
    for (const [x, y] of [[38, 37], [58, 37], [34, 40], [62, 40]]) f.color[y * 96 + x] = W;   // ruedas que siguen girando
  });
  V('energia_agotada', (f) => {
    fondo(f, 'luna', 60, 92); suelo(f, 'luna_arena', 50);
    robot(f, 36, 52);
    efecto(f, 'fx_energia_agotada_luna', 6, 40, 38);
    pegar(f, leer('ui/ui_icono_energia.png'), 68, 18);
    for (let y = 21; y < 25; y++) for (let x = 70; x < 73; x++) f.color[y * 96 + x] = hex('#2e3648');   // batería vacía
    f.color[19 * 96 + 78] = hex(BASE.r); f.color[20 * 96 + 78] = hex(BASE.r); f.color[22 * 96 + 78] = hex(BASE.r);
  });
  V('atascado', (f) => {
    fondo(f, 'dunas', 60, 92); suelo(f, 'tierra_arena', 50);
    for (let x = 0; x < 96; x += 16) pegar(f, leer('obstaculos/obstaculo_arena_blanda.png'), x, 47);
    const r = robot(f, 36, 55);                                                    // hundido 3 px en la arena
    pintar(f, 34, 50, 28, 2, (x, y) => (y === 50 ? hex(PALETAS.tierra.arena[5]) : hex(PALETAS.tierra.arena[4])));
    efecto(f, 'fx_patinaje', 3, r.trasera[0], 52, [28, 25]);
    // reloj de 15 s
    disco(f, 78, 16, 6, (u, v, d) => (d > 0.8 ? K : hex('#e8e2ff')));
    for (let i = 0; i < 5; i++) f.color[(12 + i) * 96 + 78] = K;
    for (let i = 0; i < 4; i++) f.color[16 * 96 + 78 + i] = K;
  });
  V('carga_danada', (f) => {
    fondo(f, 'marte', 30, 92); suelo(f, 'marte_arena', 52);
    pegar(f, leer('entidades/base.png'), 54, 28); pegar(f, leer('entidades/zona_entrega.png'), 34, 52);
    cuadro(f, 'entidades/astronauta.png', 0, 10, 46, 35);                        // en reposo: no celebra
    robot(f, 16, 54, { carga: 1 });
    pegar(f, leer('ui/ui_icono_carga.png'), 22, 14);
    f.color[17 * 96 + 32] = hex(BASE.r); f.color[18 * 96 + 32] = hex(BASE.r); f.color[20 * 96 + 32] = hex(BASE.r);
  });
  V('abandono', (f) => {
    fondo(f, 'desierto', 200, 92); suelo(f, 'tierra_compacto', 50);
    robot(f, 36, 52);
    // bandera blanca en un poste sobre la carga
    for (let y = 22; y < 40; y++) f.color[y * 96 + 50] = hex('#9aa6ba');
    pintar(f, 51, 22, 8, 5, (x, y) => ((x + y) % 4 === 0 ? hex('#d0d8e6') : W));
  });
  V('caida', (f) => {
    fondo(f, 'luna', 200, 92);
    // borde de un precipicio: suelo solo a la izquierda
    pintar(f, 0, 38, 40, 26, (x, y) => (x > 36 + (y - 38) * 0.2 ? 0 : y === 38 ? hex('#b4b4c0') : tramado(rampa(PALETAS.luna.roca.slice(1, 6)), 0.6 - (y - 38) / 40, x, y)));
    girado(f, robotSuelto({}), 60, 46, 0.7);                                         // cae inclinado
    for (const [x, y, n] of [[52, 24, 4], [64, 22, 5], [74, 28, 3]]) for (let i = 0; i < n; i++) f.color[(y - i) * 96 + x] = hex('#e8e8f0');
  });
}
export { leer as leerPNG };
