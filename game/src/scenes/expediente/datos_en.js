// Dueño: frente expediente. Versión en inglés de los textos de data/ (en español) que se muestran en el juego.
// - Por id: nombre, proceso y uso de los sitios JUGABLES (samalayuca, pinacate, mx0207, g00281) y de los destinos.
// - Textos repetidos (fuentes, notas, límites): diccionario exacto y patrones para los textos que arma model/scan.py.
// Traducción fiel: no agrega afirmaciones. Los nombres de fuentes (Copernicus DEM GLO-30 (ESA)…) no se traducen.
// Si un texto no tiene versión en inglés, se muestra el original en español (nunca se inventa).
//
// prepararIngles() agrega campos `<campo>_en` a los objetos de data/ (p. ej. sitio.nombre_en, variable.fuente_en),
// que es lo que lee trDato() de i18n.js en cualquier escena. Es idempotente.
import { idioma } from '../../i18n.js';
import { TODOS_LOS_SITIOS, DESTINOS } from '../../data.js';

const SITIOS_EN = {
  samalayuca: {
    nombre: 'Samalayuca Dunes',
    proceso: 'Wind-formed dunes (aeolian processes)',
    uso_exploracion: 'Rover mobility on loose sand and active dunes (traction, sinkage, climbing up and down crests)',
  },
  pinacate: {
    nombre: 'El Pinacate volcanic field',
    proceso: 'Basaltic volcanism and craters',
    uso_exploracion: 'Field geology and mobility on volcanic terrain and inside a crater (El Elegante maar)',
  },
  mx0207: {
    nombre: 'Real de Ángeles (Zac.)',
    proceso: 'Probable open-pit mine (OpenStreetMap quarry within ≤ 2 km; to be verified)',
    uso_exploracion: 'Operational analog, not geological: test rover navigation and mobility on steep walls, '
      + 'excavation (ISRU) and operations in shadow at the bottom of the pit',
  },
  g00281: {
    nombre: 'Al Wahbah maar (Harrat Kishb, Saudi Arabia)',
    proceso: 'Closed crater-like depression (maar); measured raised rim of 6.1 m',
    uso_exploracion: 'Candidate to verify in the field: navigation and mobility inside a crater-like depression',
  },
};

const DESTINOS_EN = {
  jezero: {
    nombre: 'Jezero Crater (Mars)',
    variables: {
      oscilacion_termica: {
        fecha: '2021-2022 (sols 34–359)',
        nota: 'Diurnal AIR amplitude at 1.45 m (Tmax − Tmin): 52 K (Ls 25°), 53 K (Ls 90°) and 61 K (Ls 180°). The 55 K is '
          + 'the simple average of those three rows, computed by the model team; the paper does not publish an annual '
          + 'average. Comparable with T2M_RANGE (air at 2 m) except for height and sol length (24 h 39 min). Backup: '
          + 'diurnal semi-amplitude of 26 K (Rodríguez-Manfredi et al. 2023, Nature Geoscience, doi:10.1038/s41561-022-01084-0).',
      },
      pendiente: {
        nota: 'Median of the mean slope of 100 tiles of 10 km (Jezero Crater), computed with the same code and at the same '
          + 'resolution (200 m) as Earth (analisis/03; ciencia_datos/datos/referencias_luna_marte_10km.csv). '
          + 'Interquartile range 2.82–4.74°.',
      },
    },
  },
  polo_sur_lunar: {
    nombre: 'Artemis candidate region, lunar south pole',
    variables: {
      oscilacion_termica: {
        fuente: 'LRO Diviner, seasonal polar temperature maps by Williams et al. 2019, JGR Planets 124, 2505 (doi:10.1029/2019JE006028)',
        fecha: 'southern summer (product polar_south_80_summer_amplitude)',
        nota: 'SURFACE temperature range (there is no air) over one lunation (~29.5 days). 176 K is the median computed '
          + 'by the model team (script: model/fuentes/diviner_polo_sur.py, reproduces 176.5 K) on the official summer '
          + 'amplitude map, in 85–90°S pixels with summer maximum ≥ 110 K (excludes permanent shadow); interquartile range '
          + '160–193 K. Candidate point Connecting Ridge C2: 144 K. It is not the same observable as T2M_RANGE: the '
          + 'comparison is only an order of magnitude and the comparator clips it to the Earth maximum (40 K).',
      },
      pendiente: {
        nota: 'Median of the mean slope of 725 tiles of 10 km (South pole (85-90°S)), computed with the same code and at '
          + 'the same resolution (200 m) as Earth (analisis/03; ciencia_datos/datos/referencias_luna_marte_10km.csv). '
          + 'Interquartile range 6.19–11.42°.',
      },
    },
  },
};

// Textos que se repiten en muchos sitios (fuentes, notas, procesos de los candidatos del modelo).
const EXACTOS = {
  'NASA POWER T2M_RANGE (climatología anual)': 'NASA POWER T2M_RANGE (annual climatology)',
  'NASA POWER PRECTOTCORR (climatología anual)': 'NASA POWER PRECTOTCORR (annual climatology)',
  'Copernicus DEM GLO-30 (ESA, versión 2024_1) promediado a 200 m, Google Earth Engine':
    'Copernicus DEM GLO-30 (ESA, version 2024_1) averaged to 200 m, Google Earth Engine',
  'Copernicus DEM GLO-30 (ESA), remuestreado a 200 m; detector analisis/07_buscador_crateres.py':
    'Copernicus DEM GLO-30 (ESA), resampled to 200 m; detector analisis/07_buscador_crateres.py',
  'MODIS MOD13Q1 percentil 90, 2021-2025 (Earth Engine)': 'MODIS MOD13Q1 90th percentile, 2021-2025 (Earth Engine)',
  'Modelo explicable Luna contra Marte (regresión logística, 3 variables) + distancia a la nube Luna+Marte':
    'Explainable Moon vs. Mars model (logistic regression, 3 variables) + distance to the Moon+Mars cloud',
  'media del píxel de 250 m': 'mean of the 250 m pixel',
  'media de la pendiente en un cuadro de 10 km centrado en el punto': 'mean slope in a 10 km tile centered on the point',
  'a 200 m el borde lunar medido es negativo (mediana −23 m): no se usa como criterio de parecido':
    'at 200 m the measured lunar rim is negative (median −23 m): it is not used as a similarity criterion',
  'filtro de zonas áridas del detector: < 0.35': 'detector arid-zone filter: < 0.35',
  'Sin precipitación líquida en Marte actual': 'No liquid precipitation on present-day Mars',
  'Sin atmósfera': 'No atmosphere',
  'Sin vegetación': 'No vegetation',
  'Perseverance MEDA, Munguira et al. 2023, JGR Planets 128, e2022JE007559 (doi:10.1029/2022JE007559), Tabla 1':
    'Perseverance MEDA, Munguira et al. 2023, JGR Planets 128, e2022JE007559 (doi:10.1029/2022JE007559), Table 1',
  'Mosaico HRSC+MOLA Blend DEM 200 m (ESA/NASA, vía USGS Astrogeology)': 'HRSC+MOLA Blend DEM 200 m mosaic (ESA/NASA, via USGS Astrogeology)',
  'LRO LOLA polar ldem_80s_80m (NASA), promediado a 200 m': 'LRO LOLA polar ldem_80s_80m (NASA), averaged to 200 m',
  'Depresión cerrada tipo cráter (maar); borde levantado medido de 6.1 m':
    'Closed crater-like depression (maar); measured raised rim of 6.1 m',
  'Depresión cerrada tipo cráter de origen sin confirmar (borde levantado: probable volcánico)':
    'Closed crater-like depression of unconfirmed origin (raised rim: probably volcanic)',
  'Probable tajo minero a cielo abierto (cantera de OpenStreetMap a ≤ 2 km; por verificar)':
    'Probable open-pit mine (OpenStreetMap quarry within ≤ 2 km; to be verified)',
  'Volcánico: maar del catálogo de cráteres conocidos de México': 'Volcanic: maar from the catalog of known Mexican craters',
  'Análogo operativo, no geológico: probar navegación y movilidad de rovers en paredes empinadas, excavación (ISRU) y operación con sombra en el fondo del tajo':
    SITIOS_EN.mx0207.uso_exploracion,
  'Candidato a verificar en campo: navegación y movilidad dentro de una depresión tipo cráter':
    'Candidate to verify in the field: navigation and mobility inside a crater-like depression',
  'Navegación y movilidad de rovers dentro y en el borde de un cráter; geología de campo en un cráter real':
    'Rover navigation and mobility inside and on the rim of a crater; field geology in a real crater',
};

// Cola de las notas de forma que escribe model/scan.py.
const COLA_FORMA = [
  [/^dentro del 95 % de la nube de cráteres Luna\+Marte$/, () => 'inside 95 % of the Moon+Mars crater cloud'],
  [/^fuera de la nube Luna\+Marte \(distancia ([\d.]+) > ([\d.]+)\): (.+)$/,
    (m) => `outside the Moon+Mars cloud (distance ${m[1]} > ${m[2]}): ${traducirEn(m[3]) ?? m[3]}`],
];

// Patrones de los textos generados (nombres de detecciones, notas de forma, límites del cálculo).
const PATRONES = [
  [/^Depresión tipo cráter (\S+)(?: \((.+)\))?$/, (m) => `Crater-like depression ${m[1]}${m[2] ? ` (${m[2].replace('EE. UU.', 'USA')})` : ''}`],
  [/^más hondo que casi cualquier cráter planetario de su tamaño$/, () => 'deeper than almost any planetary crater of its size'],
  [/^forma poco común en la Luna y Marte$/, () => 'shape uncommon on the Moon and Mars'],
  [/^(?:Cráter (\S+): )?P\(Luna\)=([\d.]+), distancia a la nube=([\d.]+); (.+)$/, (m) => {
    const cola = COLA_FORMA.map(([re, f]) => { const x = m[4].match(re); return x && f(x); }).find(Boolean);
    return cola && `${m[1] ? `Crater ${m[1]}: ` : ''}P(Moon)=${m[2]}, distance to the cloud=${m[3]}; ${cola}`;
  }],
  [/^oscilacion_termica: destino por encima del máximo terrestre \(([\d.]+) > ([\d.]+)\); se compara contra el extremo$/,
    (m) => `temperature range: destination above the Earth maximum (${m[1]} > ${m[2]}); compared against the extreme`],
  [/^forma: (.+)$/, (m) => { const c = COLA_FORMA.map(([re, f]) => { const x = m[1].match(re); return x && f(x); }).find(Boolean); return c && `shape: ${c}`; }],
];

/** Versión en inglés de un texto de data/ o de la API, o null si no se conoce. */
export function traducirEn(texto) {
  if (typeof texto !== 'string' || !texto) return null;
  if (EXACTOS[texto]) return EXACTOS[texto];
  for (const [re, f] of PATRONES) {
    const m = texto.match(re);
    if (m) { const r = f(m); if (r) return r; }
  }
  return null;
}

/** Texto en el idioma actual: en inglés usa la traducción si existe; si no, el original. */
export const enIdioma = (texto) => (idioma() === 'en' ? traducirEn(texto) ?? texto : texto);

function poner(obj, campo, en) {
  if (obj && typeof obj[campo] === 'string' && en) obj[`${campo}_en`] = en;
}

function prepararObjeto(obj, propios = {}) {
  for (const campo of ['nombre', 'proceso', 'uso_exploracion']) poner(obj, campo, propios[campo] ?? traducirEn(obj[campo]));
  for (const [clave, v] of Object.entries(obj.variables || {})) {
    if (!v || typeof v !== 'object') continue;
    const p = propios.variables?.[clave] || {};
    for (const campo of ['fuente', 'fecha', 'nota']) poner(v, campo, p[campo] ?? traducirEn(v[campo]));
  }
}

let listo = false;
/** Agrega `<campo>_en` a sitios y destinos de data/ (una sola vez). */
export function prepararIngles(sitios = TODOS_LOS_SITIOS, destinos = DESTINOS) {
  if (listo) return;
  listo = true;
  for (const s of sitios) prepararObjeto(s, SITIOS_EN[s.id]);
  for (const d of Object.values(destinos)) prepararObjeto(d, DESTINOS_EN[d.id]);
}
