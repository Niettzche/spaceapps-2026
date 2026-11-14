// Carga única de los datos compartidos (data/ en la raíz del repo).
const sitios = import.meta.glob('../../data/sites/*.json', { eager: true, import: 'default' });
const destinos = import.meta.glob('../../data/targets/*.json', { eager: true, import: 'default' });
import piezas from './content/parts.json';

export const SITIOS = Object.values(sitios);
export const DESTINOS = Object.fromEntries(Object.values(destinos).map((d) => [d.id, d]));
export const PIEZAS = piezas;
