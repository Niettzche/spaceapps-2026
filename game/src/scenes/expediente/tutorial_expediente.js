// Dueño: frente expediente. Tutorial rápido del Expediente (coach marks): la primera vez que se abre el Expediente en
// este navegador, 6 pasos cortos que oscurecen la pantalla y señalan una zona. Se repite con el botón «?» o la tecla ?.
// Lógica pura (sin Phaser) para probarla con `node --test`; la vista está en tutorial_vista.js.
// Regla (AGENTS.md §3.3): los textos explican qué es cada zona; no dan cifras de ningún sitio.
import { tr } from '../../i18n.js';

export const CLAVE_TUTORIAL = 'marsception.tutorial_expediente.visto';

// Si el navegador no deja guardar (modo privado, almacenamiento bloqueado), se recuerda al menos durante la sesión.
let vistoEnSesion = false;

function almacenDelNavegador() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** ¿Hay que mostrar el tutorial al abrir el Expediente? (`almacen` inyectable para las pruebas) */
export function debeMostrarTutorial(almacen = almacenDelNavegador()) {
  if (vistoEnSesion) return false;
  try { return almacen?.getItem(CLAVE_TUTORIAL) !== '1'; } catch { return true; }
}

/** Marca el tutorial como visto (al terminarlo o saltarlo). */
export function marcarTutorialVisto(almacen = almacenDelNavegador()) {
  vistoEnSesion = true;
  try { almacen?.setItem(CLAVE_TUTORIAL, '1'); return true; } catch { return false; }
}

/** Solo para pruebas: olvida la marca de la sesión. */
export function _reiniciarSesionTutorial() { vistoEnSesion = false; }

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
      zona: 'probar',
      titulo: tr('¡A probar!', "Let's test!"),
      texto: tr('Gasta 1 ticket para probar tu robot en este lugar. Volver a probar un sitio ya pagado es gratis.',
        'Spend 1 ticket to test your robot at this place. Testing a site you already paid for again is free.'),
    },
  ];
}

/**
 * Dónde va la burbuja respecto de la zona resaltada: abajo si la zona está en la mitad de arriba, si no arriba.
 * Devuelve { x, y, abajo } (esquina superior izquierda de la burbuja), dentro de la pantalla (`pantalla` = { w, h }).
 */
export function posicionBurbuja(zona, burbuja, pantalla = { w: 960, h: 540 }, { hueco = 28, margen = 8 } = {}) {
  const cx = zona ? zona.x + zona.w / 2 : pantalla.w / 2;
  const x = Math.round(Math.min(Math.max(margen, cx - burbuja.w / 2), pantalla.w - margen - burbuja.w));
  if (!zona) return { x, y: Math.round((pantalla.h - burbuja.h) / 2), abajo: null };
  const abajo = zona.y + zona.h / 2 < pantalla.h / 2;
  let y = abajo ? zona.y + zona.h + hueco : zona.y - hueco - burbuja.h;
  y = Math.round(Math.min(Math.max(margen, y), pantalla.h - margen - burbuja.h));
  return { x, y, abajo };
}
