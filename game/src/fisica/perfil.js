// Perfiles de recorrido (funciones puras, sin Phaser). Ver docs/juego/ESPECIFICACION.md §8.
//
// Un perfil es: { x_m: [], y_m: [], superficies: [{ desde, hasta, tipo }], largo_m, ilustrativo, fuente, nota }
//   x_m, y_m: puntos del recorrido en metros (y hacia arriba), ya con la exageración vertical aplicada.
//   superficies: tramos en metros; tipo ∈ arena | roca | compacto.
//   ilustrativo: true si NO viene de datos reales (se avisa en pantalla).

import { tr } from '../i18n.js';
import { traducirFuente } from './nombres_en.js';

export const SUPERFICIES = ['arena', 'roca', 'compacto'];

// Zonas planas para arrancar y para la meta o la entrega (recreación de juego). (P)
export const PLANO_INICIO_M = 18;
export const PLANO_FINAL_M = 36; // retro: "un poco más de camino al final" (antes 30)

// Separación entre puntos de un perfil real si el sitio no la declara. (P) Pendiente: campo nivel.paso_m en el esquema.
export const PASO_REAL_DEFECTO_M = 5;

// Terreno ilustrativo por tipo de prueba del sitio (solo cuando no hay perfil real).
const TIPO_POR_PRUEBA = { agarre: 'dunas', relieve: 'lava', energia: 'pendiente' };
const TIPO_POR_MUNDO = { luna: 'luna', marte: 'marte' };

/** Generador pseudoaleatorio con semilla (mulberry32): mismo nivel en cada partida. */
export function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semilla estable a partir de un texto (id del sitio o destino). */
export function semillaDe(texto = '') {
  let h = 2166136261;
  for (const c of String(texto)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const PASO_GEN_M = 1;

// Cada generador devuelve la elevación (m) en x (m) dentro del tramo jugable y los tramos de superficie.
const GENERADORES = {
  // Dunas: el robot sube por la cara empinada (~33°) y baja por la suave (~9°), todo arena.
  // Con agarre 0.4 (rueda estándar, límite ~22°) la cara empinada hace patinar; con 0.9 (rueda ancha, ~42°) se sube. (P)
  dunas(largo, r) {
    const PERIODO = 28;
    const SUBIDA = 0.22; // fracción del periodo que ocupa la cara empinada
    const alturas = Array.from({ length: Math.ceil(largo / PERIODO) + 1 }, () => 3.6 + r() * 0.8);
    const elev = (x) => {
      const i = Math.floor(x / PERIODO);
      const t = (x % PERIODO) / PERIODO; // 0..1
      const forma = t < SUBIDA ? t / SUBIDA : (1 - t) / (1 - SUBIDA);
      return alturas[i] * forma + 0.3 * Math.sin(x / 13);
    };
    return { elev, superficies: [{ desde: 0, hasta: largo, tipo: 'arena' }] };
  },
  // Campo de lava: escalones y bloques de roca.
  lava(largo, r) {
    const bloques = Array.from({ length: Math.ceil(largo / 12) + 1 }, () => (r() - 0.5) * 2.2);
    const elev = (x) => {
      const i = Math.floor(x / 12);
      const t = (x % 12) / 12;
      const suave = t < 0.8 ? 0 : (t - 0.8) / 0.2;
      return bloques[i] * (1 - suave) + (bloques[i + 1] ?? bloques[i]) * suave + 0.25 * Math.sin(x * 1.7); // x = largo: no hay bloque siguiente
    };
    return { elev, superficies: [{ desde: 0, hasta: largo, tipo: 'roca' }] };
  },
  // Desierto con pendiente: subida sostenida, meseta y bajada, suelo compacto con un tramo de roca.
  pendiente(largo) {
    const elev = (x) => {
      const t = x / largo;
      if (t < 0.55) return 28 * (t / 0.55) ** 1.15;
      if (t < 0.8) return 28;
      return 28 - 14 * ((t - 0.8) / 0.2);
    };
    return {
      elev,
      superficies: [
        { desde: 0, hasta: largo * 0.4, tipo: 'compacto' },
        { desde: largo * 0.4, hasta: largo * 0.55, tipo: 'roca' },
        { desde: largo * 0.55, hasta: largo, tipo: 'compacto' },
      ],
    };
  },
  // Luna (ilustrativo): ladera de regolito con cráteres pequeños (≤ 1.2 m de hondo, paredes ≤ ~12° sobre la ladera).
  // La inclinación media la agrega perfilDeDestino con la pendiente típica medida del destino. Todo regolito suelto = arena,
  // como en los perfiles reales (niveles.json: roca solo si la pendiente pasa de 20°; 98 % arena en el polo sur). (P)
  // Sin cráteres grandes: con gravedad baja, bajar y subir paredes de 25–30° vuelca la carga. (P)
  luna(largo, r) {
    const crateres = [0.2, 0.5, 0.8].map((f) => ({ c: largo * (f + (r() - 0.5) * 0.08), radio: 10 + r() * 4, hondo: 0.8 + r() * 0.4 }));
    const fase = r() * 10;
    const elev = (x) => {
      let y = 0.6 * Math.sin(x / 13 + fase);
      for (const { c, radio, hondo } of crateres) {
        const d = Math.abs(x - c) / radio;
        if (d < 1) y -= hondo * (1 - d * d) ** 2; // cuenco suave, sin escalón en el borde
      }
      return y;
    };
    return { elev, superficies: [{ desde: 0, hasta: largo, tipo: 'arena' }] };
  },
  // Marte (ilustrativo): llanura de arena con ondulaciones suaves y un campo de dunas bajas (≤ ~12° antes de la inclinación), con un afloramiento
  // de roca. Arena casi todo, como el perfil real de Jezero (100 % arena por la regla de pendiente). (P)
  marte(largo, r) {
    const fase = r() * 10;
    const elev = (x) => {
      const dunas = x > largo * 0.35 && x < largo * 0.65 ? 1.8 * Math.max(0, Math.sin((x - largo * 0.35) / 9)) : 0;
      // Sin baches cortos: con gravedad baja lanzan al robot y la carga. (P)
      return 2 * Math.sin(x / 40 + fase) + dunas + 0.15 * Math.sin(x * 0.5);
    };
    return {
      elev,
      superficies: [
        { desde: 0, hasta: largo * 0.7, tipo: 'arena' },
        { desde: largo * 0.7, hasta: largo * 0.8, tipo: 'roca' },
        { desde: largo * 0.8, hasta: largo, tipo: 'arena' },
      ],
    };
  },
};

export const TIPOS_GENERADOS = Object.keys(GENERADORES);
const TIPO_EN = { dunas: 'dunes', lava: 'lava field', pendiente: 'slope', luna: 'Moon', marte: 'Mars' };


/** Recorta y desplaza los tramos de superficie de [0, largo] a [desplazamiento, desplazamiento + largo]. */
function desplazarSuperficies(superficies, desplazamiento, largoTotal) {
  const tramos = superficies.map((s) => ({ ...s, desde: s.desde + desplazamiento, hasta: s.hasta + desplazamiento }));
  tramos[0].desde = 0;
  tramos[tramos.length - 1].hasta = largoTotal;
  return tramos;
}

/** Agrega planos de inicio y final al tramo jugable para arrancar y para la meta o la entrega. */
function conPlanos(elevJugable, largoJugable) {
  const largo = PLANO_INICIO_M + largoJugable + PLANO_FINAL_M;
  const x_m = [];
  const y_m = [];
  const y0 = elevJugable(0);
  const y1 = elevJugable(largoJugable);
  for (let x = 0; x <= largo + 1e-9; x += PASO_GEN_M) {
    let y;
    if (x <= PLANO_INICIO_M) y = y0;
    else if (x >= PLANO_INICIO_M + largoJugable) y = y1;
    else y = elevJugable(x - PLANO_INICIO_M);
    x_m.push(Number(x.toFixed(3)));
    y_m.push(Number(y.toFixed(3)));
  }
  return { x_m, y_m, largo_m: largo };
}

/** Perfil ilustrativo generado (con semilla fija). */
export function generarPerfil({ tipo = 'dunas', semilla = 1, largo_m = 240 } = {}) {
  const gen = GENERADORES[tipo] ?? GENERADORES.dunas;
  const { elev, superficies } = gen(largo_m, aleatorio(semilla));
  const base = conPlanos(elev, largo_m);
  return {
    ...base,
    superficies: desplazarSuperficies(superficies, PLANO_INICIO_M, base.largo_m),
    ilustrativo: true,
    fuente: null,
    nota: tr(`Terreno ilustrativo generado (${tipo}); no es un perfil medido.`,
      `Illustrative generated terrain (${TIPO_EN[tipo] ?? tipo}); not a measured profile.`),
    tipo,
  };
}

// Largo jugable de un tramo real (m): un nivel de 2 a 3 minutos. Se toma a escala real, sin deformar. (P)
export const VENTANA_REAL_M = 250;
// Regla general de "transitable" al elegir la ventana (sitios sin entrada en VENTANAS_JUEGO): pendiente máxima de subida y
// de bajada (°). Más empinado (paredes de cráter o de tajo de 40–64°) el modelo de agarre no lo sube ni lo baja entero. (P)
export const LIMITES_VENTANA = { subida: 30, bajada: 30 };
const PASO_BUSQUEDA_M = 10; // separación entre ventanas candidatas (m)

// Caras de duna recreadas (recreación declarada): el DEM de 30 m no resuelve la cara de una duna, que llega al ángulo de
// reposo de la arena (~30–34°). Se agregan solo en tramos de arena de sitios terrestres y solo donde el terreno medido es
// casi plano (≤ pendienteBaseMax): las dunas se forman sobre llanuras; en una pared de cráter o de tajo el DEM ya muestra el
// relieve y una duna encima daría paredes de más de 50° que nadie sube. (P)
// Tope de la cara: la pendiente TOTAL (terreno medido + cara recreada) no pasa de `anguloMax` = 30°, el borde inferior del
// ángulo de reposo de la arena seca (30–34°; caras de barjanes: reposo medio 32°, crítico 34°, Pelletier et al. 2015, JGR,
// https://doi.org/10.1002/2015JF003636). Antes la altura al azar más el terreno de base daba caras de hasta 39°, más empinadas
// que cualquier duna real, y el camino dorado quedaba en el filo (la rueda ancha a veces sí y a veces no). (P)
const DUNA = { periodo: 28, subida: 0.22, alturaMin: 3.6, alturaVar: 0.8, anguloMax: 30, pendienteBaseMax: 10 };

// Bloques de roca recreados (recreación declarada): el DEM de 30 m tampoco resuelve rocas sueltas de medio metro.
// Se agregan solo en tramos de roca de sitios terrestres; dan golpes a la carga (el soporte amortiguado sirve). (P)
const ROCA = { separacion: 6, ancho: 1.2, alturaMin: 0.22, alturaVar: 0.18 };

const GRADOS = 180 / Math.PI;
const km = (mts) => (mts >= 1000 ? `${(mts / 1000).toFixed(1)} km` : `${Math.round(mts)} m`);

/**
 * Transecto en un sentido de marcha. 'ida' = como viene en los datos (el robot va del m 0 al final); 'vuelta' = invertido
 * (el robot recorre el transecto de su final a su inicio, p. ej. para subir una pared que en los datos es bajada).
 * Las superficies quedan en metros del recorrido orientado.
 */
export function transectoEnSentido(elevaciones, paso, superficies, sentido = 'ida') {
  if (sentido !== 'vuelta') return { elevaciones, superficies };
  const total = paso * (elevaciones.length - 1);
  return {
    elevaciones: [...elevaciones].reverse(),
    superficies: superficies?.map((t) => ({ ...t, desde: total - t.hasta, hasta: total - t.desde })).reverse(),
  };
}

/**
 * Métricas de la ventana [desde, desde + largo] (m) de un transecto ya orientado, exactas por segmento (el perfil es lineal
 * entre puntos): metros de subida y de bajada, pendiente máxima de subida y de bajada (°), pendiente media de los tramos de
 * subida (°) y fracción del largo con la superficie difícil para el juego de ruedas previsto.
 */
export function metricasVentana(elevaciones, paso, desde, largo, superficies, superficieDificil) {
  const hasta = desde + largo;
  let subida = 0;
  let bajada = 0;
  let maxSubida = 0;
  let maxBajada = 0;
  let sumaSubida = 0;
  let largoSubida = 0;
  for (let i = Math.max(0, Math.floor(desde / paso)); i < elevaciones.length - 1 && i * paso < hasta; i++) {
    const a = Math.max(desde, i * paso);
    const b = Math.min(hasta, (i + 1) * paso);
    if (b <= a) continue;
    const dy = elevaciones[i + 1] - elevaciones[i];
    const angulo = Math.atan2(dy, paso) * GRADOS;
    if (dy > 0) {
      subida += (dy * (b - a)) / paso;
      maxSubida = Math.max(maxSubida, angulo);
      sumaSubida += angulo * (b - a);
      largoSubida += b - a;
    } else {
      bajada -= (dy * (b - a)) / paso;
      maxBajada = Math.max(maxBajada, -angulo);
    }
  }
  let dificil = 0;
  for (const t of superficies ?? []) if (t.tipo === superficieDificil) dificil += Math.max(0, Math.min(t.hasta, hasta) - Math.max(t.desde, desde));
  return {
    subida_m: subida,
    bajada_m: bajada,
    max_subida: maxSubida,
    max_bajada: maxBajada,
    media_subida: largoSubida ? sumaSubida / largoSubida : 0,
    fraccion_dificil: largo ? Math.min(1, dificil / largo) : 0,
  };
}

/** Criticidad de una ventana (valor de juego, P): metros de subida, más si es superficie difícil, más la pared más empinada. */
export const puntajeCriticidad = (mt) => mt.subida_m * (1 + mt.fraccion_dificil) + mt.max_subida;

/**
 * Ventana más crítica y transitable de un transecto: recorre ventanas de `largo` m cada PASO_BUSQUEDA_M en los dos sentidos
 * (ida y vuelta) y se queda con la de mayor puntajeCriticidad cuya pendiente máxima de subida y de bajada no pase los
 * límites. Si ninguna es transitable, la menos empinada (transitable: false). Devuelve { desde_m, hasta_m } en metros del
 * transecto original (desde < hasta) + sentido + métricas.
 */
export function ventanaCritica(elevaciones, paso, superficies, {
  largo = VENTANA_REAL_M, superficieDificil = 'arena', maxSubida = LIMITES_VENTANA.subida, maxBajada = LIMITES_VENTANA.bajada,
} = {}) {
  const total = paso * (elevaciones.length - 1);
  const L = Math.min(largo, total);
  let mejor = null;
  for (const sentido of ['ida', 'vuelta']) {
    const o = transectoEnSentido(elevaciones, paso, superficies, sentido);
    const inicios = [];
    for (let d = 0; d + L <= total + 1e-9; d += PASO_BUSQUEDA_M) inicios.push(d);
    if (total - L - inicios[inicios.length - 1] > 1e-9) inicios.push(total - L); // la última ventana llega al final
    for (const d of inicios) {
      const mt = metricasVentana(o.elevaciones, paso, d, L, o.superficies, superficieDificil);
      const transitable = mt.max_subida <= maxSubida && mt.max_bajada <= maxBajada;
      const c = {
        desde_m: sentido === 'ida' ? d : total - d - L, hasta_m: sentido === 'ida' ? d + L : total - d, sentido, ...mt, puntaje: puntajeCriticidad(mt), transitable,
      };
      const peor = (x) => Math.max(x.max_subida, x.max_bajada);
      if (!mejor || (transitable && (!mejor.transitable || c.puntaje > mejor.puntaje + 1e-9))
        || (!transitable && !mejor.transitable && peor(c) < peor(mejor))) mejor = c;
    }
  }
  return mejor;
}

/**
 * Ventana elegida y medida con la física para cada nivel real (valores de juego, P). Se fija aquí porque "transitable" se
 * verificó corriendo la simulación (paso fijo de 60 Hz, acelerador a fondo) con el diseño previsto para el sitio, no con una
 * regla. desde_m < hasta_m en metros del transecto de data/; sentido 'vuelta' = se recorre del hasta al desde.
 * Solo se usa si `transecto_m` coincide con el largo del transecto de los datos (si el frente modelo cambia el perfil, se cae a
 * la regla general ventanaCritica). Resultados medidos: docs/juego/ESPECIFICACION.md §8–§10.
 */
export const VENTANAS_JUEGO = {
  // Mina de Real de Ángeles (tajo de ~340 m de hondo, paredes de 25–64° en el DEM). La pared este entre el m 1710 y el 1890 es
  // el único tramo largo de ≤ 32° (abajo y arriba pasa de 40°): sube 87 m en 180 m. Es roca: la rueda ancha (agarre 0.5 en
  // roca) se atasca en la primera rampa; la de tacos (51 s, 45 % de energía) y la estándar (58 s, 42 %) suben. El motor potente
  // con rueda ancha no basta: falta agarre, no fuerza. Las rampas de acarreo de la mina (mucho más suaves) no caen en este corte del DEM.
  mx0207: {
    desde_m: 1710, hasta_m: 1890, sentido: 'ida', transecto_m: 3000, pieza_clave: ['rueda_tacos', 'rueda_estandar'],
    descripcion: ['subida por la pared este del tajo (más abajo y más arriba la pared pasa de 40°)',
      'climb up the east wall of the open pit (below and above, the wall exceeds 40°)'],
  },
  // Maar Al Wahbah: salida del cráter por la pared oeste (los datos la tienen como bajada: se recorre al revés). Sube 89 m con
  // paredes de hasta 27°; el escalón final al borde (50°) queda fuera. Regolito/arena: la ancha llega, la estándar se queda sin energía.
  g00281: {
    desde_m: 1050, hasta_m: 1300, sentido: 'vuelta', transecto_m: 3990, pieza_clave: ['rueda_ancha'],
    descripcion: ['salida del cráter: subida desde el fondo por la pared oeste (el escalón final al borde, de 50°, queda fuera)',
      'climbing out of the crater: up the west wall from the floor (the last 50° step to the rim is left out)'],
  },
  // Samalayuca: campo de dunas en el sentido en que más se sube (22 m en el DEM, más caras de duna recreadas en lo casi plano).
  samalayuca: {
    desde_m: 1380, hasta_m: 1630, sentido: 'vuelta', transecto_m: 3000.0019, pieza_clave: ['rueda_ancha'],
    descripcion: ['campo de dunas, en el sentido en que más se sube', 'dune field, in the direction that climbs the most'],
  },
  // Pinacate (transecto centrado en el maar El Elegante): subida por la pared oeste del cráter, 64 m con tramos de 30°, roca
  // con bloques recreados. La rueda ancha se atasca antes de la meta; la de tacos y la estándar suben.
  pinacate: {
    desde_m: 1320, hasta_m: 1570, sentido: 'vuelta', transecto_m: 3999.9946, pieza_clave: ['rueda_tacos', 'rueda_estandar'],
    descripcion: ['subida por la pared oeste del cráter El Elegante (el borde, a más de 50°, queda fuera)',
      'climb up the west wall of El Elegante crater (the rim, steeper than 50°, is left out)'],
  },
  // Polo sur lunar: pared de una depresión de ~125 m hacia su borde (sube 65 m, hasta 21°). Ventanas más críticas (78–88 m)
  // dejan al diseño dorado con < 10 % de energía o al límite (10–15 % según el orden de los pares de colisión de Matter).
  polo_sur_lunar: {
    desde_m: 2000, hasta_m: 2250, sentido: 'ida', transecto_m: 4000, pieza_clave: ['rueda_ancha'],
    descripcion: ['subida por la pared de una depresión de ~125 m hacia su borde', 'climb up the wall of a ~125 m deep depression toward its rim'],
  },
  // Jezero (DEM de 200 m, casi plano: ≤ 4.3°): subida sostenida de 13 m sobre arena, recorriendo al revés el tramo que los
  // datos tienen como bajada. La subida más larga (19 m, m 8550–8800) deja al diseño dorado con 11–12 % de energía: sin margen.
  jezero: {
    desde_m: 2660, hasta_m: 2910, sentido: 'vuelta', transecto_m: 10000, pieza_clave: ['rueda_ancha'],
    descripcion: ['subida suave y sostenida sobre arena (el modelo de 200 m no resuelve dunas ni rocas)',
      'gentle, sustained climb over sand (the 200 m model does not resolve dunes or rocks)'],
  },
};

/** Ventana fija de VENTANAS_JUEGO para un nivel, o null si no hay o no corresponde al transecto actual. */
function ventanaFija(id, total) {
  const v = id ? VENTANAS_JUEGO[id] : null;
  if (!v || Math.abs(v.transecto_m - total) > 1 || v.desde_m < 0 || v.hasta_m > total + 1e-6 || v.hasta_m <= v.desde_m) return null;
  return v;
}

/**
 * Perfil a partir de elevaciones reales (m) con su paso y exageración vertical declarados.
 * Si el transecto es más largo que `ventana_m`, se usa un tramo real de ese largo, sin deformar: el de `ventana` si se da
 * ({ desde_m, hasta_m, sentido }), si no el más crítico y transitable (ventanaCritica), en cualquiera de los dos sentidos.
 * Con `dunasRecreadas`, se agregan caras de duna en los tramos de arena casi planos, marcadas como recreación.
 */
export function perfilDesdeElevaciones(elevaciones, {
  paso_m = PASO_REAL_DEFECTO_M, exageracion = 1, superficies, fuente = null, ventana_m = VENTANA_REAL_M, ventana = null, descripcion = null,
  superficieDificil = 'arena', dunasRecreadas = false, rocasRecreadas = false, semilla = 1,
} = {}) {
  const total = paso_m * (elevaciones.length - 1);
  const elevEx = elevaciones.map((e) => e * exageracion);
  const tramosTotales = superficies?.length ? superficies : [{ desde: 0, hasta: total, tipo: 'compacto' }];
  const elegida = ventana ?? ventanaCritica(elevEx, paso_m, tramosTotales, { largo: ventana_m, superficieDificil });
  const sentido = elegida.sentido === 'vuelta' ? 'vuelta' : 'ida';
  const largoJugable = elegida.hasta_m - elegida.desde_m;
  const o = transectoEnSentido(elevEx, paso_m, tramosTotales, sentido);
  const d0 = sentido === 'vuelta' ? total - elegida.hasta_m : elegida.desde_m; // inicio de la ventana en el recorrido orientado
  const mt = metricasVentana(o.elevaciones, paso_m, d0, largoJugable, o.superficies, superficieDificil);
  const elevReal = (x) => {
    const i = Math.max(0, Math.min(Math.floor(x / paso_m), o.elevaciones.length - 2));
    const t = (x - i * paso_m) / paso_m;
    return o.elevaciones[i] * (1 - t) + o.elevaciones[i + 1] * t;
  };
  const pendienteBase = (x) => {
    const i = Math.max(0, Math.min(Math.floor((d0 + x) / paso_m), o.elevaciones.length - 2));
    return Math.abs(Math.atan2(o.elevaciones[i + 1] - o.elevaciones[i], paso_m)) * GRADOS;
  };
  // Tramos dentro de la ventana, en coordenadas de la ventana.
  const tramos = o.superficies
    .map((t) => ({ ...t, desde: Math.max(t.desde, d0) - d0, hasta: Math.min(t.hasta, d0 + largoJugable) - d0 }))
    .filter((t) => t.hasta > t.desde);
  if (!tramos.length) tramos.push({ desde: 0, hasta: largoJugable, tipo: 'compacto' });
  const tipoEn = (x) => tramos.find((t) => x >= t.desde && x < t.hasta)?.tipo ?? tramos[tramos.length - 1].tipo;

  const r = aleatorio(semilla);
  const nDunas = Math.ceil(largoJugable / DUNA.periodo) + 1;
  const alturasDuna = Array.from({ length: nDunas }, () => DUNA.alturaMin + r() * DUNA.alturaVar);
  // Una duna entera por periodo, solo si todo el periodo es arena casi plana: así nunca hay un escalón en el borde.
  const hayDuna = Array.from({ length: nDunas }, (_, k) => {
    if (!dunasRecreadas || k * DUNA.periodo >= largoJugable) return false;
    for (let x = k * DUNA.periodo; x <= Math.min((k + 1) * DUNA.periodo, largoJugable); x += 2) {
      if (tipoEn(x) !== 'arena' || pendienteBase(x) > DUNA.pendienteBaseMax) return false;
    }
    return true;
  });
  // Altura de cada duna con el tope de pendiente total: h ≤ L·(tan anguloMax − pendiente de base más fuerte en la cara).
  const largoCara = DUNA.periodo * DUNA.subida;
  hayDuna.forEach((hay, k) => {
    if (!hay) return;
    let baseMax = -Infinity;
    for (let x = k * DUNA.periodo; x < k * DUNA.periodo + largoCara; x += 0.5) {
      baseMax = Math.max(baseMax, elevReal(d0 + x + 0.5) - elevReal(d0 + x)); // subida de la base en 0.5 m
    }
    const hMax = largoCara * (Math.tan(DUNA.anguloMax / GRADOS) - baseMax / 0.5);
    alturasDuna[k] = Math.max(0, Math.min(alturasDuna[k], hMax));
  });
  const duna = (x) => {
    const k = Math.floor(x / DUNA.periodo);
    if (!hayDuna[k]) return 0;
    const t = (x % DUNA.periodo) / DUNA.periodo;
    return alturasDuna[k] * (t < DUNA.subida ? t / DUNA.subida : (1 - t) / (1 - DUNA.subida));
  };
  const hayDunas = hayDuna.some(Boolean);
  const alturasRoca = Array.from({ length: Math.ceil(largoJugable / ROCA.separacion) + 1 }, () => ROCA.alturaMin + r() * ROCA.alturaVar);
  const roca = (x) => {
    if (!rocasRecreadas || tipoEn(x) !== 'roca') return 0;
    const k = Math.floor(x / ROCA.separacion);
    const local = x - k * ROCA.separacion;
    return local < ROCA.ancho ? alturasRoca[k] * Math.sin((Math.PI * local) / ROCA.ancho) : 0;
  };
  const hayRocas = rocasRecreadas && tramos.some((t) => t.tipo === 'roca');
  const elev = (x) => elevReal(d0 + x) - elevReal(d0) + duna(x) + roca(x);

  const base = conPlanos(elev, largoJugable);
  const vuelta = sentido === 'vuelta';
  const [a, b] = vuelta ? [elegida.hasta_m, elegida.desde_m] : [elegida.desde_m, elegida.hasta_m];
  const desc = descripcion ? tr(`: ${descripcion[0]}`, `: ${descripcion[1]}`) : '';
  const datosTramo = tr(`sube ${Math.round(mt.subida_m)} m, pendiente máx. ${Math.round(mt.max_subida)}° de subida`,
    `climbs ${Math.round(mt.subida_m)} m, max ${Math.round(mt.max_subida)}° uphill`);
  const partes = [
    tr(`Perfil medido (${fuente ?? 'fuente sin declarar'})`, `Measured profile (${traducirFuente(fuente) ?? 'source not declared'})`),
    total > largoJugable + 1e-6
      ? tr(`tramo real de ${km(largoJugable)} (del m ${Math.round(a)} al m ${Math.round(b)}${vuelta ? ', sentido inverso del transecto' : ''}) de un transecto de ${km(total)}, ${datosTramo}${desc}`,
        `real ${km(largoJugable)} stretch (from m ${Math.round(a)} to m ${Math.round(b)}${vuelta ? ', reverse direction of the transect' : ''}) of a ${km(total)} transect, ${datosTramo}${desc}`)
      : vuelta ? tr(`recorrido en sentido inverso del transecto${desc}`, `driven in the reverse direction of the transect${desc}`) : null,
    exageracion !== 1 ? tr(`exageración vertical ×${exageracion}`, `vertical exaggeration ×${exageracion}`) : null,
    hayDunas ? tr(`caras de duna recreadas (hasta ${DUNA.anguloMax}°, borde inferior del ángulo de reposo de la arena; el modelo de 30 m no las resuelve)`,
      `recreated dune faces (up to ${DUNA.anguloMax}°, lower bound of the angle of repose of sand; the 30 m model does not resolve them)`) : null,
    hayRocas ? tr('bloques de roca recreados (~0.5 m; el modelo de 30 m no resuelve rocas sueltas)',
      'recreated rock blocks (~0.5 m; the 30 m model does not resolve loose rocks)') : null,
    tr('inicio y meta planos = recreación', 'flat start and finish = recreation'),
  ].filter(Boolean);
  return {
    ...base,
    superficies: desplazarSuperficies(tramos, PLANO_INICIO_M, base.largo_m),
    ilustrativo: false,
    fuente,
    nota: partes.join(' · '),
    tipo: 'real',
    ventana: {
      desde_m: elegida.desde_m, hasta_m: elegida.hasta_m, transecto_m: total, sentido, subida_m: mt.subida_m, pendiente_max_subida: mt.max_subida,
      pieza_clave: elegida.pieza_clave ?? null, // pieza que el diseño previsto necesita en este tramo (medido, VENTANAS_JUEGO)
    },
    recreacion: [...(hayDunas ? [{ tipo: 'cara_duna', recreacion: true }] : []), ...(hayRocas ? [{ tipo: 'bloque_roca', recreacion: true }] : [])],
  };
}

/**
 * Tramos de superficie de un nivel. Acepta `superficies: [{desde, hasta, tipo}]` (especificación de juego)
 * y `superficie_tramos: [{desde_m, hasta_m, tipo}]` (formato de ciencia_datos/datos/niveles.json del frente modelo).
 */
export function tramosDeNivel(nivel) {
  const crudos = nivel?.superficies ?? nivel?.superficie_tramos;
  if (!Array.isArray(crudos) || !crudos.length) return undefined;
  return crudos
    .map((t) => ({ desde: t.desde ?? t.desde_m, hasta: t.hasta ?? t.hasta_m, tipo: t.tipo }))
    .filter((t) => Number.isFinite(t.desde) && Number.isFinite(t.hasta) && SUPERFICIES.includes(t.tipo));
}

/** Opciones comunes de un nivel real (sitio o destino): paso, exageración, superficies, fuente y ventana fija si la hay. */
function opcionesDeNivel(id, nivel) {
  const paso_m = nivel.paso_m ?? PASO_REAL_DEFECTO_M;
  const fija = ventanaFija(id, paso_m * (nivel.perfil_elevacion_m.length - 1));
  return {
    paso_m,
    exageracion: nivel.exageracion_vertical ?? 1,
    superficies: tramosDeNivel(nivel),
    fuente: nivel.fuente,
    ventana: fija,
    descripcion: fija?.descripcion ?? null,
  };
}

const tienePerfil = (nivel) => Array.isArray(nivel?.perfil_elevacion_m) && nivel.perfil_elevacion_m.length >= 2;

/** Perfil de la prueba terrestre de un sitio: real si existe, si no ilustrativo según su prueba_util. */
export function perfilDeSitio(sitio) {
  const nivel = sitio?.nivel;
  if (tienePerfil(nivel)) {
    return perfilDesdeElevaciones(nivel.perfil_elevacion_m, {
      ...opcionesDeNivel(sitio.id, nivel),
      dunasRecreadas: true,
      rocasRecreadas: true,
      semilla: semillaDe(sitio.id),
    });
  }
  return generarPerfil({ tipo: TIPO_POR_PRUEBA[sitio?.prueba_util] ?? 'dunas', semilla: semillaDe(sitio?.id ?? 'sin_sitio') });
}

// Largo jugable del terreno ilustrativo de la misión por mundo (m). (P) Con batería chica y motor eficiente, la rueda ancha
// llega con energía de sobra y la estándar (que patina en el regolito) no alcanza en la Luna.
const LARGO_MISION_M = { luna: 240, marte: 170 };

/** Perfil de la misión en el destino: real si el destino lo trae (nivel), si no ilustrativo por mundo. */
export function perfilDeDestino(destino) {
  const nivel = destino?.nivel;
  if (tienePerfil(nivel)) return perfilDesdeElevaciones(nivel.perfil_elevacion_m, opcionesDeNivel(destino.id, nivel));
  const mundo = TIPO_POR_MUNDO[destino?.mundo] ?? 'marte';
  const largo = LARGO_MISION_M[mundo];
  const perfil = generarPerfil({ tipo: mundo, semilla: semillaDe(destino?.id ?? 'destino'), largo_m: largo });
  // Inclinación media del terreno ilustrativo = pendiente típica medida del destino (dato real, no inventado).
  const pendiente = destino?.variables?.pendiente?.valor;
  if (!Number.isFinite(pendiente)) return perfil;
  const subida = Math.tan((pendiente * Math.PI) / 180);
  const y_m = perfil.y_m.map((y, i) => {
    const t = Math.min(Math.max(perfil.x_m[i] - PLANO_INICIO_M, 0), largo);
    return Number((y + t * subida).toFixed(3));
  });
  const fuente = destino.variables.pendiente.fuente;
  return {
    ...perfil,
    y_m,
    nota: tr(`${perfil.nota} Inclinación media de ${pendiente}°: la pendiente típica medida del destino${fuente ? ` (${fuente})` : ''}.`,
      `${perfil.nota} Mean incline of ${pendiente}°: the measured typical slope of the destination${fuente ? ` (${traducirFuente(fuente)})` : ''}.`),
  };
}

/** Tipo de superficie en x (m). */
export function superficieEn(perfil, x) {
  for (const s of perfil.superficies) if (x >= s.desde && x < s.hasta) return s.tipo;
  return perfil.superficies[perfil.superficies.length - 1].tipo;
}

/** Elevación (m) en x (m), interpolada. */
export function alturaEn(perfil, x) {
  const { x_m, y_m } = perfil;
  if (x <= x_m[0]) return y_m[0];
  if (x >= x_m[x_m.length - 1]) return y_m[y_m.length - 1];
  let i = 0;
  while (x_m[i + 1] < x) i++;
  const t = (x - x_m[i]) / (x_m[i + 1] - x_m[i]);
  return y_m[i] * (1 - t) + y_m[i + 1] * t;
}

/** Pendiente máxima (grados) del perfil, para describir el nivel. */
export function pendienteMaxima(perfil) {
  let max = 0;
  for (let i = 1; i < perfil.x_m.length; i++) {
    const a = Math.atan2(Math.abs(perfil.y_m[i] - perfil.y_m[i - 1]), perfil.x_m[i] - perfil.x_m[i - 1]);
    max = Math.max(max, (a * 180) / Math.PI);
  }
  return max;
}
