// B2 del playtest de Leo (15 nov): con la energía agotada y sin patinaje dominante, primero la batería; las ruedas con tacos
// solo con eventos en roca que lo justifiquen; el camino dorado (atasco en arena) sigue con ruedas anchas primero.
// Correr: node --test game/src/feedback/
import test from 'node:test';
import assert from 'node:assert/strict';
import { recomendar, patinajeDomina, PATINAJES_CAUSA_ENERGIA } from './reglas.js';
import { setIdioma } from '../i18n.js';

setIdioma('es');
const diseno = (rueda, bateria = 'bateria_chica', extra = {}) => [
  { ranura: 'rueda_del', pieza: rueda }, { ranura: 'rueda_tras', pieza: rueda }, { ranura: 'bateria', pieza: bateria },
  ...Object.entries(extra).map(([ranura, pieza]) => ({ ranura, pieza })),
];
/** k patinajes en `sup`, uno cada `paso` s desde `desde`. */
const patinajes = (k, sup, paso = 3, desde = 1) => Array.from({ length: k }, (_, i) => ({ t: desde + i * paso, tipo: 'patinaje', detalle: sup }));
const agotada = (t) => ({ t, tipo: 'energia_agotada', detalle: 'bateria_chica' });

test('energía agotada con patinajes ocasionales en roca → primero la batería (Rincón de Parangueo, batería chica)', () => {
  // 6 resbalones en roca en ~140 s de recorrido: ~15 s patinando, lejos de la mitad del intento.
  const eventos = [...patinajes(6, 'roca', 20, 10), agotada(140)];
  const recs = recomendar({ eventos, diseno: diseno('rueda_malla'), distancia_m: 536 }, 'energia_agotada');
  assert.equal(patinajeDomina(eventos, 'roca'), false);
  assert.equal(recs[0].id, 'bateria_grande');
  assert.match(recs[0].evidencia, /536 m/);
  assert.ok(!recs.some((r) => r.id === 'auto_rescate'), 'sin patinaje dominante no se sugiere el auto-rescate');
});

test('energía agotada con un par de resbalones en roca → no se sugieren ruedas con tacos', () => {
  const eventos = [...patinajes(2, 'roca', 30, 20), agotada(90)];
  const recs = recomendar({ eventos, diseno: diseno('rueda_estandar') }, 'energia_agotada');
  assert.equal(recs[0].id, 'bateria_grande');
  assert.ok(!recs.some((r) => r.id === 'rueda_tacos'));
});

test('energía agotada patinando casi todo el tiempo en arena → primero ruedas anchas, luego batería', () => {
  // Patina sin parar (un evento cada 2.5 s) durante 60 s: el patinaje es la causa dominante.
  const eventos = [...patinajes(24, 'arena', 2.5, 0), agotada(60)];
  assert.equal(patinajeDomina(eventos, 'arena'), true);
  const ids = recomendar({ eventos, diseno: diseno('rueda_estandar') }, 'energia_agotada').map((r) => r.id);
  assert.deepEqual(ids.slice(0, 2), ['rueda_ancha', 'bateria_grande']);
});

test('energía agotada patinando casi todo el tiempo en roca → primero tacos (evidencia real en roca)', () => {
  const eventos = [...patinajes(20, 'roca', 2.5, 0), agotada(50)];
  const ids = recomendar({ eventos, diseno: diseno('rueda_estandar') }, 'energia_agotada').map((r) => r.id);
  assert.deepEqual(ids.slice(0, 2), ['rueda_tacos', 'bateria_grande']);
});

test('sin tiempos en los eventos, el patinaje domina solo con muchos patinajes', () => {
  const sinT = (k, sup) => Array.from({ length: k }, () => ({ tipo: 'patinaje', detalle: sup }));
  assert.equal(patinajeDomina(sinT(PATINAJES_CAUSA_ENERGIA, 'arena'), 'arena'), true);
  assert.equal(patinajeDomina(sinT(PATINAJES_CAUSA_ENERGIA - 1, 'arena'), 'arena'), false);
  assert.equal(patinajeDomina([...sinT(5, 'arena'), ...sinT(8, 'roca')], 'arena'), false, 'no domina si patinó más en roca');
});

test('camino dorado: atasco en arena con rueda estándar → la PRIMERA es «Cambia a ruedas anchas para arena» (Samalayuca y Al Hutaymah)', () => {
  for (const extra of [[], patinajes(1, 'roca', 1, 8)]) {
    const eventos = [...patinajes(4, 'arena', 2.5, 1), ...extra, { t: 20, tipo: 'fallo', detalle: 'atascado' }];
    const recs = recomendar({ eventos, diseno: diseno('rueda_estandar'), distancia_m: 12.6 }, 'atascado');
    assert.equal(recs[0].id, 'rueda_ancha');
    assert.equal(recs[0].texto, 'Cambia a ruedas anchas para arena.');
  }
});

test('prueba superada con ruedas anchas y dos resbalones en roca (g00263) → sin ruedas con tacos', () => {
  const eventos = [...patinajes(2, 'roca', 4, 100), ...patinajes(1, 'arena', 1, 30)];
  const recs = recomendar({ eventos, diseno: diseno('rueda_ancha'), energia_restante: 0.37, integridad_carga: 0.96 }, 'meta');
  assert.ok(!recs.some((r) => r.id === 'rueda_tacos'), JSON.stringify(recs.map((r) => r.id)));
});

test('atascado justo después de patinar en roca → sí se sugieren tacos', () => {
  const eventos = [...patinajes(3, 'arena', 3, 1), ...patinajes(1, 'roca', 1, 40), { t: 55, tipo: 'fallo', detalle: 'atascado' }];
  const recs = recomendar({ eventos, diseno: diseno('rueda_ancha'), distancia_m: 300 }, 'atascado');
  assert.equal(recs[0].id, 'rueda_tacos');
});

test('misión entregada con 8 % de energía → primero «batería más grande» (la siguiente talla); con la grande, el panel', () => {
  const r1 = recomendar({ eventos: [], diseno: diseno('rueda_ancha'), entrega: true, energia_restante: 0.08, integridad_carga: 1 }, 'entrega');
  assert.equal(r1[0].id, 'bateria_margen');
  assert.deepEqual(r1[0].cambio, { ranuras: ['bateria'], pieza: 'bateria_mediana' });
  assert.match(r1[0].evidencia, /8 %/);
  const r2 = recomendar({ eventos: [], diseno: diseno('rueda_ancha', 'bateria_grande'), entrega: true, energia_restante: 0.08 }, 'entrega');
  assert.deepEqual(r2[0].cambio, { ranuras: ['modulo'], pieza: 'panel_solar' });
  // Con energía de sobra no hay aviso.
  assert.ok(!recomendar({ eventos: [], diseno: diseno('rueda_ancha'), energia_restante: 0.4 }, 'meta').some((r) => r.id === 'bateria_margen'));
});
