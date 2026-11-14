// Carga única de los datos compartidos (data/ en la raíz del repo).
const sitios = import.meta.glob('../../data/sites/*.json', { eager: true, import: 'default' });
const destinos = import.meta.glob('../../data/targets/*.json', { eager: true, import: 'default' });
import piezas from './content/parts.json';

export const TODOS_LOS_SITIOS = Object.values(sitios);
// El catálogo científico completo se conserva; Expediente solo recibe sitios jugables.
export const SITIOS = TODOS_LOS_SITIOS.filter((s) =>
  s.estado !== 'candidato_modelo' || (Array.isArray(s.nivel?.perfil_elevacion_m) && s.nivel.perfil_elevacion_m.length >= 2));
export const DESTINOS = Object.fromEntries(Object.values(destinos).map((d) => [d.id, d]));
export const PIEZAS = piezas;
