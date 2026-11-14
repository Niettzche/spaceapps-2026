// Tiles de terreno: relleno <mundo>_<superficie> (16 × 16) y borde <mundo>_<superficie>_borde (16 × 4), repetibles.
// Tres estilos de superficie: arena (granos y ondas), roca (bloques con grietas, celdas de Worley repetibles), compacto (costra con estratos).
import { createFrame, painterFor, guardar, tileFbm, tileNoise, rampa, tramado } from './comun.mjs';
import { PALETAS } from './paletas.mjs';

const TILES = [
  ['tierra', 'arena'], ['tierra', 'roca'], ['tierra', 'compacto'],
  ['marte', 'arena'], ['marte', 'roca'], ['marte', 'compacto'],
  ['luna', 'arena'], ['luna', 'roca'],
];

export function generar() {
  for (const [mundo, sup] of TILES) {
    const A = rampa(PALETAS[mundo][sup]);
    const seed = mundo === 'tierra' && sup === 'arena' ? 11 : mundo.length * 7 + sup.length; // tierra_arena igual que en el PR #26
    const { relleno, borde } = ESTILOS[sup](A, seed);
    guardar(`terreno/${mundo}_${sup}.png`, relleno);
    guardar(`terreno/${mundo}_${sup}_borde.png`, borde);
  }
}

const tile = (w, h, f) => { const fr = createFrame(w, h); painterFor(fr).shade(0, 0, w, h, (x, y) => f(Math.floor(x), Math.floor(y))); return fr; };

// Worley repetible en 16 × 16: 4 × 4 celdas de 4 px con un punto cada una; devuelve [d1, d2, id] con distancias envueltas.
function worley(x, y, seed) {
  let d1 = 99, d2 = 99, id = 0;
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    const px = cx * 4 + 0.5 + (tileNoise(cx * 3.1, cy * 3.1, 0, 0, seed) * 0.5 + 0.5) * 3;
    const py = cy * 4 + 0.5 + (tileNoise(cx * 3.1, cy * 3.1, 0, 0, seed + 9) * 0.5 + 0.5) * 3;
    let dx = Math.abs(x + 0.5 - px), dy = Math.abs(y + 0.5 - py);
    dx = Math.min(dx, 16 - dx); dy = Math.min(dy, 16 - dy);
    const d = Math.hypot(dx * 1.0, dy * 1.25);
    if (d < d1) { d2 = d1; d1 = d; id = cy * 4 + cx; } else if (d < d2) d2 = d;
  }
  return [d1, d2, id];
}

const ESTILOS = {
  arena(A, seed) {
    const relleno = tile(16, 16, (x, y) => {
      const n = tileFbm(x / 4, y / 4, 4, 4, seed, 3), g = tileNoise(x, y, 16, 16, seed + 12);
      if (g > 0.86) return A[4];
      if (g < -0.9) return A[0];
      return tramado(A.slice(1, 4), 0.5 + n * 0.9, x, y);
    });
    const borde = tile(16, 4, (x, y) => {
      const ola = Math.sin((x / 16) * Math.PI * 4) * 0.5 + tileNoise(x / 2, 0, 8, 0, seed - 6) * 0.4;
      if (y === 0) return ola > 0.2 ? A[5] : A[4];
      if (y === 1) return ola > -0.1 ? A[4] : A[3];
      if (y === 2) return tramado([A[2], A[3]], 0.5 + ola * 0.6, x, y);
      return tramado([A[1], A[2], A[3]], 0.5 + tileFbm(x / 4, 0, 4, 0, seed, 2) * 0.9, x, y);
    });
    return { relleno, borde };
  },

  roca(A, seed) {
    // bloques: cada celda es una piedra con luz arriba a la izquierda; grietas oscuras donde dos celdas se tocan
    const piedra = (x, y) => {
      const [d1, d2, id] = worley(x, y, seed);
      if (d2 - d1 < 0.7) return A[0];                                         // grieta
      const [, , idL] = worley(x - 1, y - 1, seed);
      const borde = idL !== id;                                                // arista iluminada
      const tono = 0.35 + (tileNoise(id * 2.3, 0, 0, 0, seed + 5) * 0.5 + 0.5) * 0.35 - d1 * 0.05;
      if (borde) return A[4];
      return tramado(A.slice(1, 5), tono, x, y);
    };
    const relleno = tile(16, 16, piedra);
    const borde = tile(16, 4, (x, y) => {
      // cresta irregular: arriba piedras salientes iluminadas, abajo empata con el relleno
      const alto = tileNoise(x / 4, 0, 4, 0, seed + 7) > 0.1 ? 0 : 1;
      if (y < alto) return 0;
      if (y === alto) return A[5];
      if (y === alto + 1) return x % 5 === 2 ? A[0] : A[4];
      return piedra(x, y + 12);
    });
    return { relleno, borde };
  },

  compacto(A, seed) {
    // costra firme: estratos horizontales suaves, piedritas y pocas grietas finas
    const suelo = (x, y) => {
      const estrato = Math.sin((y / 16) * Math.PI * 2 * 2 + tileFbm(x / 8, y / 8, 2, 2, seed, 2) * 2);
      const g = tileNoise(x, y, 16, 16, seed + 4);
      if (g > 0.9) return A[4];
      if (g < -0.88) return A[0];
      return tramado(A.slice(1, 4), 0.5 + estrato * 0.28 + tileFbm(x / 4, y / 4, 4, 4, seed + 2, 2) * 0.4, x, y);
    };
    const relleno = tile(16, 16, suelo);
    const borde = tile(16, 4, (x, y) => {
      if (y === 0) return tileNoise(x / 2, 0, 8, 0, seed + 8) > 0.35 ? A[4] : A[5];   // costra iluminada
      if (y === 1) return A[3];
      return suelo(x, y + 12);
    });
    return { relleno, borde };
  },
};
