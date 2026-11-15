// Dueño: frente expediente. Íconos de las variables del Expediente: arte de Mauricio (assets/iconos/ico_*) si existe; si
// no, un glifo de 8 × 8 dibujado aquí con cuadros (respaldo, mismo tamaño). Así la tabla nunca queda sin ícono mientras
// llegan ico_forma, ico_precipitacion, ico_vegetacion, ico_confianza, etc.

// Glifos de respaldo (8 × 8). Letra → color; '.' = vacío.
const COLORES = { a: 0xd08a4a, b: 0x6b3f22, c: 0x6ec6ff, d: 0x06d6a0, e: 0x8a5a3a, f: 0x80e0dc, g: 0xffd166, h: 0xff7a93, i: 0xffffff, j: 0x9aa4c7 };
const GLIFOS = {
  // Corte de un cráter: borde levantado y fondo hondo.
  forma: ['........', '........', 'bb....bb', 'aab..baa', '.aab.aa.', '..aaaa..', '........', '........'],
  // Dos gotas.
  lluvia: ['..c.....', '.ccc....', '.ccc..c.', '..c..ccc', '.....ccc', '......c.', '........', '........'],
  // Brote sobre tierra.
  planta: ['.dd..dd.', 'dddd.ddd', '.ddd.dd.', '...dd...', '...d....', '...d....', '.eeeeee.', '........'],
  // Barras crecientes (cuántos datos hay).
  confianza: ['......ff', '......ff', '...ff.ff', '...ff.ff', 'ff.ff.ff', 'ff.ff.ff', 'ff.ff.ff', '........'],
  // Estrella.
  novedoso: ['...gg...', '...gg...', 'gggggggg', '.gggggg.', '..gggg..', '.gg..gg.', '.g....g.', '........'],
  // Termómetro.
  temperatura: ['...ii...', '...ih...', '...ih...', '...ih...', '..hhhh..', '..hhhh..', '...hh...', '........'],
  // Rampa.
  pendiente: ['........', '.......j', '......jj', '.....jjj', '....jjjj', '..jjjjjj', 'jjjjjjjj', '........'],
  // Recorrido (bandera sobre el suelo).
  mision: ['.ig.....', '.igg....', '.iggg...', '.i......', '.i......', '.i......', 'aaaaaaaa', '........'],
  // Dato genérico: un punto «i».
  dato: ['...ff...', '........', '..fff...', '...ff...', '...ff...', '...ff...', '..ffff..', '........'],
};

/** Glifo de respaldo centrado en (x, y): 8 × 8 cuadros de `px` px (por defecto 2 → 16 px, como un ícono ×1). */
export function glifo(scene, x, y, nombre, { px = 2 } = {}) {
  const filas = GLIFOS[nombre] ?? GLIFOS.dato;
  const g = scene.add.graphics();
  const x0 = Math.round(x - 4 * px);
  const y0 = Math.round(y - 4 * px);
  filas.forEach((fila, r) => [...fila].forEach((ch, c) => {
    if (ch === '.') return;
    g.fillStyle(COLORES[ch] ?? 0xffffff, 1).fillRect(x0 + c * px, y0 + r * px, px, px);
  }));
  return g;
}

/** Primera textura que existe de `claves` (o null). */
export function primeraTextura(scene, claves = []) {
  return claves.find((k) => k && scene.textures.exists(k)) ?? null;
}

/**
 * Ícono centrado en (x, y) a escala entera `escala` (16 px × escala). Arte si existe alguna de `claves`; si no, el glifo.
 * Devuelve el objeto (Image o Graphics).
 */
export function icono(scene, x, y, claves, nombreGlifo, { escala = 1 } = {}) {
  const k = primeraTextura(scene, claves);
  if (k) return scene.add.image(Math.round(x), Math.round(y), k).setScale(escala);
  return glifo(scene, x, y, nombreGlifo, { px: 2 * escala });
}

/** Ícono de una variable (glosario.js → infoVariable). */
export function iconoVariable(scene, x, y, info, opciones) {
  return icono(scene, x, y, info?.iconos ?? [], info?.glifo ?? 'dato', opciones);
}
