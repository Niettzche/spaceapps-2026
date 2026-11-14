// Daño por impacto (funciones puras). Ver docs/juego/ESPECIFICACION.md §7. Umbrales y factores = valores de juego (P).

// Chasis: velocidad de impacto (m/s, componente normal) a partir de la cual hay daño, y daño por m/s extra.
export const UMBRAL_CHASIS_MS = 3.5;
export const FACTOR_CHASIS = 12; // puntos de `resistencia` por m/s sobre el umbral

// Carga: umbral más bajo (es frágil) y fracción de integridad perdida por m/s extra, antes de la protección.
export const UMBRAL_CARGA_MS = 2.0;
export const FACTOR_CARGA = 0.12;

/** Puntos de resistencia que pierde el chasis en un impacto. */
export function danioChasis(velImpactoMs) {
  return Math.max(0, velImpactoMs - UMBRAL_CHASIS_MS) * FACTOR_CHASIS;
}

/** Fracción de integridad (0..1) que pierde la carga en un impacto, con la protección del soporte (0..1). */
export function danioCarga(velImpactoMs, proteccion = 0) {
  return Math.max(0, velImpactoMs - UMBRAL_CARGA_MS) * FACTOR_CARGA * (1 - proteccion);
}
