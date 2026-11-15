// Dueño: frente juego (pantalla de inicio). Marte GRANDE que gira en pixel art para la pantalla de inicio (como el GIF de
// título de Mauricio), dibujado en código y sin Phaser (se prueba con node --test).
//
// Rendimiento (teléfono): todo lo que no cambia con el giro se calcula UNA vez (tablas por pixel: fila y columna base del
// mapa, luz, tramado y borde morado). Cada cuadro solo suma la fase a la columna y busca el color: ~20 000 pixeles con
// 6–8 operaciones cada uno (< 1 ms en un teléfono). Así el giro es continuo (1 pixel de arte por cuadro) sin guardar cientos
// de cuadros en memoria: una tira de 160 × 160 × 300 cuadros pesaría ~30 MB de textura.
//
// Es ILUSTRACIÓN (arte del juego): casquetes, mares oscuros, un cañón y cráteres con ruido; no es un mapa real de Marte.
import { PALETAS_PLANETA, fbm, hash } from './planeta_pixeles.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const norm = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const LUZ = norm([-0.6, -0.5, 0.62]); // luz arriba a la izquierda, como planeta_pixeles.js y titulo_fondo.png
const LUZ_BORDE = norm([0.9, -0.2, 0.2]);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export const MAPA_GRANDE = { ancho: 512, alto: 256 };
let mapaCache = null;

/** Mapa equirectangular (u = longitud, v = latitud de norte a sur) con el brillo base y el hielo; se calcula una vez. */
export function mapaMarteGrande() {
  if (mapaCache) return mapaCache;
  const { ancho: W, alto: H } = MAPA_GRANDE;
  const m = new Float32Array(W * H);
  const hielo = new Uint8Array(W * H);
  const crateres = Array.from({ length: 46 }, (_, k) => ({
    lon: hash(k, 1, 13) * Math.PI * 2, lat: (hash(k, 2, 13) - 0.5) * 2.2, r: 0.03 + hash(k, 3, 13) ** 2 * 0.1,
  }));
  for (let j = 0; j < H; j++) {
    const v = (j + 0.5) / H, lat = (v - 0.5) * Math.PI;
    for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / W;
      const h = fbm(u, v, 8, 91, 5), mar = fbm(u, v, 3, 92, 4);
      let b = 0.62 + h * 0.75;
      if (mar > 0.04) b -= 0.3; // regiones oscuras grandes
      if (mar > 0.14) b -= 0.14;
      // Un cañón largo cerca del ecuador (inspirado en Valles Marineris; ilustración).
      const curso = -0.12 + fbm(u, 0.3, 6, 97, 2) * 0.12;
      if (u > 0.52 && u < 0.78 && Math.abs(lat - curso) < 0.022 + (u > 0.6 && u < 0.7 ? 0.012 : 0)) b -= 0.32;
      const borde = 1.18 + fbm(u, 0.5, 8, 95, 2) * 0.35;
      if (lat < -borde || lat > borde + 0.12) hielo[j * W + i] = 1;
      m[j * W + i] = b;
    }
  }
  // Cráteres: solo se recorren los pixeles de su caja (antes, cada pixel contra cada cráter: ~1.4 s).
  for (const c of crateres) {
    const j0 = Math.max(0, Math.floor(((c.lat - c.r) / Math.PI + 0.5) * H)), j1 = Math.min(H - 1, Math.ceil(((c.lat + c.r) / Math.PI + 0.5) * H));
    const ancho = Math.ceil((c.r / Math.max(0.2, Math.cos(Math.abs(c.lat) + c.r)) / (Math.PI * 2)) * W) + 1;
    const i0 = Math.round((c.lon / (Math.PI * 2)) * W);
    for (let j = j0; j <= j1; j++) {
      const lat = ((j + 0.5) / H - 0.5) * Math.PI;
      for (let di = -ancho; di <= ancho; di++) {
        const i = (((i0 + di) % W) + W) % W;
        const lon = ((i + 0.5) / W) * Math.PI * 2;
        const cosd = Math.sin(lat) * Math.sin(c.lat) + Math.cos(lat) * Math.cos(c.lat) * Math.cos(lon - c.lon);
        const d = Math.acos(clamp(cosd, -1, 1));
        if (d < c.r * 0.7) m[j * W + i] -= 0.14;
        else if (d < c.r) m[j * W + i] += 0.12;
      }
    }
  }
  mapaCache = { m, hielo };
  return mapaCache;
}

/**
 * Prepara un Marte de `tam` × `tam` px de arte. Devuelve { tam, datos, pintar(fase) }: `datos` es RGBA (tam × tam) y
 * `pintar(fase)` lo reescribe con el giro `fase` (1 = una vuelta). Lo que queda fuera del disco no se toca nunca.
 */
export function crearMarteGrande(tam = 160) {
  const { m, hielo } = mapaMarteGrande();
  const { ancho: W, alto: H } = MAPA_GRANDE;
  const pal = PALETAS_PLANETA.marte.map(rgb), HIELO = PALETAS_PLANETA.hielo.map(rgb), BORDE = PALETAS_PLANETA.borde.map(rgb);
  const R = tam / 2 - 1.5, cx = tam / 2, cy = tam / 2;
  const datos = new Uint8ClampedArray(tam * tam * 4);
  // Tablas de los pixeles del disco que cambian con el giro.
  const pix = [], fila = [], col = [], base = [], luz = [], trama = [];
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const dx = (x + 0.5 - cx) / R, dy = (y + 0.5 - cy) / R, d2 = dx * dx + dy * dy;
      const k = (y * tam + x) * 4;
      if (d2 <= 1) {
        const nz = Math.sqrt(1 - d2);
        const borde = clamp(dx * LUZ_BORDE[0] + dy * LUZ_BORDE[1] + nz * LUZ_BORDE[2], 0, 1) * Math.pow(1 - nz, 1.5);
        if (borde > 0.4 + ((x * 7 + y * 3) % 4) * 0.04) { // borde morado fijo (no gira)
          const c = borde > 0.6 ? BORDE[1] : BORDE[0];
          datos[k] = c[0]; datos[k + 1] = c[1]; datos[k + 2] = c[2]; datos[k + 3] = 255;
          continue;
        }
        const lam = clamp(dx * LUZ[0] + dy * LUZ[1] + nz * LUZ[2], 0, 1);
        const lat = Math.asin(clamp(dy, -1, 1));
        pix.push(k);
        fila.push(Math.min(H - 1, Math.floor((lat / Math.PI + 0.5) * H)) * W);
        col.push(Math.atan2(dx, nz) / (Math.PI * 2)); // longitud base; el giro le suma la fase
        base.push(0.06 + lam * 0.25);
        luz.push(lam * 0.8);
        trama.push((BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 0.9);
      } else if (Math.sqrt(d2) < 1 + 1 / R && dx > 0.25) { // halo del lado del borde
        datos[k] = BORDE[0][0]; datos[k + 1] = BORDE[0][1]; datos[k + 2] = BORDE[0][2]; datos[k + 3] = 255;
      }
    }
  }
  const n = pix.length;
  const P = Int32Array.from(pix), F = Int32Array.from(fila), C = Float32Array.from(col);
  const B = Float32Array.from(base), L = Float32Array.from(luz), T = Float32Array.from(trama);
  const maxPal = pal.length - 1, maxHielo = HIELO.length - 1;
  function pintar(fase) {
    for (let i = 0; i < n; i++) {
      let u = C[i] + fase;
      u -= Math.floor(u);
      const idx = F[i] + Math.min(W - 1, (u * W) | 0);
      const t = clamp(B[i] + L[i] * m[idx], 0, 0.999);
      const hi = hielo[idx];
      const rampa = hi ? HIELO : pal;
      const max = hi ? maxHielo : maxPal;
      const c = rampa[clamp(Math.round(t * max + T[i]), 0, max)];
      const k = P[i];
      datos[k] = c[0]; datos[k + 1] = c[1]; datos[k + 2] = c[2]; datos[k + 3] = 255;
    }
    return datos;
  }
  pintar(0);
  return { tam, datos, pintar, pixeles: n };
}
