// Infografía de museo en pixel art. Cada ilustración se dibuja a 1 px de arte en un canvas chico (128 × 72 o menos) y se
// amplía con image-rendering: pixelated, con las paletas del juego (assets/paletas.json) y tramado ordenado (Bayer 4 × 4),
// igual que el arte de Marsception. Los cortes de El Elegante y Peñasquito son sus perfiles radiales reales
// (ciencia_datos/datos/perfiles_radiales.json, vía preparar_datos.py); los cráteres de la Luna y Marte del panel 2 están a la
// escala de su profundidad entre diámetro mediana (0.060 y 0.027, model/NIVEL2.md). Todo se anima al aparecer.

const PAL = {
  contorno: '#0e0c16',
  espacio: ['#0d051c', '#180630', '#240d43', '#2e0d6b'],
  estrella: '#cfc4ff',
  metal: ['#2e3648', '#4a5468', '#9aa6ba', '#d0d8e6', '#ffffff'],
  acento: ['#a8301a', '#f2701f', '#ffd23c', '#fff08a'],
  turquesa: '#4ce8d8', lavanda: '#b9a6ff', rojo: '#ff5a4a',
  cieloTierra: ['#141026', '#2a1a48', '#5a2a5a', '#a8405a', '#e0703a', '#ffb45a'],
  desierto: ['#24140e', '#4a2c1a', '#74482a', '#9e6a3e', '#c48e56', '#e6b878'],
  roca: ['#141012', '#2a2024', '#43363a', '#624e4c', '#8a6e62', '#b8967e'],
  cieloLuna: ['#000000', '#05040a', '#0c0a16'],
  luna: ['#121218', '#24242c', '#3c3c48', '#5c5c6a', '#8a8a98', '#c4c4d0'],
  cieloMarte: ['#1e0e10', '#3e1a16', '#6e3222', '#a4583a', '#d08a5c'],
  marte: ['#2e120c', '#4e2216', '#743622', '#9a4e2e', '#c06c40', '#de9662'],
  arenaMarte: ['#c48e56', '#dca462', '#e6b878', '#f6d698'],   // arena clara: se distingue del suelo marciano
};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const reducido = matchMedia('(prefers-reduced-motion: reduce)');

const nuevoLienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function ctx2d(c) { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; }
function px(g, x, y, color) { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
const ruido = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 97;

// Degradado vertical tramado entre varios colores
function degradado(g, x0, y0, w, h, colores) {
  const n = colores.length - 1;
  for (let y = 0; y < h; y++) {
    const t = (y / Math.max(1, h - 1)) * n;
    const i = Math.min(Math.floor(t), n - 1), f = t - i;
    for (let x = 0; x < w; x++) {
      const umbral = (BAYER[(y0 + y) & 3][(x0 + x) & 3] + 0.5) / 16;
      px(g, x0 + x, y0 + y, colores[Math.max(0, Math.min(n, i + (f > umbral ? 1 : 0)))]);
    }
  }
}
function estrellas(g, x0, x1, y0, y1, n, semilla = 1) {
  for (let i = 0; i < n; i++) {
    const x = x0 + (ruido(i * 7 + semilla, 3) * 13 + i * 29) % (x1 - x0);
    const y = y0 + (ruido(i * 11 + semilla, 5) * 7 + i * 17) % (y1 - y0);
    px(g, x, y, i % 5 === 0 ? '#ffffff' : PAL.estrella);
  }
}
// Suelo en corte: la orilla de arriba clara (como los tiles del juego) y el cuerpo tramado, más oscuro con la profundidad
function suelo(g, x0, x1, alto, altura, paleta, limite = Infinity) {
  const n = paleta.length;
  for (let x = x0; x < x1 && x < limite; x++) {
    const yt = Math.round(altura(x));
    for (let y = Math.max(0, yt); y < alto; y++) {
      const d = y - yt;
      let c;
      if (d === 0) c = paleta[n - 1];
      else if (d === 1) c = paleta[n - 2];
      else {
        const base = d < 6 ? n - 3 : d < 14 ? n - 4 : n - 5;
        c = paleta[Math.max(0, base - (ruido(x, y) < 18 ? 1 : 0))];
      }
      px(g, x, y, c);
    }
  }
}
function sprite(g, mapa, x0, y0, colores) {
  mapa.forEach((fila, y) => [...fila].forEach((ch, x) => { if (colores[ch]) px(g, x0 + x, y0 + y, colores[ch]); }));
}
function circulo(g, cx, cy, r, color) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(g, cx + x, cy + y, color);
}

// Perfil radial real (altura / diámetro) interpolado en r/R
function perfilDe(datos, id) {
  const r = datos.r, p = datos.sitios[id].tierra;
  return (q) => {
    if (q <= r[0]) return p[0];
    if (q >= r[r.length - 1]) return p[p.length - 1] * Math.max(0, 1 - (q - r[r.length - 1]) * 2);
    let i = 0; while (r[i + 1] < q) i++;
    const f = (q - r[i]) / (r[i + 1] - r[i]);
    return p[i] * (1 - f) + p[i + 1] * f;
  };
}

const SATELITE = [
  '.....m.....',
  'pppp.M.pppp',
  'pPpPMMMPpPp',
  'pppp.M.pppp',
  '.....m.....',
];
const coloresSat = { p: PAL.metal[0], P: PAL.turquesa, M: PAL.metal[3], m: PAL.metal[2] };

/* ── ① Medimos: un satélite recorre El Elegante y deja marcado su perfil ── */
function medimos(c, { perfiles }) {
  const W = 128, H = 72, y0 = 46, cx = 64, R = 20, D = 2 * R, EXAG = 2;
  const perfil = perfilDe(perfiles, 'MX0008');
  const altura = (x) => y0 - perfil(Math.abs(x - cx) / R) * D * EXAG;
  const fondo = nuevoLienzo(W, H), gf = ctx2d(fondo);
  degradado(gf, 0, 0, W, H, PAL.cieloTierra);
  estrellas(gf, 0, W, 1, 22, 14, 3);
  suelo(gf, 0, W, H, altura, PAL.desierto);
  const g = ctx2d(c);
  return (t) => {
    const ciclo = 7;
    const sx = reducido.matches ? 58 : -14 + ((t % ciclo) / ciclo) * (W + 28);
    g.drawImage(fondo, 0, 0);
    // perfil medido: la orilla queda marcada en turquesa por donde ya pasó el satélite
    const hasta = reducido.matches ? W : sx + 5;
    for (let x = 0; x < Math.min(W, hasta); x++) px(g, x, Math.round(altura(x)) - 1, PAL.turquesa);
    // haz del escáner, tramado
    for (let y = 13; y < 52; y++) {
      const ancho = 1 + Math.floor((y - 13) * 0.22);
      for (let dx = -ancho; dx <= ancho; dx++) {
        const x = Math.round(sx + 5 + dx);
        if (x < 0 || x >= W || y >= Math.round(altura(x))) continue;
        if ((BAYER[y & 3][x & 3]) < 5) px(g, x, y, PAL.turquesa);
      }
    }
    sprite(g, SATELITE, Math.round(sx), 8, coloresSat);
  };
}

/* ── ② Comparamos: un cráter lunar hondo junto a uno marciano que se rellena de arena ── */
function comparamos(c) {
  const W = 128, H = 72, y0 = 40, R = 20, D = 2 * R, EXAG = 5;
  const prof = (dd) => dd * D * EXAG;           // px de hondura
  const borde = 1.5;
  const cuenco = (cx, x) => {
    const dx = Math.abs(x - cx);
    if (dx < R) return y0 + prof(0.06) * (1 - (dx / R) ** 2) - borde * (dx / R) ** 2;
    return y0 - borde * (R / dx) ** 3;
  };
  const fondo = nuevoLienzo(W, H), gf = ctx2d(fondo);
  degradado(gf, 0, 0, 64, H, PAL.cieloLuna);
  estrellas(gf, 0, 64, 1, 30, 10, 7);
  degradado(gf, 64, 0, 64, H, PAL.cieloMarte);
  suelo(gf, 0, 64, H, (x) => cuenco(32, x), PAL.luna);
  suelo(gf, 64, 128, H, (x) => cuenco(96, x), PAL.marte);
  for (let y = 0; y < H; y++) px(gf, 64, y, PAL.contorno);
  const g = ctx2d(c);
  const nivelFinal = y0 + prof(0.027);         // la arena sube hasta dejar d/D = 0.027
  let inicio = null;
  return (t) => {
    if (inicio === null) inicio = t;
    const k = reducido.matches ? 1 : Math.min(1, Math.max(0, (t - inicio - 0.6) / 2.4));
    const fondoCrater = y0 + prof(0.06);
    const nivel = fondoCrater - (fondoCrater - nivelFinal) * k;
    g.drawImage(fondo, 0, 0);
    for (let x = 97 - R; x < 96 + R; x++) {
      const yb = Math.round(cuenco(96, x));
      for (let y = Math.ceil(nivel); y < yb; y++) {
        const capa = y === Math.ceil(nivel) ? 3 : (BAYER[y & 3][x & 3] < 8 ? 2 : 1);
        px(g, x, y, PAL.arenaMarte[capa]);
      }
    }
    // granos que caen mientras se rellena
    if (k > 0 && k < 1) for (let i = 0; i < 6; i++) {
      const gx = 82 + ((i * 37 + Math.floor(t * 9) * 13) % 28), gy = 20 + ((t * 40 + i * 11) % 18);
      if (gy < nivel) px(g, gx, gy, PAL.arenaMarte[3]);
    }
  };
}

/* ── ③ Revisamos el borde: cortes reales de El Elegante (cráter) y Peñasquito (mina) ── */
function bordeArte(c, { perfiles }) {
  const W = 128, H = 72, y0 = 26, R = 14, D = 2 * R, EXAG = 6;
  const el = perfilDe(perfiles, 'MX0008'), pe = perfilDe(perfiles, 'MX0155');
  const alturaEl = (x) => y0 - el(Math.abs(x - 32) / R) * D * EXAG;
  const alturaPe = (x) => y0 - pe(Math.abs(x - 96) / R) * D * EXAG;
  const g = ctx2d(c);
  const cielo = nuevoLienzo(W, H), gc = ctx2d(cielo);
  degradado(gc, 0, 0, W, H, PAL.cieloTierra);
  estrellas(gc, 0, W, 1, 14, 10, 11);
  const flecha = ['ccc', '.c.'];
  let inicio = null;
  // dónde está el borde de El Elegante (el punto más alto del perfil entre 1 y 1.7 radios)
  let qMax = 1.25, hMax = -1;
  for (let q = 0.9; q <= 1.7; q += 0.01) if (el(q) > hMax) { hMax = el(q); qMax = q; }
  return (t) => {
    if (inicio === null) inicio = t;
    const k = reducido.matches ? 1 : Math.min(1, (t - inicio - 0.3) / 1.6);
    g.drawImage(cielo, 0, 0);
    const limite = Math.max(0, Math.round(k * W));
    suelo(g, 0, 64, H, alturaEl, PAL.desierto, limite);
    suelo(g, 64, 128, H, alturaPe, PAL.roca, limite);
    for (let y = 0; y < H; y++) px(g, 64, y, PAL.contorno);
    if (k >= 1 && (reducido.matches || Math.floor(t * 2) % 2 === 0)) {
      for (const lado of [-1, 1]) {
        const xb = Math.round(32 + lado * qMax * R);
        sprite(g, flecha, xb - 1, Math.round(alturaEl(xb)) - 6, { c: PAL.acento[2] });
        const xm = Math.round(96 + lado * qMax * R);
        const ym = Math.round(alturaPe(xm)) - 6;
        px(g, xm - 1, ym, PAL.rojo); px(g, xm + 1, ym, PAL.rojo); px(g, xm, ym + 1, PAL.rojo); px(g, xm - 1, ym + 2, PAL.rojo); px(g, xm + 1, ym + 2, PAL.rojo);
      }
    }
  };
}

/* ── Gravedad: la carga del juego cae 2 m en la Tierra, Marte y la Luna, con su tiempo real ── */
function gravedad(c, { carga }) {
  const W = 72, H = 36, suelo0 = 31, arriba = 3;
  const tiempos = [Math.sqrt(4 / 9.81), Math.sqrt(4 / 3.71), Math.sqrt(4 / 1.62)];
  const colores = [PAL.turquesa, PAL.rojo, PAL.lavanda];
  const g = ctx2d(c);
  return (t) => {
    g.fillStyle = PAL.espacio[0]; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x++) px(g, x, suelo0, PAL.metal[1]);
    const ciclo = 3.4, f = reducido.matches ? 9 : (t % ciclo) - 0.6;
    tiempos.forEach((tc, i) => {
      const cx = 12 + i * 24;
      const tt = Math.max(0, Math.min(f, tc));
      const y = arriba + (suelo0 - 5 - arriba) * (tt / tc) ** 2;
      if (carga.complete && carga.naturalWidth) g.drawImage(carga, 0, 0, 7, 5, cx - 3, Math.round(y), 7, 5);
      if (f >= tc && f < tc + 0.35) { px(g, cx - 5, suelo0 - 1, colores[i]); px(g, cx + 5, suelo0 - 1, colores[i]); }
      for (let x = cx - 1; x <= cx + 1; x++) px(g, x, suelo0 + 2, colores[i]);
    });
  };
}

/* ── Temperatura: oscilación diaria (K) en la Tierra (máximo del modelo), Jezero y el polo sur lunar ── */
function termica(c) {
  const W = 72, H = 40, valores = [40, 55, 176], colores = [PAL.turquesa, PAL.rojo, PAL.lavanda];
  const g = ctx2d(c);
  let inicio = null;
  return (t) => {
    if (inicio === null) inicio = t;
    const k = reducido.matches ? 1 : Math.min(1, (t - inicio) / 1.4);
    g.fillStyle = PAL.espacio[0]; g.fillRect(0, 0, W, H);
    valores.forEach((v, i) => {
      const x = 10 + i * 24, base = 34, alto = Math.round((v / 176) * 26 * (1 - (1 - k) ** 3));
      for (let y = base - 27; y <= base; y++) { px(g, x - 1, y, PAL.metal[1]); px(g, x + 3, y, PAL.metal[1]); }
      for (let y = base - alto; y <= base; y++) for (let dx = 0; dx < 3; dx++) px(g, x + dx, y, colores[i]);
      circulo(g, x + 1, base + 2, 3, colores[i]);
    });
  };
}

/* ── Aire: la Tierra con su atmósfera; la Luna sin ella ── */
function vacio(c) {
  const g = ctx2d(c);
  return (t) => {
    g.fillStyle = PAL.espacio[0]; g.fillRect(0, 0, 64, 32);
    estrellas(g, 0, 64, 0, 32, 8, 19);
    const brillo = reducido.matches ? 0 : Math.floor(t * 2) % 2;
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      for (const r of [11, 12]) if ((a + r + brillo) % 2 === 0) px(g, 18 + Math.cos(ang) * r, 16 + Math.sin(ang) * r, PAL.turquesa);
    }
    circulo(g, 18, 16, 9, '#2f6fd6');
    for (let i = 0; i < 26; i++) px(g, 12 + (ruido(i, 2) % 13), 9 + (ruido(i, 4) % 14), '#3fae6a');
    circulo(g, 47, 16, 7, PAL.luna[3]);
    for (let i = 0; i < 9; i++) px(g, 42 + (ruido(i, 8) % 10), 11 + (ruido(i, 9) % 10), PAL.luna[2]);
  };
}

/* ── Radiación: el campo magnético de la Tierra la desvía ── */
function radiacion(c) {
  const g = ctx2d(c);
  return (t) => {
    g.fillStyle = PAL.espacio[0]; g.fillRect(0, 0, 64, 32);
    circulo(g, 4, 16, 6, PAL.acento[2]);
    const fase = reducido.matches ? 0 : Math.floor(t * 12);
    for (const y of [8, 13, 19, 24]) for (let x = 12; x < 40; x++) if ((x + fase) % 5 < 2) px(g, x, y, PAL.acento[3]);
    for (let a = -1.2; a <= 1.2; a += 0.06) px(g, 52 - Math.cos(a) * 12, 16 + Math.sin(a) * 12, PAL.turquesa);
    circulo(g, 54, 16, 6, '#2f6fd6');
  };
}

const ARTE = { medimos, comparamos, borde: bordeArte, gravedad, termica, vacio, radiacion };

export function montarInfografia(raiz, datos) {
  const carga = new Image();
  carga.src = `${import.meta.env.BASE_URL}arte/carga.png`;
  const piezas = [...raiz.querySelectorAll('canvas[data-arte]')].map((c) => {
    c.width = Number(c.getAttribute('width')); c.height = Number(c.getAttribute('height'));
    return { c, dibujar: ARTE[c.dataset.arte](c, { ...datos, carga }), visible: false, t0: null };
  });
  const io = new IntersectionObserver((entradas) => {
    for (const en of entradas) {
      const p = piezas.find((q) => q.c === en.target);
      p.visible = en.isIntersecting;
      if (p.visible && p.t0 === null) p.t0 = performance.now() / 1000;
    }
    arrancar();
  }, { threshold: 0.3 });
  piezas.forEach((p) => { io.observe(p.c); p.dibujar(0); });

  // 20 cuadros por segundo, como un juego retro; solo mientras alguna ilustración está en pantalla
  let corriendo = false, ultimo = 0;
  function ciclo(ahora) {
    const algun = piezas.some((p) => p.visible);
    if (!algun || document.hidden) { corriendo = false; return; }
    if (ahora - ultimo >= 50) {
      ultimo = ahora;
      for (const p of piezas) if (p.visible) p.dibujar(ahora / 1000 - p.t0);
    }
    requestAnimationFrame(ciclo);
  }
  function arrancar() { if (!corriendo && piezas.some((p) => p.visible)) { corriendo = true; requestAnimationFrame(ciclo); } }
  document.addEventListener('visibilitychange', arrancar);
  carga.addEventListener('load', () => piezas.forEach((p) => { if (p.c.dataset.arte === 'gravedad') p.dibujar(0); }));
}
