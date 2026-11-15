// Dueño: frente expediente. Vista SIMPLE del Expediente (pedido de Edmundo, 15 nov): para todo público, se entiende sin
// leer. Postal del sitio junto a la del destino, «Se parece X %», una frase de qué entrena, 3 íconos con una palabra,
// lo que la Tierra no puede probar y el botón de probar. La vista completa (tabla, fuentes, condiciones…) sigue a un
// botón de distancia («Ver detalles (V)»). Lógica pura (sin Phaser) para probarla con `node --test`.
// Regla (AGENTS.md §3.3): los valores salen del recorrido (fisica/perfil.js) y del clima del sitio (fisica/ambiente.js);
// si falta un dato, el ícono se cambia por otro con dato real, nunca se inventa.
import { tr } from '../../i18n.js';
import { CLAVES_TUTORIAL, marcaTutorial } from '../comun/tutorial.js';
import { palabrasClave } from './resumen.js';

/** localStorage: qué vista del Expediente eligió el jugador ('simple' | 'completa'). */
export const CLAVE_VISTA = 'marsception.expediente.vista';
export const VISTAS = ['simple', 'completa'];
let vistaEnSesion = null; // respaldo si el navegador no deja guardar (modo privado)

function almacenDelNavegador() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Vista guardada; por defecto 'simple'. */
export function leerVista(almacen = almacenDelNavegador()) {
  try {
    const v = almacen?.getItem(CLAVE_VISTA);
    if (VISTAS.includes(v)) return v;
  } catch { /* sin almacenamiento: la de la sesión */ }
  return vistaEnSesion ?? 'simple';
}

/** Guarda la vista elegida (true si se pudo guardar en el navegador). */
export function guardarVista(v, almacen = almacenDelNavegador()) {
  if (!VISTAS.includes(v)) return false;
  vistaEnSesion = v;
  try { almacen?.setItem(CLAVE_VISTA, v); return true; } catch { return false; }
}

/** Solo para pruebas. */
export function _reiniciarVista() { vistaEnSesion = null; }

/** La frase de la tarjeta: «Qué entrena» corto del nivel destacado o, si no hay, las keywords proceso → uso. */
export function fraseSimple(sitio, destacado) {
  const e = destacado?.entrena_corto ?? destacado?.entrena;
  if (e) return { texto: tr(e.es, e.en ?? e.es), entrena: true };
  const c = palabrasClave(sitio, 48);
  return c ? { texto: c, entrena: false } : null;
}

const redondo = (v) => String(Math.round(v)).replace('-', '−');

/** Temperatura en pocas letras: «−3…38 °C» o «15 °C»; null si el clima es la referencia genérica de la Tierra. */
export function temperaturaCorta(amb) {
  if (!amb || amb.referencia) return null;
  const a = amb.temperatura_min_C;
  const b = amb.temperatura_max_C;
  if (a == null && b == null) return null;
  if (a == null || b == null || a === b) return `${redondo(a ?? b)} °C`;
  return `${redondo(a)}…${redondo(b)} °C`;
}

/**
 * Los 3 íconos de la tarjeta: [{ clave, iconos, glifo, valor, etiqueta }]. `recorrido` = resumenRecorrido() del sitio
 * (o null), `amb` = ambienteDeSitio(). Orden: suelo · pendiente · temperatura; si falta uno, entra la subida o el viento.
 */
export function iconosSimples(recorrido, amb) {
  const cand = [];
  if (recorrido?.suelo) {
    cand.push({ clave: 'suelo', iconos: ['iconos/ico_suelo'], glifo: 'dato', valor: recorrido.suelo.split(' + ')[0], etiqueta: tr('suelo', 'ground') });
  }
  if (recorrido?.pendiente) {
    cand.push({ clave: 'pendiente', iconos: ['iconos/ico_pendiente'], glifo: 'pendiente', valor: recorrido.pendiente, etiqueta: tr('pendiente', 'slope') });
  }
  const t = temperaturaCorta(amb);
  if (t) cand.push({ clave: 'temperatura', iconos: ['iconos/ico_temperatura'], glifo: 'temperatura', valor: t, etiqueta: tr('temperatura', 'temperature') });
  if (recorrido?.subida) {
    cand.push({ clave: 'subida', iconos: ['iconos/ico_subida'], glifo: 'pendiente', valor: recorrido.subida, etiqueta: tr('subida', 'climb') });
  }
  if (typeof amb?.viento_max_ms === 'number' && !amb.referencia) {
    cand.push({ clave: 'viento', iconos: ['iconos/ico_aire'], glifo: 'dato', valor: `${redondo(amb.viento_max_ms)} m/s`, etiqueta: tr('viento', 'wind') });
  }
  return cand.slice(0, 3);
}

// Tutorial corto de la vista simple (3 pasos + «¿quieres los datos?»). El de 7 pasos sale la primera vez que se abre
// la vista completa (tutorial_expediente.js).
export const CLAVE_TUTORIAL_SIMPLE = CLAVES_TUTORIAL.expediente_simple;
const marca = marcaTutorial(CLAVE_TUTORIAL_SIMPLE);
export const marcaTutorialSimple = () => marca;
export const debeMostrarTutorialSimple = (almacen) => marca.debeMostrar(almacen);

/** Pasos del tutorial de la vista simple. `enFrase`: «Marte», «la Luna» / «Mars», «the Moon». */
export function pasosTutorialSimple(enFrase) {
  return [
    {
      zona: 'parecido',
      titulo: tr('¿Qué tanto se parece?', 'How alike is it?'),
      texto: tr(`Este lugar de la Tierra se parece a ${enFrase}. 100 % sería igual.`,
        `This place on Earth is like ${enFrase}. 100 % would be the same.`),
    },
    {
      zona: 'entrena',
      titulo: tr('¿Qué entrena?', 'What does it train?'),
      texto: tr('Lo que vas a enfrentar aquí, en una frase y 3 íconos: suelo, pendiente y clima o subida.',
        "What you'll face here, in one line and 3 icons: ground, slope, and weather or climb."),
    },
    {
      zona: 'probar',
      titulo: tr('¡A probar!', "Let's test!"),
      texto: tr('Gasta 1 ticket y prueba tu robot aquí. Repetir un sitio ya pagado es gratis.',
        "Spend 1 ticket and test your robot here. Re-testing a site you've paid for is free."),
    },
    {
      zona: 'detalles',
      titulo: tr('¿Quieres los datos?', 'Want the data?'),
      texto: tr('Pulsa «Ver detalles» (V): cada dato con su fuente de la NASA, el clima y por qué el modelo eligió el sitio.',
        'Press «See details» (V): every value with its NASA source, the weather and why the model picked the site.'),
    },
  ];
}
