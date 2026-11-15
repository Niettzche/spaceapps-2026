// Tutorial guiado de la primera partida (docs/juego/PLAN_REMAKE.md §1): lógica común, sin Phaser, para probarla con
// `node --test` (pruebas en comun/tutorial.test.mjs). La vista está en comun/tutorial_vista.js.
// - Marca de «ya visto» por tutorial, en localStorage con try/catch; si el navegador no deja guardar (modo privado), se
//   recuerda al menos durante la sesión.
// - Pasos de cada tutorial (resumen al elegir destino, primera prueba, primera misión), bilingües con tr().
// - Dónde va la burbuja respecto de la zona resaltada.
// Regla (AGENTS.md §3.3): los textos explican qué hacer; las únicas cifras salen de los datos que pasa la escena
// (gravedad del destino) o son reglas del juego (2 s de entrega).
import { tr } from '../../i18n.js';

/** Claves de localStorage de todos los tutoriales (la e2e las marca como vistas). */
export const CLAVES_TUTORIAL = {
  resumen: 'marsception.tutorial_resumen.visto',
  expediente: 'marsception.tutorial_expediente.visto',
  taller: 'marsception.tutorial_taller.visto',
  prueba: 'marsception.tutorial_prueba.visto',
  mision: 'marsception.tutorial_mision.visto',
};

function almacenDelNavegador() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

const marcas = new Map();

/**
 * Marca de «ya visto» de un tutorial: { clave, debeMostrar(almacen?), marcarVisto(almacen?), olvidar(almacen?),
 * _reiniciarSesion() }. `almacen` es inyectable para las pruebas (por defecto, localStorage). Una sola por clave.
 */
export function marcaTutorial(clave) {
  if (marcas.has(clave)) return marcas.get(clave);
  let vistoEnSesion = false;
  const m = {
    clave,
    debeMostrar(almacen = almacenDelNavegador()) {
      if (vistoEnSesion) return false;
      try { return almacen?.getItem(clave) !== '1'; } catch { return true; }
    },
    marcarVisto(almacen = almacenDelNavegador()) {
      vistoEnSesion = true;
      try { almacen?.setItem(clave, '1'); return true; } catch { return false; }
    },
    /** Vuelve a mostrarlo la próxima vez (p. ej. «Cómo jugar» → repetir el resumen). */
    olvidar(almacen = almacenDelNavegador()) {
      vistoEnSesion = false;
      try { almacen?.removeItem(clave); return true; } catch { return false; }
    },
    _reiniciarSesion() { vistoEnSesion = false; },
  };
  marcas.set(clave, m);
  return m;
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

/** «Marte» / «la Luna» (es) o «Mars» / «the Moon» (en) para usar dentro de una frase. */
function destinoEnFrase(mundo) {
  if (mundo === 'luna') return tr('la Luna', 'the Moon');
  if (mundo === 'marte') return tr('Marte', 'Mars');
  return tr('la Luna o Marte', 'the Moon or Mars');
}

/**
 * Resumen de 4 viñetas al elegir destino (viñetas de Mauricio: textura 'tutorial/tutorial_N'). ~1 frase cada una.
 * `mundo`: 'luna' | 'marte' | null (desde «Cómo jugar», sin destino elegido).
 */
export function pasosResumen(mundo) {
  const destino = destinoEnFrase(mundo);
  return [
    { imagen: 'tutorial/tutorial_1', texto: tr(`Elige un lugar de la Tierra parecido a ${destino}`, `Pick a place on Earth that is like ${destino}`) },
    { imagen: 'tutorial/tutorial_2', texto: tr('Arma tu robot con tu presupuesto', 'Build your robot on a budget') },
    { imagen: 'tutorial/tutorial_3', texto: tr('Pruébalo en ese lugar de la Tierra', 'Test it at that place on Earth') },
    { imagen: 'tutorial/tutorial_4', texto: tr(`Llévalo a ${destino} y entrega el suministro`, `Take it to ${destino} and deliver the supply`) },
  ];
}

/** Primera prueba terrestre: controles (flechas táctiles y teclas) y la META (al final de la barra de progreso). */
export function pasosPrueba() {
  return [
    {
      zona: 'controles',
      titulo: tr('Así se maneja', 'How to drive'),
      texto: tr('Mantén → (o D) para avanzar y ← (o A) para frenar. En pantalla táctil, usa estos dos botones.',
        'Hold → (or D) to drive and ← (or A) to brake. On a touch screen, use these two buttons.'),
    },
    {
      zona: 'meta',
      titulo: tr('Tu META', 'Your FINISH'),
      texto: tr('Esta barra es tu avance: la META está al final, a la derecha. Llega con la carga entera. ¡Acelera para empezar!',
        'This bar is your progress: the FINISH is at its right end. Get there with the payload in one piece. Accelerate to start!'),
    },
  ];
}

/**
 * Primera misión: «Aquí pesas menos: frena antes» y la ZONA DE ENTREGA. `gravedad` (m/s²) y `gravedadTierra` vienen de
 * los datos del destino (data/targets) y de config/world.js; sin dato, la frase no lleva número.
 */
export function pasosMision({ mundo, gravedad, gravedadTierra = 9.81, segundosEntrega = 2 } = {}) {
  const destino = destinoEnFrase(mundo);
  const pct = typeof gravedad === 'number' && gravedadTierra > 0 ? Math.round((gravedad / gravedadTierra) * 100) : null;
  const cuanto = pct != null ? tr(` (${pct} % de tu peso en la Tierra)`, ` (${pct} % of your weight on Earth)`) : '';
  return [
    {
      zona: 'frenar',
      titulo: tr('Aquí pesas menos: frena antes', 'You weigh less here: brake early'),
      texto: tr(`En ${destino} pesas menos${cuanto}: las ruedas agarran menos y el robot tarda más en frenar.`,
        `On ${destino} you weigh less${cuanto}: the wheels grip less and the robot takes longer to stop.`),
    },
    {
      zona: 'entrega',
      titulo: tr('La ZONA DE ENTREGA', 'The DELIVERY ZONE'),
      texto: tr(`Está al final de esta barra, a la derecha. Al llegar, frena y quédate quieto ${segundosEntrega} s para entregar.`,
        `It is at the right end of this bar. When you get there, brake and stay still for ${segundosEntrega} s to deliver.`),
    },
  ];
}
