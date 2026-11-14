// Utilidades compartidas del generador de arte de MARSCEPTION.
// Dibuja con el painter de pixelfx (https://github.com/patch-gg/pixelfx, MIT) y guarda PNG con su codificador.
// Ruta de pixelfx: variable de entorno PIXELFX o, por defecto, ../../../tools/pixelfx desde esta carpeta.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const ASSETS = resolve(AQUI, '..');
const PFX = resolve(process.env.PIXELFX ?? join(AQUI, '..', '..', '..', 'tools', 'pixelfx'));
const core = await import(pathToFileURL(join(PFX, 'src', 'core', 'index.js')).href);
const { encodePNG } = await import(pathToFileURL(join(PFX, 'tools', 'lib', 'png.mjs')).href);
export const { createFrame, painterFor, composite, hex, mix, scale, tileFbm, tileNoise, clamp, lerp, TAU, Rng } = core;
export { core, encodePNG };

// ---------- paleta base (robot, interfaz, personajes) ----------
// Contorno oscuro de 1 px, metales fríos, acento naranja saturado y luz de borde turquesa (estilo acordado, §1 de ASSETS_ARTE.md).
export const BASE = {
  k: '#0e0c16', // contorno
  d: '#2e3648', m: '#4a5468', l: '#9aa6ba', h: '#d0d8e6', w: '#ffffff', // metal / traje
  o: '#f2701f', O: '#a8301a', // acento naranja
  y: '#ffd23c', Y: '#fff08a', // luces
  c: '#4ce8d8', C: '#108088', // luz de borde turquesa
  r: '#d42a30', R: '#6a101c', // alerta
  v: '#172a78', V: '#7cc8ff', // visor
  T: '#5c5c6b', t: '#2c2c38', g: '#1c1c24', // llanta
  x: '#1c1a22', // quemado
  e: '#3ec466', E: '#17663e', // energía (verde)
  s: '#2550d0', S: '#7cc8ff', // panel solar
};

/** Dibuja filas de texto con la paleta (pixelfx p.sprite). '.' = vacío. */
export function filas(p, rows, x = 0, y = 0, pal = BASE) {
  const w = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== w) throw new Error(`fila ${i} mide ${r.length}, se esperaba ${w}: "${r}"`); });
  p.sprite(rows, pal, x, y);
}

/** Contorno de 1 px (4 vecinos) alrededor de todo lo dibujado en el rectángulo, dentro del cuadro. */
export function contorno(frame, x0, y0, w, h, color = BASE.k) {
  const C = frame.color, W = frame.w, c = hex(color);
  const lleno = (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h && C[y * W + x] >>> 24 > 0;
  const marcar = [];
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++)
      if (!lleno(x, y) && (lleno(x - 1, y) || lleno(x + 1, y) || lleno(x, y - 1) || lleno(x, y + 1))) marcar.push(y * W + x);
  for (const i of marcar) C[i] = c;
}

/**
 * Tira horizontal de n cuadros de w × h. dibuja(p, i, frame, x0) pinta el cuadro i con el origen en su esquina superior izquierda.
 * opts.contorno: añade el contorno automático a cada cuadro.
 */
export function tira(ruta, w, h, n, dibuja, opts = {}) {
  const frame = createFrame(w * n, h);
  for (let i = 0; i < n; i++) {
    const p = painterFor(frame);
    p.place(i * w, 0);
    dibuja(p, i, frame, i * w);
    if (opts.contorno !== false) contorno(frame, i * w, 0, w, h);
  }
  guardar(ruta, frame);
  return frame;
}

export const registro = [];
export function guardar(ruta, frame) {
  registro.push({ ruta, frame });
  const out = new Uint8ClampedArray(frame.w * frame.h * 4);
  composite(frame, out, null);
  const abs = join(ASSETS, ruta);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, encodePNG(frame.w, frame.h, out));
  console.log(`  ${ruta}  ${frame.w}×${frame.h}`);
}

/** Umbral de Bayer 4×4 (0..1) para tramados ordenados a mano. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
/** Paso de rampa con tramado ordenado: t en 0..1. */
export function tramado(rampa, t, x, y) {
  const f = clamp(t, 0, 1) * (rampa.length - 1), i = Math.floor(f);
  return rampa[Math.min(rampa.length - 1, i + (f - i > bayer(x, y) ? 1 : 0))];
}
export const rampa = (lista) => lista.map(hex);
