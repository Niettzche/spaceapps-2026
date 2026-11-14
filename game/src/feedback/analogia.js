// "Dónde se rompe la analogía": compara la prueba en la Tierra con la misión en el destino usando la telemetría real
// de las dos corridas. Responde a lo que pide el reto: qué tan buen análogo fue el sitio y qué no pudo probar.
import { GRAVEDAD } from '../config/world.js';
import { datosSuelo } from '../fisica/suelos.js';

const NOMBRE_LIMITE = {
  gravedad: 'gravedad',
  presion_atmosferica: 'presión atmosférica',
  vacio: 'vacío',
  radiacion: 'radiación',
  iluminacion_polar_rasante: 'luz polar rasante',
};

const contar = (r, tipo) => (r?.eventos ?? []).filter((e) => e.tipo === tipo).length;
/** % de batería gastado por cada 100 m recorridos. */
const gastoPor100m = (r) => (r && r.distancia_m > 1 ? ((1 - r.energia_restante) / r.distancia_m) * 100 * 100 : null);

/**
 * @param {object} prueba   registro de la última prueba terrestre { resultado } (puede faltar)
 * @param {object} mision   registro de la misión { resultado }
 * @param {object} destino  target (data/targets): mundo, nombre, gravedad_ms2, no_reproducible_en_tierra
 * @returns {string[]} líneas cortas para la pantalla de resultados
 */
export function compararAnalogia(prueba, mision, destino) {
  const lineas = [];
  const gT = GRAVEDAD.tierra;
  const gD = destino?.gravedad_ms2;
  if (gD) lineas.push(`Gravedad: Tierra ${gT} → destino ${gD} m/s² (${(gD / gT).toFixed(2)} ×). La Tierra no la puede reproducir.`);

  const p = prueba?.resultado;
  const m = mision?.resultado;
  if (p && m) {
    const pa = contar(p, 'patinaje');
    const pm = contar(m, 'patinaje');
    let txt = `Patinaje: ${pa} momentos en la prueba, ${pm} en la misión.`;
    if (pm > pa) txt += ' Con menos peso sobre las ruedas se agarra menos: eso la prueba no lo mostró.';
    else if (pm < pa) txt += ' El suelo del análogo fue más exigente que el del destino.';
    lineas.push(txt);
    const ep = gastoPor100m(p);
    const em = gastoPor100m(m);
    if (ep !== null && em !== null) lineas.push(`Batería por cada 100 m: ${ep.toFixed(0)} % en la prueba, ${em.toFixed(0)} % en la misión.`);
  } else {
    lineas.push('Sin una prueba terrestre previa: no hay con qué comparar la misión.');
  }

  const suelo = datosSuelo(destino?.mundo, 'arena');
  if (suelo) lineas.push(`Suelo del destino: ${suelo.nombre}, fricción interna ${suelo.phi[0]}–${suelo.phi[1]}° (dato medido).`);

  const limites = (destino?.no_reproducible_en_tierra ?? []).filter((l) => l !== 'gravedad').map((l) => NOMBRE_LIMITE[l] ?? l);
  if (limites.length) lineas.push(`Tampoco se pudo probar en la Tierra: ${limites.join(', ')}.`);
  return lineas;
}
