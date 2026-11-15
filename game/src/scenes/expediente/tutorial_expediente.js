// Dueño: frente expediente. Tutorial rápido del Expediente (coach marks): la primera vez que se abre el Expediente en
// este navegador, 7 pasos cortos que oscurecen la pantalla y señalan una zona. Se repite con el botón «?» o la tecla ?.
// Lógica pura (sin Phaser) para probarla con `node --test`; la vista está en tutorial_vista.js.
// Regla (AGENTS.md §3.3): los textos explican qué es cada zona; no dan cifras de ningún sitio.
import { tr } from '../../i18n.js';
import { CLAVES_TUTORIAL, marcaTutorial, posicionBurbuja } from '../comun/tutorial.js';

// La marca de «ya visto» y la posición de la burbuja son comunes a todos los tutoriales (comun/tutorial.js).
export const CLAVE_TUTORIAL = CLAVES_TUTORIAL.expediente;
const marca = marcaTutorial(CLAVE_TUTORIAL);

/** ¿Hay que mostrar el tutorial al abrir el Expediente? (`almacen` inyectable para las pruebas) */
export const debeMostrarTutorial = (almacen) => marca.debeMostrar(almacen);

/** Marca el tutorial como visto (al terminarlo o saltarlo). */
export const marcarTutorialVisto = (almacen) => marca.marcarVisto(almacen);

/** Solo para pruebas: olvida la marca de la sesión. */
export function _reiniciarSesionTutorial() { marca._reiniciarSesion(); }

export { posicionBurbuja };

/**
 * Los pasos, en el idioma actual. `mundo`: nombre del destino («Marte», «Luna»). Cada paso:
 * { zona, titulo, texto } — `zona` es la parte de la pantalla que se resalta (la escena da su rectángulo).
 */
export function pasosTutorial(mundo) {
  return [
    {
      zona: 'similitud',
      titulo: tr('¿Qué tanto se parece?', 'How alike is it?'),
      texto: tr(`Este lugar de la Tierra se parece a ${mundo}: este número dice cuánto (100 % = igual). Confianza = cuántos datos hay, no tu probabilidad de ganar.`,
        `This place on Earth is like ${mundo}: this number says how much (100 % = the same). Confidence = how much data there is, not your odds of winning.`),
    },
    {
      zona: 'tabla',
      titulo: tr('Una cosa medida por fila', 'One measured thing per row'),
      texto: tr(`Tierra a la izquierda, ${mundo} a la derecha. La barra dice qué tan parecido es. Pasa el ratón por una fila para ver su pregunta.`,
        `Earth on the left, ${mundo} on the right. The bar says how alike they are. Hover a row to see its question.`),
    },
    {
      zona: 'limites',
      titulo: tr('Lo que la Tierra NO puede probar', 'What Earth CANNOT test'),
      texto: tr('En rojo: lo que ningún lugar de la Tierra imita, por más parecido que sea. La gravedad real solo la vives en la misión.',
        'In red: what no place on Earth can copy, however alike it is. You only feel the real gravity in the mission.'),
    },
    {
      zona: 'recorrido',
      titulo: tr('El camino que vas a manejar', 'The route you will drive'),
      texto: tr(`Izquierda: la prueba en la Tierra. Derecha: la misión en ${mundo}. Subida, pendiente, suelo y el tramo más difícil.`,
        `Left: the test on Earth. Right: the mission on ${mundo}. Climb, slope, ground and the hardest stretch.`),
    },
    {
      zona: 'datos',
      titulo: tr('¿De dónde sale cada número?', 'Where does each number come from?'),
      texto: tr('I · Datos abre la fuente, la fecha y la unidad de cada dato. Toca una fila para ir directo a la suya.',
        'I · Data opens the source, date and unit of each value. Tap a row to jump straight to it.'),
    },
    {
      zona: 'descubrir',
      titulo: tr('¿Cómo eligió el modelo?', 'How did the model choose?'),
      texto: tr('D · Descubrir: todos los lugares que halló el modelo, en un mapa. M · ¿Por qué aquí?: cómo lo encontró, su forma y si es novedoso.',
        'D · Discover: every place the model found, on a map. M · Why here?: how it was found, its shape and whether it is novel.'),
    },
    {
      zona: 'probar',
      titulo: tr('¡A probar!', "Let's test!"),
      texto: tr('Gasta 1 ticket para probar tu robot en este lugar. Volver a probar un sitio ya pagado es gratis.',
        'Spend 1 ticket to test your robot at this place. Testing a site you already paid for again is free.'),
    },
  ];
}
