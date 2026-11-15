// "Dónde se rompe la analogía": compara la prueba en la Tierra con la misión en el destino usando la telemetría real
// de las dos corridas. Responde a lo que pide el reto: qué tan buen análogo fue el sitio y qué no pudo probar.
import { GRAVEDAD } from '../config/world.js';
import { datosSuelo } from '../fisica/suelos.js';
import { ambienteDeSitio, ambienteDeDestino, porcentajeAire, factorFrio } from '../fisica/ambiente.js';
import { tr, trDato } from '../i18n.js';

// Se evalúa al usarse (el idioma puede cambiar después de cargar el módulo).
const NOMBRE_LIMITE = () => ({
  gravedad: tr('gravedad', 'gravity'),
  presion_atmosferica: tr('presión atmosférica', 'atmospheric pressure'),
  vacio: tr('vacío', 'vacuum'),
  radiacion: tr('radiación', 'radiation'),
  iluminacion_polar_rasante: tr('luz polar rasante', 'grazing polar sunlight'),
});

const veces = (n) => `${n} ${n === 1 ? 'vez' : 'veces'}`;
const vecesEn = (n) => (n === 1 ? 'once' : `${n} times`);
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
  if (gD) {
    lineas.push(tr(`Gravedad: Tierra ${gT} → destino ${gD} m/s² (${(gD / gT).toFixed(2)} ×). La Tierra no la puede reproducir.`,
      `Gravity: Earth ${gT} → destination ${gD} m/s² (${(gD / gT).toFixed(2)} ×). Earth cannot reproduce it.`));
  }

  const p = prueba?.resultado;
  const m = mision?.resultado;
  if (p && m) {
    const pa = contar(p, 'patinaje');
    const pm = contar(m, 'patinaje');
    let txt = tr(`Patinaje: ${pa} momentos en la prueba, ${pm} en la misión.`, `Wheel slip: ${pa} moments in the test, ${pm} in the mission.`);
    if (pm > pa) txt += tr(' Con menos peso sobre las ruedas se agarra menos: eso la prueba no lo mostró.', ' Less weight on the wheels means less grip: the test could not show that.');
    else if (pm < pa) txt += tr(' El suelo del análogo fue más exigente que el del destino.', ' The analog site\'s ground was harder to drive than the destination\'s.');
    lineas.push(txt);
    const ep = gastoPor100m(p);
    const em = gastoPor100m(m);
    if (ep !== null && em !== null) {
      lineas.push(tr(`Batería por cada 100 m: ${ep.toFixed(0)} % en la prueba, ${em.toFixed(0)} % en la misión.`,
        `Battery per 100 m: ${ep.toFixed(0)} % in the test, ${em.toFixed(0)} % in the mission.`));
    }
  } else {
    lineas.push(tr('Sin una prueba terrestre previa: no hay con qué comparar la misión.', 'No previous Earth test: nothing to compare the mission with.'));
  }

  // Ambiente: el motor y la batería (ambiente.js). La Tierra enfría el motor con su aire y no enfría la batería.
  const sc = contar(m, 'sobrecalentamiento');
  const pc = contar(p, 'sobrecalentamiento');
  const ambD = destino ? ambienteDeDestino(destino.id, destino.mundo) : null;
  if (m && (sc > 0 || pc > 0)) {
    const ambT = ambienteDeSitio(p?.sitio);
    const aire = ambD?.densidad_aire_kg_m3 === 0
      ? tr('en el destino no hay aire y solo se enfría por radiación', 'at the destination there is no air and it only cools by radiation')
      : tr(`en el destino el aire es el ${Math.max(1, Math.round(porcentajeAire(ambD)))} % del de la Tierra`,
        `at the destination the air is ${Math.max(1, Math.round(porcentajeAire(ambD)))} % of Earth's`);
    lineas.push(tr(`El motor se calentó ${veces(sc)} en la misión y ${pc ? veces(pc) : 'ninguna'} en la prueba: el aire de la Tierra (${ambT.densidad_aire_kg_m3} kg/m³) lo enfría; ${aire}.`,
      `The motor overheated ${vecesEn(sc)} in the mission and ${pc ? vecesEn(pc) : 'never'} in the test: Earth's air (${ambT.densidad_aire_kg_m3} kg/m³) cools it; ${aire}.`));
  }
  const fD = ambD ? factorFrio(ambD.temperatura_min_C) : 1;
  if (fD < 1) {
    lineas.push(tr(`Frío: en el destino hace ${String(ambD.temperatura_min_C).replace('-', '−')} °C y la batería arrancó al ${Math.round(fD * 100)} %; en la prueba no se notó.`,
      `Cold: the destination reaches ${String(ambD.temperatura_min_C).replace('-', '−')} °C and the battery started at ${Math.round(fD * 100)} %; the test did not show it.`));
  }

  const suelo = datosSuelo(destino?.mundo, 'arena');
  if (suelo) {
    lineas.push(tr(`Suelo del destino: ${suelo.nombre}, fricción interna ${suelo.phi[0]}–${suelo.phi[1]}° (dato medido).`,
      `Destination soil: ${trDato(suelo, 'nombre')}, internal friction angle ${suelo.phi[0]}–${suelo.phi[1]}° (measured value).`));
  }

  const nombres = NOMBRE_LIMITE();
  const limites = (destino?.no_reproducible_en_tierra ?? []).filter((l) => l !== 'gravedad').map((l) => nombres[l] ?? l);
  if (limites.length) lineas.push(tr(`Tampoco se pudo probar en la Tierra: ${limites.join(', ')}.`, `Also impossible to test on Earth: ${limites.join(', ')}.`));
  return lineas;
}
