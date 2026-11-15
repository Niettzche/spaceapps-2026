// Pruebas del planificador del fondo del Menú (ambiente_plan.js). Son ilustración, no ciencia.
// Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as p from '../ambiente_plan.js';

test('el generador con semilla repite la misma secuencia', () => {
  const a = p.crearRng(42);
  const b = p.crearRng(42);
  for (let i = 0; i < 50; i++) assert.equal(a(), b());
  const c = p.crearRng(43);
  assert.notEqual(p.crearRng(42)(), c());
});

test('las esperas caen dentro de las cadencias del diseño', () => {
  const r = p.crearRng(7);
  for (let i = 0; i < 2000; i++) {
    const ast = p.esperaMs(r, 'asteroide') / 1000;
    const com = p.esperaMs(r, 'cometa') / 1000;
    const ev = p.esperaMs(r, 'evento') / 1000;
    const gal = p.esperaMs(r, 'galaxia') / 1000;
    assert.ok(ast >= 4 && ast <= 10, `asteroide ${ast}`);
    assert.ok(com >= 15 && com <= 40, `cometa ${com}`);
    assert.ok(ev >= 90 && ev <= 240, `evento ${ev}`);
    assert.ok(gal >= 120 && gal <= 240, `galaxia ${gal}`);
  }
});

test('nunca aparece Marte como evento; el Sol es el más raro', () => {
  const r = p.crearRng(1);
  const cuenta = {};
  for (let i = 0; i < 20000; i++) {
    const id = p.elegirEvento(r);
    assert.notEqual(id, 'marte');
    cuenta[id] = (cuenta[id] ?? 0) + 1;
  }
  const otros = Object.entries(cuenta).filter(([k]) => k !== 'sol').map(([, v]) => v);
  assert.ok(cuenta.sol < Math.min(...otros), 'el Sol debe ser el menos probable');
  assert.ok(cuenta.sol > 0, 'el Sol debe poder aparecer');
});

test('la galaxia no se repite seguida cuando hay varias activas', () => {
  const r = p.crearRng(3);
  let anterior = null;
  for (let i = 0; i < 500; i++) {
    const id = p.elegirGalaxia(r, anterior);
    assert.notEqual(id, anterior);
    assert.ok(p.GALAXIAS.find((g) => g.id === id).activa);
    anterior = id;
  }
});

test('el destello es plata en su mayoría y los otros colores son de la paleta', () => {
  const r = p.crearRng(9);
  let plata = 0;
  for (let i = 0; i < 10000; i++) {
    const c = p.elegirDestello(r);
    assert.ok(['plata', 'lavanda', 'turquesa', 'ambar'].includes(c));
    if (c === 'plata') plata++;
  }
  assert.ok(plata / 10000 > 0.65 && plata / 10000 < 0.75, `plata ${plata / 10000}`);
});

test('el agujero negro evita la columna de botones y deja margen', () => {
  const r = p.crearRng(5);
  for (let i = 0; i < 500; i++) {
    const q = p.posicionAgujero(r);
    assert.ok(q.x >= 80 && q.x <= 880, `x ${q.x}`);
    assert.ok(q.y >= 120 && q.y <= 460, `y ${q.y}`);
    const enZona = q.x > 320 && q.x < 640 && q.y > 110 && q.y < 560;
    assert.ok(!enZona, `dentro de la zona de botones ${q.x},${q.y}`);
  }
});

test('regla del agujero negro: solo cuenta cuando hay más resultados que al salir', () => {
  assert.equal(p.evaluarRegreso(null, 0), false, 'primera visita: solo línea base');
  assert.equal(p.evaluarRegreso(null, 3), false, 'primera visita con resultados: solo línea base');
  assert.equal(p.evaluarRegreso(2, 2), false, 'Continuar sin resultados nuevos');
  assert.equal(p.evaluarRegreso(2, 0), false, 'Nueva partida (vacía) no cuenta');
  assert.equal(p.evaluarRegreso(2, 3), true, 'volvió de un nivel con resultado nuevo');
});

test('asteroides: 6 a 10 variantes, cada una con al menos 5 puntos dentro del círculo', () => {
  const vs = p.variantesAsteroide(p.crearRng(11));
  assert.ok(vs.length >= 6 && vs.length <= 10);
  for (const poligono of vs) {
    assert.ok(poligono.length >= 5);
    for (const [x, y] of poligono) assert.ok(Math.hypot(x, y) <= 1.0001);
  }
});
