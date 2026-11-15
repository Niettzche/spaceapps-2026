// Dueño: frente taller. Tutorial del Taller (primera vez, PLAN_REMAKE.md §1.3): 4 pasos sobre el propio Taller con la
// astronauta guía. Lógica pura (sin Phaser); la vista está en Taller/tutorial_vista.js. Se salta con Esc, se repite con «?»
// y se recuerda en el navegador (localStorage con try/catch; sin almacenamiento, al menos durante la sesión).
// Cuando exista el módulo común (game/src/scenes/comun/tutorial.js) basta con cambiar estas dos importaciones.
// Regla (AGENTS.md §3.3): los textos explican qué es cada zona; el único dato es el suelo del sitio (de data/sites).
import { tr } from '../../i18n.js';
import { nombreSuelo } from './accesible.js';

export const CLAVE_TUTORIAL_TALLER = 'marsception.tutorial_taller.visto';

let vistoEnSesion = false;
function almacen() { try { return globalThis.localStorage ?? null; } catch { return null; } }

/** ¿Hay que mostrar el tutorial al abrir el Taller? (`a` inyectable para las pruebas) */
export function debeMostrarTutorialTaller(a = almacen()) {
  if (vistoEnSesion) return false;
  try { return a?.getItem(CLAVE_TUTORIAL_TALLER) !== '1'; } catch { return true; }
}

/** Lo marca como visto (al terminarlo o saltarlo). */
export function marcarTutorialTallerVisto(a = almacen()) {
  vistoEnSesion = true;
  try { a?.setItem(CLAVE_TUTORIAL_TALLER, '1'); return true; } catch { return false; }
}

/** Solo para pruebas. */
export function _reiniciarSesionTutorialTaller() { vistoEnSesion = false; }

/**
 * Los 4 pasos en el idioma actual: { zona, titulo, texto, espera }. `zona` la mide la escena; `espera` = el paso avanza
 * solo cuando el jugador hace la acción (o con Enter / «Siguiente»). `suelo`: suelo principal del sitio ('arena'…) o null.
 */
export function pasosTutorialTaller(suelo = null) {
  const lugar = suelo
    ? tr(`Aquí el suelo es ${nombreSuelo(suelo)}: mira esa barra.`, `Here the ground is ${nombreSuelo(suelo)}: watch that bar.`)
    : tr('Mira la barra del suelo de tu lugar.', "Watch the bar for your place's ground.");
  return [
    {
      zona: 'armar',
      espera: 'rueda',
      titulo: tr('Arrastra una rueda a su eje', 'Drag a wheel onto its axle'),
      texto: tr('Toma una tarjeta de rueda y suéltala en un eje. Con teclado: Enter sigue.',
        'Grab a wheel card and drop it on an axle. Keyboard: Enter continues.'),
    },
    {
      zona: 'presupuesto',
      titulo: tr('Este es tu presupuesto', 'This is your budget'),
      texto: tr('Cada pieza cuesta créditos. Si te pasas, no puedes probar.',
        'Each part costs credits. Go over and you cannot test.'),
    },
    {
      zona: 'agarre',
      titulo: tr('El agarre cambia según el suelo', 'Grip changes with the ground'),
      texto: `${tr('Cada rueda agarra distinto en arena, roca y suelo compacto.', 'Each wheel grips differently on sand, rock and compact ground.')} ${lugar}`,
    },
    {
      zona: 'probar',
      titulo: tr('Prueba el robot', 'Test the robot'),
      texto: tr('Con ✓ Listo, pruébalo en la Tierra. Luego puedes volver a ajustar. ? repite esta guía.',
        'With ✓ Ready, test it on Earth. You can come back and adjust. ? repeats this guide.'),
    },
  ];
}
