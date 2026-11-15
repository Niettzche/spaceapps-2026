// Dueño: frente expediente. Barras de similitud (DISENO.md §2.4: números → visuales, siempre con el número escrito).
// Lógica pura para poder probarla con `node --test`.

/** Ancho de la barra en % (0–100) para una similitud 0–1; null si no hay dato (no se dibuja barra, se escribe "sin dato"). */
export function anchoBarra(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  return Math.round(Math.min(1, Math.max(0, valor)) * 100);
}

/** Recorta un texto a `max` palabras (DISENO.md §2.3: máx. 6 palabras por etiqueta); la frase completa va al detalle. */
export function palabrasClave(texto, max = 6) {
  const p = String(texto ?? '').trim().split(/\s+/).filter(Boolean);
  return p.length <= max ? p.join(' ') : `${p.slice(0, max).join(' ')}…`;
}
