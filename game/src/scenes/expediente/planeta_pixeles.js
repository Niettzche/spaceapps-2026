// Dueño: frente expediente. Planeta girando en pixel art, dibujado en código (sin Phaser: se prueba con node --test).
// Respaldo de los spritesheets del frente arte (assets/menu/planeta_marte.png y planeta_luna.png): si no existen, el
// Menú genera aquí una tira horizontal de N cuadros cuadrados con el mismo formato.
// Estilo de assets/fuente/titulo.mjs: esfera con textura de ruido, luz desde arriba a la izquierda y borde morado a la
// derecha. Es una ilustración (arte del juego), no un mapa real de Marte ni de la Luna.

// Paletas de oscuro a claro. Marte = PALETAS.titulo.marte de assets/fuente/paletas.mjs; borde = PALETAS.titulo.borde_luz.
export const PALETAS_PLANETA = {
  marte: ['#2a0e0e', '#4e1c16', '#7a3424', '#a8593e', '#bc6240', '#d88a5a', '#f0b07a'],
  luna: ['#14141c', '#2a2a36', '#45454f', '#62626e', '#84848f', '#a6a6b0', '#c8c8d4', '#ecebf2'],
  hielo: ['#7a6a88', '#c8bcd8', '#f4eef8'],
  borde: ['#7a4cff', '#c9a7ff'],
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const norm = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const LUZ = norm([-0.6, -0.5, 0.62]);
const LUZ_BORDE = norm([0.9, -0.2, 0.2]);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export function hash(ix, iy, semilla) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(semilla, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido de valor periódico en x (para que la longitud dé la vuelta sin costura). */
function ruido(x, y, periodo, semilla) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = ((x0 % periodo) + periodo) % periodo, b = (a + 1) % periodo;
  const v00 = hash(a, y0, semilla), v10 = hash(b, y0, semilla), v01 = hash(a, y0 + 1, semilla), v11 = hash(b, y0 + 1, semilla);
  return (v00 + (v10 - v00) * sx) * (1 - sy) + (v01 + (v11 - v01) * sx) * sy - 0.5;
}

export function fbm(u, v, periodo, semilla, octavas = 4) {
  let s = 0, amp = 0.5, f = 1;
  for (let o = 0; o < octavas; o++) { s += amp * ruido(u * periodo * f, v * periodo * f * 0.5, periodo * f, semilla + o); amp *= 0.5; f *= 2; }
  return s;
}

const MAPA_W = 256, MAPA_H = 128;
const mapas = {};

/**
 * Mapa equirectangular (u = longitud 0..1, v = latitud 0..1 de norte a sur) con el brillo base de la superficie.
 * Se calcula una vez por mundo; cada cuadro solo lo muestrea con otra fase.
 */
function mapa(mundo) {
  if (mapas[mundo]) return mapas[mundo];
  const m = new Float32Array(MAPA_W * MAPA_H);
  const hielo = new Uint8Array(MAPA_W * MAPA_H);
  // Cráteres de la Luna: posiciones y tamaños pseudoaleatorios fijos (ilustración, no un mapa real).
  const crateres = [];
  if (mundo === 'luna') {
    for (let k = 0; k < 22; k++) {
      crateres.push({ lon: hash(k, 1, 7) * Math.PI * 2, lat: (hash(k, 2, 7) - 0.5) * 2.4, r: 0.1 + hash(k, 3, 7) ** 2 * 0.32 });
    }
  }
  for (let j = 0; j < MAPA_H; j++) {
    const v = (j + 0.5) / MAPA_H, lat = (v - 0.5) * Math.PI;
    for (let i = 0; i < MAPA_W; i++) {
      const u = (i + 0.5) / MAPA_W, lon = u * Math.PI * 2;
      let b;
      if (mundo === 'luna') {
        const h = fbm(u, v, 8, 31, 4), mar = fbm(u, v, 4, 37, 3);
        b = 0.7 + h * 0.4 - (mar > 0.08 ? 0.22 : 0);
        for (const c of crateres) {
          const cosd = Math.sin(lat) * Math.sin(c.lat) + Math.cos(lat) * Math.cos(c.lat) * Math.cos(lon - c.lon);
          const d = Math.acos(clamp(cosd, -1, 1));
          if (d < c.r * 0.72) b -= 0.16;
          else if (d < c.r) b += 0.16;
        }
      } else {
        const h = fbm(u, v, 8, 91, 5), mar = fbm(u, v, 4, 92, 4);
        b = 0.6 + h * 0.7 - (mar > 0.08 ? 0.3 : 0);
        // Casquetes polares (más grande el norte), con borde irregular.
        const borde = 1.12 + fbm(u, 0.5, 8, 95, 2) * 0.4;
        if (lat < -borde || lat > borde + 0.2) hielo[j * MAPA_W + i] = 1;
      }
      m[j * MAPA_W + i] = b;
    }
  }
  mapas[mundo] = { m, hielo };
  return mapas[mundo];
}

/**
 * Pinta un cuadro del planeta (tam × tam px) en `datos` (RGBA, ancho de fila `ancho`), a partir de la columna `x0`.
 * `fase` en [0, 1): giro (1 = una vuelta completa).
 */
export function pintarPlaneta(datos, ancho, x0, tam, mundo, fase) {
  const { m, hielo } = mapa(mundo);
  const pal = (PALETAS_PLANETA[mundo] || PALETAS_PLANETA.marte).map(rgb);
  const HIELO = PALETAS_PLANETA.hielo.map(rgb), BORDE = PALETAS_PLANETA.borde.map(rgb);
  const R = tam / 2 - 1.5, cx = tam / 2, cy = tam / 2;
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const dx = (x + 0.5 - cx) / R, dy = (y + 0.5 - cy) / R, d2 = dx * dx + dy * dy;
      const k = (y * ancho + x0 + x) * 4;
      let c = null;
      if (d2 <= 1) {
        const nz = Math.sqrt(1 - d2), n = [dx, dy, nz];
        const lam = clamp(n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2], 0, 1);
        const lat = Math.asin(clamp(dy, -1, 1));
        const lon = Math.atan2(dx, nz) / (Math.PI * 2) + fase; // la superficie avanza de izquierda a derecha
        const u = ((lon % 1) + 1) % 1, v = lat / Math.PI + 0.5;
        const idx = Math.min(MAPA_H - 1, Math.floor(v * MAPA_H)) * MAPA_W + Math.min(MAPA_W - 1, Math.floor(u * MAPA_W));
        const rampa = hielo[idx] ? HIELO : pal;
        const t = clamp(0.06 + lam * 0.8 * m[idx] + lam * 0.25, 0, 0.999);
        const q = t * (rampa.length - 1) + (BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 0.9;
        c = rampa[clamp(Math.round(q), 0, rampa.length - 1)];
        const borde = clamp(n[0] * LUZ_BORDE[0] + n[1] * LUZ_BORDE[1] + n[2] * LUZ_BORDE[2], 0, 1) * Math.pow(1 - nz, 1.5);
        if (borde > 0.4 + ((x * 7 + y * 3) % 4) * 0.04) c = borde > 0.6 ? BORDE[1] : BORDE[0];
      } else {
        const dd = Math.sqrt(d2);
        if (dd < 1 + 1 / R && dx > 0.25) c = BORDE[0]; // halo del lado del borde, como en titulo.mjs
      }
      if (c) { datos[k] = c[0]; datos[k + 1] = c[1]; datos[k + 2] = c[2]; datos[k + 3] = 255; }
      else { datos[k] = datos[k + 1] = datos[k + 2] = datos[k + 3] = 0; }
    }
  }
}

/** Tira horizontal de `cuadros` cuadros de tam × tam (mismo formato que los spritesheets del frente arte). */
export function tiraPlaneta(mundo, { tam = 48, cuadros = 48 } = {}) {
  const ancho = tam * cuadros;
  const datos = new Uint8ClampedArray(ancho * tam * 4);
  for (let i = 0; i < cuadros; i++) pintarPlaneta(datos, ancho, i * tam, tam, mundo, i / cuadros);
  return { datos, ancho, alto: tam, tam, cuadros };
}
