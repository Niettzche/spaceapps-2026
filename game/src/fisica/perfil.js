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
export const PLANO_FINAL_M = 30;

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

/** Parte de la nota que describe el tramo real usado (se reemplaza en la misión). */
const esParteTramo = (p) => p.startsWith('tramo real de') || p.startsWith('real ');

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
// Pendiente máxima admitida al elegir la ventana: tramos más empinados (paredes de cráter o de tajo) no se pueden subir. (P)
const PENDIENTE_MAX_VENTANA = 30;

// Caras de duna recreadas (recreación declarada): el DEM de 30 m no resuelve la cara de una duna, que llega al ángulo de
// reposo de la arena (~30–34°). Se agregan solo en tramos de arena de sitios terrestres. (P)
const DUNA = { periodo: 28, subida: 0.22, alturaMin: 3.6, alturaVar: 0.8, anguloRef: 32 };

// Bloques de roca recreados (recreación declarada): el DEM de 30 m tampoco resuelve rocas sueltas de medio metro.
// Se agregan solo en tramos de roca de sitios terrestres; dan golpes a la carga (el soporte amortiguado sirve). (P)
const ROCA = { separacion: 6, ancho: 1.2, alturaMin: 0.22, alturaVar: 0.18 };

/** Ventana de `largo` m dentro de [0, total]: la de mayor pendiente media cuya pendiente máxima no pase el límite. */
function elegirVentana(elev, total, largo, paso) {
  if (total <= largo) return { desde: 0, hasta: total };
  const pend = (a, b) => Math.abs(Math.atan2(elev(b) - elev(a), b - a)) * (180 / Math.PI);
  let mejor = null;
  for (let d = 0; d + largo <= total + 1e-9; d += paso) {
    let suma = 0;
    let max = 0;
    for (let x = d; x < d + largo; x += paso) {
      const p = pend(x, Math.min(x + paso, d + largo));
      suma += p;
      max = Math.max(max, p);
    }
    const candidata = { desde: d, hasta: d + largo, media: suma / Math.ceil(largo / paso), max };
    const valida = max <= PENDIENTE_MAX_VENTANA;
    if (!mejor || (valida && (!mejor.valida || candidata.media > mejor.media)) || (!valida && !mejor.valida && candidata.max < mejor.max)) {
      mejor = { ...candidata, valida };
    }
  }
  return mejor;
}

/**
 * Perfil a partir de elevaciones reales (m) con su paso y exageración vertical declarados.
 * Si el transecto es más largo que `ventana_m`, se usa un tramo real de ese largo, sin deformar.
 * Con `dunasRecreadas`, se agregan caras de duna en los tramos de arena, marcadas como recreación.
 */
export function perfilDesdeElevaciones(elevaciones, {
  paso_m = PASO_REAL_DEFECTO_M, exageracion = 1, superficies, fuente = null, ventana_m = VENTANA_REAL_M, dunasRecreadas = false, rocasRecreadas = false, semilla = 1,
} = {}) {
  const e0 = elevaciones[0];
  const total = paso_m * (elevaciones.length - 1);
  const elevReal = (x) => {
    const i = Math.max(0, Math.min(Math.floor(x / paso_m), elevaciones.length - 2));
    const t = (x - i * paso_m) / paso_m;
    return ((elevaciones[i] * (1 - t) + elevaciones[i + 1] * t) - e0) * exageracion;
  };
  const v = elegirVentana(elevReal, total, ventana_m, paso_m);
  const largoJugable = v.hasta - v.desde;
  const tramosTotales = superficies?.length ? superficies : [{ desde: 0, hasta: total, tipo: 'compacto' }];
  // Tramos dentro de la ventana, en coordenadas de la ventana.
  const tramos = tramosTotales
    .map((t) => ({ ...t, desde: Math.max(t.desde, v.desde) - v.desde, hasta: Math.min(t.hasta, v.hasta) - v.desde }))
    .filter((t) => t.hasta > t.desde);
  if (!tramos.length) tramos.push({ desde: 0, hasta: largoJugable, tipo: 'compacto' });
  const tipoEn = (x) => tramos.find((t) => x >= t.desde && x < t.hasta)?.tipo ?? tramos[tramos.length - 1].tipo;

  const r = aleatorio(semilla);
  const alturasDuna = Array.from({ length: Math.ceil(largoJugable / DUNA.periodo) + 1 }, () => DUNA.alturaMin + r() * DUNA.alturaVar);
  const duna = (x) => {
    if (!dunasRecreadas || tipoEn(x) !== 'arena') return 0;
    const k = Math.floor(x / DUNA.periodo);
    const t = (x % DUNA.periodo) / DUNA.periodo;
    return alturasDuna[k] * (t < DUNA.subida ? t / DUNA.subida : (1 - t) / (1 - DUNA.subida));
  };
  const hayDunas = dunasRecreadas && tramos.some((t) => t.tipo === 'arena');
  const alturasRoca = Array.from({ length: Math.ceil(largoJugable / ROCA.separacion) + 1 }, () => ROCA.alturaMin + r() * ROCA.alturaVar);
  const roca = (x) => {
    if (!rocasRecreadas || tipoEn(x) !== 'roca') return 0;
    const k = Math.floor(x / ROCA.separacion);
    const local = x - k * ROCA.separacion;
    return local < ROCA.ancho ? alturasRoca[k] * Math.sin((Math.PI * local) / ROCA.ancho) : 0;
  };
  const hayRocas = rocasRecreadas && tramos.some((t) => t.tipo === 'roca');
  const elev = (x) => elevReal(v.desde + x) - elevReal(v.desde) + duna(x) + roca(x);

  const base = conPlanos(elev, largoJugable);
  const km = (mts) => (mts >= 1000 ? `${(mts / 1000).toFixed(1)} km` : `${Math.round(mts)} m`);
  const partes = [
    tr(`Perfil medido (${fuente ?? 'fuente sin declarar'})`, `Measured profile (${traducirFuente(fuente) ?? 'source not declared'})`),
    total > largoJugable
      ? tr(`tramo real de ${km(largoJugable)} (desde el m ${Math.round(v.desde)}) de un transecto de ${km(total)}`,
        `real ${km(largoJugable)} stretch (from m ${Math.round(v.desde)}) of a ${km(total)} transect`)
      : null,
    exageracion !== 1 ? tr(`exageración vertical ×${exageracion}`, `vertical exaggeration ×${exageracion}`) : null,
    hayDunas ? tr(`caras de duna recreadas (~${DUNA.anguloRef}°, ángulo de reposo de la arena; el modelo de 30 m no las resuelve)`,
      `recreated dune faces (~${DUNA.anguloRef}°, angle of repose of sand; the 30 m model does not resolve them)`) : null,
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
    ventana: { desde_m: v.desde, hasta_m: v.hasta, transecto_m: total },
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

/** Perfil de la prueba terrestre de un sitio: real si existe, si no ilustrativo según su prueba_util. */
export function perfilDeSitio(sitio) {
  const nivel = sitio?.nivel;
  if (Array.isArray(nivel?.perfil_elevacion_m) && nivel.perfil_elevacion_m.length >= 2) {
    return perfilDesdeElevaciones(nivel.perfil_elevacion_m, {
      paso_m: nivel.paso_m ?? PASO_REAL_DEFECTO_M,
      exageracion: nivel.exageracion_vertical ?? 1,
      superficies: tramosDeNivel(nivel),
      fuente: nivel.fuente,
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

/**
 * Tramo real de la misión (índice de inicio en el transecto): la ventana de `largo` m cuya pendiente media (en valor
 * absoluto) más se parece a la pendiente típica medida del destino (`variables.pendiente`, mediana de cuadros de 10 km
 * a 200 m). Así el nivel representa el terreno típico del destino y no su peor pared. Ignora ventanas con tramos de más
 * de PENDIENTE_MAX_VENTANA. Devuelve null si no hay pendiente de referencia o el transecto es más corto que la ventana.
 */
export function ventanaRepresentativa(elevaciones, paso, largo, pendienteObjetivo) {
  const segmentos = elevaciones.length - 1;
  const k = Math.ceil(largo / paso - 1e-9); // segmentos que toca la ventana
  if (!Number.isFinite(pendienteObjetivo) || segmentos < k || paso * segmentos <= largo) return null;
  const pend = (i) => Math.abs(Math.atan2(elevaciones[i + 1] - elevaciones[i], paso)) * (180 / Math.PI);
  let mejor = null;
  for (let i0 = 0; i0 + k <= segmentos; i0++) {
    let suma = 0;
    let max = 0;
    for (let j = 0; j < k; j++) {
      const tramo = Math.min(paso, largo - j * paso); // el último segmento puede entrar solo en parte
      suma += pend(i0 + j) * tramo;
      max = Math.max(max, pend(i0 + j));
    }
    const media = suma / largo;
    const dif = Math.abs(media - pendienteObjetivo);
    if (max <= PENDIENTE_MAX_VENTANA && (!mejor || dif < mejor.dif)) mejor = { i0, k, media, dif };
  }
  return mejor;
}

/** Perfil de la misión en el destino: real si el destino lo trae (nivel), si no ilustrativo por mundo. */
export function perfilDeDestino(destino) {
  const nivel = destino?.nivel;
  if (Array.isArray(nivel?.perfil_elevacion_m) && nivel.perfil_elevacion_m.length >= 2) {
    const elev = nivel.perfil_elevacion_m;
    const paso = nivel.paso_m ?? PASO_REAL_DEFECTO_M;
    const exageracion = nivel.exageracion_vertical ?? 1;
    const superficies = tramosDeNivel(nivel);
    const opciones = { paso_m: paso, exageracion, fuente: nivel.fuente };
    const objetivo = destino.variables?.pendiente?.valor;
    const v = ventanaRepresentativa(elev.map((e) => e * exageracion), paso, VENTANA_REAL_M, objetivo);
    if (!v) return perfilDesdeElevaciones(elev, { ...opciones, superficies });

    // Se recorta el transecto a los k segmentos de la ventana: dentro de ese recorte la única ventana posible empieza en 0.
    const desde = v.i0 * paso;
    const perfil = perfilDesdeElevaciones(elev.slice(v.i0, v.i0 + v.k + 1), {
      ...opciones,
      superficies: superficies?.map((t) => ({ ...t, desde: t.desde - desde, hasta: t.hasta - desde })),
    });
    const transecto = paso * (elev.length - 1);
    const km = (mts) => (mts >= 1000 ? `${(mts / 1000).toFixed(1)} km` : `${Math.round(mts)} m`);
    const partes = perfil.nota.split(' · ').filter((p) => !esParteTramo(p));
    partes.splice(1, 0, tr(`tramo real de ${km(VENTANA_REAL_M)} (desde el m ${Math.round(desde)}) de un transecto de ${km(transecto)}, `
      + `elegido por su pendiente media (${v.media.toFixed(1)}°), la más parecida a la típica del destino (${objetivo}°)`,
    `real ${km(VENTANA_REAL_M)} stretch (from m ${Math.round(desde)}) of a ${km(transecto)} transect, `
      + `chosen because its mean slope (${v.media.toFixed(1)}°) is the closest to the destination's typical slope (${objetivo}°)`));
    return { ...perfil, nota: partes.join(' · '), ventana: { desde_m: desde, hasta_m: desde + VENTANA_REAL_M, transecto_m: transecto, pendiente_media: v.media } };
  }
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
