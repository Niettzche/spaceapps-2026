// Dueño: frente expediente. Glosario para novatos del Expediente: cada variable con un nombre llano, una pregunta corta
// y un ícono; el nombre técnico (textos.js → VARIABLES) y la unidad siguen visibles en la franja de ayuda y en el detalle I.
// Regla (AGENTS.md §3.3): estas frases DESCRIBEN qué mide la variable; nunca le asignan un valor ni una cifra.
// Lógica pura (sin Phaser) para probarla con `node --test`.
import { tr } from '../../i18n.js';
import { etiquetaVariable } from './textos.js';
import { unidadVisible } from './logica.js';

// Íconos: arte de Mauricio (assets/iconos/ico_*.png → textura 'iconos/ico_*'). `iconos` va en orden de preferencia: el
// primero que exista se usa (los nuevos de Mauricio primero; luego uno parecido que ya existe). Si no hay ninguno, la
// vista dibuja el glifo de respaldo `glifo` (ver iconos_expediente.js).
const DEF = {
  forma: {
    llano: ['Forma del hoyo', 'Crater shape'],
    pregunta: ['¿Se parece la forma del hoyo?', 'Does the hole have the same shape?'],
    iconos: ['iconos/ico_forma'], glifo: 'forma',
  },
  oscilacion_termica: {
    llano: ['Cambio día-noche', 'Day-night swing'],
    pregunta: ['¿Cuánto cambia la temperatura en un día?', 'How much does the temperature change in a day?'],
    iconos: ['iconos/ico_oscilacion', 'iconos/ico_temperatura'], glifo: 'temperatura',
  },
  precipitacion: {
    llano: ['Lluvia', 'Rain'],
    pregunta: ['¿Cuánto llueve?', 'How much does it rain?'],
    iconos: ['iconos/ico_precipitacion'], glifo: 'lluvia',
  },
  ndvi: {
    llano: ['Plantas', 'Plants'],
    pregunta: ['¿Cuánta vegetación hay?', 'How much vegetation is there?'],
    iconos: ['iconos/ico_vegetacion'], glifo: 'planta',
  },
  ndvi_p90: {
    llano: ['Plantas (alto)', 'Plants (high)'],
    pregunta: ['¿Cuánta vegetación hay, en su valor alto?', 'How much vegetation is there, at its high value?'],
    iconos: ['iconos/ico_vegetacion'], glifo: 'planta',
  },
  pendiente: {
    llano: ['Inclinación', 'Steepness'],
    pregunta: ['¿Qué tan empinado es?', 'How steep is it?'],
    iconos: ['iconos/ico_pendiente'], glifo: 'pendiente',
  },
  diametro: {
    llano: ['Ancho del hoyo', 'Hole width'],
    pregunta: ['¿Qué tan ancho es el hoyo?', 'How wide is the hole?'],
    iconos: ['iconos/ico_forma'], glifo: 'forma',
  },
  profundidad: {
    llano: ['Hondura del hoyo', 'Hole depth'],
    pregunta: ['¿Qué tan hondo es el hoyo?', 'How deep is the hole?'],
    iconos: ['iconos/ico_forma'], glifo: 'forma',
  },
  profundidad_diametro: {
    llano: ['Hondo vs. ancho', 'Depth vs. width'],
    pregunta: ['¿Qué tan hondo es para lo ancho que es?', 'How deep is it for how wide it is?'],
    iconos: ['iconos/ico_forma'], glifo: 'forma',
  },
  borde: {
    llano: ['Borde del hoyo', 'Rim height'],
    pregunta: ['¿Qué tan alto es el borde?', 'How high is the rim?'],
    iconos: ['iconos/ico_forma', 'iconos/ico_subida'], glifo: 'forma',
  },
  borde_levantado: {
    llano: ['Borde levantado', 'Raised rim'],
    pregunta: ['¿Tiene un borde levantado alrededor?', 'Does it have a raised rim around it?'],
    iconos: ['iconos/ico_forma', 'iconos/ico_subida'], glifo: 'forma',
  },
};

// Un tajo minero es una excavación, no un cráter (logica.js → esMina): el nombre llano lo dice.
const FORMA_MINA = {
  llano: ['Forma del tajo', 'Pit shape'],
  pregunta: ['¿Se parece la forma del tajo a un cráter?', 'Does the pit look like a crater?'],
};

/**
 * Lo que ve un novato de una variable: { clave, llano, pregunta, tecnico, iconos, glifo }.
 * `tecnico` es el nombre de siempre (textos.js); una clave desconocida usa ese nombre también como nombre llano.
 */
export function infoVariable(clave, { mina = false } = {}) {
  const d = DEF[clave];
  const tecnico = clave === 'forma' && mina ? tr('Forma del tajo minero', 'Open-pit mine shape') : etiquetaVariable(clave);
  if (!d) return { clave, llano: tecnico, pregunta: null, tecnico, iconos: [], glifo: 'dato' };
  const t = clave === 'forma' && mina ? { ...d, ...FORMA_MINA } : d;
  return { clave, llano: tr(...t.llano), pregunta: tr(...t.pregunta), tecnico, iconos: d.iconos, glifo: d.glifo };
}

/** «Oscilación térmica diaria (K)»: nombre técnico con su unidad visible (sin unidad si es adimensional o falta). */
export function tecnicoConUnidad(info, unidad) {
  const u = unidad && unidad !== '-' ? ` (${unidadVisible(unidad)})` : '';
  return `${info.tecnico}${u}`;
}

/** Una línea: qué quiere decir el % de parecido (de una fila o del total). */
export function explicaSimilitud(mundo) {
  return tr(`100 % = igual a ${mundo} en esa variable`, `100 % = same as ${mundo} on that variable`);
}

/** Leyenda corta de la franja de ayuda bajo la tabla (cuando no hay una fila bajo el ratón). */
export function leyendaTabla(mundo) {
  return tr(`100 % = igual a ${mundo} · toca una fila: fuentes`, `100 % = same as ${mundo} · tap a row: sources`);
}

/** Qué es la confianza (docs/METODOLOGIA.md: cobertura de dimensiones, no probabilidad de acierto). */
export function explicaConfianza() {
  return tr('Confianza = cuántas variables del modelo tienen dato. No es la probabilidad de que tu robot gane.',
    'Confidence = how many of the model variables have data. It is not the chance that your robot wins.');
}

/** Qué es la similitud total (docs/METODOLOGIA.md: combina las variables; no es probabilidad de éxito de la misión). */
export function explicaTotal(mundo) {
  return tr(`Similitud total = qué tanto se parece este lugar a ${mundo}, juntando todas las variables (100 % = igual). No es la probabilidad de éxito de la misión.`,
    `Total similarity = how much this place is like ${mundo}, combining all variables (100 % = the same). It is not the chance of mission success.`);
}
