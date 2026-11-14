// Agarre del suelo con datos reales: tan(ángulo de fricción interna) del suelo, por mundo y tipo de superficie.
// Origen: libro de datos del frente taller (Space_Apps_Game_Data.xlsx, hoja Biomes, "Grip = tan(friction angle)").
// Se usa el punto medio del rango medido. Donde no hay dato (Gap), el suelo no limita: decide la rueda.
//
// Modelo de juego (P): fricción efectiva de la rueda = curva(agarre de la pieza) × agarre del suelo (tope 1).
// La pieza dice qué fracción del agarre del suelo aprovecha la rueda; el suelo pone el límite real.

const FUENTE_LUNA = 'Connolly y Carrier, propiedades del regolito lunar (datos Apolo), NASA NTRS 20220014634';
const FUENTE_MARTE = 'Propiedades mecánicas del suelo de Marte (Viking), NASA NTRS 20200003046, tabla 1';

export const SUELOS = {
  luna: {
    arena: { bioma: 'BM-008', nombre: 'regolito suelto', phi: [30, 50], fuente: FUENTE_LUNA },
    compacto: { bioma: 'BM-012', nombre: 'regolito compactado', phi: [30, 50], fuente: FUENTE_LUNA },
    roca: null, // sin dato para roca lunar
  },
  marte: {
    arena: { bioma: 'BM-013', nombre: 'polvo y arena suelta (drift)', phi: [15.6, 20.4], fuente: FUENTE_MARTE },
    compacto: { bioma: 'BM-015', nombre: 'suelo con costra (crusty/cloddy)', phi: [29.8, 39.2], fuente: FUENTE_MARTE },
    roca: { bioma: 'BM-016', nombre: 'roca o afloramiento (cota superior)', phi: [40, 60], fuente: FUENTE_MARTE },
  },
  tierra: { arena: null, roca: null, compacto: null }, // dunas y lava: Gap en el libro de datos (por investigar)
};

const tanGrados = (g) => Math.tan((g * Math.PI) / 180);

/** Datos del suelo (o null si no hay dato) para un mundo y una superficie. */
export function datosSuelo(mundo, superficie) {
  return SUELOS[mundo]?.[superficie] ?? null;
}

/** Agarre del suelo (0..1) para la física: tan(φ medio), con tope 1. Sin dato → 1 (no limita). */
export function agarreSuelo(mundo, superficie) {
  const d = datosSuelo(mundo, superficie);
  if (!d) return 1;
  return Math.min(1, tanGrados((d.phi[0] + d.phi[1]) / 2));
}

/** Rango medido de agarre del suelo [min, max] = tan(φ), o null si no hay dato. */
export function rangoAgarreSuelo(mundo, superficie) {
  const d = datosSuelo(mundo, superficie);
  return d ? [tanGrados(d.phi[0]), tanGrados(d.phi[1])] : null;
}
