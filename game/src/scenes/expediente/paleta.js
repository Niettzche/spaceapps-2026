// Dueño: frente expediente. Colores de MIS pantallas HTML/Boot según docs/juego/DISENO.md §2.5 (color con significado fijo).
// La paleta de las escenas de Phaser compartidas (COLOR en interfaz.js) la cambia el frente juego (DISENO.md §4).
export const PALETA = {
  fondo: '#0b0d17',      // fondo del juego
  panel: '#141831',      // tarjetas y paneles
  borde: '#2a3160',      // bordes (no es texto)
  texto: '#ffffff',      // texto principal
  secundario: '#a3abcc', // texto secundario (antes #6c7393 / #9aa4c7): ≥ 6.4:1
  accion: '#ffd166',     // acción / lo que puedes tocar
  bien: '#06d6a0',       // bien / foco de teclado
  riesgo: '#ff7a93',     // riesgo / límite (antes #ef476f)
  dato: '#80e0dc',       // dato medido
};

/** Luminancia relativa (WCAG 2.1) de un color #rrggbb. */
export function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores #rrggbb (1 a 21). */
export function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
