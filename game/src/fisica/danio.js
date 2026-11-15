// Daño por impacto (funciones puras). Ver docs/juego/ESPECIFICACION.md §7. Umbrales y factores = valores de juego (P).
import { FACTOR_GRAVEDAD } from './escala.js';

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

// Sacudidas: la suspensión absorbe los choques en las ruedas y la carga nunca deja de tocar el soporte, así que el daño
// a la carga sale de la aceleración brusca del chasis (en g), suavizada para ignorar el ruido numérico de Matter. (P)
export const UMBRAL_SACUDIDA_G = 4;
export const FACTOR_SACUDIDA = 0.25; // fracción de integridad por (g sobre el umbral) × segundo, antes de la protección

/** Fracción de integridad (0..1) que pierde la carga durante dt segundos con una sacudida de `g`. */
export function danioSacudida(g, dtSeg, proteccion = 0) {
  return Math.max(0, g - UMBRAL_SACUDIDA_G) * FACTOR_SACUDIDA * dtSeg * (1 - proteccion);
}

// Paso seguro sobre rocas en la MISIÓN (P, con base física). En Marte (4–24 min de retraso de señal) y en la Luna el robot no
// se maneja en tiempo real: como los rovers reales (AutoNav), frena solo al cruzar una roca. La velocidad sale del salto:
// una rueda de radio r que sube un escalón de alto h a velocidad v sale con v_y ≈ v·sen α (cos α = (r − h)/r) y sube
// v_y²/(2g). Para que la carga no salga por encima de la pared del soporte (alto H): v ≤ k·√(2·g·H)/sen α. g = la que simula
// el juego (gravedad real × FACTOR_GRAVEDAD, escala.js). k (P) = 1.5: la suspensión y el chasis absorben parte del golpe
// (calibrado: con k 1.5 la misión de Jezero con rueda ancha y soporte básico no pierde la carga; docs/juego/FISICA_V2.md §5.2).
// Un soporte más alto (correas, amortiguado) deja cruzar más rápido. En las pruebas en la Tierra no se aplica (se maneja en vivo).
export const PASO_ROCA = { k: 1.5, antes_m: 6, despues_m: 1 };
export function velocidadPasoRoca({ g, radio_m, alto_m, pared_m, factorGravedad = FACTOR_GRAVEDAD }) {
  const cosA = Math.max(-1, Math.min(1, (radio_m - Math.min(alto_m, radio_m)) / radio_m));
  const senA = Math.max(0.2, Math.sqrt(1 - cosA * cosA));
  return (PASO_ROCA.k * Math.sqrt(2 * g * factorGravedad * pared_m)) / senA;
}
