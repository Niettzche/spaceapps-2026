// Eventos de fondo (se ponen sobre la capa lejana del fondo; el juego los mueve o los anima): assets/eventos/
//   evento_remolino.png        remolino de polvo de Marte, 8 cuadros de 16 × 40 (bucle; el juego lo desplaza despacio)
//   evento_fobos.png           Fobos, 8 × 6 (el juego lo cruza por el cielo de Marte)
//   evento_tierra.png          la Tierra vista desde la Luna, 24 × 24, gibosa (3/4 iluminada desde la izquierda); el lado nocturno
//                              queda transparente: el juego dibuja detrás el halo de atmósfera y el disco oscuro, y la escala ×4
//   evento_micrometeorito.png  destello de un impacto de micrometeorito en la Luna, 6 cuadros de 16 × 16 (una vez)
import { createFrame, guardar, hex, clamp, tileFbm } from './comun.mjs';
import { readFileSync } from 'node:fs';
import { PALETAS } from './paletas.mjs';

const K = hex('#0e0c16');
/** Color con alfa (0..1) en el formato del cuadro. */
const conAlfa = (h, a) => ((Math.round(a * 255) << 24) | (parseInt(h.slice(5, 7), 16) << 16) | (parseInt(h.slice(3, 5), 16) << 8) | parseInt(h.slice(1, 3), 16)) >>> 0;

function remolino() {
  const W = 16, H = 40, N = 8, f = createFrame(W * N, H), P = PALETAS.marte.polvo;
  for (let i = 0; i < N; i++) for (let y = 0; y < H; y++) {
    const ancho = 1.3 + (H - 1 - y) * 0.15, t = i / N;
    const vaiven = Math.sin((y / H) * Math.PI * 2 + t * Math.PI * 2) * (0.6 + (H - y) * 0.03);       // la columna se mece
    for (let x = 0; x < W; x++) {
      const d = x + 0.5 - (W / 2 + vaiven);
      if (Math.abs(d) > ancho) continue;
      const banda = ((y * 0.9 - d * 1.4 + t * 12) % 4 + 4) % 4;                                      // espiral que sube
      const borde = Math.abs(d) / ancho;
      const a = clamp((0.85 - borde * 0.5) * (y < 6 ? y / 6 : 1), 0, 1);                             // se desvanece arriba
      const c = banda < 1.2 ? P[4] : banda < 2.4 ? P[3] : P[2];
      f.color[y * f.w + i * W + x] = conAlfa(c, a);
    }
    // nube de polvo en la base
    if (y >= H - 4) for (let x = 0; x < W; x++) {
      const d = Math.abs(x + 0.5 - W / 2), r = 7 - (H - 1 - y) * 0.8 + Math.sin(i + x) * 0.6;
      if (d < r && !(f.color[y * f.w + i * W + x] >>> 24)) f.color[y * f.w + i * W + x] = conAlfa((x + y + i) % 3 ? P[2] : P[3], 0.6);
    }
  }
  guardar('eventos/evento_remolino.png', f);
}

function fobos() {
  const f = createFrame(8, 6);
  const forma = ['..###...', '.#####..', '########', '#######.', '.######.', '..###...'];
  const C = ['#4a3a34', '#6a564c', '#8a7a70', '#b4a496'];
  forma.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch !== '#') return;
    let t = clamp(2.6 - x * 0.35 - y * 0.25, 0, 3);                       // luz desde la izquierda
    if (x === 4 && y === 2) t = 0;                                        // cráter Stickney
    f.color[y * 8 + x] = hex(C[Math.round(t)]);
  }));
  guardar('eventos/evento_fobos.png', f);
}

function tierra() {
  // Costas reales: la máscara de Natural Earth 1:110m del mapa de la diapositiva 3 (lon −128..60, lat 54..−52).
  const M = JSON.parse(readFileSync(new URL('./datos/tierra_mapa.txt', import.meta.url), 'utf8'));
  const tierraM = M.filas.map((r) => { const out = []; for (const t of r.split(',')) if (t) out.push(...Array(+t.slice(1)).fill(t[0] === '1')); return out; });
  const esTierra = (lat, lon) => {
    const x = Math.floor(((lon - M.lon[0]) / (M.lon[1] - M.lon[0])) * M.ancho), y = Math.floor(((lat - M.lat[0]) / (M.lat[1] - M.lat[0])) * M.alto);
    return !!tierraM[y]?.[x];
  };
  const S = 24, f = createFrame(S, S), c = S / 2, r = 11.6;
  const lat0 = (12 * Math.PI) / 180, lon0 = 28;                       // de frente: África y Europa; Sudamérica asoma a la izquierda
  const fase = (60 * Math.PI) / 180, L = [-Math.sin(fase), -0.15, Math.cos(fase)];   // ángulo de fase 60° → 75 % iluminada
  const C = {
    mar: ['#12307a', '#1c4aa8', '#2a66d0', '#4a8ae8'], verde: ['#1e4a24', '#2e6a30', '#4a8a3a', '#6aa848'],
    desierto: ['#7a5a32', '#a8804a', '#cca468', '#e6c68a'], nube: ['#9aa8c4', '#d0d8e8', '#ffffff', '#ffffff'],
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = (x + 0.5 - c) / r, ny = (y + 0.5 - c) / r, d2 = nx * nx + ny * ny;
    if (d2 > 1) continue;
    const nz = Math.sqrt(1 - d2), luz = nx * L[0] + ny * L[1] + nz * L[2];
    if (luz < 0) continue;                                               // lado nocturno: lo pone el juego
    // proyección ortográfica inversa
    const yy = -ny, lat = Math.asin(yy * Math.cos(lat0) + nz * Math.sin(lat0));
    const lon = lon0 + (Math.atan2(nx, nz * Math.cos(lat0) - yy * Math.sin(lat0)) * 180) / Math.PI, latG = (lat * 180) / Math.PI;
    const t = clamp(Math.round(luz * 4.2 - 0.3), 0, 3);                 // 4 tonos: oscuro en el terminador, claro hacia el Sol
    const nube = tileFbm(lon / 28, latG / 9, 0, 0, 211, 3) > 0.4 || Math.abs(latG) < 6 && tileFbm(lon / 12, 3, 0, 0, 212, 2) > 0.25;   // nubes sueltas y la franja ecuatorial
    let pal;
    if (Math.abs(latG) > 60 || nube) pal = C.nube;                       // casquetes y nubes
    else if (esTierra(latG, lon)) pal = latG > 12 && latG < 32 && lon > -18 || latG < -18 && latG > -30 && lon > 12 ? C.desierto : C.verde;   // Sahara y Kalahari
    else pal = C.mar;
    f.color[y * S + x] = hex(pal[t]);
  }
  guardar('eventos/evento_tierra.png', f);
}

function micrometeorito() {
  const W = 16, N = 6, f = createFrame(W * N, W), c = 7.5;
  const pon = (i, x, y, col) => { if (x >= 0 && y >= 0 && x < W && y < W) f.color[y * f.w + i * W + x] = col; };
  for (let i = 0; i < N; i++) {
    if (i === 0) { pon(i, 7, 7, hex('#ffffff')); pon(i, 8, 7, hex('#ffffff')); pon(i, 7, 8, hex('#ffffff')); pon(i, 8, 8, hex('#fff08a')); }
    if (i === 1 || i === 2) {
      const L = i === 1 ? 4 : 6;
      for (let k = -L; k <= L; k++) {                                     // estrella de 4 puntas
        const col = Math.abs(k) < 2 ? hex('#ffffff') : Math.abs(k) < L - 1 ? hex('#fff08a') : hex('#ffd166');
        pon(i, Math.round(c + k), 7, col); pon(i, Math.round(c + k), 8, col); pon(i, 7, Math.round(c + k), col); pon(i, 8, Math.round(c + k), col);
      }
      if (i === 2) for (let a = 0; a < 8; a++) pon(i, Math.round(c + Math.cos(a * Math.PI / 4) * 4), Math.round(c + Math.sin(a * Math.PI / 4) * 4), hex('#ffffff'));
    }
    if (i >= 3) {
      // chispas y polvo que salen en abanico hacia arriba y se apagan
      const t = i - 2;
      for (let a = 0; a < 7; a++) {
        const ang = Math.PI * (1.1 + a * 0.13), rr = 2 + t * 2;
        const x = Math.round(c + Math.cos(ang) * rr), y = Math.round(c + 3 + Math.sin(ang) * rr);
        pon(i, x, y, t === 1 ? hex('#fff08a') : t === 2 ? hex('#b4b4c0') : hex('#7c7c8a'));
      }
      if (t === 1) { pon(i, 7, 10, hex('#e8e8f0')); pon(i, 8, 10, hex('#e8e8f0')); }
    }
  }
  guardar('eventos/evento_micrometeorito.png', f);
}

export function generar() {
  remolino();
  fobos();
  tierra();
  micrometeorito();
}
