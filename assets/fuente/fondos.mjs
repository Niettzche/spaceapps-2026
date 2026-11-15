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
  desierto();
  lava();
  marte();
  luna();
  mina();
  maar();
}

// ---------------------------------------------------------------- Tierra: mina a cielo abierto (Real de Ángeles, Zacatecas)
// Análogo operativo de la Luna: un tajo de bancos escalonados (anillos de terrazas) en el altiplano semidesértico.
// Capa 2: sierra lejana, terreros de cima plana y el tajo visto desde el borde (su pared del fondo en terrazas).
// Capa 3: borde cercano con escalones de roca cortada, matorral y nopales.
function mina() {
  const P = PALETAS.tierra, CIELO = rampa(P.cielo_mina), SIERRA = rampa(P.sierra_mina), BANCO = rampa(P.banco);
  const OX = rampa(P.oxido), SUELO = rampa(P.semidesierto), MAT = rampa(P.matorral);
  const SOL = [44, 34];
  cielo('fondos/fondo_mina_1.png', (x, y) => {
    const dx = Math.min(Math.abs(x - SOL[0]), W - Math.abs(x - SOL[0])), d = Math.hypot(dx, y - SOL[1]);
    if (d < 6) return hex('#fffbe8');
    if (d < 8) return (x + y) % 2 ? hex('#fffbe8') : CIELO[5];
    // cielo de altiplano: azul profundo arriba, claro en el horizonte; cúmulos chicos de base plana
    let t = Math.pow(clamp(y / 120, 0, 1), 1.3) + clamp(1 - d / 80, 0, 1) * 0.15;
    for (const [cx, cy, r] of [[118, 52, 15], [138, 50, 11], [228, 66, 12], [246, 64, 8], [302, 44, 9]]) {
      const u = (x - cx) / r, v = (y - cy) / (r * 0.55);
      const n = ruido(x, 32, 79, 2) * 0.35;
      if (y <= cy + 2 && u * u + v * v < 1 + n) return y > cy - 1 ? CIELO[4] : v < -0.3 && u < 0.2 ? hex('#ffffff') : CIELO[5];
    }
    return tramado(CIELO.slice(0, 6), t, x, y);
  });

  // tajo: anillos elípticos (contornos de cada banco) centrados abajo; solo se ve la pared del fondo
  const T = { cx: 160, cy: 156, a: 132, b: 52, n: 10 };
  const banco = (x, y) => { const u = (x - T.cx) / T.a, v = (y - T.cy) / T.b; return Math.floor((1 - Math.sqrt(u * u + v * v)) * T.n); };
  const terreros = [[0, 46, 12], [214, 22, 7]]; // [x, medio ancho, alto] de los montones de tepetate (cima plana)
  capa('fondos/fondo_mina_2.png', (x) => {
    let h = 98 - 8 * clamp(1 - Math.abs(ruido(x, 4, 101, 4)) * 2.6, 0, 1) - 3 * onda(x, 3, 0.5); // sierra
    for (const [tx, r, alto] of terreros) {
      let dx = Math.abs(x - tx); dx = Math.min(dx, W - dx);
      if (dx < r) h = Math.min(h, 104 - alto * clamp((r - dx) / 6, 0, 1));
    }
    return h;
  }, (x, y, i) => {
    const u = (x - T.cx) / T.a, v = (y - T.cy) / T.b, r = Math.sqrt(u * u + v * v);
    if (r < 1 && y > 103) {
      // dentro del tajo: banco k = anillo, cara (pared) y huella (piso claro de 2 px) alternadas
      const z = (1 - r) * T.n * 1.0, k = Math.floor(z), f = z - k;
      const luz = 0.5 + u * 0.35;                                 // el Sol (izquierda) ilumina la pared derecha
      if (r < 0.2) return tramado(BANCO.slice(1, 5), 0.35 + ruido(x, 20, 102, 2) * 0.3, x, y); // piso del tajo
      // rampa de acarreo: una franja que baja en diagonal por la pared izquierda
      const rampaY = 108 + (x - 52) * 0.42;
      if (u < -0.15 && Math.abs(y - rampaY) < 1 && x > 52) return BANCO[5];
      const huella = banco(x, y - 2) !== k;                         // los 2 px de arriba de cada banco: su piso
      if (huella) return luz > 0.45 ? BANCO[6] : BANCO[5];
      // vetas de óxido que cruzan varias paredes
      const veta = k % 3 === 1 && ruido(x, 3, 103 + k, 2) > 0.12;      // tramos de bancos con roca oxidada
      if (veta) return tramado(OX, 0.3 + luz * 0.6, x, y);
      const t = 0.15 + luz * 0.6 + (k % 2) * 0.08 - f * 0.25 + ruido(x, 40, 104 + k, 2) * 0.25;
      return tramado(BANCO.slice(0, 6), t, x, y);
    }
    if (y < 104) {
      // terreros de cima plana (tepetate claro) y sierra azulada por la distancia
      for (const [tx, rr] of terreros) {
        let dx = Math.abs(x - tx); dx = Math.min(dx, W - dx);
        if (dx < rr) return i.prof < 1 ? BANCO[6] : tramado(BANCO.slice(2, 6), 0.75 - i.prof / 14 + (dx < rr - 6 ? 0.1 : -0.15), x, y);
      }
      if (i.prof < 1) return i.luz > 0.5 ? SIERRA[3] : SIERRA[2];
      return tramado(SIERRA, 0.55 - i.prof / 40 + (i.luz - 0.5) * 0.4, x, y);
    }
    // llano del altiplano alrededor del tajo, con manchas de matorral
    if (y === 104) return SUELO[5];
    if (hash(x, y, 105) > 0.9) return MAT[2];
    return tramado(SUELO.slice(2, 6), 0.75 - (y - 104) / 50, x, y);
  }, { luzDesde: 'izquierda', elev: 0.5 });

  // borde cercano: escalones de roca cortada (bancos) y semidesierto con nopales y gobernadora
  const nopales = [[30, 0], [168, 1], [262, 0]];
  const matas = [8, 74, 101, 140, 205, 231, 296];
  capa('fondos/fondo_mina_3.png', (x) => {
    const base = 150 + 3 * onda(x, 1, 0.6) + 1.5 * ruido(x, 16, 106, 2);
    return base - Math.round(clamp(ruido(x, 5, 107, 2) * 3 + 0.5, 0, 2)) * 5;  // escalones de 5 px
  }, (x, y, i) => {
    for (const [nx, v] of nopales) {
      // nopal: pencas ovaladas apiladas (verde con borde claro)
      const by = i.hs[nx];
      const pencas = v ? [[0, -4, 2, 3], [-3, -9, 2, 3], [2, -10, 2, 3]] : [[0, -4, 2, 3], [2, -9, 2, 3], [-2, -12, 2, 2.5]];
      for (const [px0, py0, rx, ry] of pencas) {
        const ux = (x - nx - px0) / rx, uy = (y - by - py0) / ry;
        if (ux * ux + uy * uy <= 1) return ux < -0.3 ? MAT[4] : ux + uy > 0.5 ? MAT[1] : MAT[3];
      }
    }
    for (const mx of matas) {
      const dx = x - mx, top = i.hs[mx] - 3;
      if (Math.abs(dx) <= 2 && y >= top + Math.abs(dx) * 0.6 && y < i.hs[mx] + 1) return hash(x, y, 108) > 0.4 ? MAT[1] : MAT[2];
    }
    if (i.prof < 1) return i.luz > 0.5 ? SUELO[5] : SUELO[4];
    // cara del escalón: roca cortada del banco
    if (Math.abs(i.pend) > 1.5 || i.hs[per(x - 1)] > i.hs[x] + 2 || i.hs[per(x + 1)] > i.hs[x] + 2) {
      if (i.prof < 5) return tramado(BANCO.slice(1, 6), i.luz > 0.5 ? 0.75 : 0.3, x, y);
    }
    if (i.prof < 3) return tramado(SUELO.slice(2, 6), 0.7, x, y);  // suelo de arriba
    if (hash(x, y, 109) > 0.92) return i.luz > 0.5 ? BANCO[5] : BANCO[2]; // grava
    return tramado(SUELO.slice(1, 6), 0.62 - i.prof / 40 + (i.luz - 0.5) * 0.4, x, y);
  }, { luzDesde: 'izquierda', elev: 0.45 });
}

// ---------------------------------------------------------------- Tierra: maar de Al Wahbah (Harrat Kishb, Arabia Saudita)
// Cráter volcánico de ~2.3 km de ancho y ~250 m de profundidad: borde de basalto oscuro, paredes de toba en capas y fondo
// cubierto de una costra blanca de sal, en un desierto pedregoso (harrat de basalto).
function maar() {
  const P = PALETAS.tierra, CIELO = rampa(P.cielo_maar), TOBA = rampa(P.toba), BAS = rampa(P.roca), SAL = rampa(P.salar);
  const HAR = rampa(P.harrat);
  const SOL = [276, 30];
  cielo('fondos/fondo_maar_1.png', (x, y) => {
    const dx = Math.min(Math.abs(x - SOL[0]), W - Math.abs(x - SOL[0])), d = Math.hypot(dx, y - SOL[1]);
    if (d < 6) return hex('#ffffff');
    if (d < 8) return (x + y) % 2 ? hex('#ffffff') : CIELO[5];
    // cielo de calor: azul pálido arriba, casi blanco y con bruma en el horizonte
    const t = Math.pow(clamp(y / 110, 0, 1), 0.8) + clamp(1 - d / 100, 0, 1) * 0.25;
    return tramado(CIELO, t, x, y);
  });

  // el cráter: borde lejano a y=100, pared del fondo en capas y el salar blanco; el borde cercano lo tapa abajo
  const M = { cx: 160, a: 118, cy: 134, b: 11 };
  const anchoCrater = (x) => { const u = (x - M.cx) / M.a; return Math.abs(u) < 1 ? Math.sqrt(1 - u * u) : 0; };
  capa('fondos/fondo_maar_2.png', (x) => {
    const s = anchoCrater(x);
    // llanura del harrat con lomas lejanas muy bajas; el borde del cráter sobresale un poco
    return 108 - 2 * onda(x, 3, 1.4) - 1.5 * ruido(x, 10, 111, 2) - 3 * Math.pow(s, 0.3);
  }, (x, y, i) => {
    const s = anchoCrater(x), u = (x - M.cx) / M.a;
    if (s > 0) {
      const top = M.cy - M.b * s, near = M.cy + 3 * s;   // salar visible entre la pared del fondo y el borde cercano
      const borde = Math.max(i.hs[x], M.cy - (M.b + 23) * Math.pow(s, 0.7)); // borde lejano: baja hasta el salar en los lados
      if (y < borde) {                                                      // llano detrás del cráter
        if (y < i.hs[x] + 1) return HAR[5];
        return hash(x, y, 116) > 0.9 ? HAR[2] : tramado(HAR.slice(3, 7), 0.62 - (y - i.hs[x]) / 40, x, y);
      }
      if (y >= near) {
        // borde cercano (cara exterior, iluminada por el Sol de la derecha): basalto y grava
        if (y < near + 1) return BAS[4];
        return hash(x, y, 112) > 0.9 ? HAR[2] : tramado(HAR.slice(3, 7), 0.62 - (y - i.hs[x]) / 40, x, y);
      }
      if (y >= top) {
        // salar: costra blanca con grietas poligonales tenues y bordes beige
        const g = tileNoise(x / 3, y, 0, 0, 113) > 0.8;
        if (y < top + 1) return SAL[1];
        return g ? SAL[1] : (x + y) % 5 ? SAL[3] : SAL[2];
      }
      // pared del fondo: casquete de basalto oscuro (3 px) y capas de toba más claras debajo
      const z = (y - borde) / Math.max(1, top - borde);             // 0 en el borde, 1 al llegar al salar
      const luz = 0.5 - u * 0.4;                                      // la pared izquierda mira al Sol (derecha)
      const carcava = Math.sin(x * 1.3 + ruido(x, 16, 114, 2) * 6) > 0.88; // surcos de erosión verticales
      if (y - borde < 3) return y - borde < 1 ? BAS[5] : tramado(BAS.slice(1, 5), 0.3 + luz * 0.5, x, y);
      const capaN = Math.floor(z * 6 + ruido(x, 8, 115, 2) * 0.6);
      const talud = z > 0.78;                                          // abanicos de derrubio al pie
      let t = 0.2 + luz * 0.55 + (capaN % 2) * 0.12 - (carcava ? 0.18 : 0) + (talud ? 0.1 : 0);
      if (capaN === 1 || capaN === 3) return tramado(BAS.slice(1, 5), t, x, y);           // coladas de basalto intercaladas
      return tramado(TOBA, t, x, y);
    }
    // llanura del harrat: suelo beige cubierto de piedras de basalto negro
    if (i.prof < 1) return HAR[5];
    if (hash(x, y, 116) > 0.9) return HAR[2];
    return tramado(HAR.slice(3, 7), 0.62 - i.prof / 40, x, y);
  }, { luzDesde: 'derecha', elev: 0.5 });

  // harrat cercano: grava beige cubierta de piedras y bloques de basalto con brillo de barniz del desierto
  const bloques = [[14, 3], [57, 2], [96, 4], [133, 2], [171, 3], [210, 2], [238, 4], [281, 2], [309, 3]];
  capa('fondos/fondo_maar_3.png', (x) => 150 + 3 * onda(x, 2, 0.7) + 2 * onda(x, 5, 2.1) + 1.5 * ruido(x, 20, 117, 2), (x, y, i) => {
    for (const [bx, r] of bloques) {
      const cy = i.hs[bx] - r * 0.45, dx = x - bx, dy = y - cy;
      if ((dx * dx) / (r * r) + (dy * dy) / (r * r * 0.5) <= 1) return dx - dy > r * 0.5 ? BAS[4] : dx > 0 ? BAS[2] : BAS[1];
    }
    if (i.prof < 1) return i.luz > 0.5 ? HAR[6] : HAR[5];
    // piedras sueltas: puntos oscuros de 1–2 px con un brillo arriba a la derecha
    const hp = hash(x, y, 118);
    if (hp > 0.92 && i.prof > 1) return hash(x, y - 1, 118) > 0.92 ? HAR[0] : HAR[1];
    if (hp > 0.9 && i.prof > 1) return HAR[5];
    return tramado(HAR.slice(2, 7), 0.62 - i.prof / 36 + (i.luz - 0.5) * 0.4, x, y);
  }, { luzDesde: 'derecha', elev: 0.45 });
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

// ---------------------------------------------------------------- Tierra: desierto genérico (cualquier sitio sin fondo propio)
// BM-001 del Excel (desierto hiperárido pedregoso, tipo Atacama): sin vegetación, piedras sueltas y un salar en el llano.
// Tarde dorada con cielo despejado y sierras lejanas.
function desierto() {
  const P = PALETAS.tierra, CIELO = rampa(P.cielo_tarde), LEJOS = rampa(P.sierra), CERCA = rampa(P.desierto_cerca);
  const SOL = [62, 70];
  cielo('fondos/fondo_desierto_1.png', (x, y) => {
    const dx = Math.min(Math.abs(x - SOL[0]), W - Math.abs(x - SOL[0])), d = Math.hypot(dx, y - SOL[1]);
    if (d < 8) return CIELO[6];
    if (d < 10) return (x + y) % 2 ? CIELO[6] : CIELO[5];
    let t = Math.pow(clamp(y / 140, 0, 1), 1.1) + clamp(1 - d / 110, 0, 1) * 0.25;
    // cirros altos, muy tenues
    const cirro = ruido(x + y * 2, 4, 71, 3);
    if (y > 24 && y < 60 && cirro > 0.32 && (x + y) % 2 === 0) return CIELO[Math.min(6, Math.floor(t * 6) + 1)];
    return tramado(CIELO.slice(0, 6), t, x, y);
  });
  // sierra lejana con mesetas: perfil escalonado y azulado por la distancia
  capa('fondos/fondo_desierto_2.png', (x) => {
    const sierra = 104 - 14 * clamp(1 - Math.abs(ruido(x, 4, 72, 4)) * 2.4, 0, 1) - 5 * onda(x, 2, 0.7);
    const meseta = ruido(x, 7, 73, 2) > 0.25 ? 112 - Math.round(ruido(x, 3, 74, 1) * 3) * 3 : 200;
    return Math.min(sierra, meseta);
  }, (x, y, i) => {
    if (i.prof < 1) return i.luz > 0.5 ? LEJOS[3] : LEJOS[2];
    return tramado(LEJOS, 0.6 - i.prof / 60 + (i.luz - 0.5) * 0.35, x, y);
  }, { luzDesde: 'izquierda', elev: 0.5 });
  // llano cercano con lomitas, matorral y rocas
  const rocas = [[18, 3], [51, 2], [77, 4], [112, 2], [139, 3], [168, 2], [196, 4], [228, 3], [251, 2], [300, 3]];
  capa('fondos/fondo_desierto_3.png', (x) => 146 + 5 * onda(x, 1, 1.9) + 4 * onda(x, 3, 0.3) + 2 * ruido(x, 16, 75, 3), (x, y, i) => {
    for (const [rx, r] of rocas) {
      const cy = i.hs[rx] - r * 0.4, dx = x - rx, dy = y - cy;
      if ((dx * dx) / (r * r) + (dy * dy) / (r * r * 0.45) <= 1) return dx + dy < -r * 0.5 ? CERCA[5] : dx + dy < 0 ? CERCA[4] : CERCA[2];
    }
    if (i.prof < 1) return i.luz > 0.5 ? CERCA[5] : CERCA[4];
    // salar: costra blanca en una franja baja del llano
    const salar = i.prof > 6 && i.prof < 13 && ruido(x, 3, 76, 2) > 0.05;
    if (salar) return tramado(rampa(PALETAS.tierra.salar), 0.55 + ruido(x, 24, 77, 2) * 0.5, x, y);
    // piedrecillas: pavimento del desierto
    if (hash(x, y, 78) > 0.9 && i.prof > 2) return i.luz > 0.5 ? CERCA[4] : CERCA[1];
    return tramado(CERCA.slice(1, 6), 0.62 - i.prof / 40 + (i.luz - 0.5) * 0.5, x, y);
  }, { luzDesde: 'izquierda', elev: 0.45 });
}

// ---------------------------------------------------------------- Tierra: campo de lava (Pinacate)
// Conos de ceniza en el horizonte, coladas de basalto negro con bordes ásperos, cielo claro con bruma.
function lava() {
  const P = PALETAS.tierra, CIELO = rampa(P.cielo_lava), CONOS = rampa(P.conos), BAS = rampa(P.roca);
  cielo('fondos/fondo_lava_1.png', (x, y) => {
    const t = Math.pow(clamp(y / 150, 0, 1), 1.2);
    if (hash(x, y, 81) > 0.997 && y < 40) return CIELO[2];
    return tramado(CIELO, t, x, y);
  });
  // conos de ceniza: montículos truncados, con cráter en la cima, en tonos óxido apagados
  const conos = [[34, 38, 24], [118, 26, 16], [176, 46, 30], [262, 30, 18]];
  capa('fondos/fondo_lava_2.png', (x) => {
    let h = 128 + 3 * onda(x, 3, 1.2) + 2 * ruido(x, 12, 82, 2);
    for (const [cx, r, alto] of conos) {
      let dx = Math.abs(x - cx); dx = Math.min(dx, W - dx);
      const u = dx / r;
      if (u < 1) {
        const cima = u < 0.28 ? alto - (0.28 - u) * 10 : alto * (1 - (u - 0.28) / 0.72) ** 1.2 + 0;
        h = Math.min(h, 128 - Math.max(0, cima));
      }
    }
    return h;
  }, (x, y, i) => {
    if (i.prof < 1) return i.luz > 0.55 ? CONOS[4] : CONOS[2];
    const surco = Math.sin(x * 0.9 + y * 0.15) > 0.8 && i.prof > 2;   // cárcavas en las laderas
    return tramado(CONOS.slice(0, 5), 0.62 - i.prof / 55 + (i.luz - 0.5) * 0.55 - (surco ? 0.12 : 0), x, y);
  }, { luzDesde: 'derecha', elev: 0.55 });
  // coladas cercanas: bordes dentados de basalto, casi negras, con brillos vítreos
  capa('fondos/fondo_lava_3.png', (x) => {
    const escalon = Math.round(ruido(x, 10, 83, 2) * 3) * 3;
    return 150 - escalon + 2.5 * ruido(x, 40, 84, 2) + 3 * onda(x, 2, 2.2);
  }, (x, y, i) => {
    if (i.prof < 1) return i.luz > 0.5 ? BAS[5] : BAS[3];
    const vidrio = hash(x, y, 85) > 0.965 && i.luz > 0.45;
    const grieta = tileNoise(x / 4, y / 2, 80, 0, 86) > 0.62;
    if (grieta) return BAS[0];
    return tramado(BAS.slice(0, 5), 0.45 - i.prof / 45 + (i.luz - 0.5) * 0.6 + (vidrio ? 0.35 : 0), x, y);
  }, { luzDesde: 'derecha', elev: 0.5 });
}
