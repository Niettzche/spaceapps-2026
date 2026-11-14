// Puntuación visible (valor de juego, no evidencia científica). Ver ESPECIFICACION.md §11 y AGENTS.md §7.

export const PUNTOS_ENTREGA = 500;
export const ESTRELLAS = { dos: 750, tres: 900 }; // (P) a confirmar con integración

/**
 * 500 si entrega + integridad (0–100) × 3 + energía restante (0–100) × 1 + presupuesto ahorrado (0–100) × 1. Máximo 1,000.
 * Sin entrega: 0 puntos y 0 estrellas.
 */
export function puntuar(resultado, presupuesto) {
  if (!resultado.entrega) return { total: 0, estrellas: 0, desglose: { entrega: 0, integridad: 0, energia: 0, ahorro: 0 } };
  const pct = (v) => Math.round(Math.max(0, Math.min(1, v)) * 100);
  const desglose = {
    entrega: PUNTOS_ENTREGA,
    integridad: pct(resultado.integridad_carga) * 3,
    energia: pct(resultado.energia_restante),
    ahorro: pct((presupuesto - resultado.costo) / presupuesto),
  };
  const total = desglose.entrega + desglose.integridad + desglose.energia + desglose.ahorro;
  const estrellas = total >= ESTRELLAS.tres ? 3 : total >= ESTRELLAS.dos ? 2 : 1;
  return { total, estrellas, desglose };
}
