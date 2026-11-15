// Pruebas de los resúmenes cortos de la vista principal del Expediente (keywords, chips y recorrido).
// Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setIdioma } from '../../../i18n.js';
import { palabrasClave, chipsLimites, gravedadEnG, resumenRecorrido, chipsAmbiente } from '../resumen.js';
import { estadisticasNivel } from '../../../fisica/estadisticas.js';
import { ambienteDeSitio, ambienteDeDestino } from '../../../fisica/ambiente.js';

setIdioma('es');

test('keywords: curadas para los sitios jugables; si no, acorta proceso y uso sin inventar', () => {
  assert.equal(palabrasClave({ id: 'samalayuca' }), 'Dunas eólicas → movilidad en arena suelta');
  assert.equal(palabrasClave({ id: 'x', proceso: 'Dunas de yeso (eólicas)', uso_exploracion: 'Movilidad: arena' }), 'Dunas de yeso → Movilidad');
  assert.equal(palabrasClave({ id: 'x' }), null);
  setIdioma('en');
  assert.equal(palabrasClave({ id: 'samalayuca' }), 'Aeolian dunes → loose-sand mobility');
  setIdioma('es');
});

test('límites: gravedad en g calculada del destino; presión no se repite', () => {
  assert.equal(gravedadEnG(3.71, 9.81), '0.38 g');
  assert.equal(gravedadEnG(null, 9.81), null);
  const chips = chipsLimites([
    { clave: 'gravedad', etiqueta: 'Gravedad' }, { clave: 'presion', etiqueta: 'Presión atmosférica' },
    { clave: 'presion_atmosferica', etiqueta: 'Presión atmosférica' }, { clave: 'otra_cosa', etiqueta: 'Otra cosa' }], 1.62, 9.81);
  assert.deepEqual(chips.map((c) => c.texto), ['GRAVEDAD 0.17 g', 'PRESIÓN', 'OTRA COSA']);
  assert.equal(chipsLimites([{ clave: 'gravedad', etiqueta: 'Gravedad' }], undefined, 9.81)[0].texto, 'GRAVEDAD');
});

test('recorrido: mismos números que estadisticasNivel', () => {
  const perfil = { x_m: [0, 10, 20, 30], y_m: [0, 5, 5, 0], largo_m: 30, superficies: [{ desde: 0, hasta: 20, tipo: 'arena' }, { desde: 20, hasta: 30, tipo: 'roca' }] };
  const e = estadisticasNivel(perfil);
  const r = resumenRecorrido(perfil);
  assert.equal(r.subida, `${Math.round(e.subida_m)} m`);
  assert.equal(r.pendiente, `${e.pendMaxSubida.toFixed(0)}°`);
  assert.equal(r.suelo, 'arena + roca');
  assert.match(r.critico, /^subida \d+° · arena$/);
});

test('condiciones: 3 chips con los números de fisica/ambiente.js', () => {
  assert.deepEqual(chipsAmbiente(ambienteDeSitio('samalayuca')), ['0 a 36 °C', 'aire 86 %', 'luz 100 %']);
  assert.deepEqual(chipsAmbiente(ambienteDeDestino('polo_sur_lunar', 'luna')), ['−53 °C', 'sin aire', 'luz 20 %']);
  assert.deepEqual(chipsAmbiente(null), []);
});
