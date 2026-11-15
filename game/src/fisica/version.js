// Versión del modelo de física. 1 = modelo calibrado del camino dorado (agarre² × tan φ). 2 = terramecánica Bekker–Wong
// (fisica/suelo_v2.js, docs/juego/FISICA_V2.md). Se elige con ?fisica=2 en la URL; sin parámetro, FISICA_POR_DEFECTO.
export const FISICA_POR_DEFECTO = 1;

/** Versión activa (1 | 2) según la URL; `busqueda` permite probarla sin navegador. */
export function versionFisica(busqueda = globalThis.location?.search ?? '') {
  const v = new URLSearchParams(busqueda).get('fisica');
  if (v === '2') return 2;
  if (v === '1') return 1;
  return FISICA_POR_DEFECTO;
}
