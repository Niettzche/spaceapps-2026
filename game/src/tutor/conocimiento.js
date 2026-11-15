// Frente modelo. ANA, la tutora de análogos: preguntas sugeridas y sus respuestas POR REGLAS (sin IA ni red).
// Lógica pura (sin Phaser ni navegador) para probarla con `node --test`.
// Regla de oro: solo se leen campos que existen en data/sites y data/targets; lo que falta se dice ("sin dato").
// Las cifras fijas salen de docs/METODOLOGIA.md y model/VALIDATION.md (las mismas que numeros.js, verificadas el
// 15 nov 2026). No agregar cifras que no estén documentadas allí.
// Inglés: trDato lee los campos `<campo>_en` que agrega prepararIngles() (datos_en.js; lo llaman Expediente y Menú).
import { tr, trDato } from '../i18n.js';
import { MUNDOS, PRUEBAS } from '../scenes/expediente/textos.js';
import { filasComparacion, limitesDe, formatoValor, formatoPorcentaje, esMina, esDemostracion } from '../scenes/expediente/logica.js';

export const NOMBRE_TUTORA = 'ANA';
const G_TIERRA = 9.81;

const mundoDe = (d) => (d ? MUNDOS[d.mundo] || d.mundo : tr('la Luna o Marte', 'the Moon or Mars'));
/** Nombre del mundo dentro de una frase: «la Luna» / «the Moon», «Marte» / «Mars». */
const mundoEn = (d) => (d?.mundo === 'luna' ? tr('la Luna', 'the Moon') : mundoDe(d));
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
/** Recorta en un límite de palabra (las fuentes son largas: la completa está en el panel de datos). */
function recortarPalabra(texto, n) {
  const t = String(texto ?? '');
  if (t.length <= n) return t;
  const corte = t.slice(0, n);
  const i = Math.max(corte.lastIndexOf(' '), corte.lastIndexOf(','), corte.lastIndexOf(';'));
  return `${(i > n * 0.5 ? corte.slice(0, i) : corte).replace(/[\s,;(]+$/, '')}…`;
}
const nombreSitio = (s) => trDato(s, 'nombre');
const fuenteCorta = (v) => (v?.fuente ? recortarPalabra(trDato(v, 'fuente'), 64) : tr('sin fuente', 'no source'));
const filasConSimilitud = (s, d) => filasComparacion(s, d).filas.filter((f) => typeof f.similitud === 'number');
/** «14.78 K» del lado de la Tierra (en forma: profundidad/diámetro) y del destino ("cráteres Luna+Marte" si no hay número). */
const ladoTierra = (f) => formatoValor(f.tierra);
const ladoDestino = (f) => (f.destino?.valor != null ? formatoValor(f.destino) : f.destino?.texto || tr('sin dato', 'no data'));

/**
 * Variables donde el destino vale 0 (vegetación, lluvia): parecerse ahí solo dice «casi no hay plantas ni lluvia», así que
 * no se usan como argumento principal del parecido (playtest de Leo, B3: Cananea «se parecía» por su NDVI).
 */
const destinoEnCero = (f) => f.destino?.valor === 0;

/**
 * Gemelo de forma más cercano, tal como lo escribe model/scan.py en la nota del sitio
 * («Gemelo de forma más cercano: <nombre> (Luna), 0.84 km, 80 m, d/D 0.095»). null si la nota no lo trae.
 */
export function gemeloDe(sitio) {
  const m = /Gemelo de forma más cercano: .+? \((Luna|Marte)\), ([\d.]+) km, ([\d.]+) m, d\/D ([\d.]+)/.exec(sitio?.nota || '');
  return m ? { mundo: m[1] === 'Luna' ? 'luna' : 'marte', diametroKm: m[2], profundidadM: m[3], dD: m[4] } : null;
}

/** `uso_exploracion` partido en frases: { cabeza (qué entrena), rompe (la frase «La analogía se rompe…», si la hay) }. */
function usoPartido(sitio) {
  const t = String(trDato(sitio, 'uso_exploracion') ?? '').trim();
  const i = t.search(/\. (La analogía se rompe|The analogy breaks)/);
  if (i < 0) return { cabeza: t.replace(/\.$/, ''), rompe: null };
  return { cabeza: t.slice(0, i), rompe: t.slice(i + 2).trim() };
}

/** «Sirve para: …» sin repetir «Análogo operativo, no geológico» (ya dicho) y con el aviso «Candidato a verificar» aparte. */
function fraseUso(sitio, { minaDicha }) {
  const { cabeza } = usoPartido(sitio);
  if (!cabeza) return null;
  const m = /^([^:]{8,60}): (.+)$/.exec(cabeza);
  let uso = cabeza;
  let aviso = null;
  if (m) {
    uso = m[2];
    if (!(minaDicha && /operativo|operational/i.test(m[1]))) aviso = m[1];
  }
  uso = recortarPalabra(uso, 200);
  const sirve = tr(`Sirve para: ${uso}.`, `Useful for: ${uso}.`).replace(/…\.$/, '…');
  return aviso ? `${aviso}. ${sirve}` : sirve;
}

/** Saludo al abrir el panel (con o sin sitio). */
export function saludo({ sitio, destino } = {}) {
  if (sitio && destino) {
    return tr(`¡Hola! Soy ${NOMBRE_TUTORA}, tu tutora de análogos. Te explico por qué ${nombreSitio(sitio)} se parece a ${mundoEn(destino)} y en qué no. Elige una pregunta o escribe la tuya.`,
      `Hi! I'm ${NOMBRE_TUTORA}, your analog tutor. I'll explain why ${nombreSitio(sitio)} resembles ${mundoEn(destino)}, and where it doesn't. Pick a question or type your own.`);
  }
  return tr(`¡Hola! Soy ${NOMBRE_TUTORA}, tu tutora de análogos. Pregúntame qué es un análogo, cómo encontramos los sitios o qué no puede probar la Tierra.`,
    `Hi! I'm ${NOMBRE_TUTORA}, your analog tutor. Ask me what an analog is, how we found the sites, or what Earth cannot test.`);
}

/** Preguntas sugeridas para este contexto: [{ id, texto }]. Con sitio: sobre ese sitio; sin sitio: sobre el método. */
export function preguntasSugeridas({ sitio, destino } = {}) {
  const analogo = { id: 'analogo', texto: tr('¿Qué es un análogo?', 'What is an analog?') };
  if (sitio && destino) {
    return [
      analogo,
      { id: 'parecido', texto: tr(`¿Por qué se parece a ${mundoEn(destino)}?`, `Why is it like ${mundoEn(destino)}?`) },
      { id: 'rompe', texto: tr('¿Dónde se rompe la analogía?', 'Where does the analogy break?') },
      { id: 'datos', texto: tr('¿De dónde salen estos datos?', 'Where does this data come from?') },
    ];
  }
  return [
    analogo,
    { id: 'modelo', texto: tr('¿Cómo encuentra el modelo los sitios?', 'How does the model find sites?') },
    { id: 'validacion', texto: tr('¿Qué tan confiable es?', 'How reliable is it?') },
    { id: 'tierra', texto: tr('¿Qué no puede probar la Tierra?', 'What can Earth not test?') },
  ];
}

const RESPUESTAS = {
  analogo: () => tr(
    'Un análogo es un lugar de la Tierra que se parece en algo medible a un lugar de la Luna o de Marte: la forma de un cráter, la aridez, la pendiente o el tipo de suelo. Sirve para probar robots y operaciones antes de la misión. Nunca es igual en todo: la gravedad, el vacío o la radiación del destino no se pueden copiar aquí.',
    'An analog is a place on Earth that matches a place on the Moon or Mars in something measurable: crater shape, dryness, slope or soil type. It lets you test robots and operations before the mission. It is never the same in everything: the destination\'s gravity, vacuum or radiation cannot be copied here.'),

  modelo: () => tr(
    'El mismo detector mide depresiones tipo cráter a 200 m por píxel en la Tierra (Copernicus DEM), el polo sur lunar (LRO LOLA) y Marte (HRSC+MOLA). Un modelo explicable, un árbol de decisión y una regresión logística entrenados con cráteres reales de la Luna y Marte, compara su forma; la regla principal es profundidad/diámetro. Después se suman clima (NASA POWER), vegetación (MODIS) y pendiente, y se descarta lo que tiene vegetación densa.',
    'One detector measures crater-like depressions at 200 m per pixel on Earth (Copernicus DEM), the lunar south pole (LRO LOLA) and Mars (HRSC+MOLA). An explainable model, a decision tree and a logistic regression trained on real Moon and Mars craters, compares their shape; the key rule is depth/diameter. Then climate (NASA POWER), vegetation (MODIS) and slope are added, and densely vegetated places are ruled out.'),

  validacion: () => tr(
    'Son pruebas distintas, no una sola cifra: el detector encuentra 9 de 11 cráteres conocidos de México; el modelo distingue cráteres de la Luna y de Marte con cerca de 78 % de exactitud balanceada; y el comparador da 0 % en los 3 controles negativos (Amazonas, Congo y un arrozal del Mekong). Un sitio candidato todavía necesita revisión: el puntaje no certifica nada.',
    'These are separate tests, not one number: the detector finds 9 of 11 known Mexican craters; the model tells Moon and Mars craters apart with about 78 % balanced accuracy; and the comparator gives 0 % on all 3 negative controls (Amazon, Congo and a Mekong rice plain). A candidate site still needs review: the score certifies nothing.'),

  tierra: ({ destino } = {}) => {
    const g = destino?.gravedad_ms2;
    const grav = g
      ? tr(`la gravedad de ${mundoEn(destino)} (${g} m/s² contra ${G_TIERRA} en la Tierra)`, `${mayuscula(mundoEn(destino))}'s gravity (${g} m/s² vs. ${G_TIERRA} on Earth)`)
      : tr('la gravedad del destino (Marte 3.71, Luna 1.62 m/s²)', 'the destination\'s gravity (Mars 3.71, Moon 1.62 m/s²)');
    return tr(
      `Ningún lugar de la Tierra reproduce ${grav}, la presión atmosférica, la radiación ni el vacío lunar. Por eso aquí pruebas tu robot en la Tierra y la gravedad real solo aparece en la misión.`,
      `No place on Earth reproduces ${grav}, the atmospheric pressure, the radiation or the lunar vacuum. That is why you test your robot on Earth here, and the real gravity only shows up in the mission.`);
  },

  parecido: ({ sitio, destino }) => {
    const partes = [];
    if (esDemostracion(sitio)) partes.push(tr('Ojo: este sitio es de demostración (ILUSTRATIVO), no un dato real.', 'Note: this site is demonstration data (ILLUSTRATIVE), not real data.'));
    const total = sitio.similitud?.total;
    partes.push(typeof total === 'number'
      ? tr(`${nombreSitio(sitio)} tiene ${formatoPorcentaje(total)} de similitud total con ${mundoEn(destino)} (no es la probabilidad de éxito de la misión).`,
        `${nombreSitio(sitio)} has ${formatoPorcentaje(total)} total similarity with ${mundoEn(destino)} (it is not the chance of mission success).`)
      : tr(`${nombreSitio(sitio)} todavía no tiene similitud total calculada.`, `${nombreSitio(sitio)} has no total similarity computed yet.`));
    const filas = filasConSimilitud(sitio, destino);
    const forma = filas.find((f) => f.clave === 'forma');
    if (forma) {
      // Primero la forma: es la dimensión con más peso y la que el modelo explicable sí separa (AGENTS.md §6.1).
      const dD = typeof forma.tierra?.valor === 'number' ? forma.tierra.valor.toFixed(3) : null;
      const pct = formatoPorcentaje(forma.similitud);
      partes.push(tr(`Lo que más pesa es la forma${dD ? ` (d/D ${dD})` : ''}: un modelo explicable entrenado con cráteres reales de la Luna y Marte la asigna a ${mundoEn(destino)} con ${pct}.`,
        `What matters most is shape${dD ? ` (d/D ${dD})` : ''}: an explainable model trained on real Moon and Mars craters assigns it to ${mundoEn(destino)} with ${pct}.`));
      const g = gemeloDe(sitio);
      if (g) {
        partes.push(tr(`Su gemelo más cercano: un cráter ${g.mundo === 'luna' ? 'lunar' : 'marciano'} de ${g.diametroKm} km y ${g.profundidadM} m de profundidad (d/D ${g.dD}).`,
          `Closest twin: a ${g.mundo === 'luna' ? 'lunar' : 'Martian'} crater ${g.diametroKm} km wide and ${g.profundidadM} m deep (d/D ${g.dD}).`));
      }
    } else {
      // Sin forma: la variable más parecida, sin contar las que valen 0 en el destino (si solo quedan esas, se usan).
      const utiles = filas.filter((f) => !destinoEnCero(f));
      const mejor = (utiles.length ? utiles : filas).sort((a, b) => b.similitud - a.similitud)[0];
      if (mejor) {
        partes.push(tr(`Lo que más se parece: ${mejor.etiqueta}, ${ladoTierra(mejor)} aquí contra ${ladoDestino(mejor)} allá (${formatoPorcentaje(mejor.similitud)}; ${fuenteCorta(mejor.tierra)}).`,
          `Closest match: ${mejor.etiqueta}, ${ladoTierra(mejor)} here vs. ${ladoDestino(mejor)} there (${formatoPorcentaje(mejor.similitud)}; ${fuenteCorta(mejor.tierra)}).`));
      }
    }
    const mina = esMina(sitio);
    if (mina) partes.push(tr('Es un tajo minero: análogo operativo, no geológico.', 'It is an open-pit mine: an operational analog, not a geological one.'));
    const uso = sitio.uso_exploracion ? fraseUso(sitio, { minaDicha: mina }) : null;
    if (uso) partes.push(uso);
    else if (sitio.prueba_util && PRUEBAS[sitio.prueba_util]) partes.push(tr(`En el juego prueba: ${PRUEBAS[sitio.prueba_util]}.`, `In the game it tests: ${PRUEBAS[sitio.prueba_util]}.`));
    return partes.join(' ');
  },

  rompe: ({ sitio, destino }) => {
    const partes = [];
    const { noReproducible, notas } = limitesDe(sitio, destino);
    const lista = noReproducible.map((l) => l.etiqueta.toLowerCase());
    const g = destino?.gravedad_ms2;
    if (lista.length) {
      partes.push(tr(`La Tierra no puede reproducir: ${lista.join(', ')}.`, `Earth cannot reproduce: ${lista.join(', ')}.`));
    }
    if (g) partes.push(tr(`En ${mundoEn(destino)} la gravedad es ${g} m/s², contra ${G_TIERRA} aquí: tu robot pesará ${Math.round((g / G_TIERRA) * 100)} % de lo que pesa en la prueba.`,
      `On ${mundoEn(destino)} gravity is ${g} m/s², vs. ${G_TIERRA} here: your robot will weigh ${Math.round((g / G_TIERRA) * 100)} % of its test weight.`));
    const peor = filasConSimilitud(sitio, destino).sort((a, b) => a.similitud - b.similitud)[0];
    if (peor) {
      partes.push(tr(`Lo que menos se parece: ${peor.etiqueta}, ${ladoTierra(peor)} aquí contra ${ladoDestino(peor)} allá (${formatoPorcentaje(peor.similitud)}).`,
        `Weakest match: ${peor.etiqueta}, ${ladoTierra(peor)} here vs. ${ladoDestino(peor)} there (${formatoPorcentaje(peor.similitud)}).`));
    }
    // La frase «La analogía se rompe…» que el modelo escribió para este sitio (antes se cortaba en «¿Por qué se parece?»).
    const { rompe } = sitio.uso_exploracion ? usoPartido(sitio) : {};
    if (rompe) partes.push(rompe);
    if (notas.some((n) => /m[aá]ximo terrestre|extremo/i.test(n))) {
      partes.push(tr('Algún valor del destino está fuera de lo que existe en la Tierra y se compara contra el extremo terrestre.',
        'Some destination value is beyond anything on Earth, so it is compared against the Earth extreme.'));
    }
    return partes.join(' ') || tr('Este sitio no trae límites declarados.', 'This site has no declared limits.');
  },

  datos: ({ sitio, destino }) => {
    const mundo = mayuscula(mundoDe(destino));
    const filas = filasComparacion(sitio, destino).filas.filter((f) => f.tierra && f.destino).slice(0, 3);
    const lineas = filas.map((f) => tr(`${f.etiqueta}: Tierra, ${fuenteCorta(f.tierra)}; ${mundo}, ${fuenteCorta(f.destino)}.`,
      `${f.etiqueta}: Earth, ${fuenteCorta(f.tierra)}; ${mundo}, ${fuenteCorta(f.destino)}.`));
    if (!lineas.length) return tr('Este sitio todavía no tiene variables medidas.', 'This site has no measured variables yet.');
    lineas.push(tr('Cada valor guarda fuente, unidad y fecha: tócalo en la tabla (tecla I) para verlo completo.',
      'Every value keeps its source, unit and date: tap it in the table (I key) to see it in full.'));
    return lineas.join(' ');
  },
};

/** Respuesta por reglas a una pregunta sugerida (id), o null si no hay una para ese id o falta el sitio. */
export function respuestaPorReglas(id, { sitio = null, destino = null } = {}) {
  const f = RESPUESTAS[id];
  if (!f) return null;
  if (['parecido', 'rompe', 'datos'].includes(id) && !(sitio && destino)) return null;
  return f({ sitio, destino });
}

/** Qué decir cuando no hay IA disponible para una pregunta libre. */
export function sinIA(motivo) {
  if (motivo === 'limite') {
    return tr('Respondí muchas preguntas seguidas y necesito un respiro. Mientras, prueba las preguntas sugeridas: esas las contesto siempre.',
      'I answered a lot of questions in a row and need a breather. Meanwhile, try the suggested questions: I can always answer those.');
  }
  return tr('Ahora no puedo contestar preguntas libres (sin conexión con la API). Las preguntas sugeridas sí funcionan: salen directo de nuestros datos.',
    'I cannot answer free questions right now (no connection to the API). The suggested questions still work: they come straight from our data.');
}
