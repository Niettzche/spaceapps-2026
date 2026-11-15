// Dueño: frente expediente. Resúmenes cortos (keywords con número) para la vista principal del Expediente.
// Funciones puras (sin Phaser) para probarlas con `node --test`. Regla: solo acortan o calculan a partir de los datos;
// el texto completo (con fuente, unidad y fecha) sigue disponible en el panel de detalle (tecla I). Ver docs/juego/DISENO.md §2–§3.
import { tr, trDato } from '../../i18n.js';
import { estadisticasNivel } from '../../fisica/estadisticas.js';
import { factorLuz, porcentajeAire } from '../../fisica/ambiente.js';
import { etiquetaLimite } from './textos.js';

// Keywords «proceso → uso» de los sitios jugables: paráfrasis corta de `proceso` y `uso_exploracion` de data/sites
// (la frase completa está en el detalle). No agregan afirmaciones nuevas.
const CLAVES_SITIO = {
  samalayuca: ['Dunas eólicas → movilidad en arena suelta', 'Aeolian dunes → loose-sand mobility'],
  pinacate: ['Vulcanismo y cráteres → geología y movilidad', 'Volcanism and craters → field geology, mobility'],
  mx0207: ['Tajo minero → paredes empinadas, excavación, sombra', 'Open-pit mine → steep walls, excavation, shadow'],
  g00281: ['Maar con borde levantado → salir del cráter', 'Maar with a raised rim → climb out of the crater'],
};

/** Primer trozo de una frase (antes de paréntesis, dos puntos o punto y coma). */
function cabeza(txt) {
  return String(txt ?? '').split(/\s*[(:;]/)[0].trim();
}

/** «Dunas eólicas → movilidad en arena suelta». Si el sitio no tiene keywords curadas, acorta proceso y uso. null si no hay nada. */
export function palabrasClave(sitio, max = 64) {
  const c = CLAVES_SITIO[sitio?.id];
  if (c) return tr(c[0], c[1]);
  const p = cabeza(trDato(sitio ?? {}, 'proceso'));
  const u = cabeza(trDato(sitio ?? {}, 'uso_exploracion'));
  const s = [p, u].filter(Boolean).join(' → ');
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// Etiquetas cortas (chips) de lo que la Tierra no puede probar. La versión larga está en el detalle.
const LIMITE_CORTO = {
  presion: ['PRESIÓN', 'PRESSURE'],
  presion_atmosferica: ['PRESIÓN', 'PRESSURE'],
  radiacion: ['RADIACIÓN', 'RADIATION'],
  vacio: ['VACÍO', 'VACUUM'],
  iluminacion_polar_rasante: ['LUZ RASANTE', 'GRAZING LIGHT'],
};

/** g del destino en unidades de la Tierra (3.71 / 9.81 → «0.38 g»); null si falta un dato. */
export function gravedadEnG(gDestino, gTierra) {
  if (typeof gDestino !== 'number' || typeof gTierra !== 'number' || !(gTierra > 0)) return null;
  return `${(gDestino / gTierra).toFixed(2)} g`;
}

/** Chips de límites: [{ clave, texto }]; sin repetir textos (presion y presion_atmosferica son lo mismo). */
export function chipsLimites(noReproducible, gDestino, gTierra) {
  const vistos = new Set();
  return noReproducible.map(({ clave, etiqueta }) => {
    let texto;
    if (clave === 'gravedad') {
      const g = gravedadEnG(gDestino, gTierra);
      texto = `${tr('GRAVEDAD', 'GRAVITY')}${g ? ` ${g}` : ''}`;
    } else {
      const c = LIMITE_CORTO[clave];
      texto = c ? tr(c[0], c[1]) : String(etiqueta || etiquetaLimite(clave)).toUpperCase();
    }
    return { clave, texto };
  }).filter((x) => (vistos.has(x.texto) ? false : vistos.add(x.texto)));
}

const NOMBRE_SUELO = () => ({ arena: tr('arena', 'sand'), roca: tr('roca', 'rock'), compacto: tr('compacto', 'compact') });

/**
 * Recorrido en keywords: { largo, subida, pendiente, suelo, critico, ilustrativo }.
 * Mismas estadísticas que lineasRecorrido (fisica/estadisticas.js), que va completo al detalle.
 */
export function resumenRecorrido(perfil) {
  const e = estadisticasNivel(perfil);
  const nombres = NOMBRE_SUELO();
  const suelos = Object.entries(e.superficies).sort((a, b) => b[1] - a[1]);
  const suelo = suelos.length ? suelos.map(([t]) => nombres[t] ?? t).slice(0, 2).join(' + ') : null;
  const c = e.critica;
  const sueloCrit = nombres[c.superficie] ?? c.superficie;
  const critico = c.pendiente >= 1
    ? tr(`${c.sentido === 'subida' ? 'subida' : 'bajada'} ${c.pendiente.toFixed(0)}° · ${sueloCrit}`,
      `${c.sentido === 'subida' ? 'climb' : 'descent'} ${c.pendiente.toFixed(0)}° · ${sueloCrit}`)
    : tr('casi plano: agarre y energía', 'almost flat: grip and energy');
  return {
    largo: `${Math.round(e.largo_m)} m`,
    subida: `${Math.round(e.subida_m)} m`,
    pendiente: `${e.pendMaxSubida.toFixed(0)}°`,
    suelo,
    critico,
    ilustrativo: !!perfil.ilustrativo,
  };
}

const num = (v) => String(Math.round(v)).replace('-', '−');

/** Condiciones del lugar en 3 chips: temperatura, aire (% de la Tierra) y luz (% de recarga del panel). */
export function chipsAmbiente(amb) {
  if (!amb) return [];
  const { temperatura_min_C: a, temperatura_max_C: b } = amb;
  const temp = a == null && b == null ? tr('temp. sin dato', 'temp. no data')
    : b == null || a === b ? `${num(a ?? b)} °C`
      : tr(`${num(a)} a ${num(b)} °C`, `${num(a)} to ${num(b)} °C`);
  const rho = amb.densidad_aire_kg_m3;
  const aire = rho == null ? tr('aire sin dato', 'air: no data')
    : rho === 0 ? tr('sin aire', 'no air')
      : tr(`aire ${Math.max(1, Math.round(porcentajeAire(amb)))} %`, `air ${Math.max(1, Math.round(porcentajeAire(amb)))} %`);
  const luz = `${tr('luz', 'light')} ${Math.round(factorLuz(amb) * 100)} %`;
  return [temp, aire, luz];
}
