// Planetas girando para elegir destino (Nueva partida): assets/menu/planeta_marte.png y planeta_luna.png.
// Tira horizontal de 48 cuadros de 48 × 48 (2304 × 48). La textura gira en longitud (una vuelta en 48 cuadros, sin costura);
// la luz queda fija, desde arriba a la izquierda, con el borde morado a la derecha como la pantalla de título.
// Es una ilustración del juego, no un mapa real de Marte ni de la Luna.
import { createFrame, painterFor, guardar, tileFbm, rampa, tramado, clamp, hex } from './comun.mjs';
import { PALETAS } from './paletas.mjs';

const N = 48, S = 48, C = S / 2, R = 21;
const norm = (v) => { const l = Math.hypot(...v); return v.map((a) => a / l); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const L = norm([-0.6, -0.5, 0.62]), RD = norm([0.9, -0.2, 0.2]);
const TAU = Math.PI * 2;

/** Dibuja la tira: textura(lon 0..1, lat -1..1, x, y) → { t (0..1 de luz base), color? } */
function tira(ruta, pal, textura) {
  const f = createFrame(S * N, S), RAMPA = rampa(pal), RIM = rampa(PALETAS.titulo.borde_luz);
  painterFor(f).shade(0, 0, S * N, S, (px, py) => {
    const X = Math.floor(px), y = Math.floor(py), i = Math.floor(X / S), x = X - i * S;
    const nx = (x + 0.5 - C) / R, ny = (y + 0.5 - C) / R, d2 = nx * nx + ny * ny;
    if (d2 > 1) {
      const d = Math.sqrt(d2);
      return d < 1 + 1.3 / R && nx > -0.35 ? RIM[0] : 0;                    // halo morado del lado del borde
    }
    const nz = Math.sqrt(1 - d2), n = [nx, ny, nz];
    const lon = ((Math.atan2(nx, nz) / TAU + i / N) % 1 + 1) % 1, lat = -Math.asin(clamp(ny, -1, 1)) / (Math.PI / 2);
    const lam = clamp(dot(n, L), 0, 1);
    const tex = textura(lon, lat, nx, ny);
    if (tex.color && lam > 0.08) return tex.color(lam, x, y);
    let c = tramado(RAMPA, clamp(0.06 + lam * 0.88 + tex.t, 0, 1), X, y);
    const rim = clamp(dot(n, RD), 0, 1) * Math.pow(1 - nz, 1.5);
    if (rim > 0.22 + ((x * 7 + y * 3) % 4) * 0.04) c = rim > 0.42 ? RIM[1] : RIM[0];
    return c;
  });
  guardar(ruta, f);
}

/** Ruido de la esfera, periódico en longitud. */
const ruido = (lon, lat, k, seed, oct = 4) => tileFbm(lon * k, (lat + 1) * k * 0.5, k, 0, seed, oct);

/** Cráteres en posiciones fijas [lon, lat, radio angular]: devuelve -1 (hondo), +1 (borde) o 0. */
function crater(lon, lat, lista) {
  for (const [cl, ca, r] of lista) {
    let dl = Math.abs(lon - cl); dl = Math.min(dl, 1 - dl);
    const d = Math.hypot(dl * TAU * Math.cos(ca * Math.PI / 2), (lat - ca) * Math.PI / 2) / r;
    if (d < 0.75) return -1;
    if (d < 1) return 1;
  }
  return 0;
}

export function generar() {
  // Marte: óxido con mares oscuros, un cañón largo, cráteres pequeños y casquetes polares blancos
  const HIELO = PALETAS.titulo.logo.slice(0, 3).map(hex);
  const crateresM = [[0.12, 0.2, 0.12], [0.41, -0.35, 0.09], [0.63, 0.1, 0.1], [0.85, -0.15, 0.08], [0.3, 0.5, 0.07]];
  tira('menu/planeta_marte.png', PALETAS.titulo.marte, (lon, lat) => {
    if (Math.abs(lat) > 0.6 + ruido(lon, lat, 6, 401, 2) * 0.12) {
      return { t: 0, color: (lam, x, y) => tramado(HIELO.slice().reverse(), clamp(lam * 1.1, 0, 1), x, y) };
    }
    const mar = ruido(lon, lat, 4, 402) > 0.1 ? -0.22 : 0;
    const canon = Math.abs(lat + 0.08 - Math.sin(lon * TAU) * 0.05) < 0.035 && lon > 0.2 && lon < 0.55 ? -0.3 : 0;   // gran cañón
    const k = crater(lon, lat, crateresM);
    return { t: ruido(lon, lat, 10, 403, 3) * 0.25 + mar + canon + (k < 0 ? -0.15 : k > 0 ? 0.12 : 0) };
  });

  // Luna: grises con mares oscuros y muchos cráteres de borde claro
  const crateresL = [];
  for (let i = 0; i < 26; i++) {
    const h = (a) => { const v = Math.sin(i * 12.9898 + a * 78.233) * 43758.5453; return v - Math.floor(v); };
    crateresL.push([h(1), (h(2) - 0.5) * 1.6, 0.05 + h(3) * 0.1]);
  }
  tira('menu/planeta_luna.png', PALETAS.luna.roca.slice(1), (lon, lat) => {
    const mar = ruido(lon, lat, 3, 411) > 0.12 ? -0.25 : 0;
    const k = crater(lon, lat, crateresL);
    return { t: ruido(lon, lat, 12, 412, 3) * 0.2 + mar + (k < 0 ? -0.3 : k > 0 ? 0.28 : 0) };
  });
}
