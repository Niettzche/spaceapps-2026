// Escala y unidades del juego (frente juego). Ver docs/juego/ESPECIFICACION.md §2.
// Los valores marcados (P) son valores de juego, no datos científicos.
import { ESCALA_GRAVEDAD } from '../config/world.js';

// Arte: base 320 × 180, escalada × 3 al lienzo de 960 × 540.
export const ARTE_ANCHO = 320;
export const ARTE_ALTO = 180;
export const ZOOM_ARTE = 3;

// 8 px de arte = 1 m → 24 px de mundo por metro.
export const PX_ARTE_POR_M = 8;
export const PX_POR_M = PX_ARTE_POR_M * ZOOM_ARTE;

// Paso base de Matter (ms). Las velocidades de Matter son "px por paso base".
export const PASO_BASE_MS = 1000 / 60;

// Multiplica la gravedad por igual en los tres mundos para que el juego no se sienta lento.
// Conserva la proporción real Tierra : Marte : Luna. (P)
export const FACTOR_GRAVEDAD = 1.5;

export const m = (metros) => metros * PX_POR_M;
export const aMetros = (px) => px / PX_POR_M;

/** Velocidad de Matter (px por paso base) → m/s. */
export const velAMs = (pxPorPaso) => (pxPorPaso / PX_POR_M) * (1000 / PASO_BASE_MS);
/** m/s → velocidad de Matter (px por paso base). */
export const msAVel = (ms) => (ms * PX_POR_M * PASO_BASE_MS) / 1000;

/**
 * Aplica la gravedad g (m/s²) al mundo de Matter de la escena.
 * Matter: aceleración (px/ms²) = gravity.y × gravity.scale. Con g real a esta escala: g · PX_POR_M / 1e6.
 * Se mantiene la convención de config/world.js (gravity.y = g × ESCALA_GRAVEDAD) y se ajusta gravity.scale.
 */
export function aplicarGravedad(scene, g_ms2) {
  const escalaMatter = (PX_POR_M * FACTOR_GRAVEDAD) / (1e6 * ESCALA_GRAVEDAD);
  scene.matter.world.setGravity(0, g_ms2 * ESCALA_GRAVEDAD, escalaMatter);
}
