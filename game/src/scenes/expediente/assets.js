// Dueño: frente expediente. Lista de arte a precargar en Boot (para que la barra muestre progreso REAL).
// Lee /assets (del frente arte) sin modificarlo:
// - Si existe assets/manifest.json, manda él:
//     { "imagenes": [{ "clave": "fondo_marte", "archivo": "fondos/marte.png" }],
//       "spritesheets": [{ "clave": "robot", "archivo": "robot/robot.png", "ancho": 32, "alto": 32 }] }
// - Si no, se precarga cada imagen de /assets con clave = ruta sin extensión (ej. "fondos/marte").

const manifiestos = import.meta.glob('../../../../assets/manifest.json', { eager: true, import: 'default' });
const urls = import.meta.glob('../../../../assets/**/*.{png,jpg,jpeg,webp,gif}', { eager: true, query: '?url', import: 'default' });

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
