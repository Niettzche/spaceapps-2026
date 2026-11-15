// Nombres en inglés de destinos y sitios, y traducción de las notas de fuente de los perfiles (data/ está en español).
// Mapa propio y pequeño del frente juego (prueba y misión); no depende de los datos traducidos del expediente.
import { idioma, trDato } from '../i18n.js';

const DESTINOS_EN = {
  jezero: 'Jezero Crater (Mars)',
  polo_sur_lunar: 'Artemis candidate region, lunar south pole',
};

const SITIOS_EN = {
  samalayuca: 'Samalayuca Dunes',
  pinacate: 'El Pinacate volcanic field',
  mx0207: 'Real de Ángeles (Zac.)',
  g00281: 'Al Wahbah maar (Harrat Kishb, Saudi Arabia)',
};

// Nombres genéricos del catálogo ("Depresión tipo cráter G00003 (Atacama (Chile))").
const GENERICOS = [
  [/^Depresión tipo cráter/, 'Crater-like depression'],
  [/\(EE\. UU\.\)/g, '(USA)'],
];

const ingles = () => idioma() === 'en';

/** Nombre del destino (data/targets) en el idioma actual. */
export function nombreDestino(destino) {
  if (!destino) return '';
  if (!ingles()) return destino.nombre;
  return destino.nombre_en ?? DESTINOS_EN[destino.id] ?? destino.nombre;
}

/** Nombre del sitio análogo (data/sites) en el idioma actual. */
export function nombreSitio(sitio) {
  if (!sitio) return '';
  if (!ingles()) return sitio.nombre;
  if (sitio.nombre_en) return trDato(sitio, 'nombre');
  if (SITIOS_EN[sitio.id]) return SITIOS_EN[sitio.id];
  return GENERICOS.reduce((t, [re, en]) => t.replace(re, en), sitio.nombre ?? '');
}

// Frases de las notas de fuente de data/ (de la más larga a la más corta). Nombres de productos, números y
// coordenadas no se tocan.
const FRASES_FUENTE = [
  ['altura relativa al primer punto', 'height relative to the first point'],
  ['eje x de la proyección estereográfica polar', 'x axis of the polar stereographic projection'],
  ['por verificar contra el nomenclátor IAU', 'to be checked against the IAU gazetteer'],
  ['centro del recorte de la celda', 'center of the crop of cell'],
  ['gemelo lunar de', 'lunar twin of'],
  ['por perfil a', 'by profile at'],
  ['celda', 'cell'],
  ['muestreo a', 'sampled at'],
  ['transecto de', 'transect of'],
  ['centrado en', 'centered at'],
  ['proyección', 'projection'],
  ['UTM local', 'local UTM'],
  ['promediado a', 'averaged to'],
  ['rumbo', 'bearing'],
  ['paso', 'step'],
  ['vía', 'via'],
];

/** Nota de fuente de un perfil (data/) en el idioma actual: en inglés se traducen las frases conocidas. */
export function traducirFuente(fuente) {
  if (!fuente || !ingles()) return fuente;
  let t = String(fuente).replace(/^Mosaico (.+?) \(/, '$1 mosaic (');
  for (const [es, en] of FRASES_FUENTE) t = t.split(es).join(en);
  return t;
}
