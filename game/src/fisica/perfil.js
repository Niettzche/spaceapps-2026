// Perfiles de recorrido (funciones puras, sin Phaser). Ver docs/juego/ESPECIFICACION.md §8.
//
// Un perfil es: { x_m: [], y_m: [], superficies: [{ desde, hasta, tipo }], largo_m, ilustrativo, fuente, nota }
//   x_m, y_m: puntos del recorrido en metros (y hacia arriba), ya con la exageración vertical aplicada.
//   superficies: tramos en metros; tipo ∈ arena | roca | compacto.
//   ilustrativo: true si NO viene de datos reales (se avisa en pantalla).

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
      return bloques[i] * (1 - suave) + bloques[i + 1] * suave + 0.25 * Math.sin(x * 1.7);
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
  // Luna (ilustrativo): llanura de regolito con un cráter a cruzar. Regolito suelto = arena (valor de juego).
  luna(largo, r) {
    const c = largo * (0.45 + r() * 0.1);
    const radio = 34;
    const elev = (x) => {
      const d = Math.abs(x - c) / radio;
      const crater = d < 1 ? -7 * (1 - d * d) : 0;
      const borde = Math.exp(-(((Math.abs(x - c) - radio) / 8) ** 2)) * 2;
      return crater + borde + 0.6 * Math.sin(x / 11);
    };
    return {
      elev,
      superficies: [
        { desde: 0, hasta: c - radio - 6, tipo: 'arena' },
        { desde: c - radio - 6, hasta: c + radio + 6, tipo: 'roca' },
        { desde: c + radio + 6, hasta: largo, tipo: 'arena' },
      ],
    };
  },
  // Marte (ilustrativo): llanura compacta con rocas y un campo de dunas.
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
        { desde: 0, hasta: largo * 0.35, tipo: 'compacto' },
        { desde: largo * 0.35, hasta: largo * 0.65, tipo: 'arena' },
        { desde: largo * 0.65, hasta: largo, tipo: 'roca' },
      ],
    };
  },
};

export const TIPOS_GENERADOS = Object.keys(GENERADORES);

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
    nota: `Terreno ilustrativo generado (${tipo}); no es un perfil medido.`,
    tipo,
  };
}

/** Perfil a partir de un arreglo de elevaciones reales (m), con su paso y exageración vertical declarados. */
export function perfilDesdeElevaciones(elevaciones, { paso_m = PASO_REAL_DEFECTO_M, exageracion = 1, superficies, fuente = null } = {}) {
  const e0 = elevaciones[0];
  const largoJugable = paso_m * (elevaciones.length - 1);
  const elev = (x) => {
    const i = Math.min(Math.floor(x / paso_m), elevaciones.length - 2);
    const t = (x - i * paso_m) / paso_m;
    return ((elevaciones[i] * (1 - t) + elevaciones[i + 1] * t) - e0) * exageracion;
  };
  const base = conPlanos(elev, largoJugable);
  const tramos = superficies?.length ? superficies : [{ desde: 0, hasta: largoJugable, tipo: 'compacto' }];
  return {
    ...base,
    superficies: desplazarSuperficies(tramos, PLANO_INICIO_M, base.largo_m),
    ilustrativo: false,
    fuente,
    nota: `Perfil medido (${fuente ?? 'fuente sin declarar'}), exageración vertical ×${exageracion}; inicio y meta planos = recreación.`,
    tipo: 'real',
  };
}

/** Perfil de la prueba terrestre de un sitio: real si existe, si no ilustrativo según su prueba_util. */
export function perfilDeSitio(sitio) {
  const nivel = sitio?.nivel;
  if (Array.isArray(nivel?.perfil_elevacion_m) && nivel.perfil_elevacion_m.length >= 2) {
    return perfilDesdeElevaciones(nivel.perfil_elevacion_m, {
      paso_m: nivel.paso_m ?? PASO_REAL_DEFECTO_M,
      exageracion: nivel.exageracion_vertical ?? 1,
      superficies: nivel.superficies,
      fuente: nivel.fuente,
    });
  }
  return generarPerfil({ tipo: TIPO_POR_PRUEBA[sitio?.prueba_util] ?? 'dunas', semilla: semillaDe(sitio?.id ?? 'sin_sitio') });
}

/** Perfil de la misión en el destino: real si el destino lo trae (nivel), si no ilustrativo por mundo. */
export function perfilDeDestino(destino) {
  const nivel = destino?.nivel;
  if (Array.isArray(nivel?.perfil_elevacion_m) && nivel.perfil_elevacion_m.length >= 2) {
    return perfilDesdeElevaciones(nivel.perfil_elevacion_m, {
      paso_m: nivel.paso_m ?? PASO_REAL_DEFECTO_M,
      exageracion: nivel.exageracion_vertical ?? 1,
      superficies: nivel.superficies,
      fuente: nivel.fuente,
    });
  }
  return generarPerfil({ tipo: TIPO_POR_MUNDO[destino?.mundo] ?? 'marte', semilla: semillaDe(destino?.id ?? 'destino'), largo_m: 160 });
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
