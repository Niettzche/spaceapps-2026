// Idioma del juego: español e inglés (MARSCEPTION). Módulo común a todos los frentes.
//
// Uso:
//   import { tr, idioma, alternarIdioma } from '../i18n.js';
//   tr('Prueba terrestre', 'Earth test')            → texto en el idioma actual
//   tr(`Intento ${n}`, `Attempt ${n}`)               → con variables, igual que un template string
//   trDato(pieza, 'nombre')                          → pieza.nombre_en si existe y el idioma es inglés; si no, pieza.nombre
//
// El idioma se elige así (en orden): ?lang=es|en en la URL → lo guardado en el navegador → idioma del navegador
// (español si empieza con "es"; si no, inglés). El cambio se aplica al volver a crear la escena (p. ej. el Menú se
// reinicia al cambiar de idioma).

const CLAVE = 'marsception.idioma';
export const IDIOMAS = ['es', 'en'];

function leerGuardado() {
  try { return localStorage.getItem(CLAVE); } catch { return null; }
}

function inicial() {
  try {
    const url = new URLSearchParams(globalThis.location?.search ?? '').get('lang');
    if (IDIOMAS.includes(url)) return url;
  } catch { /* sin URL (pruebas en Node) */ }
  const guardado = leerGuardado();
  if (IDIOMAS.includes(guardado)) return guardado;
  const nav = globalThis.navigator?.language ?? 'en';
  return nav.toLowerCase().startsWith('es') ? 'es' : 'en';
}

let actual = inicial();

/** Idioma actual: 'es' o 'en'. */
export const idioma = () => actual;
export const enIngles = () => actual === 'en';

export function setIdioma(l) {
  if (!IDIOMAS.includes(l)) return;
  actual = l;
  try { localStorage.setItem(CLAVE, l); } catch { /* sin almacenamiento */ }
  try { globalThis.document?.documentElement?.setAttribute('lang', l); } catch { /* sin DOM */ }
}

export function alternarIdioma() {
  setIdioma(actual === 'es' ? 'en' : 'es');
  return actual;
}

/** Texto en el idioma actual. */
export const tr = (es, en) => (actual === 'en' && en != null ? en : es);

/** Campo de un dato con versión en inglés opcional (`campo_en`). */
export const trDato = (obj, campo) => (actual === 'en' && obj?.[`${campo}_en`] ? obj[`${campo}_en`] : obj?.[campo]);

try { globalThis.document?.documentElement?.setAttribute('lang', actual); } catch { /* sin DOM */ }
