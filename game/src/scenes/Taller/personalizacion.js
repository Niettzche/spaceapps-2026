// Dueño: frente taller. Personalización COSMÉTICA del robot: pintura del chasis y nombre. No cambia la física.
// Sin Phaser (se prueba con node). La usan el Taller (la elige) y fisica/aspecto.js (tiñe el sprite o la figura y pone el nombre).
//
// Dónde vive:
//   - partida.robot = { pintura, nombre } (campo opcional de la partida; main.js no lo declara y nada más depende de él);
//   - localStorage 'marsception.robot.v1' (el guardado del Expediente no lo incluye: así sobrevive a "Nueva partida",
//     que es lo esperable para la pintura y el nombre de tu robot);
//   - una copia en este módulo, para que la prueba y la misión la lean sin importar main.js.

const CLAVE = 'marsception.robot.v1';
export const LARGO_NOMBRE = 14;

/**
 * Pinturas (cosméticas). Colores de assets/paletas.json (paleta del pixel art de Mauricio).
 * `figura` = color del chasis dibujado con figuras; `tinte` = tinte (multiplicativo) del sprite, más claro para que el
 * sprite no se oscurezca. La primera es la de siempre (sin tinte).
 */
export const PINTURAS = [
  { id: 'blanco', nombre: 'Blanco lunar', nombre_en: 'Lunar white', figura: 0xdfe3ee, tinte: 0xffffff },
  { id: 'naranja', nombre: 'Naranja', nombre_en: 'Orange', figura: 0xf2701f, tinte: 0xffa86a },
  { id: 'amarillo', nombre: 'Amarillo', nombre_en: 'Yellow', figura: 0xffd23c, tinte: 0xffe680 },
  { id: 'turquesa', nombre: 'Turquesa', nombre_en: 'Teal', figura: 0x4ce8d8, tinte: 0x8ff5ea },
  { id: 'rojo', nombre: 'Rojo', nombre_en: 'Red', figura: 0xff5a4a, tinte: 0xff9a8e },
  { id: 'lavanda', nombre: 'Lavanda', nombre_en: 'Lavender', figura: 0xb9a6ff, tinte: 0xcfc2ff },
];
export const PINTURA_POR_DEFECTO = PINTURAS[0].id;

export const pinturaPorId = (id) => PINTURAS.find((p) => p.id === id) ?? PINTURAS[0];

/** Siguiente pintura de la lista (con vuelta). */
export function siguientePintura(id, paso = 1) {
  const i = Math.max(0, PINTURAS.findIndex((p) => p.id === id));
  return PINTURAS[(i + paso + PINTURAS.length) % PINTURAS.length].id;
}

/**
 * Nombre limpio: sin caracteres de control ni < >, espacios colapsados, a lo más LARGO_NOMBRE caracteres.
 * Vacío → null (el robot no lleva nombre).
 */
export function normalizarNombre(texto) {
  if (typeof texto !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const limpio = texto.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  const corto = [...limpio].slice(0, LARGO_NOMBRE).join('').trim(); // por caracteres, no por unidades UTF-16
  return corto || null;
}

/** Personalización válida a partir de cualquier cosa (guardado viejo, editado a mano, etc.). */
export function normalizar(p) {
  const pintura = p && PINTURAS.some((x) => x.id === p.pintura) ? p.pintura : PINTURA_POR_DEFECTO;
  return { pintura, nombre: normalizarNombre(p?.nombre) };
}

function almacen() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Lee la personalización guardada en el navegador (o la de por defecto). */
export function cargar() {
  const ls = almacen();
  if (!ls) return normalizar(null);
  try { return normalizar(JSON.parse(ls.getItem(CLAVE))); } catch { return normalizar(null); }
}

let actual = null;

/** Personalización en uso: la de la partida si existe; si no, la guardada en el navegador. */
export function personalizacionDe(partida) {
  if (partida && partida.robot) return normalizar(partida.robot);
  return actual ?? (actual = cargar());
}

/** Fija la personalización (partida + copia del módulo + navegador). Devuelve la versión normalizada. */
export function fijar(partida, p) {
  const n = normalizar(p);
  actual = n;
  if (partida) partida.robot = { ...n };
  const ls = almacen();
  try { ls?.setItem(CLAVE, JSON.stringify(n)); } catch { /* sin almacenamiento */ }
  return n;
}

/** Para fisica/aspecto.js (prueba y misión): la última fijada o la guardada. */
export const personalizacionActual = () => actual ?? (actual = cargar());

/** Solo para pruebas: olvida la copia del módulo. */
export function _olvidar() { actual = null; }
