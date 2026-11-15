// Pruebas de "Cómo jugar": cuándo se muestra y que su marca no se mezcla con la partida guardada.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CLAVE_COMO_JUGAR, debeMostrarComoJugar, marcarComoJugarVisto, pantallasComoJugar, _reiniciarSesion } from '../como_jugar.js';

// Almacén falso con la misma interfaz que localStorage.
function almacenFalso(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k), datos };
}

beforeEach(() => _reiniciarSesion());

test('cómo jugar: se muestra la primera vez y ya no después de verlo o saltarlo', () => {
  const ls = almacenFalso();
  assert.equal(debeMostrarComoJugar(ls), true);
  marcarComoJugarVisto(ls);
  assert.equal(ls.getItem(CLAVE_COMO_JUGAR), '1');
  _reiniciarSesion(); // como si se recargara la página: manda lo guardado
  assert.equal(debeMostrarComoJugar(ls), false);
});

test('cómo jugar: su clave es propia; borrar la partida guardada (nueva partida o reiniciar) no la borra', () => {
  assert.notEqual(CLAVE_COMO_JUGAR, 'mision_cero.partida.v1');
  const ls = almacenFalso({ 'mision_cero.partida.v1': '{"version":1}' });
  marcarComoJugarVisto(ls);
  ls.removeItem('mision_cero.partida.v1'); // lo que hace borrarGuardado() de guardado.js
  _reiniciarSesion();
  assert.equal(debeMostrarComoJugar(ls), false);
});

test('cómo jugar: sin almacenamiento (modo privado) se muestra, y tras verlo no se repite en la sesión', () => {
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.equal(debeMostrarComoJugar(roto), true);
  assert.equal(marcarComoJugarVisto(roto), false);
  assert.equal(debeMostrarComoJugar(roto), false);
  assert.equal(debeMostrarComoJugar(null), false);
});

test('cómo jugar: 4 pantallas y el presupuesto sale del valor que se le pasa (no fijo)', () => {
  const p = pantallasComoJugar(1000);
  assert.equal(p.length, 4);
  assert.match(p[1].texto, /1,000/);
  assert.match(pantallasComoJugar(750)[1].texto, /750/);
});
