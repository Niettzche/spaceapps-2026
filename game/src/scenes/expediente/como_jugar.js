// Dueño: frente expediente. "Cómo jugar": 4 pantallas cortas antes de elegir destino la primera vez que se pulsa
// "Nueva partida" en este navegador. Se pueden volver a ver desde el botón "Cómo jugar" del Menú.
// La marca de "ya se mostró" usa una clave propia, distinta de la partida guardada (guardado.js): "Nueva partida" o
// reiniciar la partida NO la borran.
// Lógica pura (sin Phaser) para poder probarla con `node --test`; la vista está en como_jugar_vista.js.
import { tr, idioma } from '../../i18n.js';

export const CLAVE_COMO_JUGAR = 'marsception.como_jugar.visto';

// Si el navegador no deja guardar (modo privado, almacenamiento bloqueado), se recuerda al menos durante la sesión.
let vistoEnSesion = false;

function almacenDelNavegador() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** ¿Hay que mostrar "Cómo jugar" antes de elegir destino? (`almacen` inyectable para las pruebas) */
export function debeMostrarComoJugar(almacen = almacenDelNavegador()) {
  if (vistoEnSesion) return false;
  try { return almacen?.getItem(CLAVE_COMO_JUGAR) !== '1'; } catch { return true; }
}

/** Marca "Cómo jugar" como visto (al terminarlo o saltarlo). */
export function marcarComoJugarVisto(almacen = almacenDelNavegador()) {
  vistoEnSesion = true;
  try { almacen?.setItem(CLAVE_COMO_JUGAR, '1'); return true; } catch { return false; }
}

/** Solo para pruebas: olvida la marca de la sesión. */
export function _reiniciarSesion() { vistoEnSesion = false; }

const creditos = (n) => new Intl.NumberFormat(idioma() === 'en' ? 'en-US' : 'es-MX').format(n);

/** Las 4 pantallas, en el idioma actual. El presupuesto llega de config/world.js (PRESUPUESTO_INICIAL), no fijo. */
export function pantallasComoJugar(presupuesto) {
  return [
    {
      titulo: tr('1 · Elige un análogo en la Tierra', '1 · Choose an Earth analog'),
      texto: tr('Busca un sitio de la Tierra parecido a tu destino. Su ficha dice qué se puede probar ahí y qué no.',
        'Find a place on Earth that resembles your destination. Its file says what can be tested there and what cannot.'),
    },
    {
      titulo: tr('2 · Arma tu robot', '2 · Build your robot'),
      texto: tr(`Tienes ${creditos(presupuesto)} créditos para elegir ruedas, chasis, motor, batería y soporte de la carga.`,
        `You have ${creditos(presupuesto)} credits to choose wheels, chassis, motor, battery and cargo mount.`),
    },
    {
      titulo: tr('3 · Pruébalo en la Tierra', '3 · Test it on Earth'),
      texto: tr('Maneja en el terreno real del sitio. Si falla, el resultado te dice qué cambiar.',
        'Drive on the real terrain of the site. If it fails, the result tells you what to change.'),
    },
    {
      titulo: tr('4 · Misión a la Luna o a Marte', '4 · Mission to the Moon or Mars'),
      texto: tr('Con su gravedad real, lleva el suministro hasta la zona de entrega.',
        'With its real gravity, deliver the supply to the drop-off zone.'),
    },
  ];
}
