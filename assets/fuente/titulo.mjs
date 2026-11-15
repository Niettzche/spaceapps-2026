// Pantalla de título de MARSCEPTION en 320 × 180 (la versión del juego del GIF de título de 400 × 225).
// titulo/titulo_fondo.png: espacio morado y Marte, sin texto (para poner encima el texto o los botones con código).
// titulo/titulo.png: lo mismo con el logotipo y el lema.
// Paleta base del título (docs/juego/ASSETS_ARTE.md §1): morados del espacio, naranja óxido de Marte, lavanda en la UI.
import { createFrame, painterFor, guardar, tileFbm, tileNoise, rampa, tramado, clamp, hex, core } from './comun.mjs';
import { PALETAS } from './paletas.mjs';

const W = 320, H = 180;
const { textWidth } = core;

function fondo(f) {
  const T = PALETAS.titulo, ESP = rampa(T.espacio), MARTE = rampa(T.marte), RIM = rampa(T.borde_luz);
  const MC = [160, 108], R = 76;
  const L = norm([-0.6, -0.5, 0.62]), RD = norm([0.9, -0.2, 0.2]);
  painterFor(f).shade(0, 0, W, H, (px, py) => {
    const x = Math.floor(px), y = Math.floor(py);
    const dx = (x + 0.5 - MC[0]) / R, dy = (y + 0.5 - MC[1]) / R, d2 = dx * dx + dy * dy;
    if (d2 <= 1) {
      // Marte: textura fija sobre la esfera, luz desde arriba a la izquierda, borde morado a la derecha
      const nz = Math.sqrt(1 - d2), n = [dx, dy, nz];
      const lam = clamp(dot(n, L), 0, 1);
      const h = tileFbm(dx * 3 + 7, dy * 3 + nz * 2, 0, 0, 91, 5), mar = tileFbm(dx * 1.8 - 3, dy * 1.8 + nz, 0, 0, 92, 4);
      let t = 0.1 + lam * 0.85 + h * 0.3 - (mar > 0.12 ? 0.22 : 0);
      let c = tramado(MARTE, t, x, y);
      const rim = clamp(dot(n, RD), 0, 1) * Math.pow(1 - nz, 1.5);
      if (rim > 0.22 + ((x * 7 + y * 3) % 4) * 0.04) c = rim > 0.42 ? RIM[1] : RIM[0];
      return c;
    }
    const dd = Math.sqrt(d2);
    if (dd < 1 + 2.5 / R && dx > -0.3) return dd < 1 + 1.2 / R ? RIM[0] : ESP[3];   // halo atmosférico
    // nebulosa morada con tramado y estrellas
    const n1 = tileFbm(x / 60, y / 60, 0, 0, 93, 5), n2 = tileFbm(x / 24 + 4, y / 24, 0, 0, 94, 3);
    const s = tileNoise(x * 1.7, y * 1.7, 0, 0, 95);
    if (s > 0.93) return s > 0.975 ? hex('#ffffff') : hex(T.estrella);
    return tramado(ESP, clamp(0.12 + (n1 + 0.2) * 0.55 + Math.max(0, n2) * 0.25, 0, 0.92), x, y);
  });
}

/** Texto con relleno en degradado (blanco → lavanda → morado), contorno y sombra, como el logotipo del GIF. */
function textoTitulo(f, str, cx, y, { font = 'big', scale = 1, rampaTexto, contorno, sombra, sombraDy = 1 }) {
  const tmp = createFrame(W, H);
  painterFor(tmp).text(str, cx, y, hex('#ffffff'), { font, scale, align: 'center' });
  const M = tmp.color, C = f.color, alto = (font === 'big' ? 7 : 5) * scale;
  const lleno = (x, y) => x >= 0 && y >= 0 && x < W && y < H && M[y * W + x];
  const R = rampa(rampaTexto);
  // sombra
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (lleno(xx, yy) && yy + sombraDy < H) C[(yy + sombraDy) * W + xx] = hex(sombra);
  // contorno (8 vecinos)
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    if (lleno(xx, yy)) continue;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (lleno(xx + ox, yy + oy)) { C[yy * W + xx] = hex(contorno); oy = ox = 2; }
  }
  // relleno por filas
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (lleno(xx, yy)) {
    const t = clamp((yy - y) / Math.max(1, alto - 1), 0, 1);
    C[yy * W + xx] = R[Math.min(R.length - 1, Math.floor(t * R.length))];
  }
}

/** Una línea del lema con tramos de colores: [[texto, color], ...], centrada, fuente mini con contorno. */
function lema(f, tramos, cy) {
  const total = textWidth(tramos.map(([s]) => s).join(''), 'mini');
  let x = Math.round(160 - total / 2);
  const p = painterFor(f);
  for (const [s, c] of tramos) {
    p.text(s, x, cy, hex(c), { font: 'mini', outline: hex('#0d051c') });
    x += textWidth(s, 'mini') + (s.endsWith(' ') ? 0 : 1);
  }
}

export function generar() {
  const T = PALETAS.titulo;
  const f = createFrame(W, H);
  fondo(f);
  guardar('titulo/titulo_fondo.png', f);

  textoTitulo(f, 'MARSCEPTION', 160, 46, { scale: 3, rampaTexto: T.logo, contorno: '#0d051c', sombra: '#2e0d6b', sombraDy: 3 });
  const B = '#e8e2ff';
  lema(f, [['TRAIN ON ', B], ['EARTH', T.tierra], ['.', B]], 112);
  lema(f, [['LAND ON THE ', B], ['MOON', T.luna], [' / ', B], ['MARS', T.rojo], ['.', B]], 121);
  lema(f, [['RUN IT ', B], ['ANYWHERE', T.lavanda], ['.', B]], 130);
  guardar('titulo/titulo.png', f);

  // Entrada y cierre del video de 30 s (1280 × 720 = 320 × 180 × 4, píxeles enteros). Van en docs/media/ y no en assets/,
  // porque el Boot del juego precarga todas las imágenes de assets/.
  const entrada = createFrame(W, H);
  fondo(entrada);
  textoTitulo(entrada, 'MARSCEPTION', 160, 46, { scale: 3, rampaTexto: T.logo, contorno: '#0d051c', sombra: '#2e0d6b', sombraDy: 3 });
  guardar('../docs/media/video_entrada_1280x720.png', escalar(entrada, 4));
  guardar('../docs/media/video_cierre_1280x720.png', escalar(f, 4));
}

/** Copia un cuadro escalado × k con vecino más cercano (para video o pantallas grandes). */
function escalar(f, k) {
  const g = createFrame(f.w * k, f.h * k);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) g.color[y * g.w + x] = f.color[((y / k) | 0) * f.w + ((x / k) | 0)];
  return g;
}

function norm(v) { const l = Math.hypot(...v); return v.map((a) => a / l); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
