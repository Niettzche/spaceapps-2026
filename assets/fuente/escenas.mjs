// Escenas compuestas con el arte ya generado (sprites, fondos, tiles, efectos e íconos de /assets):
//   tutorial/tutorial_1..4.png  viñetas de 96 × 64 para la pantalla "Cómo jugar" (sin texto: el texto lo pone el juego)
//   ../docs/media/web_portada_960x960.png  imagen principal de la página web (escena de 120 × 120 × 8, sin texto).
//   ../docs/media/og_1200x630.png  imagen para compartir el enlace (240 × 126 × 5), con título y lema
//   ../docs/media/proyecto_space_apps.png  imagen de la página del proyecto (320 × 180 × 6 = 1920 × 1080), con marca de arte con IA
//     Estas van en docs/media y no en assets/, porque el Boot del juego precarga todas las imágenes de assets/.
//   ui/favicon_32.png, ui/favicon_180.png (apple-touch, sin transparencia) y ui/favicon.svg: el robot con la carga en Marte
//   pantallas/menu_fondo.png y pantallas/taller_fondo.png (320 × 180, sin texto, se dibujan × 3)
//   pantallas/resultado_<motivo>.png (96 × 64): una viñeta por cada motivo de fin de Resultados.js
//   pantallas/sitio_<id>.png y pantallas/destino_<id>.png (96 × 64): postales del Expediente (Tierra a la izquierda, destino a la derecha)
//   pantallas/menu_nave.png (320 × 180): estación en órbita para el menú de opciones (escotilla en el centro: 160, 92)
//   menu/nave.png: la misma estación sola (fondo transparente), 4 cuadros con luces que parpadean
//   piezas/<id>.png (32 × 32): piezas del Taller de arrastrar y soltar (los 19 ids de game/src/content/parts.json)
//   ../docs/media/slides/slide_<n>_<tema>.png  fondos de las 7 diapositivas (240 × 135 × 8 = 1920 × 1080), con espacio para texto
//   ../docs/media/iconos/<32|48>/<id>.png  íconos de keywords y de piezas ampliados × 2 y × 3 (vecino más cercano) para la web
// Correr después de los demás grupos: lee sus PNG del disco.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
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
  postales();
  menuNave();
  piezasGrandes();
  diapositivas();
  iconosWeb();
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

// ---------------------------------------------------------------- postales del Expediente (96 × 64, con el marco de las viñetas)
// Ilustraciones del tipo de paisaje de cada lugar, no reconstrucciones topográficas.
function postales() {
  const V = (nombre, dibuja) => { const f = createFrame(96, 64); dibuja(f); marco(f); guardar(`pantallas/${nombre}.png`, f); };
  const P = PALETAS;

  // Médanos de Samalayuca: dunas al atardecer
  V('sitio_samalayuca', (f) => fondo(f, 'dunas', 190, 100));

  // El Pinacate: el cráter El Elegante (maar ancho y hondo, con fondo claro) entre coladas de basalto y conos de ceniza
  V('sitio_pinacate', (f) => {
    fondo(f, 'lava', 150, 80);
    const TOBA = rampa(P.tierra.toba), BAS = rampa(P.tierra.roca), PLAYA = rampa(P.tierra.salar);
    const cx = 48, cy = 50, a = 40, b = 8, borde = 39;
    // llano de coladas de basalto alrededor del cráter, desde el pie de los conos
    pintar(f, 0, 37, 96, 27, (x, y) => tramado(BAS.slice(1, 5), 0.5 - (y - 37) / 40 + ((x * 5 + y * 7) % 9 === 0 ? 0.25 : 0), x, y));
    pintar(f, 0, 0, 96, 64, (x, y) => {
      const u = (x + 0.5 - cx) / a;
      if (Math.abs(u) >= 1) return 0;
      const sq = Math.sqrt(1 - u * u), lejos = cy - b * sq, cerca = cy + 2 * sq, arriba = Math.round(borde + (1 - sq) * 9);
      if (y < arriba) return 0;
      if (y < arriba + 2) return y === arriba ? BAS[4] : BAS[2];                                       // borde de basalto
      if (y < lejos) return tramado(TOBA, 0.25 + (0.5 - u * 0.35) * 0.6 + ((y - arriba) % 4 === 0 ? -0.15 : 0), x, y); // pared en capas
      if (y < cerca) return tramado(PLAYA, 0.4 + ((x * 7 + y * 3) % 5) * 0.06, x, y);                  // fondo claro (playa)
      return 0;
    });
    // colada cercana tapando el borde de acá
    pintar(f, 0, 46, 96, 18, (x, y) => (y >= 47 + Math.round(Math.sin(x * 0.3) * 1.5) ? tramado(BAS.slice(0, 5), 0.45 - (y - 47) / 30 + ((x * 5 + y * 7) % 9 === 0 ? 0.3 : 0), x, y) : 0));
  });

  // Real de Ángeles: el tajo escalonado de la mina
  V('sitio_mx0207', (f) => fondo(f, 'mina', 112, 82));

  // Al Wahbah: el maar con su fondo de sal
  V('sitio_g00281', (f) => fondo(f, 'maar', 112, 82));

  // Jabal Bayda (g00266): cono de toba clara sobre lava oscura
  V('sitio_g00266', (f) => {
    // el cono del fondo es demasiado ancho para 96 px: aquí va uno a la medida, sobre el cielo y el suelo del fondo de toba
    pegar(f, leer('fondos/fondo_toba_1.png'), 0, 0, { sx: 120, sy: 60, w: 96, h: 64 });
    const TOBA = rampa(P.tierra.toba_clara), HAR = rampa(P.tierra.harrat);
    pintar(f, 0, 0, 96, 64, (x, y) => {
      const u = Math.abs(x + 0.5 - 48) / 42;
      if (u >= 1 || y >= 46) return 0;
      const cima = u < 0.2 ? 24 - 2 + (u / 0.2) * 2 : 24 * Math.pow(1 - (u - 0.2) / 0.8, 1.1);
      const top = Math.round(46 - cima);
      if (y < top) return 0;
      if (y === top) return x > 48 ? TOBA[5] : TOBA[3];
      const lado = x > 48 ? 0.2 : -0.15, carcava = Math.sin(x * 1.7 + y * 0.2) > 0.9 && y > top + 2;
      return tramado(TOBA, 0.62 + lado - (y - top) / 60 - (carcava ? 0.2 : 0), x, y);
    });
    pegar(f, leer('fondos/fondo_toba_3.png'), 0, 40, { sx: 120, sy: 140, w: 96, h: 24 });
  });
  // Cananea (mx0023): tajo escalonado, otro encuadre de la mina (más bancos a la vista)
  V('sitio_mx0023', (f) => fondo(f, 'mina', 150, 92));
  // Al Hutaymah (g00263, camino dorado lunar): borde y pared del maar con su fondo plano
  V('sitio_g00263', (f) => fondo(f, 'maar', 52, 86));
  // Tenoumer (Sáhara): cráter de impacto de borde levantado y piso claro de sedimento, en la llanura con mesetas
  V('sitio_tenoumer', (f) => {
    fondo(f, 'sahara', 150, 80);
    const MES = rampa(P.tierra.meseta), REG = rampa(P.tierra.reg), SED = rampa(P.tierra.salar);
    const cx = 48, cy = 50, a = 36, b = 8;
    pintar(f, 0, 0, 96, 64, (x, y) => {
      const u = (x + 0.5 - cx) / (a + 6);
      if (Math.abs(u) >= 1) return 0;
      const sq = Math.sqrt(1 - u * u), borde = Math.round(cy - b * sq - 5 * sq);                     // borde levantado sobre el llano
      const ui = (x + 0.5 - cx) / a, sqi = Math.abs(ui) < 1 ? Math.sqrt(1 - ui * ui) : 0, lejos = cy - b * sqi, cerca = cy + 2 * sqi;
      if (y < borde) return 0;
      if (y < borde + 1) return REG[5];
      if (sqi === 0) return y < cy ? tramado(REG.slice(2, 6), 0.6, x, y) : 0;                         // faldas exteriores del borde
      if (y < lejos) return tramado(MES.slice(1, 6), 0.35 + (0.5 - ui * 0.4) * 0.6, x, y);            // pared interior
      if (y < cerca) return tramado(SED, 0.45 + ((x * 5 + y * 3) % 7) * 0.05, x, y);                  // piso de sedimento
      return 0;
    });
    pintar(f, 0, 52, 96, 12, (x, y) => tramado(REG.slice(1, 6), 0.6 - (y - 52) / 24 + ((x * 7 + y * 3) % 11 === 0 ? -0.3 : 0), x, y));
  });
  // Pingualuit (Ártico): cráter redondo con lago azul profundo, bordes nevados, tundra y nieve alrededor
  V('sitio_pingualuit', (f) => {
    fondo(f, 'artico', 150, 80);
    const NIE = rampa(P.tierra.nieve), TUN = rampa(P.tierra.tundra), LAGO = rampa(['#0c1a4a', '#16307e', '#2550d0', '#5a84b4']);
    const cx = 48, cy = 49, a = 38, b = 9;
    pintar(f, 0, 0, 96, 64, (x, y) => {
      const u = (x + 0.5 - cx) / a;
      if (Math.abs(u) >= 1) return 0;
      const sq = Math.sqrt(1 - u * u), borde = Math.round(cy - b * sq - 4 * sq), lejos = cy - b * sq * 0.7, cerca = cy + 2 * sq;
      if (y < borde) return 0;
      if (y < borde + 2) return y === borde ? NIE[4] : NIE[3];                                         // borde nevado
      if (y < lejos) return (x + y) % 3 === 0 ? TUN[2] : tramado(NIE.slice(0, 4), 0.55 - u * 0.25, x, y); // pared con roca y nieve
      if (y < cerca) return tramado(LAGO, 0.35 + (y - lejos) / 20 + (Math.sin(x * 0.8 - y) > 0.9 ? 0.4 : 0), x, y);   // lago
      return 0;
    });
    pintar(f, 0, 52, 96, 12, (x, y) => (tileFbm(x / 10, y / 4, 0, 0, 601, 2) > -0.05 ? tramado(NIE.slice(1, 5), 0.7 - (y - 52) / 30, x, y) : tramado(TUN, 0.5, x, y)));
  });

  // Cualquier otro sitio: desierto pedregoso
  V('sitio_generico', (f) => fondo(f, 'desierto', 40, 100));

  // Jezero: el borde del cráter al fondo, el delta (abanico en capas con frente escarpado) y el piso del cráter con rocas
  V('destino_jezero', (f) => {
    fondo(f, 'marte', 150, 70);
    const M = rampa(P.marte.compacto), A = rampa(P.marte.arena), RO = rampa(P.marte.roca);
    // delta: meseta de cima plana a la izquierda con estratos claros y oscuros y un frente escarpado
    pintar(f, 0, 0, 96, 64, (x, y) => {

      const top = 30 + Math.round(Math.max(0, x - 40) * 0.08 + Math.sin(x * 0.4) * 0.6);
      if (x > 62 || y < top || y > 46) return 0;
      if (x > 54 && y < top + (x - 54) * 1.6) return 0;                                                 // frente escarpado
      if (y === top) return A[5];
      const capa = (y - top) % 3;
      return capa === 0 ? M[4] : capa === 1 ? M[3] : M[2];
    });
    // piso del cráter
    pintar(f, 0, 46, 96, 18, (x, y) => tramado(A.slice(1, 6), 0.65 - (y - 46) / 28 + ((x * 13 + y * 7) % 11 === 0 ? 0.25 : 0), x, y));
    for (const [rx, ry, r] of [[70, 52, 2], [18, 56, 3], [84, 58, 2], [40, 54, 1.5]]) disco(f, rx, ry, r, (u, v) => (u + v < -0.3 ? RO[5] : u + v < 0.4 ? RO[3] : RO[1]));
  });

  // Polo sur lunar: borde de cráter iluminado por el Sol rasante y el fondo en sombra permanente
  V('destino_polo_sur_lunar', (f) => {
    fondo(f, 'luna', 210, 52);
    const L = rampa(P.luna.roca);
    const cx = 52, cy = 50, a = 40, b = 10;
    pintar(f, 0, 0, 96, 64, (x, y) => {
      const u = (x + 0.5 - cx) / a;
      if (Math.abs(u) >= 1) return 0;
      const sq = Math.sqrt(1 - u * u), lejos = cy - b * sq, borde = lejos - 6 * sq;
      if (y < borde) return 0;
      if (y < borde + 1) return L[6];                                                                    // borde iluminado
      if (y < lejos) return u > 0.1 ? tramado(L.slice(3), 0.7 - (y - borde) / 12, x, y) : L[1];         // pared al Sol / en sombra
      if (y < cy + 3 * sq) return hex('#000000');                                                        // sombra permanente
      return 0;
    });
    pintar(f, 0, 56, 96, 8, (x, y) => tramado(L.slice(2, 6), 0.55 - (y - 56) / 12 + ((x * 3 + y * 5) % 7 === 0 ? 0.2 : 0), x, y));
  });
}


// ---------------------------------------------------------------- nave del menú de opciones
// Estación en órbita con la Tierra y Marte al fondo. La escotilla queda en el centro exacto de la pantalla (160, 92 en px
// de arte; 480, 276 a × 3) para que la cámara haga zoom hacia ella; las 4 ventanas están en (124, 80), (138, 80), (182, 80)
// y (196, 80). La estación sola ocupa x 28..291, y 46..121 (NAVE_CAJA): ahí se encima menu/nave.png.
const NAVE_CAJA = { x: 28, y: 46, w: 264, h: 76 };
const ESCOTILLA = [160, 92], VENTANAS = [[124, 80], [138, 80], [182, 80], [196, 80]];

/** Dibuja la estación en f con su origen de pantalla en (-ox, -oy). luces: 0 apagadas, 1 encendidas (puntas y antena). */
function estacion(f, ox, oy, luces = 1) {
  const Mt = rampa(PALETAS.base.metal), px = (x, y, c) => { const X = x - ox, Y = y - oy; if (X >= 0 && Y >= 0 && X < f.w && Y < f.h) f.color[Y * f.w + X] = c; };
  const rect = (x0, y0, w, h, fn) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const c = fn(x, y); if (c) px(x, y, c); } };
  // armadura horizontal con travesaños en zigzag
  rect(30, 89, 260, 6, (x, y) => (y === 89 || y === 94 ? K : y === 90 ? Mt[3] : Math.abs(((x - 30) % 8) - (y - 90) * 2) < 1.2 ? Mt[2] : Mt[0]));
  // alas de paneles solares (arriba y abajo de la armadura, a cada lado)
  for (const x0 of [36, 226]) for (const [y0, h] of [[70, 18], [96, 18]]) {
    rect(x0, y0, 58, h, (x, y) => {
      if (x === x0 || x === x0 + 57 || y === y0 || y === y0 + h - 1) return K;
      if (x === x0 + 1 || y === y0 + 1) return Mt[2];
      const cx = (x - x0 - 2) % 7, cy = (y - y0 - 2) % 5;
      if (cx === 6 || cy === 4) return hex('#172a78');
      return cx < 2 && cy < 2 ? hex('#7cc8ff') : hex('#2550d0');
    });
    rect(x0 + 27, y0 + (y0 < 90 ? h : -1), 3, y0 < 90 ? 89 - (y0 + h) : (y0 - 95) + 1, () => Mt[1]);   // poste al centro del ala
  }
  // módulo central: cilindro horizontal con extremos redondeados, sombreado de arriba abajo
  const MOD = { x0: 110, x1: 210, y0: 66, y1: 118 };
  rect(MOD.x0 - 4, MOD.y0, MOD.x1 - MOD.x0 + 8, MOD.y1 - MOD.y0, (x, y) => {
    const ry = (MOD.y1 - MOD.y0) / 2, cy = MOD.y0 + ry, dy = (y + 0.5 - cy) / ry;
    const tapa = Math.sqrt(Math.max(0, 1 - dy * dy)) * 6;                        // extremos redondeados
    if (x < MOD.x0 - tapa + 2 || x > MOD.x1 + tapa - 2) return null;
    if (x < MOD.x0 - tapa + 3 || x > MOD.x1 + tapa - 3 || y === MOD.y0 || y === MOD.y1 - 1) return K;
    if ((x - MOD.x0) % 25 === 0) return Mt[1];                                    // juntas entre segmentos
    if (y >= 104 && y <= 106) return y === 105 ? hex('#f2701f') : hex('#a8301a');   // franja naranja de la misión
    const t = 1 - (y - MOD.y0) / (MOD.y1 - MOD.y0);
    return tramado([Mt[1], Mt[2], Mt[3], Mt[4]], clamp(0.15 + t * 0.8, 0, 1), x, y);
  });
  // antena y plato arriba
  rect(158, 52, 4, 14, (x) => (x === 158 ? Mt[3] : Mt[1]));
  rect(150, 48, 20, 5, (x, y) => { const d = Math.abs(x + 0.5 - 160) / 10; if (y - 48 < 4 * d * d) return null; return y === 52 ? K : d < 0.3 ? Mt[4] : Mt[2]; });
  // ventanas: marco oscuro, vidrio con luz cálida y brillo arriba a la izquierda
  for (const [vx, vy] of VENTANAS) rect(vx - 4, vy - 4, 9, 9, (x, y) => {
    const d = Math.hypot(x + 0.5 - vx - 0.5, y + 0.5 - vy - 0.5);
    if (d > 4.3) return null;
    if (d > 3.3) return K;
    if (d > 2.5) return Mt[1];
    return x - vx + y - vy < -1 ? hex('#fff08a') : hex('#ffd166');
  });
  // escotilla al centro: anillo de franjas de seguridad, puerta metálica con manija y luz de estado
  const [ex, ey] = ESCOTILLA;
  rect(ex - 13, ey - 13, 27, 27, (x, y) => {
    const dx = x + 0.5 - ex - 0.5, dy = y + 0.5 - ey - 0.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (d > 12.6) return null;
    if (d > 11.6) return K;
    if (d > 9.4) return Math.floor((a + Math.PI) / (Math.PI / 8)) % 2 ? hex('#ffd23c') : K;     // franjas amarillas y negras
    if (d > 8.4) return K;
    if (Math.abs(dx) < 1 && d < 6 || Math.abs(dy) < 1 && d < 6) return Mt[4];                    // manija en cruz
    if (d < 1.6) return Mt[1];
    return tramado([Mt[1], Mt[2], Mt[3]], clamp(0.7 - (dx + dy) / 20, 0, 1), x, y);
  });
  px(ex + 7, ey - 7, luces ? hex('#3ec466') : hex('#17663e'));                                 // luz verde de la escotilla
  // luces de navegación: roja a la izquierda, verde a la derecha, blanca en la antena
  const luz = (x, y, on, off) => { px(x, y, luces ? on : off); if (luces) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(x + dx, y + dy, on === hex('#ffffff') ? hex('#9fd8ff') : off); };
  luz(32, 91, hex('#ff5a4a'), hex('#6a101c'));
  luz(288, 91, hex('#3ec466'), hex('#17663e'));
  luz(160, 47, hex('#ffffff'), Mt[1]);
}

function menuNave() {
  const f = createFrame(320, 180), ESP = rampa(T.espacio);
  pintar(f, 0, 0, 320, 180, (x, y) => {
    const n = tileFbm(x / 70, y / 70, 0, 0, 311, 4), h = Math.sin(x * 127.1 + y * 311.7 + 5) * 43758.5453, r = h - Math.floor(h);
    if (r > 0.992) return r > 0.997 ? hex('#ffffff') : hex(T.estrella);
    return tramado(ESP.slice(0, 5), clamp(0.08 + (n + 0.25) * 0.45, 0, 0.8), x, y);
  });
  const OC = rampa(['#0c1a4a', '#16307e', '#2550d0', '#3f8cff', '#7cc8ff']), TI = rampa(['#173a1e', '#2f5a34', '#3ec466', '#9ad06a']);
  planeta(f, 46, 232, 118, (nx, ny, luz, x, y) => {
    const tierra = tileFbm(nx * 3 + 4, ny * 3, 0, 0, 303, 4) > 0.08, nube = tileFbm(nx * 5, ny * 9, 0, 0, 304, 3) > 0.28;
    if (nube && luz > 0.15) return tramado([hex('#b4c4e0'), hex('#ffffff')], luz, x, y);
    return tramado(tierra ? TI : OC, luz * 0.95, x, y);
  });
  planeta(f, 276, 38, 20, (nx, ny, luz, x, y) => tramado(rampa(T.marte), luz * 0.95 - (tileFbm(nx * 2.5, ny * 2.5, 0, 0, 306, 3) > 0.12 ? 0.18 : 0), x, y));
  estacion(f, 0, 0, 1);
  guardar('pantallas/menu_nave.png', f);
  // sprite aparte: 4 cuadros (encendidas, encendidas, apagadas, encendidas) para un parpadeo a 4 fps
  const N = [1, 1, 0, 1], spr = createFrame(NAVE_CAJA.w * N.length, NAVE_CAJA.h);
  N.forEach((on, i) => {
    const tmp = createFrame(NAVE_CAJA.w, NAVE_CAJA.h);
    estacion(tmp, NAVE_CAJA.x, NAVE_CAJA.y, on);
    pegar(spr, { w: tmp.w, h: tmp.h, color: tmp.color }, i * NAVE_CAJA.w, 0);
  });
  guardar('menu/nave.png', spr);
}

// ---------------------------------------------------------------- piezas grandes del Taller (32 × 32)
// Los íconos de 16 × 16 de assets/iconos/ ampliados × 2 (vecino más cercano): mismo dibujo, para la bandeja de arrastrar y soltar.
function piezasGrandes() {
  const partes = JSON.parse(readFileSync(join(ASSETS, '../game/src/content/parts.json'), 'utf8'));
  // las de parts.json, las nuevas del Taller (ids provisionales), el candado y las siluetas de las bloqueadas
  const EXTRA = ['sellos_polvo', 'candado', 'suspension_blanda', 'suspension_dura', 'faro', 'chasis_rocker_bogie',
    'silueta_orugas', 'silueta_patas', 'silueta_rotor', 'silueta_serpiente', 'silueta_rappel'];
  // piezas bloqueadas (SPRITES_PENDIENTES §7): piezas/<robot>.png con la silueta gris
  for (const robotB of ['orugas', 'patas', 'rotor', 'serpiente', 'rappel']) {
    const img = leer(`iconos/silueta_${robotB}.png`), f = createFrame(img.w, img.h);
    f.color.set(img.color);
    guardar(`piezas/${robotB}.png`, escalar(f, 2));
  }
  for (const id of [...new Set([...(partes.piezas ?? partes).map((x) => x.id), ...EXTRA])]) {
    const img = leer(`iconos/${id}.png`), f = createFrame(img.w, img.h);
    f.color.set(img.color);
    guardar(`piezas/${id}.png`, escalar(f, 2));
  }
}

// ---------------------------------------------------------------- diapositivas (240 × 135, se guardan × 8 = 1920 × 1080)
// Mismo tamaño de píxel que los sprites del juego. Cada una deja una zona tranquila para el texto (anotada abajo).
function estrellado(f, semilla = 0) {
  const ESP = rampa(T.espacio);
  pintar(f, 0, 0, f.w, f.h, (x, y) => {
    const n = tileFbm(x / 60, y / 60, 0, 0, 301 + semilla, 4), h = Math.sin(x * 127.1 + y * 311.7 + semilla * 17) * 43758.5453, r = h - Math.floor(h);
    if (r > 0.992) return r > 0.997 ? hex('#ffffff') : hex(T.estrella);
    return tramado(ESP.slice(0, 5), clamp(0.08 + (n + 0.25) * 0.45, 0, 0.8), x, y);
  });
}
function tierraPlaneta(f, cx, cy, r) {
  const OC = rampa(['#0c1a4a', '#16307e', '#2550d0', '#3f8cff', '#7cc8ff']), TI = rampa(['#173a1e', '#2f5a34', '#3ec466', '#9ad06a']);
  planeta(f, cx, cy, r, (nx, ny, luz, x, y) => {
    const tierra = tileFbm(nx * 3 + 4, ny * 3, 0, 0, 303, 4) > 0.08, nube = tileFbm(nx * 5, ny * 9, 0, 0, 304, 3) > 0.28;
    if (nube && luz > 0.15) return tramado([hex('#b4c4e0'), hex('#ffffff')], luz, x, y);
    return tramado(tierra ? TI : OC, luz * 0.95, x, y);
  });
}
const marteP = (f, cx, cy, r) => planeta(f, cx, cy, r, (nx, ny, luz, x, y) => tramado(rampa(T.marte), luz * 0.95 - (tileFbm(nx * 2.5, ny * 2.5, 0, 0, 306, 3) > 0.12 ? 0.18 : 0), x, y));
const lunaP = (f, cx, cy, r) => planeta(f, cx, cy, r, (nx, ny, luz, x, y) => tramado(rampa(PALETAS.luna.roca.slice(1)), luz * 0.95 - (tileFbm(nx * 3, ny * 3, 0, 0, 305, 3) > 0.15 ? 0.15 : 0), x, y));
function arcoPunteado(f, x0, y0, x1, y1, alto, color = hex(T.lavanda)) {
  for (let i = 0; i <= 200; i++) {
    const t = i / 200, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * alto);
    if (i % 8 < 4 && x >= 0 && y >= 0 && x < f.w && y < f.h) f.color[y * f.w + x] = color;
  }
}

function diapositivas() {
  const W = 240, H = 135, D = (n, tema, dibuja) => { const f = createFrame(W, H); dibuja(f); guardar(`../docs/media/slides/slide_${n}_${tema}.png`, escalar(f, 8)); };

  // 1 · portada: logo arriba, robot llegando a la base en Marte abajo a la derecha. Texto: abajo a la izquierda.
  D(1, 'portada', (f) => {
    fondo(f, 'marte', 60, 45, 0, 0, W, H);
    llegada(f, 112, 120, 186);
    titulo(f, 18, 2, 2);
    lema(f, LEMA_1, 40);
  });

  // 2 · el reto: la Tierra abajo a la izquierda, trayectorias a la Luna y a Marte. Texto: arriba a la izquierda.
  D(2, 'reto', (f) => {
    estrellado(f, 1);
    tierraPlaneta(f, 34, 150, 70);
    lunaP(f, 176, 40, 12);
    marteP(f, 212, 98, 18);
    arcoPunteado(f, 80, 102, 162, 44, 30);
    arcoPunteado(f, 96, 118, 192, 102, 18);
  });

  // 3 · el modelo: mapa con los sitios análogos de data/sites (todos los candidatos y, resaltados, los 4 jugables).
  // Costas: Natural Earth 1:110m (dominio público). Texto: sobre el océano Pacífico, a la izquierda.
  D(3, 'modelo', (f) => {
    const M = JSON.parse(readFileSync(join(ASSETS, 'fuente/datos/tierra_mapa.txt'), 'utf8'));
    const tierra = M.filas.map((r) => { const out = []; for (const t of r.split(',')) if (t) out.push(...Array(+t.slice(1)).fill(t[0] === '1')); return out; });
    const OC = rampa(['#0b1030', '#101a48', '#16265e']), TI = rampa(PALETAS.tierra.desierto_cerca.slice(1));
    pintar(f, 0, 0, W, H, (x, y) => {
      const lon = M.lon[0] + ((x + 0.5) / W) * (M.lon[1] - M.lon[0]), lat = M.lat[0] + ((y + 0.5) / H) * (M.lat[1] - M.lat[0]);
      const reticula = Math.abs(((lon % 30) + 30) % 30) < 0.8 || Math.abs(((lat % 30) + 30) % 30) < 0.8;
      if (tierra[y][x]) {
        const costa = !tierra[y - 1]?.[x] || !tierra[y + 1]?.[x] || !tierra[y][x - 1] || !tierra[y][x + 1];
        if (costa) return TI[4];
        return tramado(TI, 0.45 + tileFbm(x / 14, y / 14, 0, 0, 501, 3) * 0.6, x, y);
      }
      if (reticula && (x + y) % 2) return hex('#26346e');
      return tramado(OC, 0.5 + tileFbm(x / 40, y / 40, 0, 0, 502, 2) * 0.5, x, y);
    });
    const sitios = [];
    for (const nombre of readdirSync(join(ASSETS, '../data/sites'))) {
      const st = JSON.parse(readFileSync(join(ASSETS, '../data/sites', nombre), 'utf8'));
      if (st.lat != null && st.lon != null) sitios.push(st);
    }
    const aXY = (st) => [Math.round(((st.lon - M.lon[0]) / (M.lon[1] - M.lon[0])) * W - 0.5), Math.round(((st.lat - M.lat[0]) / (M.lat[1] - M.lat[0])) * H - 0.5)];
    const JUGABLES = ['samalayuca', 'pinacate', 'mx0207', 'g00281'];
    for (const st of sitios) if (!JUGABLES.includes(st.id)) {
      const [x, y] = aXY(st);
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) f.color[(y + dy) * W + x + dx] = K;
      f.color[y * W + x] = hex('#80e0dc');
    }
    for (const st of sitios) if (JUGABLES.includes(st.id)) {
      const [x, y] = aXY(st);
      disco(f, x, y, 3.2, (u, v, d) => (d > 0.8 ? K : d > 0.3 ? hex('#ffd166') : hex('#ffffff')));
    }
  });

  // 4 · el juego: el robot armado en el taller con piezas alrededor. Texto: a la izquierda.
  D(4, 'juego', (f) => {
    const Mt = rampa(PALETAS.base.metal), PARED = [hex('#141826'), hex('#1c2132'), hex('#262c3e')];
    pintar(f, 0, 0, W, H, (x, y) => {
      if (y >= 110) return y < 113 ? (y === 110 ? Mt[2] : (x + y) % 10 < 5 ? hex('#c8a01c') : hex('#1a1a22')) : tramado([hex('#1a1d2a'), hex('#22263a'), Mt[0]], 0.3 + (y - 113) / 50, x, y);
      if (y % 40 === 0 || x % 60 === 0) return hex('#0e101a');
      if (x > 128 && x < 236 && y > 12 && y < 100 && (x % 4 === 2) && (y % 4 === 2)) return hex('#0e101a');   // tablero perforado
      return tramado(PARED, 0.3 + (y / 110) * 0.4, x, y);
    });
    pintar(f, 150, 107, 64, 3, (x, y) => (y === 107 ? Mt[3] : (x + y) % 6 < 3 ? hex(BASE.y) : K));       // plataforma
    const r = robot(f, 170, 107, { rueda: 'rueda_ancha', decos: [['deco_motor_potente', 0, 1], ['deco_bateria_grande', 18, 1], ['deco_panel_solar', 7, -2]] });
    const L = hex(T.lavanda);
    for (const [id, x, y] of [['rueda_ancha', 136, 70], ['motor_potente', 140, 30], ['bateria_grande', 212, 30], ['panel_solar', 214, 70], ['radiador', 176, 18]]) {
      const cx = x + 8, cy = y + 8, [tx, ty] = [r.carga[0], r.carga[1] + 6], n = Math.max(Math.abs(tx - cx), Math.abs(ty - cy));
      for (let i = 11; i < n - 6; i += 3) f.color[Math.round(cy + ((ty - cy) * i) / n) * W + Math.round(cx + ((tx - cx) * i) / n)] = L;
      panel(f, x - 1, y - 1, 18, 18);
      pegar(f, leer(`iconos/${id}.png`), x, y);
    }
  });

  // 5 · la misión: el robot con la carga cruzando Marte hacia la base. Texto: arriba.
  D(5, 'mision', (f) => {
    fondo(f, 'marte', 20, 45, 0, 0, W, H);
    llegada(f, 112, 70, 170);
    pegar(f, leer('obstaculos/obstaculo_roca_marte_3.png'), 120, 109);
    pegar(f, leer('obstaculos/obstaculo_roca_marte_1.png'), 30, 111);
  });

  // 6 · lo que la Tierra no puede probar: la Tierra con su atmósfera y su campo magnético desviando la radiación;
  // afuera, vacío y rayos que pasan. Texto: a la derecha.
  D(6, 'limites', (f) => {
    pintar(f, 0, 0, W, H, (x, y) => ((Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1 > 0.994 ? hex('#cfc4ff') : hex('#05040a')));
    const cx = 70, cy = 68;
    // campo magnético: arcos lavanda alrededor
    for (const k of [1.5, 2.1, 2.8]) for (let i = 0; i < 360; i++) {
      const a = (i / 360) * Math.PI * 2, rr = 30 * k * Math.pow(Math.abs(Math.cos(a)), 0.5);
      const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr * 0.9);
      if (i % 6 < 3 && x >= 0 && y >= 0 && x < W && y < H) f.color[y * W + x] = hex(k < 2 ? '#7a4cff' : '#40188a');
    }
    // atmósfera azul y la Tierra
    disco(f, cx, cy, 33, (u, v, d) => (d > 0.93 ? hex('#3f8cff') : d > 0.88 ? hex('#16307e') : 0));
    tierraPlaneta(f, cx, cy, 28);
    // radiación: rayos que llegan desde la derecha; los que tocan el campo se desvían, los demás siguen en el vacío
    const R = [hex('#ff7a93'), hex('#ffd166')];
    for (let j = 0; j < 14; j++) {
      const y0 = 8 + j * 9, largo = 26 + (j * 7) % 14;
      let x = 236 - ((j * 37) % 30), y = y0;
      for (let i = 0; i < largo; i++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < 82) { y += y < cy ? -1 : 1; x -= 1; } else { x -= 2; y += (j % 3) - 1 > 0 && i % 4 === 0 ? 1 : 0; }
        if (x < 0 || y < 0 || x >= W || y >= H) break;
        if (i % 3 !== 2) f.color[y * W + x] = i < 3 ? hex('#ffffff') : R[j % 2];
      }
    }
  });

  // 7 · cierre: Marte grande con el borde morado, el logo y el lema. Texto: abajo (enlaces, equipo).
  D(7, 'cierre', (f) => {
    estrellado(f, 2);
    marteP(f, 120, 150, 90);
    titulo(f, 30, 3, 3);
    lema(f, LEMA_1, 62);
    lema(f, [['RUN IT ', B], ['ANYWHERE', T.lavanda], ['.', B]], 71);
  });
}

// ---------------------------------------------------------------- íconos grandes para la web (× 2 = 32 px, × 3 = 48 px)
function iconosWeb() {
  for (const nombre of readdirSync(join(ASSETS, 'iconos')).filter((n) => n.endsWith('.png')).sort()) {
    const img = leer(`iconos/${nombre}`), f = createFrame(img.w, img.h);
    f.color.set(img.color);
    guardar(`../docs/media/iconos/32/${nombre}`, escalar(f, 2));
    guardar(`../docs/media/iconos/48/${nombre}`, escalar(f, 3));
  }
}

export { leer as leerPNG };
