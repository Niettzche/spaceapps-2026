// Obstáculos RECREADOS (declarados en pantalla): rocas sueltas y parches de arena blanda. Ver docs/juego/ESPECIFICACION.md §5b.
// Los modelos de elevación (30–200 m por píxel) no resuelven rocas de medio metro ni la arena suelta: se agregan para jugar,
// con semilla fija por sitio o destino (mismo nivel en cada partida), y llevan `recreacion: true`.
// Densidad, tamaños y agarre de la arena blanda son valores de juego (P). No toca el perfil (perfil.js).
//
// Reglas (P):
// - Rocas (0.3–0.6 m de diámetro, medio enterradas): Marte y Luna en todo el recorrido (los perfiles reales no traen tipo de
//   roca a esta escala); en la Tierra solo en tramos de roca y solo si el perfil no trae ya sus "bloques de roca recreados".
// - Arena blanda (5–8 m): en tramos de arena de la Tierra, solo donde el terreno es suave (< 10°). La rueda agarra 25 % menos.
// - Ni rocas ni arena blanda en los planos de inicio y final, ni en pendientes fuertes (no se vuelven paredes imposibles).
import { tr } from '../i18n.js';
import { aleatorio, semillaDe, alturaEn, superficieEn, PLANO_INICIO_M, PLANO_FINAL_M } from './perfil.js';

export const REGLAS_OBSTACULOS = {
  roca: {
    // asoma = fracción del radio que sobresale del suelo (el resto está enterrado).
    // Luna: rocas más bajas. Con 1/6 de gravedad, una roca de ~0.15 m de alto a 4 m/s lanza la carga fuera del soporte (probado).
    marte: { cada: [22, 38], radio: [0.15, 0.3], asoma: 0.8 },
    luna: { cada: [20, 34], radio: [0.15, 0.22], asoma: 0.5 },
    tierra: { cada: [14, 24], radio: [0.15, 0.3], asoma: 0.8 },
    pendienteMax: 14, // grados (ventana de ±1.5 m)
  },
  // Marte: campo de rocas con la distribución de tamaños de Golombek y Rapp 1997, reformulada en Golombek et al. 2012
  // (S86, S129; MR-071; docs/taller/FUENTES_FISICA.md): fracción de área cubierta por rocas de diámetro ≥ D,
  // F_k(D) = k·exp(−q·D), q = 1.79 + 0.152/k. El k de la elipse de Jezero es Gap: se usa k = 8 % (P; Viking 1 midió ~7–8 %).
  // De F_k sale cuántas rocas corta una línea por metro (abajo, golombekLinea). Solo D de 0.25 a 0.8 m (P): las menores no
  // se ven a esta escala y las mayores se esquivan al planear la ruta. Separación mínima de 5 m (P) para el paso seguro.
  golombek: { k: 0.08, D: [0.25, 0.8], asoma: 0.8, separacionMin_m: 5 },
  // Luna: cráteres pequeños en el regolito con la profundidad/diámetro típica que mide nuestro detector en el polo sur con
  // LOLA (d/D = 0.060, PROYECTO.md). Es la forma de cráteres de km aplicada a cráteres de 3–7 m (P); separación (P).
  // Forma de cuenco coseno (pendiente máxima ≈ π·d/D ≈ 11°), sin borde levantado (a 200 m el borde lunar medido sale negativo).
  crater: { cada: [22, 34], D: [3, 7], dD: 0.06, pendienteMax: 8 },
  arenaBlanda: { cada: [35, 55], largo: [5, 8], pendienteMax: 10, agarre: 0.75 },
  margenInicio: 4, // m después del plano de inicio
  margenFinal: 2, // m antes del plano final
};

// Extras de los caminos dorados (recreación, P). Solo decoración sin colisión salvo los bloques de toba de Al Hutaymah, que
// son rocas bajas probadas con el simulador (camino dorado 5/5, docs/juego/FISICA_V2.md §5.4).
//   samalayuca: rizaduras de viento (ripples) en la arena y matorral seco (sin colisión): dunas activas de cuarzo (S141).
//   g00263: bloques de toba y escoria del maar (anillo de toba de un campo basáltico; tamaño y separación P).
export const EXTRAS_SITIO = {
  // Samalayuca: además, arena blanda en los valles entre dunas (mínimos locales del perfil que bajan ≥ 0.4 m en ±8 m), donde
  // se junta la arena más suelta (P), hasta 3 parches de 4–6 m.
  samalayuca: { rizaduras: { cada: [9, 16], largo: [4, 9], pendienteMax: 12 }, matorral: { cada: [7, 15] }, arenaValles: { largo: [4, 6], max: 3, prominencia_m: 0.4, ventana_m: 8 } },
  g00263: { bloques: { cada: [20, 32], radio: [0.15, 0.24], asoma: 0.6, pendienteMax: 10 }, matorral: { cada: [12, 22] } },
};

const entre = (r, [a, b]) => a + r() * (b - a);

/** Pendiente local (grados, absoluta) alrededor de x. */
function pendienteLocal(perfil, x, w = 1.5) {
  return Math.abs((Math.atan2(alturaEn(perfil, x + w) - alturaEn(perfil, x - w), 2 * w) * 180) / Math.PI);
}

/**
 * Rocas que corta una línea por metro según Golombek (F_k(D) = k·e^(−qD)), entre D0 y D1. Número por m² con diámetro en
 * [D, D+dD] = (−dF/dD) / (π D²/4); una línea corta las de ancho D: λ = ∫ k q e^(−qD) · 4/(π D) dD. Devuelve
 * { porMetro, muestrear(r) } (muestreo por la inversa de la acumulada, integrada numéricamente).
 */
export function golombekLinea({ k, D: [D0, D1] }) {
  const q = 1.79 + 0.152 / k;
  const n = 200;
  const xs = [];
  const acum = [0];
  for (let i = 0; i <= n; i++) xs.push(D0 + ((D1 - D0) * i) / n);
  const f = (D) => (k * q * Math.exp(-q * D) * 4) / (Math.PI * D);
  for (let i = 1; i <= n; i++) acum.push(acum[i - 1] + ((f(xs[i - 1]) + f(xs[i])) / 2) * (xs[i] - xs[i - 1]));
  const total = acum[n];
  return {
    porMetro: total,
    q,
    muestrear(r) {
      const u = r() * total;
      let i = 1;
      while (i < n && acum[i] < u) i++;
      const t = (u - acum[i - 1]) / Math.max(1e-12, acum[i] - acum[i - 1]);
      return xs[i - 1] + t * (xs[i] - xs[i - 1]);
    },
  };
}

/**
 * Lista determinista de obstáculos del nivel (función pura).
 * @returns {Array<{ tipo: 'roca', x_m, radio_m } | { tipo: 'arena_blanda', desde_m, hasta_m } | { tipo: 'crater', x_m, diametro_m,
 *   profundidad_m } | { tipo: 'rizadura', desde_m, hasta_m } | { tipo: 'matorral', x_m }>}  (todo con recreacion: true)
 */
export function generarObstaculos(perfil, { mundo = 'tierra', semilla = '' } = {}) {
  const R = REGLAS_OBSTACULOS;
  const r = aleatorio(semillaDe(`obstaculos:${semilla}`));
  const inicio = PLANO_INICIO_M + R.margenInicio;
  const fin = perfil.largo_m - PLANO_FINAL_M - R.margenFinal;
  const lista = [];
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;

  // Cráteres lunares primero: las rocas no se ponen dentro de un cráter.
  if (mundo === 'luna') {
    const C = R.crater;
    const rc = aleatorio(semillaDe(`crateres:${semilla}`));
    for (let x = inicio + entre(rc, C.cada) / 2; x < fin; x += entre(rc, C.cada)) {
      const D = entre(rc, C.D);
      const a = x - D / 2;
      const b = x + D / 2;
      if (a < inicio || b > fin) continue;
      let ok = true;
      for (let s = a - 1; s <= b + 1 && ok; s += 0.5) ok = pendienteLocal(perfil, s) <= C.pendienteMax;
      if (ok) lista.push({ tipo: 'crater', x_m: r1(x), diametro_m: r1(D), profundidad_m: r2(D * C.dD), recreacion: true });
    }
  }
  const enCrater = (x, margen = 1) => lista.some((o) => o.tipo === 'crater' && Math.abs(x - o.x_m) < o.diametro_m / 2 + margen);

  const yaHayBloques = (perfil.recreacion ?? []).some((x) => x.tipo === 'bloque_roca');
  if (mundo === 'marte') {
    // Campo de rocas de Golombek (ver arriba): distancia entre rocas exponencial con media 1/λ, mínimo separacionMin_m.
    const G = R.golombek;
    const dist = golombekLinea(G);
    const rg = aleatorio(semillaDe(`golombek:${semilla}`));
    for (let x = inicio + G.separacionMin_m; x < fin; x += Math.max(G.separacionMin_m, -Math.log(1 - rg()) / dist.porMetro)) {
      const D = dist.muestrear(rg);
      if (pendienteLocal(perfil, x) > R.roca.pendienteMax) continue;
      const radio = r2(D / 2);
      lista.push({ tipo: 'roca', x_m: r1(x), radio_m: radio, alto_m: r2(radio * G.asoma), fuente: 'golombek', recreacion: true });
    }
  } else if (!(mundo === 'tierra' && yaHayBloques)) {
    const reglaRoca = R.roca[mundo] ?? R.roca.tierra;
    for (let x = inicio + entre(r, reglaRoca.cada) / 2; x < fin; x += entre(r, reglaRoca.cada)) {
      const radio = r2(entre(r, reglaRoca.radio));
      if (mundo === 'tierra' && superficieEn(perfil, x) !== 'roca') continue;
      if (pendienteLocal(perfil, x) > R.roca.pendienteMax || enCrater(x)) continue;
      lista.push({ tipo: 'roca', x_m: r1(x), radio_m: radio, alto_m: r2(radio * reglaRoca.asoma), recreacion: true });
    }
  }

  if (mundo === 'tierra') {
    const A = R.arenaBlanda;
    for (let x = inicio + entre(r, A.cada) / 2; x < fin; x += entre(r, A.cada)) {
      const largo = entre(r, A.largo);
      const hasta = Math.min(x + largo, fin);
      if (hasta - x < 3) continue;
      let ok = true;
      for (let s = x; s <= hasta && ok; s += 1) ok = superficieEn(perfil, s) === 'arena' && pendienteLocal(perfil, s) <= A.pendienteMax;
      if (ok) lista.push({ tipo: 'arena_blanda', desde_m: r1(x), hasta_m: r1(hasta), recreacion: true });
    }
    const E = EXTRAS_SITIO[semilla];
    if (E?.arenaValles) {
      const V = E.arenaValles;
      const rv = aleatorio(semillaDe(`valles:${semilla}`));
      let n = 0;
      for (let x = inicio + V.ventana_m; x < fin - V.ventana_m && n < V.max; x += 1) {
        const y = alturaEn(perfil, x);
        let min = true;
        let max = -Infinity;
        for (let d = -V.ventana_m; d <= V.ventana_m && min; d += 1) {
          const yd = alturaEn(perfil, x + d);
          if (d !== 0 && yd < y) min = false;
          max = Math.max(max, yd);
        }
        if (!min || max - y < V.prominencia_m) continue;
        const largo = entre(rv, V.largo);
        const desde = x - largo / 2;
        const hasta = x + largo / 2;
        if (lista.some((o) => o.tipo === 'arena_blanda' && desde < o.hasta_m + 3 && hasta > o.desde_m - 3)) continue;
        lista.push({ tipo: 'arena_blanda', desde_m: r1(desde), hasta_m: r1(hasta), valle: true, recreacion: true });
        n++;
        x += V.ventana_m;
      }
    }
    if (E?.bloques) {
      const B = E.bloques;
      const rb = aleatorio(semillaDe(`bloques_extra:${semilla}`));
      for (let x = inicio + entre(rb, B.cada) / 2; x < fin; x += entre(rb, B.cada)) {
        const radio = r2(entre(rb, B.radio));
        if (pendienteLocal(perfil, x) > B.pendienteMax) continue;
        if (lista.some((o) => o.tipo === 'arena_blanda' && x > o.desde_m - 2 && x < o.hasta_m + 2)) continue;
        lista.push({ tipo: 'roca', clase: 'toba', x_m: r1(x), radio_m: radio, alto_m: r2(radio * B.asoma), recreacion: true });
      }
    }
    if (E?.rizaduras) {
      const Z = E.rizaduras;
      const rz = aleatorio(semillaDe(`rizaduras:${semilla}`));
      for (let x = inicio + entre(rz, Z.cada) / 2; x < fin; x += entre(rz, Z.cada)) {
        const hasta = Math.min(x + entre(rz, Z.largo), fin);
        let ok = true;
        for (let s = x; s <= hasta && ok; s += 1) ok = pendienteLocal(perfil, s) <= Z.pendienteMax;
        if (ok) lista.push({ tipo: 'rizadura', desde_m: r1(x), hasta_m: r1(hasta), visual: true, recreacion: true });
      }
    }
    if (E?.matorral) {
      const rm = aleatorio(semillaDe(`matorral:${semilla}`));
      for (let x = inicio + entre(rm, E.matorral.cada) / 2; x < fin; x += entre(rm, E.matorral.cada)) {
        lista.push({ tipo: 'matorral', x_m: r1(x), variante: Math.floor(rm() * 3), visual: true, recreacion: true });
      }
    }
  }
  return lista;
}

/**
 * Perfil con los cráteres lunares hundidos (cuenco coseno de profundidad d/D·D). Devuelve un perfil nuevo con más puntos
 * dentro de cada cráter; sin cráteres devuelve el mismo objeto.
 */
export function aplicarCrateres(perfil, lista) {
  const crateres = (lista ?? []).filter((o) => o.tipo === 'crater');
  if (!crateres.length) return perfil;
  const nuevos = [];
  for (const c of crateres) for (let i = -10; i <= 10; i++) nuevos.push(Math.round((c.x_m + (i / 20) * c.diametro_m) * 1000) / 1000);
  // Sin puntos a menos de 5 cm de uno del perfil (segmentos de largo casi cero en el terreno).
  const x_m = [...perfil.x_m, ...nuevos.filter((x) => perfil.x_m.every((p) => Math.abs(p - x) > 0.05))].sort((a, b) => a - b);
  const y_m = x_m.map((x) => {
    let y = alturaEn(perfil, x);
    for (const c of crateres) {
      const d = Math.abs(x - c.x_m) / (c.diametro_m / 2);
      if (d < 1) y -= (c.profundidad_m * (1 + Math.cos(Math.PI * d))) / 2;
    }
    return Math.round(y * 1000) / 1000;
  });
  return { ...perfil, x_m, y_m };
}

/** Factor de agarre en x (m): arena blanda = 0.75 (P); en otro lugar 1. */
export function factorAgarreEn(lista, x) {
  for (const o of lista) if (o.tipo === 'arena_blanda' && x >= o.desde_m && x < o.hasta_m) return REGLAS_OBSTACULOS.arenaBlanda.agarre;
  return 1;
}

/** Nota corta para el HUD y el panel de datos, p. ej. "obstáculos recreados (5 rocas, 2 parches de arena blanda)". */
export function notaObstaculos(lista) {
  const rocasL = lista.filter((o) => o.tipo === 'roca');
  const rocas = rocasL.length;
  const arena = lista.filter((o) => o.tipo === 'arena_blanda').length;
  const crateres = lista.filter((o) => o.tipo === 'crater');
  const visuales = lista.filter((o) => o.visual).length;
  if (!rocas && !arena && !crateres.length && !visuales) return null;
  const partes = [];
  const d = rocasL.map((o) => o.radio_m * 2);
  const tam = d.length ? `${Math.min(...d).toFixed(1)}–${Math.max(...d).toFixed(1)} m` : '';
  const alto = Math.max(0, ...rocasL.map((o) => o.alto_m ?? 0));
  const toba = rocasL.some((o) => o.clase === 'toba');
  if (rocas) {
    partes.push(toba
      ? tr(`${rocas} bloques de toba de ${tam} (asoman ≤ ${alto.toFixed(2)} m, P)`, `${rocas} tuff blocks of ${tam} (≤ ${alto.toFixed(2)} m high, P)`)
      : tr(`${rocas} ${rocas === 1 ? 'roca' : 'rocas'} de ${tam} medio enterradas (asoman ≤ ${alto.toFixed(2)} m)`,
        `${rocas} half-buried ${rocas === 1 ? 'rock' : 'rocks'} of ${tam} (≤ ${alto.toFixed(2)} m high)`));
  }
  if (arena) partes.push(tr(`${arena} ${arena === 1 ? 'parche' : 'parches'} de arena blanda (agarre −25 %)`, `${arena} soft-sand ${arena === 1 ? 'patch' : 'patches'} (grip −25 %)`));
  if (crateres.length) {
    const D = crateres.map((o) => o.diametro_m);
    partes.push(tr(`${crateres.length} cráteres pequeños de ${Math.min(...D).toFixed(0)}–${Math.max(...D).toFixed(0)} m con d/D ${REGLAS_OBSTACULOS.crater.dD} (la del detector en el polo sur con LOLA, aplicada a cráteres chicos: P)`,
      `${crateres.length} small craters of ${Math.min(...D).toFixed(0)}–${Math.max(...D).toFixed(0)} m with d/D ${REGLAS_OBSTACULOS.crater.dD} (our detector's south-pole value from LOLA, applied to small craters: P)`));
  }
  if (visuales) partes.push(tr('rizaduras y matorral solo decorativos', 'ripples and shrubs are decoration only'));
  const golombek = rocasL.some((o) => o.fuente === 'golombek');
  const fuente = golombek ? tr(`; tamaños de Golombek y Rapp 1997, k = ${REGLAS_OBSTACULOS.golombek.k * 100} % (P: el de Jezero es Gap)`,
    `; sizes from Golombek & Rapp 1997, k = ${REGLAS_OBSTACULOS.golombek.k * 100} % (P: Jezero's is a gap)`) : '';
  return tr(`obstáculos recreados (${partes.join(', ')}${fuente}; el modelo de elevación no los resuelve)`,
    `recreated obstacles (${partes.join(', ')}${fuente}; the elevation model does not resolve them)`);
}

// Colores provisionales (si falta el arte `obstaculo_roca_*`): un tono más oscuro que la roca de cada mundo.
const COLOR_ROCA = { tierra: [0x5a5560, 0x8a8490], marte: [0x6a3c2e, 0x9a6050], luna: [0x5e5e64, 0x9a9aa2] };
const COLOR_ARENA_BLANDA = { tierra: 0xc49a58, marte: 0xa9603a, luna: 0x86868c };
// Franja de arriba de la arena blanda: más clara que el suelo, para que el parche se distinga (con hoyuelos oscuros).
const COLOR_ARENA_BLANDA_BORDE = { tierra: 0xf3d79a, marte: 0xe09a6a, luna: 0xd0d0d6 };

/**
 * Contorno oscuro de 1 px de arte y sombra (copias teñidas del sprite, detrás) para que un obstáculo se lea sobre el suelo.
 * `recorte` = [x, y, ancho, alto] en px de arte si el sprite está recortado.
 */
export function contornear(scene, s, { color = 0x120c0a, luz = 0xf2e6d0, recorte = null, sombra = true, aclarar = 0 } = {}) {
  const PX = 3;
  // Lados oscuros, borde de arriba claro (la luz viene de arriba) y sombra abajo a la derecha: el arte de roca tiene casi el
  // mismo color que el suelo de Marte y de la Luna, y sin esto solo se veía el contorno.
  const offs = [[-PX, 0, color, 0.9], [PX, 0, color, 0.9], [0, -PX, luz, 0.95]];
  if (sombra) offs.push([2 * PX, PX, 0x000000, 0.35]);
  // aclarar = velo claro encima del arte (0–1): las rocas de Marte y la Luna son del color del suelo; las rocas frescas se ven
  // más claras que el polvo que las rodea, así que se aclaran un poco para que se distingan.
  if (aclarar > 0) offs.push([0, 0, luz, aclarar, 0.01]);
  return offs.map(([dx, dy, c, a, dz = -0.01]) => {
    const copia = scene.add.image(s.x + dx, s.y + dy, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY)
      .setScale(s.scaleX, s.scaleY).setDepth(s.depth + dz).setTintFill(c).setAlpha(a);
    if (recorte) copia.setCrop(...recorte);
    return copia;
  });
}

/**
 * Borde visible de un parche que sigue el terreno: franja del color del material encima del suelo (1 px de arte), banda más
 * oscura debajo y, si `hoyos`, huellas/hoyuelos oscuros (arena blanda, lodo, nieve). Así el parche se distingue del suelo.
 */
export function bordeParche(g, perfil, { xMundo, yMundo }, desde, hasta, color, { oscuro = 0x2a1c12, hoyos = false } = {}) {
  const PX = 3;
  for (let xm = desde, k = 0; xm < hasta; xm += 0.125, k++) {
    const xp = Math.round(xMundo(xm) / PX) * PX;
    const y = Math.round(yMundo(alturaEn(perfil, xm)) / PX) * PX;
    const borde = xm - desde < 0.25 || hasta - xm < 0.375;
    g.fillStyle(color, 1).fillRect(xp, y - PX, PX, PX);
    g.fillStyle(oscuro, borde ? 0.85 : 0.35).fillRect(xp, y, PX, borde ? 3 * PX : 2 * PX);
    if (hoyos && k % 4 === 1) g.fillStyle(oscuro, 0.7).fillRect(xp, y - PX, PX, PX);
  }
}

const COLOR_RIZADURA = { luz: 0xf6dfa6, sombra: 0xa47e4a };
const COLOR_MATORRAL = [0x6b5a35, 0x8a7a48, 0x4a3f28];
const COLOR_CRATER = { luna: [0xe4e4ec, 0x000000], marte: [0xe8b08a, 0x2a140e], tierra: [0xe8dcc8, 0x2a2018] };
const LUZ_ROCA = { luna: 0xe4e4ec, marte: 0xf0b890, tierra: 0xf2e6d0 };

/**
 * Crea los cuerpos (rocas estáticas, label 'suelo' para que cuenten como suelo en contactos y golpes) y el dibujo.
 * @param {Phaser.Scene} scene
 * @param {object} perfil
 * @param {{ xMundo, yMundo }} terreno  conversores de construirTerreno
 * @param {Array} lista  de generarObstaculos
 * @param {{ mundo, sprite?, hayArte? }} o  sprite / hayArte = los de fisica/aspecto.js (arte si existe; si no, figura)
 */
export function crearObstaculos(scene, perfil, { xMundo, yMundo }, lista, { mundo = 'tierra', sprite = null, hayArte = () => false } = {}) {
  // Arte por mundo con respaldo al de la Tierra: obstaculo_roca_<mundo>_<n> → obstaculo_roca_<n>; arena igual.
  const elegir = (base, sufijo = '') => [mundo !== 'tierra' && `${base}_${mundo}${sufijo}`, `${base}${sufijo}`]
    .find((n) => n && hayArte(scene, n)) ?? null;
  const PX = 3; // 1 px de arte
  const g = scene.add.graphics().setDepth(3);
  const cuerpos = [];
  const [oscuro, claro] = COLOR_ROCA[mundo] ?? COLOR_ROCA.tierra;
  let i = 0;
  for (const o of lista) {
    if (o.tipo === 'roca') {
      const x = xMundo(o.x_m);
      const rpx = o.radio_m * 24;
      const ySuelo = yMundo(alturaEn(perfil, o.x_m));
      const alto = Math.min(o.alto_m ?? o.radio_m, o.radio_m) * 24; // lo que sobresale
      const cuerpo = scene.matter.add.circle(x, ySuelo + rpx - alto, rpx, { // el centro queda bajo el suelo
        isStatic: true, label: 'suelo', friction: 1, frictionStatic: 1, restitution: 0,
      });
      cuerpo.obstaculo = 'roca';
      cuerpos.push(cuerpo);
      // Arte según el tamaño (las grandes con el sprite grande); la toba de Al Hutaymah con la roca aclarada.
      const n = o.radio_m * 2 < 0.4 ? 1 : o.radio_m * 2 < 0.6 ? 2 : 3;
      const nombre = sprite && elegir('obstaculo_roca', `_${o.fuente === 'golombek' ? n : (i % 3) + 1}`);
      const s = nombre && sprite(scene, nombre, { x, y: ySuelo, origen: [0.5, 1], profundidad: 3 });
      if (s) {
        // A escala de arte; solo se ve la parte de arriba que asoma (la roca está medio enterrada): se recorta el resto.
        // Mínimo 3 px de arte visibles (antes 2: las rocas de la Luna y Marte casi no se veían), con contorno y sombra.
        const H = s.frame.height;
        const vis = Math.min(H, Math.max(3, Math.round(alto / PX) + 1));
        s.setCrop(0, 0, s.frame.width, vis);
        s.y = ySuelo + PX + (H - vis) * PX;
        if (o.clase === 'toba') s.setTint(0xe6d6b8);
        contornear(scene, s, { recorte: [0, 0, s.frame.width, vis], luz: LUZ_ROCA[mundo] ?? LUZ_ROCA.tierra, aclarar: mundo === 'tierra' ? 0 : 0.35 });
      } else {
        // Roca de píxeles (1 px de arte = 1/8 m): mínimo 3 × 2 px para que se vea; tapa más angosta, brillo y sombra.
        const ancho = 2 * Math.sqrt(Math.max(0, rpx * rpx - (rpx - alto) * (rpx - alto))); // cuerda a ras del suelo
        const w = Math.max(4, Math.round(ancho / PX));
        const h = Math.max(3, Math.round(alto / PX));
        const x0 = Math.round(x / PX) * PX - Math.floor(w / 2) * PX;
        const y0 = Math.round(ySuelo / PX) * PX + PX; // la base se mete 1 px en el suelo
        g.fillStyle(oscuro, 1);
        for (let k = 0; k < h; k++) {
          const recorte = k === h - 1 && w > 3 ? 1 : 0; // fila de arriba más angosta
          g.fillRect(x0 + recorte * PX, y0 - (k + 1) * PX, (w - 2 * recorte) * PX, PX);
        }
        g.fillStyle(claro, 1);
        g.fillRect(x0 + (w > 3 ? PX : 0), y0 - h * PX, Math.max(1, Math.floor(w / 3)) * PX, PX);
        g.fillStyle(0x000000, 0.35);
        g.fillRect(x0 + w * PX, y0 - PX, PX, PX);
        g.lineStyle(1, 0x120c0a, 0.9).strokeRect(x0 - 1, y0 - h * PX - 1, w * PX + 2, h * PX + 1);
      }
      i++;
    } else if (o.tipo === 'crater') {
      // Cráter lunar pequeño: el hueco ya está en el perfil (aplicarCrateres). Aquí el borde iluminado y el fondo en sombra.
      const [luz, sombra] = COLOR_CRATER[mundo] ?? COLOR_CRATER.luna;
      const R = o.diametro_m / 2;
      for (let xm = o.x_m - R; xm <= o.x_m + R; xm += 0.125) {
        const y = Math.round(yMundo(alturaEn(perfil, xm)) / PX) * PX;
        const d = Math.abs(xm - o.x_m) / R;
        // Borde iluminado (2 px de arte) en el último cuarto del radio; fondo en sombra.
        if (d > 0.7) g.fillStyle(luz, 0.95).fillRect(Math.round(xMundo(xm) / PX) * PX, y - PX, PX, PX * 2);
        else g.fillStyle(sombra, 0.45).fillRect(Math.round(xMundo(xm) / PX) * PX, y, PX, PX * 3);
      }
      g.fillStyle(luz, 0.9);
      for (const lado of [-1, 1]) { // guijarros de eyecta junto al borde (solo dibujo)
        const xm = o.x_m + lado * (R + 0.4);
        const y = Math.round(yMundo(alturaEn(perfil, xm)) / PX) * PX;
        g.fillRect(Math.round(xMundo(xm) / PX) * PX, y - PX, PX * 2, PX);
      }
    } else if (o.tipo === 'rizadura') {
      // Rizaduras de viento (ripples): crestas de 1 px de arte cada ~0.4 m, con su lado de sombra. Solo dibujo.
      for (let xm = o.desde_m; xm < o.hasta_m; xm += 0.4) {
        const xp = Math.round(xMundo(xm) / PX) * PX;
        const y = Math.round(yMundo(alturaEn(perfil, xm)) / PX) * PX;
        g.fillStyle(COLOR_RIZADURA.luz, 1).fillRect(xp, y - PX, PX * 2, PX);
        g.fillStyle(COLOR_RIZADURA.sombra, 0.9).fillRect(xp + 2 * PX, y - PX, PX, PX).fillRect(xp + PX, y, PX * 2, PX);
      }
    } else if (o.tipo === 'matorral') {
      // Matorral seco (gobernadora, gramas): decoración sin colisión, detrás del robot.
      const xp = Math.round(xMundo(o.x_m) / PX) * PX;
      const y = Math.round(yMundo(alturaEn(perfil, o.x_m)) / PX) * PX;
      const gm = scene.add.graphics().setDepth(2.5);
      const tallos = [[0, 4], [-1, 3], [1, 3], [-2, 2], [2, 2], [-1, 5], [1, 4]].slice(0, 5 + (o.variante ?? 0));
      for (const [dx, h] of tallos) {
        gm.fillStyle(COLOR_MATORRAL[(dx + 3) % 3], 1).fillRect(xp + dx * PX, y - h * PX, PX, h * PX);
      }
      gm.fillStyle(0x9c8c56, 1).fillRect(xp - PX, y - 4 * PX, PX, PX).fillRect(xp + PX, y - 5 * PX, PX, PX);
    } else if (o.tipo === 'arena_blanda') {
      const nombre = sprite && elegir('obstaculo_arena_blanda');
      if (nombre) {
        // Tile repetible (16 × 4 px = 2 × 0.5 m) apoyado en el suelo de cada tramo; el último se recorta al largo del parche.
        for (let xm = o.desde_m; xm < o.hasta_m - 0.05; xm += 2) {
          const t = sprite(scene, nombre, { x: xMundo(xm), y: yMundo(alturaEn(perfil, xm + 1)) + 2 * PX, origen: [0, 1], profundidad: 3 });
          if (t && xm + 2 > o.hasta_m) t.setCrop(0, 0, Math.max(1, Math.round(((o.hasta_m - xm) / 2) * t.frame.width)), t.frame.height);
        }
        bordeParche(g, perfil, { xMundo, yMundo }, o.desde_m, o.hasta_m, COLOR_ARENA_BLANDA_BORDE[mundo] ?? COLOR_ARENA_BLANDA_BORDE.tierra, { hoyos: true });
      } else {
        // Sin arte: puntitos más oscuros sobre la superficie del tramo.
        g.fillStyle(COLOR_ARENA_BLANDA[mundo] ?? COLOR_ARENA_BLANDA.tierra, 0.85);
        const r = aleatorio(semillaDe(`arena:${o.desde_m}`));
        for (let xm = o.desde_m; xm < o.hasta_m; xm += 0.25) {
          const y = yMundo(alturaEn(perfil, xm));
          g.fillRect(Math.round(xMundo(xm) / PX) * PX, Math.round(y / PX) * PX - PX + Math.floor(r() * 3) * PX, PX, PX);
        }
      }
    }
  }
  return { cuerpos, dibujo: g };
}
