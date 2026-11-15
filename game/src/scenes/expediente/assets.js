// Dueño: frente expediente. Lista de arte a precargar en Boot (para que la barra muestre progreso REAL).
// Lee /assets (del frente arte) sin modificarlo:
// - Si existe assets/manifest.json, manda él:
//     { "imagenes": [{ "clave": "fondo_marte", "archivo": "fondos/marte.png" }],
//       "spritesheets": [{ "clave": "robot", "archivo": "robot/robot.png", "ancho": 32, "alto": 32 }] }
// - Si no, se precarga cada imagen de /assets con clave = ruta sin extensión (ej. "fondos/marte").
// Formatos pesados (GIF, MP4, WebM) nunca se precargan: solo se listan para reportarlos (ver precarga.js y Boot.js).
// Ojo: listarlos hace que Vite los copie al build; no los descarga el jugador, pero conviene que no vivan en /assets.

const manifiestos = import.meta.glob('../../../../assets/manifest.json', { eager: true, import: 'default' });
const urls = import.meta.glob('../../../../assets/**/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' });
// Perezoso: la URL solo se pide si existe un archivo así; el archivo en sí nunca se descarga en el Boot.
const pesados = import.meta.glob('../../../../assets/**/*.{gif,mp4,webm}', { query: '?url', import: 'default' });

const BASE = '../../../../assets/';

export function listaDeAssets() {
  const manifiesto = Object.values(manifiestos)[0];
  const url = (archivo) => urls[BASE + archivo];
  if (manifiesto) {
    const imgs = (manifiesto.imagenes || []).map((a) => ({ tipo: 'imagen', clave: a.clave, url: url(a.archivo), archivo: a.archivo }));
    const hojas = (manifiesto.spritesheets || []).map((a) => ({ tipo: 'spritesheet', clave: a.clave, url: url(a.archivo), archivo: a.archivo, ancho: a.ancho, alto: a.alto }));
    return [...imgs, ...hojas];
  }
  return Object.entries(urls).map(([ruta, u]) => ({
    tipo: 'imagen',
    clave: ruta.slice(BASE.length).replace(/\.[^.]+$/, ''),
    url: u,
    archivo: ruta.slice(BASE.length),
  }));
}

/** Archivos pesados de /assets (GIF, MP4, WebM): { archivo, cargarUrl() } para medirlos y reportarlos, nunca precargarlos. */
export function listaDePesados() {
  return Object.entries(pesados).map(([ruta, cargarUrl]) => ({ tipo: 'pesado', archivo: ruta.slice(BASE.length), cargarUrl }));
}
