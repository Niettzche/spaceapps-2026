// Planetas girando para elegir destino (Nueva partida): assets/menu/planeta_marte.png y planeta_luna.png.
// Tira horizontal de 48 cuadros de 48 × 48 (2304 × 48). La textura gira en longitud (una vuelta en 48 cuadros, sin costura);
// la luz queda fija, desde arriba a la izquierda, con el borde morado a la derecha como la pantalla de título.
// Es una ilustración del juego, no un mapa real de Marte ni de la Luna.
import { createFrame, painterFor, guardar, tileFbm, rampa, tramado, clamp, hex } from './comun.mjs';
import { PALETAS } from './paletas.mjs';
import { glifos } from './fuentes.mjs';

const N = 48;
const norm = (v) => { const l = Math.hypot(...v); return v.map((a) => a / l); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const L = norm([-0.6, -0.5, 0.62]), RD = norm([0.9, -0.2, 0.2]);
const TAU = Math.PI * 2;

/** Dibuja la tira: textura(lon 0..1, lat -1..1, x, y) → { t (0..1 de luz base), color? } */
function tira(ruta, pal, textura, { S = 48, R = 21, cols = N } = {}) {
  const C = S / 2, filas = Math.ceil(N / cols);
  const f = createFrame(S * cols, S * filas), RAMPA = rampa(pal), RIM = rampa(PALETAS.titulo.borde_luz);
  painterFor(f).shade(0, 0, S * cols, S * filas, (px, py) => {
    const X = Math.floor(px), Y = Math.floor(py), col = Math.floor(X / S), fila = Math.floor(Y / S), i = fila * cols + col, x = X - col * S, y = Y - fila * S;
    if (i >= N) return 0;
    const nx = (x + 0.5 - C) / R, ny = (y + 0.5 - C) / R, d2 = nx * nx + ny * ny;
    if (d2 > 1) {
      const d = Math.sqrt(d2);
      return d < 1 + 1.3 / R && nx > -0.35 ? RIM[0] : 0;                    // halo morado del lado del borde
    }
    const nz = Math.sqrt(1 - d2), n = [nx, ny, nz];
    const lon = ((Math.atan2(nx, nz) / TAU + i / N) % 1 + 1) % 1, lat = -Math.asin(clamp(ny, -1, 1)) / (Math.PI / 2);
    const lam = clamp(dot(n, L), 0, 1);
    const tex = textura(lon, lat, nx, ny);
    if (tex.color && lam > 0.08) return tex.color(lam, X, Y);
    let c = tramado(RAMPA, clamp(0.06 + lam * 0.88 + tex.t, 0, 1), X, Y);
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

/**
 * Logo MARSCEPTION a la medida de pixel_titulo (mismo degradado, contorno y sombra) con un brillo diagonal que lo cruza.
 * menu/logo_brillo.png: tira de 32 cuadros (el brillo cruza en 20 y descansa 12); se dibuja × 3 a 8–12 fps.
 */
function logoBrillo() {
  const G = glifos(), txt = 'MARSCEPTION', T = PALETAS.titulo, RL = T.logo.map(hex), K = hex('#0d051c'), SOMBRA = hex('#2e0d6b');
  const tinta = new Set();
  let x = 0;
  for (const ch of txt) { for (const sp of G[ch].px) { const [gx, gy] = sp.split(',').map(Number); tinta.add(`${x + gx},${gy - 2}`); } x += G[ch].w + 1; }
  const w = x - 1 + 2, h = 7 + 3, NC = 32, PASO = 20;                       // 1 px de contorno a los lados, contorno + sombra abajo
  const f = createFrame(w * NC, h);
  for (let i = 0; i < NC; i++) {
    const ox = i * w + 1, oy = 1, frente = -6 + (i / (PASO - 1)) * (w + 10);   // posición del brillo
    const hay = (xx, yy) => tinta.has(`${xx},${yy}`);
    const pon = (xx, yy, c) => { const X = ox + xx, Y = oy + yy; if (X >= i * w && X < (i + 1) * w && Y >= 0 && Y < h) f.color[Y * f.w + X] = c; };
    for (const sp of tinta) { const [xx, yy] = sp.split(',').map(Number); pon(xx, yy + 1, SOMBRA); }
    for (let yy = -1; yy <= 8; yy++) for (let xx = -1; xx <= w - 2; xx++) {
      if (hay(xx, yy)) continue;
      let borde = false;
      for (let dy = -1; dy <= 1 && !borde; dy++) for (let dx = -1; dx <= 1; dx++) if (hay(xx + dx, yy + dy)) { borde = true; break; }
      if (borde) pon(xx, yy, K);
    }
    for (const sp of tinta) {
      const [xx, yy] = sp.split(',').map(Number), t = Math.min(1, Math.max(0, yy / 6));
      let c = RL[Math.min(RL.length - 1, Math.floor(t * RL.length))];
      if (i < PASO) {
        const d = xx + yy * 0.6 - frente;                                    // banda diagonal
        if (Math.abs(d) < 2) c = hex('#ffffff');
        else if (Math.abs(d) < 3.5) c = hex('#fff6d8');
      }
      pon(xx, yy, c);
    }
  }
  guardar('menu/logo_brillo.png', f);
  console.log(`  (cuadro de ${w} × ${h}, ${NC} cuadros)`);
}

export function generar() {
  logoBrillo();
  // Marte: óxido con mares oscuros, un cañón largo, cráteres pequeños y casquetes polares blancos
  const HIELO = PALETAS.titulo.logo.slice(0, 3).map(hex);
  const crateresM = [[0.12, 0.2, 0.12], [0.41, -0.35, 0.09], [0.63, 0.1, 0.1], [0.85, -0.15, 0.08], [0.3, 0.5, 0.07]];
  const texturaMarte = (lon, lat) => {
    if (Math.abs(lat) > 0.6 + ruido(lon, lat, 6, 401, 2) * 0.12) {
      return { t: 0, color: (lam, x, y) => tramado(HIELO.slice().reverse(), clamp(lam * 1.1, 0, 1), x, y) };
    }
    const mar = ruido(lon, lat, 4, 402) > 0.1 ? -0.22 : 0;
    const canon = Math.abs(lat + 0.08 - Math.sin(lon * TAU) * 0.05) < 0.035 && lon > 0.2 && lon < 0.55 ? -0.3 : 0;   // gran cañón
    const k = crater(lon, lat, crateresM);
    return { t: ruido(lon, lat, 10, 403, 3) * 0.25 + mar + canon + (k < 0 ? -0.15 : k > 0 ? 0.12 : 0) };
  };
  tira('menu/planeta_marte.png', PALETAS.titulo.marte, texturaMarte);
  // Marte grande para la pantalla de inicio: 48 cuadros de 152 × 152 en cuadrícula de 8 × 6 (1216 × 912). Una tira de 48
  // cuadros mediría 7296 px de ancho y muchos teléfonos solo aceptan texturas de hasta 4096 px.
  tira('menu/marte_grande.png', PALETAS.titulo.marte, texturaMarte, { S: 152, R: 68, cols: 8 });

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
