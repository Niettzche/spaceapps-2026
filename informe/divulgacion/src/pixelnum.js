// Cifras en dígitos de píxel (5 × 7), con la misma idea que el logotipo del juego: degradado de blanco al color de la cifra y
// una sombra oscura de 1 px (#0e0c16, el contorno del arte de Marsception). Se dibujan como SVG nítido (crispEdges).
const G = {
  0: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '.': ['..', '..', '..', '..', '..', '##', '##'],
  ',': ['..', '..', '..', '..', '..', '##', '.#'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  k: ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  '≥': ['#....', '.##..', '...##', '.##..', '#....', '.....', '#####'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};
const COLOR = { 'c-marte': '#ff7a5c', 'c-acento': '#ffd23c', 'c-luna': '#b9a6ff', 'c-tierra': '#4ce8d8' };
let n = 0;

export function svgPixel(texto, color) {
  let x = 0;
  const celdas = [];
  for (const ch of String(texto)) {
    const g = G[ch] ?? G[' '];
    g.forEach((fila, y) => [...fila].forEach((c, i) => { if (c === '#') celdas.push(`<rect x="${x + i}" y="${y}" width="1" height="1"/>`); }));
    x += g[0].length + 1;
  }
  const ancho = Math.max(1, x - 1) + 1;
  const id = `pxg${n++}`;
  const r = celdas.join('');
  return `<svg class="px" viewBox="0 0 ${ancho} 8" shape-rendering="crispEdges" aria-hidden="true" focusable="false">`
    + `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="7"><stop offset="0.25" stop-color="#ffffff"/><stop offset="1" stop-color="${color}"/></linearGradient></defs>`
    + `<g fill="#0e0c16" transform="translate(1 1)">${r}</g><g fill="url(#${id})">${r}</g></svg>`;
}

// Convierte cada .kn-num a dígitos de píxel. Devuelve una función para repintar un valor (para el conteo).
export function pixelarCifras(raiz = document) {
  const pintores = new Map();
  raiz.querySelectorAll('.kn-num').forEach((num) => {
    const clase = [...num.classList].find((c) => COLOR[c]);
    const color = COLOR[clase] ?? '#ffffff';
    num.setAttribute('aria-label', num.textContent.replace(/\s+/g, ' ').trim());
    num.querySelectorAll('.kn-unidad, .kn-valor').forEach((parte) => {
      const pintar = (texto) => { parte.innerHTML = svgPixel(texto, color); };
      pintar(parte.textContent.trim());
      if (parte.classList.contains('kn-valor')) pintores.set(parte, pintar);
    });
  });
  return (el, texto) => pintores.get(el)?.(texto);
}
