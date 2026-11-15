// Física 2 (bandera ?fisica=2): terramecánica simplificada de Bekker–Wong, explicable. Funciones puras.
// Ecuaciones, parámetros, fuentes y valores de juego (P): docs/juego/FISICA_V2.md.
// Origen de los datos de suelo: docs/taller/Space_Apps_Game_Data.xlsx (hojas Biomes, Equations y Sources).
//
// Unidades: W en N, b (ancho) y r (radio) en m, z (hundimiento) en m, c en kPa, k_c en kN/m^(n+1), k_φ en kN/m^(n+2).
// Bekker se escribe con p en kPa y z en m (así está tabulado en la fuente S59), por eso W se pasa a kN dentro.

import { tr } from '../i18n.js';

const FUENTE_ARENA = 'Wong (2001), arena seca, en NASA/TM-20250006958 tabla 1 (S59); genérica, no medida en el sitio';
const FUENTE_LUNA_PHI = 'Connolly y Carrier, regolito lunar (Apolo), NASA NTRS 20220014634 (S19)';
const FUENTE_LUNA_BEKKER = 'valores canónicos del regolito lunar, apuntes UMD ENAE 788X (S62, Draft): no hay Bekker real del regolito (S59)';
const FUENTE_MARTE = 'Viking, NASA NTRS 20200003046 tabla 1 (S20)';
const FUENTE_M90 = 'simulante marciano M90 (Bouton et al. 2026, S63, de Oravec et al. 2021): simulante, no drift real';
const FUENTE_CENIZA = 'ángulo de reposo de ceniza y escoria, U.S. National Park Service (S61), como aproximación';

/**
 * Suelos de física 2. `bekker: null` = suelo que no se hunde a esta escala (roca o costra): solo Mohr–Coulomb.
 * `p` = lista de campos que son valor de juego (P) y no dato con fuente.
 */
export const SUELOS_V2 = {
  arena_eolica: {
    bioma: 'BM-004', nombre: 'arena seca de duna (genérica)', nombre_en: 'dry dune sand (generic)',
    phi: 28, c_kPa: 1.04, bekker: { n: 1.1, kc: 0.99, kphi: 1528.43 }, fuente: FUENTE_ARENA, p: [],
  },
  ceniza_volcanica: {
    // φ = punto medio del ángulo de reposo de ceniza y escoria (25–32°). Cohesión y Bekker sin dato: c = 0 (material suelto
    // sin cementar) y sin hundimiento, ambos (P).
    bioma: 'BM-003', nombre: 'ceniza y escoria volcánica', nombre_en: 'volcanic ash and cinder',
    phi: 28.5, c_kPa: 0, bekker: null, fuente: FUENTE_CENIZA, p: ['c_kPa', 'bekker'],
  },
  suelo_firme: {
    // Sin dato con fuente (suelo compacto genérico, talud de mina): valores de juego declarados.
    bioma: null, nombre: 'suelo compacto (sin dato)', nombre_en: 'compact ground (no data)',
    phi: 40, c_kPa: 0, bekker: null, fuente: null, p: ['phi', 'c_kPa', 'bekker'],
  },
  roca_tierra: {
    bioma: null, nombre: 'roca (sin dato)', nombre_en: 'rock (no data)',
    phi: 45, c_kPa: 0, bekker: null, fuente: null, p: ['phi', 'c_kPa', 'bekker'],
  },
  regolito_lunar: {
    // φ: punto medio de Apolo 30–50° (S19, Verified). c 0.17 kPa y Bekker: valores canónicos (S62, Draft).
    bioma: 'BM-008', nombre: 'regolito lunar suelto', nombre_en: 'loose lunar regolith',
    phi: 40, c_kPa: 0.17, bekker: { n: 1, kc: 1.4, kphi: 820 }, fuente: `${FUENTE_LUNA_PHI}; ${FUENTE_LUNA_BEKKER}`, p: [],
  },
  roca_lunar: {
    bioma: null, nombre: 'roca lunar (sin dato)', nombre_en: 'lunar rock (no data)',
    phi: 45, c_kPa: 0, bekker: null, fuente: null, p: ['phi', 'c_kPa', 'bekker'],
  },
  drift_marciano: {
    // φ y c: puntos medios de Viking drift (15.6–20.4°, 0–3.7 kPa). Bekker: simulante M90 (no hay constantes del drift real).
    bioma: 'BM-013', nombre: 'polvo y arena suelta (drift)', nombre_en: 'loose dust and sand (drift)',
    phi: 18, c_kPa: 1.85, bekker: { n: 1.3, kc: 572.1, kphi: 4915.3 }, fuente: `${FUENTE_MARTE}; Bekker: ${FUENTE_M90}`, p: [],
    simulante: true,
  },
  costra_marciana: {
    bioma: 'BM-015', nombre: 'suelo con costra (crusty/cloddy)', nombre_en: 'crusty/cloddy soil',
    phi: 34.5, c_kPa: 1.6, bekker: null, fuente: FUENTE_MARTE, p: ['bekker'],
  },
  roca_marciana: {
    // Cota superior (40–60°): el agarre de roca contra rueda no es la fricción del suelo (nota de BM-016). c = 0 (P).
    bioma: 'BM-016', nombre: 'roca o afloramiento (cota superior)', nombre_en: 'rock or outcrop (upper bound)',
    phi: 50, c_kPa: 0, bekker: null, fuente: FUENTE_MARTE, p: ['c_kPa'],
  },
};
// Nieve o hielo como análogo de suelo blando: NO se agrega. El libro de datos no tiene c, φ ni Bekker de nieve con fuente.

/**
 * Regla (P) para paredes: OpenLandMap marca «arena» en paredes de cráter y de tajo que probablemente son roca (lo declara el
 * frente modelo). En física 2, un tramo de arena con pendiente media mayor que `grados` en una ventana de ±`ventana_m`
 * (más larga que una cara de duna, así las dunas recreadas no cuentan) se trata como roca. No se aplica a dunas (`lugar`
 * duna): ahí la arena es real. Devuelve los tramos convertidos [{ desde, hasta }] en metros del perfil.
 */
export const PARED_ARENA = { grados: 20, ventana_m: 10, paso_m: 1 };
export function paredesDeArena(perfil, alturaEn, superficieEn, lugar = 'generico') {
  if (lugar === 'duna') return [];
  const { grados, ventana_m: w, paso_m } = PARED_ARENA;
  const tramos = [];
  for (let x = 0; x <= perfil.largo_m; x += paso_m) {
    const pend = Math.abs(Math.atan2(alturaEn(perfil, x + w) - alturaEn(perfil, x - w), 2 * w) * (180 / Math.PI));
    if (superficieEn(perfil, x) !== 'arena' || pend <= grados) continue;
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && x - ultimo.hasta <= paso_m) ultimo.hasta = x + paso_m;
    else tramos.push({ desde: x, hasta: x + paso_m });
  }
  return tramos;
}

/** Tipo de lugar de un sitio a partir de su campo `proceso` (texto del frente modelo). */
export function lugarDeSitio(sitio) {
  const t = `${sitio?.proceso ?? ''} ${sitio?.nombre ?? ''}`.toLowerCase();
  if (/duna|eólic|eolic/.test(t)) return 'duna';
  if (/volc|lava|basált|basalt|maar|escoria/.test(t)) return 'volcanico';
  if (/tajo|mina|cantera/.test(t)) return 'mina';
  return 'generico';
}

/** Suelo de física 2 para un mundo, un tipo de superficie (arena | roca | compacto) y un tipo de lugar. */
export function sueloV2(mundo, tipo, lugar = 'generico') {
  const id = {
    luna: { arena: 'regolito_lunar', compacto: 'regolito_lunar', roca: 'roca_lunar' },
    marte: { arena: 'drift_marciano', compacto: 'costra_marciana', roca: 'roca_marciana' },
    tierra: { arena: 'arena_eolica', compacto: lugar === 'volcanico' ? 'ceniza_volcanica' : 'suelo_firme', roca: 'roca_tierra' },
  }[mundo]?.[tipo] ?? (mundo === 'tierra' ? 'suelo_firme' : null);
  return id ? { id, ...SUELOS_V2[id] } : { id: 'suelo_firme', ...SUELOS_V2.suelo_firme };
}

const rad = (g) => (g * Math.PI) / 180;

/**
 * Hundimiento estático de una rueda rígida (Bekker; forma cerrada de Wong, Theory of Ground Vehicles):
 *   z0 = [ 3W / ((3 − n)(k_c + b·k_φ)·√D) ]^(2/(2n+1))
 * W en N (se pasa a kN), b y D = 2r en m. Devuelve z en m. Suelo sin Bekker → 0.
 */
export function hundimientoEstatico({ W, b, r, bekker }) {
  if (!bekker || W <= 0) return 0;
  const { n, kc, kphi } = bekker;
  const base = (3 * (W / 1000)) / ((3 - n) * (kc + b * kphi) * Math.sqrt(2 * r));
  return Math.min(r, base ** (2 / (2 * n + 1)));
}

/**
 * Hundimiento con deslizamiento: una rueda que patina excava. z = z0·(1 + K·s), s = deslizamiento 0..1.
 * K = AJUSTE_V2.hundimientoPorDeslizamiento (P): forma lineal de juego; el efecto es real (Spirit en «Troy», S72) pero la constante no.
 */
export const AJUSTE_V2 = { hundimientoPorDeslizamiento: 2 };
export const hundimientoConDeslizamiento = (z0, s) => z0 * (1 + AJUSTE_V2.hundimientoPorDeslizamiento * Math.min(1, Math.max(0, s)));

/** Largo de contacto (m): arco de la rueda bajo el suelo, de la entrada al fondo, l = r·acos(1 − z/r). Mínimo (P) en suelo rígido. */
export const CONTACTO_MIN_M = 0.03;
export function largoContacto(r, z) {
  if (z <= 0) return CONTACTO_MIN_M;
  return Math.max(CONTACTO_MIN_M, r * Math.acos(Math.max(-1, 1 - z / r)));
}

/** Área de contacto A = b·l (m²). */
export const areaContacto = (b, r, z) => b * largoContacto(r, z);

/** Presión media sobre el suelo p = W/A (kPa). */
export const presionKPa = (W, A) => (A > 0 ? W / A / 1000 : 0);

/** Empuje máximo por Mohr–Coulomb: H = A·c + W·tan φ (N). c en kPa. */
export const empujeMaximo = ({ A, c_kPa, W, phi }) => A * c_kPa * 1000 + W * Math.tan(rad(phi));

/**
 * Resistencia por compactación (Bekker): R_c = b·(k_c/b + k_φ)·z^(n+1)/(n+1) (kN → N). Suelo sin Bekker → 0.
 * Es el trabajo de abrir el surco: más hundimiento = más energía y menos velocidad.
 */
export function resistenciaCompactacion({ b, z, bekker }) {
  if (!bekker || z <= 0) return 0;
  const { n, kc, kphi } = bekker;
  return b * (kc / b + kphi) * (z ** (n + 1) / (n + 1)) * 1000;
}

/**
 * Estado de una rueda sobre un suelo (función pura, todo lo que la física y la telemetría necesitan).
 * @param {{ W: number, b: number, r: number, suelo: object, s?: number }} o  W = peso sobre la rueda (N)
 * @returns {{ z0, z, A, p_kPa, H, Rc, muH, muR }}  muH = H/W (coeficiente de empuje), muR = Rc/W (de resistencia)
 */
export function estadoRueda({ W, b, r, suelo, s = 0, z: zDado }) {
  const z0 = hundimientoEstatico({ W, b, r, bekker: suelo.bekker });
  const z = zDado ?? hundimientoConDeslizamiento(z0, s);
  const A = areaContacto(b, r, z);
  const H = empujeMaximo({ A, c_kPa: suelo.c_kPa, W, phi: suelo.phi });
  const Rc = resistenciaCompactacion({ b, z, bekker: suelo.bekker });
  return { z0, z, A, p_kPa: presionKPa(W, A), H, Rc, muH: W > 0 ? H / W : 0, muR: W > 0 ? Rc / W : 0 };
}

/** Ancho de rueda (m): parts.json `ancho_m` (P); respaldo si falta. */
export const ANCHO_RESPALDO_M = 0.25;
export const anchoRueda = (pieza) => pieza?.ancho_m ?? ANCHO_RESPALDO_M;

/** Peso sobre cada rueda (N): W = m·g / ruedas. */
export const pesoPorRueda = (masaKg, g, ruedas) => (masaKg * g) / ruedas;

/** Nombre del suelo en el idioma actual. */
export const nombreSueloV2 = (suelo) => tr(suelo.nombre, suelo.nombre_en);

/**
 * Ficha para el panel de datos (tecla I): ecuaciones y valores usados con el robot y el suelo de este nivel.
 * @param {{ masaKg, g, ruedas, pieza, mundo, tipos: string[], lugar }} o
 */
export function fichaFisicaV2({ masaKg, g, ruedas, pieza, mundo, tipos, lugar }) {
  const W = pesoPorRueda(masaKg, g, ruedas);
  const b = anchoRueda(pieza);
  const r = pieza?.radio_m ?? 0.45;
  const lineas = [tr(
    `Física 2 (Bekker–Wong): W = m·g/ruedas = ${W.toFixed(0)} N · rueda ${(b * 100).toFixed(0)} cm de ancho, radio ${(r * 100).toFixed(0)} cm.`,
    `Physics 2 (Bekker–Wong): W = m·g/wheels = ${W.toFixed(0)} N · wheel ${(b * 100).toFixed(0)} cm wide, radius ${(r * 100).toFixed(0)} cm.`)];
  for (const tipo of [...new Set(tipos)]) {
    const suelo = sueloV2(mundo, tipo, lugar);
    const e = estadoRueda({ W, b, r, suelo });
    const prov = suelo.p.length ? ` (P: ${suelo.p.join(', ')})` : '';
    lineas.push(tr(
      `${nombreSueloV2(suelo)}${suelo.bioma ? ` ${suelo.bioma}` : ''}: φ ${suelo.phi}°, c ${suelo.c_kPa} kPa${suelo.bekker ? `, n ${suelo.bekker.n}, k_c ${suelo.bekker.kc}, k_φ ${suelo.bekker.kphi}` : ', no se hunde'}${prov} → z ${(e.z * 100).toFixed(1)} cm, p = W/A ${e.p_kPa.toFixed(1)} kPa, H = A·c + W·tanφ ${e.H.toFixed(0)} N, R_c ${e.Rc.toFixed(0)} N.`,
      `${nombreSueloV2(suelo)}${suelo.bioma ? ` ${suelo.bioma}` : ''}: φ ${suelo.phi}°, c ${suelo.c_kPa} kPa${suelo.bekker ? `, n ${suelo.bekker.n}, k_c ${suelo.bekker.kc}, k_φ ${suelo.bekker.kphi}` : ', no sinkage'}${prov} → z ${(e.z * 100).toFixed(1)} cm, p = W/A ${e.p_kPa.toFixed(1)} kPa, H = A·c + W·tanφ ${e.H.toFixed(0)} N, R_c ${e.Rc.toFixed(0)} N.`));
  }
  lineas.push(tr('Hundimiento p = (k_c/b + k_φ)·zⁿ; patinar excava (z crece con el deslizamiento, P). Fuentes y (P): docs/juego/FISICA_V2.md.',
    'Sinkage p = (k_c/b + k_φ)·zⁿ; slipping digs in (z grows with slip, P). Sources and (P): docs/juego/FISICA_V2.md.'));
  return lineas.join(' ');
}
