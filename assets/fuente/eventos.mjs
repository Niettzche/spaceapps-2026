// Eventos de fondo (se ponen sobre la capa lejana del fondo; el juego los mueve o los anima): assets/eventos/
//   evento_remolino.png        remolino de polvo de Marte, 8 cuadros de 16 × 40 (bucle; el juego lo desplaza despacio)
//   evento_fobos.png           Fobos, 8 × 6 (el juego lo cruza por el cielo de Marte)
//   evento_tierra.png          la Tierra vista desde la Luna, 18 × 18, media fase iluminada desde la izquierda (sube tras el horizonte)
//   evento_micrometeorito.png  destello de un impacto de micrometeorito en la Luna, 6 cuadros de 16 × 16 (una vez)
import { createFrame, guardar, hex, clamp } from './comun.mjs';
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
  const S = 18, f = createFrame(S, S), c = S / 2, r = 7.5;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = (x + 0.5 - c) / r, ny = (y + 0.5 - c) / r, d2 = nx * nx + ny * ny;
    if (d2 > 1) { if (d2 < 1.25 && nx < 0) f.color[y * S + x] = conAlfa('#7cc8ff', 0.7); continue; }  // atmósfera del lado iluminado
    const lit = -nx * 0.95 + Math.sqrt(Math.max(0, 1 - d2)) * 0.25;
    if (lit < 0.05) { f.color[y * S + x] = hex('#0c1430'); continue; }  // lado nocturno
    const tierraFirme = Math.sin(x * 1.3 + y * 0.7) + Math.cos(y * 1.1 - x * 0.4) > 0.6;
    const nube = Math.sin(x * 0.9 - y * 2.1) > 0.75;
    f.color[y * S + x] = hex(nube ? '#ffffff' : tierraFirme ? (lit > 0.5 ? '#5a9a4a' : '#2f5a34') : lit > 0.5 ? '#3f8cff' : '#2550d0');
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
