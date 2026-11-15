// Física 2: feedback explicable del hundimiento y del empuje insuficiente. Correr: node --test game/src/feedback/
import test from 'node:test';
import assert from 'node:assert/strict';
import { recomendar, leerHundimiento, textoHundimiento } from './reglas.js';
import { compararAnalogia } from './analogia.js';
import { setIdioma } from '../i18n.js';

setIdioma('es');
const estandar = [{ ranura: 'rueda_del', pieza: 'rueda_estandar' }, { ranura: 'rueda_tras', pieza: 'rueda_estandar' }];
const ev = (tipo, detalle, t = 1) => ({ t, tipo, detalle });

test('lee el peor hundimiento y arma la línea con la presión', () => {
  const h = leerHundimiento([ev('hundimiento', '2 cm · 7.9 kPa · arena · ancha 4.7 kPa'), ev('hundimiento', '4 cm · 7.9 kPa · arena · ancha 4.7 kPa')]);
  assert.deepEqual(h, { cm: 4, kPa: 7.9, superficie: 'arena', kPaAncha: 4.7 });
  assert.equal(textoHundimiento(h), 'Tus ruedas se hundieron 4 cm: presión 7.9 kPa; con ruedas anchas sería 4.7 kPa.');
  assert.equal(leerHundimiento([ev('patinaje', 'arena')]), null);
});

test('la recomendación de ruedas anchas cita el hundimiento', () => {
  const recs = recomendar({ diseno: estandar, eventos: [ev('patinaje', 'arena'), ev('hundimiento', '3 cm · 7.9 kPa · arena · ancha 4.7 kPa')] }, 'atascado');
  assert.equal(recs[0].id, 'rueda_ancha');
  assert.match(recs[0].evidencia, /hundieron 3 cm: presión 7\.9 kPa; con ruedas anchas sería 4\.7 kPa/);
});

test('hundimiento sin patinaje también recomienda ruedas anchas; empuje insuficiente solo informa', () => {
  const recs = recomendar({ diseno: estandar, eventos: [ev('hundimiento', '3 cm · 7.9 kPa · arena · ancha 4.7 kPa'), ev('empuje_insuficiente', 'H 196 N < R 621 N')] }, 'atascado');
  assert.equal(recs[0].id, 'rueda_ancha');
  const emp = recs.find((r) => r.id === 'empuje_suelo');
  assert.ok(emp && !emp.cambio);
  assert.match(emp.evidencia, /H 196 N < R 621 N/);
});

test('sin eventos de física 2 nada cambia', () => {
  const recs = recomendar({ diseno: estandar, eventos: [ev('patinaje', 'arena')] }, 'atascado');
  assert.equal(recs[0].evidencia, 'Tus ruedas patinaron 1 vez en arena.');
});

test('dónde se rompe la analogía: hundimiento en la prueba y en la misión', () => {
  const prueba = { resultado: { distancia_m: 100, energia_restante: 0.5, eventos: [ev('hundimiento', '3 cm · 7.9 kPa · arena · ancha 4.7 kPa')] } };
  const mision = { resultado: { distancia_m: 100, energia_restante: 0.5, eventos: [] } };
  const lineas = compararAnalogia(prueba, mision, { id: 'jezero', mundo: 'marte', gravedad_ms2: 3.71 });
  assert.ok(lineas.some((l) => /Hundimiento: 3 cm \(7\.9 kPa\) en la prueba, menos de 2 cm en la misión/.test(l)));
});
