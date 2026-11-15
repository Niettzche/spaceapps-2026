// Prueba del historial del taller (Deshacer / Rehacer). Correr desde la raíz del repo: node game/src/scenes/Taller/historial.test.mjs
import assert from 'node:assert/strict';
import { Historial, iguales, diferencias, historialAlEntrar } from './historial.js';
import { RANURAS, DISENO_POR_DEFECTO, comoMapa } from './diseno.js';

const BASE = comoMapa(DISENO_POR_DEFECTO);
const ORDEN = RANURAS.map((r) => r.id);
const con = (cambios) => {
  const m = { ...BASE, ...cambios };
  for (const k of Object.keys(m)) if (m[k] == null) delete m[k];
  return m;
};
let n = 0;
const caso = (nombre, fn) => { fn(); n += 1; console.log(`✓ ${nombre}`); };

caso('iguales ignora vacías y el orden de las claves', () => {
  assert.ok(iguales({ a: 'x', b: 'y' }, { b: 'y', a: 'x', c: null }));
  assert.ok(!iguales({ a: 'x' }, { a: 'z' }));
  assert.ok(!iguales({ a: 'x' }, { a: 'x', b: 'y' }));
  assert.ok(iguales({}, undefined));
});

caso('diferencias da las ranuras cambiadas (en el orden de RANURAS)', () => {
  assert.deepEqual(diferencias(BASE, con({ rueda_tras: 'rueda_ancha', rueda_del: 'rueda_ancha' }), ORDEN), ['rueda_del', 'rueda_tras']);
  assert.deepEqual(diferencias(BASE, con({ motor: null, modulo: 'panel_solar' }), ORDEN), ['motor', 'modulo']);
  assert.deepEqual(diferencias(BASE, BASE, ORDEN), []);
});

caso('historial nuevo: nada que deshacer ni rehacer', () => {
  const h = new Historial(BASE);
  assert.equal(h.puedeDeshacer, false);
  assert.equal(h.puedeRehacer, false);
  assert.equal(h.deshacer(), null);
  assert.equal(h.rehacer(), null);
  assert.deepEqual(h.actual, BASE);
});

caso('equipar, quitar y restablecer se deshacen y rehacen en orden', () => {
  const h = new Historial(BASE);
  const s1 = con({ rueda_del: 'rueda_ancha' });
  const s2 = con({ rueda_del: 'rueda_ancha', motor: null });
  assert.ok(h.registrar(s1, { ranura: 'rueda_del', texto: 'equipar' }));
  assert.ok(h.registrar(s2, { ranura: 'motor', texto: 'quitar' }));
  assert.ok(h.registrar(BASE, { ranura: null, texto: 'restablecer' }));
  let r = h.deshacer();
  assert.deepEqual(r.estado, s2);
  assert.equal(r.cambio.texto, 'restablecer');
  r = h.deshacer();
  assert.deepEqual(r.estado, s1);
  assert.equal(r.cambio.texto, 'quitar');
  r = h.deshacer();
  assert.deepEqual(r.estado, BASE);
  assert.equal(r.cambio.texto, 'equipar');
  assert.equal(h.puedeDeshacer, false);
  assert.equal(h.puedeRehacer, true);
  r = h.rehacer();
  assert.deepEqual(r.estado, s1);
  assert.equal(r.cambio.texto, 'equipar');
  assert.deepEqual(h.rehacer().estado, s2);
  assert.deepEqual(h.rehacer().estado, BASE);
  assert.equal(h.puedeRehacer, false);
});

caso('un cambio igual al actual no se registra (equipar la pieza que ya está)', () => {
  const h = new Historial(BASE);
  assert.equal(h.registrar({ ...BASE }), false);
  assert.equal(h.puedeDeshacer, false);
});

caso('un cambio nuevo después de deshacer borra lo que se podía rehacer', () => {
  const h = new Historial(BASE);
  h.registrar(con({ rueda_del: 'rueda_ancha' }));
  h.deshacer();
  assert.equal(h.puedeRehacer, true);
  h.registrar(con({ motor: 'motor_potente' }));
  assert.equal(h.puedeRehacer, false);
  assert.deepEqual(h.deshacer().estado, BASE);
});

caso('guarda copias: cambiar el mapa afuera no altera el historial', () => {
  const m = { ...BASE };
  const h = new Historial(m);
  m.motor = 'motor_potente';
  assert.deepEqual(h.actual, BASE);
  const s = con({ rueda_del: 'rueda_ancha' });
  h.registrar(s);
  s.rueda_del = 'rueda_tacos';
  assert.equal(h.actual.rueda_del, 'rueda_ancha');
  const r = h.deshacer();
  r.estado.chasis = 'otro';
  assert.equal(h.actual.chasis, BASE.chasis);
});

caso('límite: se descartan los pasos más viejos', () => {
  const h = new Historial({ n: '0' }, { limite: 3 });
  for (let i = 1; i <= 5; i += 1) h.registrar({ n: String(i) });
  let veces = 0;
  while (h.deshacer()) veces += 1;
  assert.equal(veces, 3);
  assert.deepEqual(h.actual, { n: '2' });
});

caso('al entrar desde "Aplicar y al taller": Deshacer revierte la recomendación', () => {
  const clave = [];
  const aplicado = con({ rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' });
  const h = historialAlEntrar({ clave, mapa: BASE }, aplicado, clave,
    (antes, despues) => ({ ranura: diferencias(antes, despues, ORDEN)[0], texto: 'aplicado' }));
  assert.deepEqual(h.actual, aplicado);
  assert.equal(h.puedeDeshacer, true);
  const r = h.deshacer();
  assert.deepEqual(r.estado, BASE);
  assert.deepEqual(r.cambio, { ranura: 'rueda_del', texto: 'aplicado' });
  assert.deepEqual(h.rehacer().estado, aplicado);
});

caso('al entrar con el mismo diseño, otra partida o sin memoria: historial vacío', () => {
  const clave = [];
  assert.equal(historialAlEntrar({ clave, mapa: BASE }, { ...BASE }, clave).puedeDeshacer, false);
  assert.equal(historialAlEntrar({ clave: [], mapa: BASE }, con({ motor: 'motor_potente' }), clave).puedeDeshacer, false);
  assert.equal(historialAlEntrar(null, BASE, clave).puedeDeshacer, false);
  assert.deepEqual(historialAlEntrar(null, BASE, clave).actual, BASE);
});

console.log(`\n${n} casos OK`);
