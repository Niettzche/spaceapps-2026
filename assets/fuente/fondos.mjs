// Fondos de 3 capas (320 × 180, repetibles a lo ancho): fondo_<clave>_1 cielo fijo, _2 lejana, _3 cercana.
// Prioridad A: dunas (Samalayuca), marte (Jezero), luna (polo sur).
// Todo lo que varía a lo ancho usa periodos enteros de 320 px, así la imagen empata consigo misma.
import { createFrame, painterFor, guardar, tileFbm, tileNoise, rampa, tramado, clamp, hex, mix, TAU } from './comun.mjs';
import { PALETAS } from './paletas.mjs';

const W = 320, H = 180;
const per = (x) => ((x % W) + W) % W;
const onda = (x, k, fase = 0) => Math.sin((x / W) * TAU * k + fase);
const ruido = (x, k, seed, oct = 3) => tileFbm((per(x) / W) * k, 0.5, k, 0, seed, oct); // repetible en x
const hash = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

/**
 * Capa con silueta: alto(x) da la línea del terreno (y de pantalla). sombra: elevación de la luz (px por px) y lado de donde viene.
 * pinta(x, y, i) recibe { prof (px bajo la línea), pend (dy/dx), luz (0..1), sombra (bool) } y devuelve un color o 0.
 */
function capa(ruta, alto, pinta, { luzDesde = 'derecha', elev = 0.35 } = {}) {
  const hs = Array.from({ length: W }, (_, x) => alto(x));
  const enSombra = (x) => {
    // ¿algún terreno entre la luz y este punto lo tapa? (sombras largas con luz rasante)
    const dir = luzDesde === 'derecha' ? 1 : -1;
    for (let d = 1; d < W; d++) {
      const hx = hs[per(x + dir * d)];
      if (hx < hs[x] - elev * d) return true;
      if (hs[x] - elev * d < 0) return false;
    }
    return false;
  };
  const sombras = hs.map((_, x) => enSombra(x));
  const f = createFrame(W, H);
  painterFor(f).shade(0, 0, W, H, (px, py) => {
    const x = Math.floor(px), y = Math.floor(py), h = hs[x];
    if (y < Math.floor(h)) return 0;
    const pend = (hs[per(x + 1)] - hs[per(x - 1)]) / 2;
    const cara = luzDesde === 'derecha' ? pend : -pend; // > 0: la cara mira hacia la luz
    const luz = sombras[x] ? 0 : clamp(0.5 + cara * 0.9, 0, 1);
    return pinta(x, y, { prof: y - h, pend, luz, sombra: sombras[x], hs });
  });
  guardar(ruta, f);
}

function cielo(ruta, pinta) {
  const f = createFrame(W, H);
  painterFor(f).shade(0, 0, W, H, (px, py) => pinta(Math.floor(px), Math.floor(py)));
  guardar(ruta, f);
}

export function generar() {
  dunas();
  marte();
  luna();
}

// ---------------------------------------------------------------- Tierra: dunas de Samalayuca (atardecer cálido)
function dunas() {
  const P = PALETAS.tierra, CIELO = rampa(P.cielo), LEJOS = rampa(P.dunas_lejos), CERCA = rampa(P.dunas_cerca);
  const SOL = [236, 108];
  cielo('fondos/fondo_dunas_1.png', (x, y) => {
    // degradado de noche arriba a horizonte encendido, con tramado ordenado entre pasos
    let t = Math.pow(clamp(y / 132, 0, 1), 1.35);
    const dx = Math.min(Math.abs(x - SOL[0]), W - Math.abs(x - SOL[0])), d = Math.hypot(dx, (y - SOL[1]) * 1.15);
    t += clamp(1 - d / 120, 0, 1) * 0.22; // el cielo se aclara alrededor del sol
    if (d < 13) return CIELO[6];
    if (d < 15) return (x + y) % 2 ? CIELO[6] : CIELO[5];
    // nubes alargadas que cruzan el sol (franjas de ruido repetible)
    const nube = ruido(x, 6, 3, 3) + onda(y, 12) * 0.08;
    const banda = Math.abs(((y - 70) % 11) - 5);
    if (y > 70 && y < 102 && nube > 0.3 + banda * 0.09 && banda < 2 && (banda < 1 || (x + y) % 2)) return d < 60 ? CIELO[5] : CIELO[4];
    // estrellas tenues en lo alto
    if (y < 52 && hash(x, y, 1) > 0.994) return hash(x, y, 2) > 0.5 ? hex('#e8d8ff') : CIELO[3];
    return tramado(CIELO.slice(0, 6), t, x, y);
  });
  capa('fondos/fondo_dunas_2.png', (x) => 116 + 6 * onda(x, 2, 0.4) + 4 * onda(x, 5, 1.7) + 3 * ruido(x, 8, 7), (x, y, i) => {
    if (i.prof < 1 && i.luz > 0.55) return LEJOS[3];               // cresta iluminada por el sol
    return tramado(LEJOS, 0.75 - i.prof / 40 + (i.luz - 0.5) * 0.4, x, y);
  });
  capa('fondos/fondo_dunas_3.png', (x) => 140 + 9 * onda(x, 1, 0.9) + 6 * onda(x, 3, 2.3) + 2.5 * onda(x, 7, 0.2) + 2 * ruido(x, 16, 9), (x, y, i) => {
    // matorrales (gobernadora) en puntos fijos de la silueta
    for (const bx of [38, 121, 207, 286]) {
      const dx = x - bx, top = i.hs[bx] - 4;
      if (Math.abs(dx) <= 3 && y >= top + Math.abs(dx) * 0.7 && y < i.hs[bx] + 1) return hash(x, y, 4) > 0.3 ? CERCA[0] : CERCA[1];
    }
    if (i.prof < 1) return i.luz > 0.55 ? CERCA[5] : CERCA[3];       // luz de borde en la cresta
    // ondas de viento en la cara iluminada
    const rizo = Math.sin(x * 0.55 + y * 2.2 + ruido(x, 20, 2) * 4) > 0.86 && i.luz > 0.5 && i.prof > 3;
    const t = 0.62 - i.prof / 30 + (i.luz - 0.5) * 0.7 + (rizo ? 0.18 : 0);
    return tramado(CERCA.slice(0, 5), t, x, y);
  });
}

// ---------------------------------------------------------------- Marte: cráter Jezero (óxido, cielo de polvo)
function marte() {
  const P = PALETAS.marte, CIELO = rampa(P.cielo), LEJOS = rampa(P.lejos), CERCA = rampa(P.cerca);
  const SOL = [74, 46];
  cielo('fondos/fondo_marte_1.png', (x, y) => {
    let t = Math.pow(clamp(y / 140, 0, 1), 0.9);
    const dx = Math.min(Math.abs(x - SOL[0]), W - Math.abs(x - SOL[0])), d = Math.hypot(dx, y - SOL[1]);
    if (d < 3.5) return hex('#f6eedc');                              // sol pequeño y pálido
    if (d < 9) return mix(hex('#c8d4dc'), CIELO[3], d / 9);           // halo azulado (dispersión del polvo)
    t += clamp(1 - d / 90, 0, 1) * 0.12;
    const p2 = Math.hypot(x - 248, y - 30);
    if (p2 < 1.6) return hex('#8a7a70');                             // Fobos
    const velo = ruido(x, 5, 13, 3);                                  // velos de polvo en suspensión
    t += clamp(velo, 0, 1) * 0.08 * (y > 60 && y < 130 ? 1 : 0);
    return tramado(CIELO, t, x, y);
  });
  // borde lejano del cráter: mesetas de cima plana
  capa('fondos/fondo_marte_2.png', (x) => {
    const n = ruido(x, 6, 21, 2);
    return 112 + 4 * onda(x, 2, 2.1) - Math.round(clamp(n * 3, -1, 2)) * 5;
  }, (x, y, i) => {
    if (i.prof < 1) return LEJOS[3];
    if (Math.abs(i.pend) > 2 && i.prof < 6) return i.luz > 0.5 ? LEJOS[3] : LEJOS[0]; // paredes de las mesetas
    return tramado(LEJOS, 0.68 - i.prof / 50 + (i.luz - 0.5) * 0.3, x, y);
  }, { luzDesde: 'izquierda', elev: 0.6 });
  // lomas cercanas con rocas
  const rocas = [[24, 3], [70, 2], [133, 4], [181, 2], [240, 3], [301, 2]];
  capa('fondos/fondo_marte_3.png', (x) => 142 + 8 * onda(x, 1, 2.6) + 5 * onda(x, 4, 0.8) + 4 * ruido(x, 12, 31, 4), (x, y, i) => {
    for (const [rx, r] of rocas) {
      const cy = i.hs[rx] - r * 0.5, dx = x - rx, dy = y - cy;
      if ((dx * dx) / (r * r) + (dy * dy) / (r * r * 0.5) <= 1) return dx + dy < -r * 0.6 ? CERCA[4] : dx + dy < 0 ? CERCA[3] : CERCA[1];
    }
    if (i.prof < 1) return i.luz > 0.5 ? CERCA[5] : CERCA[3];
    const piedra = tileNoise(x / 2, y / 2, 160, 0, 33) > 0.72 && i.prof > 4;
    return tramado(CERCA.slice(0, 5), 0.6 - i.prof / 34 + (i.luz - 0.5) * 0.6 + (piedra ? 0.2 : 0), x, y);
  }, { luzDesde: 'izquierda', elev: 0.5 });
}

// ---------------------------------------------------------------- Luna: polo sur (cielo negro, luz rasante)
function luna() {
  const P = PALETAS.luna, CIELO = rampa(P.cielo), ROCA = rampa(P.roca);
  const TIERRA = [252, 58];
  cielo('fondos/fondo_luna_1.png', (x, y) => {
    // la Tierra baja sobre el horizonte, iluminada desde la izquierda (mismo Sol rasante)
    const dx = x - TIERRA[0], dy = y - TIERRA[1], d = Math.hypot(dx, dy);
    if (d < 8) {
      const nx = dx / 8, ny = dy / 8, lit = -nx * 0.95 + Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * 0.3;
      if (lit < 0.05) return hex('#0c1430');
      const tierra = tileNoise(x / 2.5, y / 2.5, 0, 0, 41) > 0.15;
      const nube = tileNoise(x / 1.5 + 9, y / 3, 0, 0, 42) > 0.45;
      return nube ? hex('#ffffff') : tierra ? (lit > 0.5 ? hex('#5a9a4a') : hex('#2f5a34')) : lit > 0.5 ? hex('#3f8cff') : hex('#2550d0');
    }
    if (d < 9.5 && dx < 0) return hex('#7cc8ff');                     // atmósfera iluminada
    // estrellas fijas (sin atmósfera: nítidas, de uno o dos tonos)
    const s = hash(x, y, 7);
    if (s > 0.9965) return hash(x, y, 8) > 0.7 ? hex('#ffffff') : hash(x, y, 9) > 0.5 ? hex('#b4b4c0') : hex('#9fc8ff');
    return CIELO[y < 90 ? 0 : 1];
  });
  // macizos lejanos: crestas dentadas, cara a la luz casi blanca, el resto negro
  capa('fondos/fondo_luna_2.png', (x) => {
    const r = 1 - Math.abs(ruido(x, 5, 51, 4)) * 2.2;
    return 104 - 22 * clamp(r, 0, 1) - 6 * onda(x, 3, 1.1) + 4 * ruido(x, 24, 52, 2);
  }, (x, y, i) => {
    // relieve 2D repetible: caras que miran a la izquierda (al Sol) casi blancas, el resto en sombra negra
    const R = (xx, yy) => tileFbm((per(xx) / W) * 14, yy / 22, 14, 0, 53, 3) + (yy - i.hs[per(xx)]) * 0.012;
    const g = R(x - 1, y) - R(x + 1, y);
    if (i.prof < 1) return i.sombra ? ROCA[2] : ROCA[6];
    const t = (g > 0.02 ? 0.55 + g * 6 : 0.1 + g * 2) - i.prof / 90 - (i.sombra ? 0.25 : 0) - 0.08;
    return tramado(ROCA.slice(0, 6), t, x, y);
  }, { luzDesde: 'izquierda', elev: 0.32 });
  // bordes de cráteres cercanos: anillos con sombras largas y regolito
  const crateres = [[40, 34], [150, 46], [262, 30]];
  capa('fondos/fondo_luna_3.png', (x) => {
    let h = 146 + 3 * onda(x, 2, 0.4) + 2 * ruido(x, 20, 61, 3);
    for (const [cx, r] of crateres) {
      let dx = Math.abs(x - cx); dx = Math.min(dx, W - dx);
      const u = dx / r;
      h -= 9 * Math.exp(-((u - 1) ** 2) / 0.05); // borde alto
      if (u < 1) h += 6 * (1 - u * u);           // fondo hundido
    }
    return h;
  }, (x, y, i) => {
    const R = (xx, yy) => tileFbm((per(xx) / W) * 20, yy / 14, 20, 0, 63, 3) * 0.6 + (yy - i.hs[per(xx)]) * 0.02;
    const g = R(x - 1, y) - R(x + 1, y);
    if (i.prof < 1) return i.sombra ? ROCA[2] : ROCA[6];
    const grano = hash(x, y, 11) > 0.95 ? 0.12 : 0;
    const t = (g > 0.015 ? 0.5 + g * 7 : 0.12 + g * 2) - i.prof / 70 - (i.sombra ? 0.3 : 0) + grano;
    return tramado(ROCA.slice(0, 6), t, x, y);
  }, { luzDesde: 'izquierda', elev: 0.28 });
}
