// Dueño: frente expediente. Etiquetas legibles para claves de los contratos de datos (data/schema/).
// Solo traducen nombres: nunca agregan valores. Una clave desconocida se muestra "humanizada".
// Bilingüe: cada etiqueta es un getter que se evalúa al leerla, así un cambio de idioma se nota al redibujar
// (VARIABLES.forma, MUNDOS[d.mundo], ESTADOS.mina… siguen funcionando igual que con constantes).
import { tr } from '../../i18n.js';

/** { clave: [es, en] } → objeto con getters que devuelven el texto en el idioma actual. */
function perezoso(def, armar = (t) => t) {
  const o = {};
  for (const [k, [es, en, ...resto]] of Object.entries(def)) {
    Object.defineProperty(o, k, { enumerable: true, get: () => armar(tr(es, en), ...resto) });
  }
  return o;
}

export const VARIABLES = perezoso({
  forma: ['Forma del cráter', 'Crater shape'],
  oscilacion_termica: ['Oscilación térmica diaria', 'Daily temperature range'],
  precipitacion: ['Precipitación', 'Precipitation'],
  ndvi: ['Vegetación (NDVI)', 'Vegetation (NDVI)'],
  pendiente: ['Pendiente media', 'Mean slope'],
  diametro: ['Diámetro', 'Diameter'],
  profundidad: ['Profundidad', 'Depth'],
  profundidad_diametro: ['Profundidad / diámetro', 'Depth / diameter'],
  borde: ['Altura del borde', 'Rim height'],
  borde_levantado: ['Borde levantado', 'Raised rim'],
  ndvi_p90: ['NDVI percentil 90', 'NDVI 90th percentile'],
});

export const ESTADOS = perezoso({
  documentado: ['DOCUMENTADO', 'DOCUMENTED', '#06d6a0'],
  candidato_modelo: ['CANDIDATO DEL MODELO', 'MODEL CANDIDATE', '#ffd166'],
  propuesto_usuario: ['PROPUESTO POR USUARIO', 'USER PROPOSED', '#9aa4c7'],
  ilustrativo: ['ILUSTRATIVO', 'ILLUSTRATIVE', '#ef476f'],
  // No es un estado del contrato: se muestra en lugar del estado cuando el sitio es un tajo minero (esMina).
  mina: ['ANÁLOGO OPERATIVO (MINA)', 'OPERATIONAL ANALOG (MINE)', '#f2701f'],
}, (texto, color) => ({ texto, color }));

export const LIMITES = perezoso({
  gravedad: ['Gravedad', 'Gravity'],
  presion: ['Presión atmosférica', 'Atmospheric pressure'],
  presion_atmosferica: ['Presión atmosférica', 'Atmospheric pressure'],
  radiacion: ['Radiación', 'Radiation'],
  vacio: ['Vacío', 'Vacuum'],
  iluminacion_polar_rasante: ['Iluminación polar rasante', 'Low-angle polar lighting'],
});

export const PRUEBAS = perezoso({ agarre: ['agarre', 'traction'], relieve: ['relieve', 'terrain'], energia: ['energía', 'energy'] });

export const MUNDOS = perezoso({ marte: ['Marte', 'Mars'], luna: ['Luna', 'Moon'] });

export function humanizar(clave) {
  const s = String(clave).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const etiquetaVariable = (k) => VARIABLES[k] || humanizar(k);
export const etiquetaLimite = (k) => LIMITES[k] || humanizar(k);
