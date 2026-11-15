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

/**
 * Las 4 pantallas, en el idioma actual. El presupuesto llega de config/world.js (PRESUPUESTO_INICIAL), no fijo.
 * `claves`: 2–3 keywords (máx. ~6 palabras) que se ven en grande; `texto`: las mismas unidas en una línea; `imagen`: la
 * viñeta de Mauricio (assets/tutorial/tutorial_N.png → textura 'tutorial/tutorial_N').
 */
export function pantallasComoJugar(presupuesto) {
  const p = [
    {
      titulo: tr('1 · Elige un análogo en la Tierra', '1 · Choose an Earth analog'),
      claves: [tr('Sitio parecido a tu destino', 'A place like your destination'),
        tr('Qué se puede probar y qué no', 'What can and cannot be tested'),
        tr('Cada sitio nuevo: 1 ticket', 'Each new site: 1 ticket')],
    },
    {
      titulo: tr('2 · Arma tu robot', '2 · Build your robot'),
      claves: [tr(`${creditos(presupuesto)} créditos`, `${creditos(presupuesto)} credits`),
        tr('Ruedas · chasis · motor · batería', 'Wheels · chassis · motor · battery'),
        tr('Soporte de la carga', 'Cargo mount')],
    },
    {
      titulo: tr('3 · Pruébalo en la Tierra', '3 · Test it on Earth'),
      claves: [tr('Terreno real del sitio', 'Real terrain of the site'),
        tr('¿Falla? El resultado dice qué cambiar', 'Failed? The result says what to change')],
    },
    {
      titulo: tr('4 · Misión a la Luna o a Marte', '4 · Mission to the Moon or Mars'),
      claves: [tr('Gravedad real del destino', 'Real destination gravity'),
        tr('Lleva el suministro a la base', 'Deliver the supply to the base')],
    },
  ];
  return p.map((x, i) => ({ ...x, texto: x.claves.join(' · '), imagen: `tutorial/tutorial_${i + 1}` }));
}
