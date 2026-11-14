// Energía del robot (función pura). Ver docs/juego/ESPECIFICACION.md §6. Todos los factores son valores de juego (P).

// Ajuste global del gasto para que una batería chica alcance para un recorrido sin errores. (P)
export const FACTOR_CONSUMO = 1;

/**
 * Energía gastada por segundo (en unidades de `capacidad` de la batería).
 * consumo del motor × |acelerador| × (1 + masa total / 100). Detenido (acelerador 0) no gasta.
 */
export function gastoPorSegundo(motor, masaTotalKg, acelerador) {
  if (!motor || acelerador === 0) return 0;
  return motor.consumo * Math.abs(acelerador) * (1 + masaTotalKg / 100) * FACTOR_CONSUMO;
}
