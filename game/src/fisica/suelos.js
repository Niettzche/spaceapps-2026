// Agarre del suelo con datos reales: tan(ángulo de fricción interna) del suelo, por mundo y tipo de superficie.
// Origen: libro de datos del frente taller (docs/taller/Space_Apps_Game_Data.xlsx, hoja Biomes, "Grip = tan(friction angle)").
// Se usa el punto medio del rango medido. Donde no hay dato con fuente se usa AGARRE_PROVISIONAL (P) y se declara en pantalla.
//
// Modelo de juego (P): fricción efectiva de la rueda = curva(agarre de la pieza) × agarre del suelo (tope 1).
// La pieza dice qué fracción del agarre del suelo aprovecha la rueda; el suelo pone el límite real.

import { tr } from '../i18n.js';

const FUENTE_LUNA = 'Connolly y Carrier, propiedades del regolito lunar (datos Apolo), NASA NTRS 20220014634';
const FUENTE_MARTE = 'Propiedades mecánicas del suelo de Marte (Viking), NASA NTRS 20200003046, tabla 1';
const FUENTE_DUNA = 'Arena seca de Wong (2001) en NASA/TM-20250006958, tabla 1 (28°); caras de barjanes, Pelletier et al. 2015, JGR (34°)';

export const SUELOS = {
  luna: {
    arena: { bioma: 'BM-008', nombre: 'regolito suelto', nombre_en: 'loose regolith', phi: [30, 50], fuente: FUENTE_LUNA },
    compacto: { bioma: 'BM-012', nombre: 'regolito compactado', nombre_en: 'compacted regolith', phi: [30, 50], fuente: FUENTE_LUNA },
    roca: null, // sin dato para roca lunar
  },
  marte: {
    arena: { bioma: 'BM-013', nombre: 'polvo y arena suelta (drift)', nombre_en: 'loose dust and sand (drift)', phi: [15.6, 20.4], fuente: FUENTE_MARTE },
    compacto: { bioma: 'BM-015', nombre: 'suelo con costra (crusty/cloddy)', nombre_en: 'crusty/cloddy soil', phi: [29.8, 39.2], fuente: FUENTE_MARTE },
    roca: { bioma: 'BM-016', nombre: 'roca o afloramiento (cota superior)', nombre_en: 'rock or outcrop (upper bound)', phi: [40, 60], fuente: FUENTE_MARTE },
  },
  tierra: {
    // Arena seca GENÉRICA (no medida en Samalayuca). Mismo origen que la fila BM-004 del libro de datos.
    arena: { bioma: 'BM-004', nombre: 'arena de duna seca (genérica)', nombre_en: 'dry dune sand (generic)', phi: [28, 34], fuente: FUENTE_DUNA, generico: true },
    // Sin dato con fuente: la lava sólida se comporta como roca y el suelo "compacto" de Pinacate/mx0207 no tiene φ medido.
    // BM-003 (escoria suelta, 25–32°, NPS) existe en el libro de datos, pero no corresponde a estos tramos: no se usa aquí.
    roca: null,
    compacto: null,
  },
};

// ⚠ VALOR PROVISIONAL DE JUEGO (P), NO ES UN DATO MEDIDO.
// Se usa donde el suelo no tiene φ con fuente (hoy: roca y compacto de la Tierra, roca lunar). 1 = el suelo no limita y decide
// la rueda; es el valor con el que se calibró el camino dorado. Se declara en pantalla con notaSuelo().
export const AGARRE_PROVISIONAL = 1;

// Interruptor de balance (P), APAGADO por defecto. Con la arena real (φ medio 31° → 0.60) la rueda ancha queda en
// 0.9² × 0.60 ≈ 0.49 (límite ≈ 26°) y las caras de duna recreadas llegan a 30° (perfil.js, DUNA.anguloMax): lo más
// probable es que la ancha ya no suba y el camino dorado se rompa. Es coherente con la física real (ninguna rueda sube una
// cara al ángulo de reposo de la arena), pero hay que rebalancear antes (p. ej. caras más suaves o otra curva de agarre).
// Mientras esté en false, la arena de la Tierra usa AGARRE_PROVISIONAL y el HUD lo declara como (P).
// Probado (14 nov, juego): con la arena real y las dunas en orientación real (subir por barlovento ~10°, bajar por sotavento
// ~33°), la rueda estándar también llega (68 s vs 54 s de la ancha) y el camino dorado deja de fallar. Con la orientación actual
// (subir la cara de ~33°) la ancha tampoco sube. Por eso queda apagado: la arena de la Tierra usa AGARRE_PROVISIONAL (P) declarado.
export const USAR_SUELO_TIERRA = false;

// Hundimiento en suelo blando (Bekker: k_c, k_φ, n): NO implementado. El libro de datos tiene arena seca (BM-004, NASA TM)
// y valores lunares aproximados (BM-008, Draft); el polvo de Marte (BM-013) sigue sin dato.

/** Nombre de un tipo de superficie (arena | roca | compacto) en el idioma actual. */
const SUPERFICIE_EN = { arena: 'sand', roca: 'rock', compacto: 'compact' };
export const nombreSuperficie = (tipo) => (tipo ? tr(tipo, SUPERFICIE_EN[tipo] ?? tipo) : tipo);

const tanGrados = (g) => Math.tan((g * Math.PI) / 180);

/** Datos del suelo (o null si no hay dato con fuente o está desactivado) para un mundo y una superficie. */
export function datosSuelo(mundo, superficie) {
  if (mundo === 'tierra' && !USAR_SUELO_TIERRA) return null;
  return SUELOS[mundo]?.[superficie] ?? null;
}

/** ¿Este suelo usa el valor provisional (P) en vez de un dato con fuente? */
export const sueloProvisional = (mundo, superficie) => !datosSuelo(mundo, superficie);

/** Agarre del suelo (0..1) para la física: tan(φ medio), con tope 1. Sin dato → AGARRE_PROVISIONAL (P). */
export function agarreSuelo(mundo, superficie) {
  const d = datosSuelo(mundo, superficie);
  if (!d) return AGARRE_PROVISIONAL;
  return Math.min(1, tanGrados((d.phi[0] + d.phi[1]) / 2));
}

/** Rango medido de agarre del suelo [min, max] = tan(φ), o null si no hay dato. */
export function rangoAgarreSuelo(mundo, superficie) {
  const d = datosSuelo(mundo, superficie);
  return d ? [tanGrados(d.phi[0]), tanGrados(d.phi[1])] : null;
}

/**
 * Texto corto para el HUD con el origen del agarre de las superficies del nivel, p. ej.
 * "Suelo: arena φ 28–34° (genérico, BM-004) · roca: agarre provisional (P)". null si no hay superficies.
 */
export function notaSuelo(mundo, superficies) {
  const tipos = [...new Set((superficies ?? []).map((s) => s.tipo))];
  if (!tipos.length) return null;
  const partes = tipos.map((t) => {
    const d = datosSuelo(mundo, t);
    const n = nombreSuperficie(t);
    if (!d) return tr(`${n}: agarre provisional (P)`, `${n}: provisional grip (P)`);
    return `${n} φ ${d.phi[0]}–${d.phi[1]}° (${d.generico ? tr('genérico, ', 'generic, ') : ''}${d.bioma})`;
  });
  return `${tr('Suelo', 'Soil')}: ${partes.join(' · ')}`;
}
