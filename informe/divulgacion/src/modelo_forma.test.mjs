// node --test informe/divulgacion/src/ — el clasificador de la página da lo mismo que model/forma.py.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { puntuarForma, fronteraProfDiam, aVariables } from './modelo_forma.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf-8'));
const nube = leer('../public/datos/nube.json');
const { casos } = leer('../pruebas/casos_modelo.json');

test('P(Luna) y la distancia a la nube coinciden con model/forma.puntuar en 548 cráteres', () => {
  assert.ok(casos.length > 500);
  for (const c of casos) {
    const r = puntuarForma(nube.modelo, c.x);
    assert.ok(Math.abs(r.pLuna - c.P_Luna) < 1e-9, `P_Luna ${r.pLuna} ≠ ${c.P_Luna}`);
    assert.ok(Math.abs(r.dist - c.dist) < 1e-6 * Math.max(1, c.dist), `dist ${r.dist} ≠ ${c.dist}`);
    assert.equal(r.dentro, c.dentro_95);
  }
});

test('los ejemplos de la página dan lo que exportó Python', () => {
  for (const e of nube.ejemplos) {
    const r = puntuarForma(nube.modelo, e.x);
    assert.equal(Math.round(r.pLuna * 1e4) / 1e4, e.P_Luna, e.id);
    assert.equal(r.dentro, e.dentro_95, e.id);
  }
});

test('en la frontera P(Luna) = 50 %, y más hondo es más lunar', () => {
  const m = nube.modelo;
  for (const [ld, b] of [[0, 0], [0.5, -0.02], [-0.1, 0.05]]) {
    const dd = fronteraProfDiam(m, ld, b);
    assert.ok(Math.abs(puntuarForma(m, [ld, dd, b]).pLuna - 0.5) < 1e-12);
    assert.ok(puntuarForma(m, [ld, dd + 0.02, b]).pLuna > 0.5);
  }
  const x = aVariables(2, 100, 10);
  assert.deepEqual(x.map((v) => +v.toFixed(6)), [+Math.log10(2).toFixed(6), 0.05, 0.005]);
});
