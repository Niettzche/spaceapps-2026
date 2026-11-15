// Dueño: frente juego (pantalla de inicio). Fondo del menú de opciones: una estación en órbita de Marte, en pixel art
// dibujado en código (sin Phaser: se prueba con node --test). Es el RESPALDO del arte de Mauricio:
//   assets/pantallas/menu_nave.png  320 × 180 (se dibuja × 3), sin texto. Si existe, el Menú lo usa en lugar de este.
// Reglas para ese arte (las mismas que sigue este respaldo, ver ARTE_NAVE):
//   - La escotilla (a donde hace zoom la cámara al elegir una opción) centrada en ARTE_NAVE.escotilla (px de arte).
//   - La mitad izquierda (x < 165 px de arte) tranquila y oscura: ahí van los botones.
// Es ILUSTRACIÓN (arte del juego): no representa una nave real.
import { PALETAS_PLANETA, fbm, hash } from './planeta_pixeles.js';

export const ARTE_NAVE = {
  ancho: 320, alto: 180,
  escotilla: { x: 246, y: 79 }, // centro de la escotilla (zoom)
  planeta: { x: 300, y: 262, r: 112 }, // Marte asomando abajo a la derecha (para la máscara del fondo vivo)
  // Luces que parpadean (el Menú las dibuja encima; px de arte).
  luces: [{ x: 186, y: 46, color: 0xff5a6e }, { x: 306, y: 46, color: 0x4cc38a }, { x: 246, y: 43, color: 0xffd166 }],
  casco: { x0: 206, x1: 286, y0: 64, y1: 94 }, // caja del casco (para no poner estrellas encima)
};

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const CIELO = ['#07061a', '#0d0a24', '#150f33', '#1f1545', '#2b1b5a'].map(rgb);
const CASCO = ['#0e0c16', '#2a2742', '#45415f', '#66627f', '#8c89a6', '#b9b6d0', '#e4e2f0'].map(rgb);
const PANEL = ['#0e0c16', '#1d2a5e', '#2c4392', '#3f62c4', '#7fa2f0'].map(rgb);
const LUZ_VENTANA = ['#ffd166', '#fff1c2'].map(rgb);
const NARANJA = rgb('#ff9f43');

/** Pinta el fondo completo (RGBA 320 × 180); `nave: false` = solo cielo y Marte (para el sprite menu/nave). */
export function pintarFondoNave({ nave = true } = {}) {
  const { ancho: W, alto: H } = ARTE_NAVE;
  const datos = new Uint8ClampedArray(W * H * 4);
  const poner = (x, y, c) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = (y * W + x) * 4;
    datos[k] = c[0]; datos[k + 1] = c[1]; datos[k + 2] = c[2]; datos[k + 3] = 255;
  };
  const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) poner(x, y, c); };

  // 1) Cielo: degradado morado con nebulosa tramada (como titulo_fondo.png) y estrellas fijas.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const neb = fbm(x / W, y / H, 4, 41, 4);
      const t = 0.25 + (y / H) * 0.25 + neb * 1.6 + (x / W) * 0.2;
      const q = t * (CIELO.length - 1) + (BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 0.8;
      poner(x, y, CIELO[clamp(Math.round(q), 0, CIELO.length - 1)]);
    }
  }
  for (let k = 0; k < 140; k++) {
    const x = Math.floor(hash(k, 1, 5) * W), y = Math.floor(hash(k, 2, 5) * H);
    poner(x, y, hash(k, 3, 5) < 0.6 ? rgb('#cfc4ff') : rgb('#ffffff'));
  }

  // 2) Marte asomando abajo a la derecha (luz arriba a la izquierda, borde morado), mismo estilo que planeta_pixeles.js.
  const pm = PALETAS_PLANETA.marte.map(rgb), borde = PALETAS_PLANETA.borde.map(rgb);
  const { x: px, y: py, r: pr } = ARTE_NAVE.planeta;
  for (let y = py - pr; y < H; y++) {
    for (let x = px - pr; x < W; x++) {
      const dx = (x + 0.5 - px) / pr, dy = (y + 0.5 - py) / pr, d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      const lam = clamp(-0.6 * dx - 0.5 * dy + 0.62 * nz, 0, 1);
      const h = fbm(x / 90, y / 90, 6, 91, 4);
      const t = clamp(0.08 + lam * 0.75 * (0.62 + h * 0.8) + lam * 0.2, 0, 0.999);
      const q = t * (pm.length - 1) + (BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 0.9;
      poner(x, y, pm[clamp(Math.round(q), 0, pm.length - 1)]);
      if (d2 > 0.965 && dx < 0.2) poner(x, y, d2 > 0.985 ? borde[1] : borde[0]); // atmósfera del lado iluminado
    }
  }

  if (!nave) return { datos, ancho: W, alto: H };

  // 3) Estación. Alas de paneles solares (izquierda y derecha) unidas por una viga.
  rect(176, 77, 118, 3, CASCO[2]); rect(176, 77, 118, 1, CASCO[4]); rect(176, 79, 118, 1, CASCO[1]);
  for (const x0 of [172, 292]) {
    for (const y0 of [48, 82]) {
      rect(x0 - 1, y0 - 1, 30, 26, PANEL[0]);
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 28; x++) {
          const linea = x % 7 === 6 || y % 6 === 5;
          const brillo = clamp(3 - Math.floor((x + y) / 14), 1, 4);
          rect(x0 + x, y0 + y, 1, 1, linea ? PANEL[1] : PANEL[brillo]);
        }
      }
    }
    rect(x0 + 13, 72, 2, 10, CASCO[3]); // mástil del ala
  }
  // Antena con plato encima del casco.
  rect(245, 44, 2, 20, CASCO[3]);
  for (let x = -6; x <= 6; x++) rect(246 + x, 50 + Math.floor((x * x) / 9), 1, 1, CASCO[5]);

  // Casco: cilindro horizontal con luz arriba, costuras y una fila de ventanas.
  const { x0, x1, y0, y1 } = ARTE_NAVE.casco;
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0);
    const nivel = t < 0.12 ? 6 : t < 0.3 ? 5 : t < 0.6 ? 4 : t < 0.82 ? 3 : 2;
    for (let x = x0; x < x1; x++) {
      const extremo = x - x0 < 3 || x1 - x < 4;
      const costura = (x - x0) % 16 === 0;
      const n = clamp(nivel - (extremo ? 2 : 0) - (costura ? 1 : 0), 1, 6);
      const q = n + (BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 0.6;
      poner(x, y, CASCO[clamp(Math.round(q), 1, 6)]);
    }
  }
  for (let x = x0; x < x1; x++) { poner(x, y0 - 1, CASCO[0]); poner(x, y1, CASCO[0]); }
  for (let y = y0; y < y1; y++) { poner(x0 - 1, y, CASCO[0]); poner(x1, y, CASCO[0]); }
  // Ventanas (3 × 2, luz cálida) a los lados de la escotilla.
  for (let x = x0 + 6; x < x1 - 6; x += 7) {
    if (Math.abs(x + 1 - ARTE_NAVE.escotilla.x) < 14) continue;
    rect(x - 1, 71, 5, 4, CASCO[0]);
    rect(x, 72, 3, 2, LUZ_VENTANA[0]); rect(x, 72, 1, 1, LUZ_VENTANA[1]);
  }
  // Franja naranja de señalización abajo.
  for (let x = x0 + 2; x < x1 - 2; x++) if (((x >> 2) & 1) === 0) poner(x, 89, NARANJA);

  // Escotilla redonda con marco grueso y luz adentro (la cámara se acerca aquí).
  const e = ARTE_NAVE.escotilla;
  for (let y = -10; y <= 10; y++) {
    for (let x = -10; x <= 10; x++) {
      const d = Math.hypot(x, y);
      if (d > 10.4) continue;
      let c;
      if (d > 9.4) c = CASCO[0];
      else if (d > 7) c = (x + y) < 0 ? CASCO[5] : CASCO[2]; // marco con luz arriba a la izquierda
      else if (d > 6.2) c = CASCO[0];
      else c = d < 2.5 ? LUZ_VENTANA[1] : LUZ_VENTANA[0];
      poner(e.x + x, e.y + y, c);
    }
  }
  // Pernos del marco.
  for (const [dx, dy] of [[0, -8], [8, 0], [0, 8], [-8, 0]]) poner(e.x + dx, e.y + dy, CASCO[1]);
  // Reflejo en el cristal.
  rect(e.x - 4, e.y - 4, 2, 1, LUZ_VENTANA[1]); rect(e.x - 4, e.y - 3, 1, 1, LUZ_VENTANA[1]);
  return { datos, ancho: W, alto: H };
}
