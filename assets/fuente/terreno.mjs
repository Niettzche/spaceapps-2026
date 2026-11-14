// Tiles de terreno (prioridad A: tierra_arena). Relleno 16 × 16 repetible y borde 16 × 4 repetible a lo ancho.
import { createFrame, painterFor, guardar, tileFbm, tileNoise, rampa, tramado } from './comun.mjs';
import { PALETAS } from './paletas.mjs';

export function generar() {
  const A = rampa(PALETAS.tierra.arena);
  // relleno: arena tramada con granos claros y piedritas oscuras; todo con ruido que se repite cada 16 px
  const relleno = createFrame(16, 16);
  painterFor(relleno).shade(0, 0, 16, 16, (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const n = tileFbm(xi / 4, yi / 4, 4, 4, 11, 3);            // manchas suaves
    const g = tileNoise(xi, yi, 16, 16, 23);                    // grano por pixel
    if (g > 0.86) return A[4];                                  // grano brillante
    if (g < -0.9) return A[0];                                  // piedrita
    return tramado(A.slice(1, 4), 0.5 + n * 0.9, xi, yi);
  });
  guardar('terreno/tierra_arena.png', relleno);

  // borde: cresta iluminada arriba (sobre la línea del suelo) y ondas de viento que bajan al relleno
  const borde = createFrame(16, 4);
  painterFor(borde).shade(0, 0, 16, 4, (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const ola = Math.sin((xi / 16) * Math.PI * 2 * 2) * 0.5 + tileNoise(xi / 2, 0, 8, 0, 5) * 0.4;
    if (yi === 0) return ola > 0.2 ? A[5] : A[4];
    if (yi === 1) return ola > -0.1 ? A[4] : A[3];
    if (yi === 2) return tramado([A[2], A[3]], 0.5 + ola * 0.6, xi, yi);
    return tramado([A[1], A[2], A[3]], 0.5 + tileFbm(xi / 4, 0, 4, 0, 11, 2) * 0.9, xi, yi);
  });
  guardar('terreno/tierra_arena_borde.png', borde);
}
