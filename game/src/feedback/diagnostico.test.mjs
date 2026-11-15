import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnosticar } from './diagnostico.js';
import { recomendar } from './reglas.js';
import { setIdioma } from '../i18n.js';

test('la batería es la primera recomendación si terminó el intento, aunque hubo patinaje', () => {
  setIdioma('es');
  const resultado = { eventos: [{ tipo: 'patinaje', detalle: 'arena' }], diseno: [] };
  assert.equal(recomendar(resultado, 'energia_agotada')[0].id, 'bateria_grande');
  assert.match(diagnosticar({ motivo: 'energia_agotada', resultado }).detalle, /batería se agotó/);
});

test('un atasco sin telemetría no se atribuye a tracción', () => {
  setIdioma('en');
  const d = diagnosticar({ motivo: 'atascado' });
  assert.match(d.detalle, /not enough events/);
  assert.equal(recomendar({}, 'atascado').length, 0);
});

test('distingue patinaje de falta de fuerza y conserva la evidencia contada', () => {
  setIdioma('en');
  assert.match(diagnosticar({ motivo: 'atascado', resultado: { eventos: [{ tipo: 'patinaje' }, { tipo: 'patinaje' }] } }).detalle, /2 wheel-slip/);
  const d = diagnosticar({ motivo: 'atascado', resultado: { eventos: [{ tipo: 'sin_fuerza' }] } });
  assert.match(d.detalle, /1 insufficient-force/);
  assert.match(d.consejo, /motor force/);
});

test('todos los finales ofrecen un consejo en ambos idiomas, sin recomendar piezas tras abandono', () => {
  for (const idioma of ['es', 'en']) {
    setIdioma(idioma);
    for (const motivo of ['energia_agotada', 'atascado', 'volcado', 'carga_perdida', 'carga_danada', 'chasis_destruido', 'abandono', 'desconocido', 'meta']) {
      const d = diagnosticar({ motivo, exito: motivo === 'meta' });
      assert.ok(d.detalle.length > 10 && d.consejo.length > 10, `${idioma}: ${motivo}`);
    }
  }
  assert.deepEqual(recomendar({}, 'abandono'), []);
  assert.match(recomendar({}, 'carga_danada')[0].evidencia, /below the required integrity/);
});

test('no modifica el registro ni vuelve a sugerir una batería grande ya instalada', () => {
  const resultado = { eventos: [], diseno: [{ ranura: 'bateria', pieza: 'bateria_grande' }] };
  const copia = structuredClone(resultado);
  assert.equal(recomendar(resultado, 'energia_agotada').some((r) => r.id === 'bateria_grande'), false);
  diagnosticar({ motivo: 'energia_agotada', resultado });
  assert.deepEqual(resultado, copia);
});
