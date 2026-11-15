// Explorador: ¿vale la pena esperar a la API del modelo? Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esHostLocal, apiSinPublicar } from '../logica.js';
import { apiDisponible } from '../api.js';

test('esHostLocal: localhost, 127.x, ::1 y file:// cuentan como desarrollo', () => {
  for (const h of ['localhost', '127.0.0.1', '127.1.2.3', '[::1]', '::1', '', 'juego.localhost', '0.0.0.0']) assert.equal(esHostLocal(h), true, h);
  for (const h of ['niettzche.github.io', 'marsception.example.org', '192.168.1.20', 'localhost.evil.com']) assert.equal(esHostLocal(h), false, h);
});

test('apiSinPublicar: solo sin VITE_API_URL y fuera de localhost', () => {
  assert.equal(apiSinPublicar({ configurada: false, host: 'niettzche.github.io' }), true);
  assert.equal(apiSinPublicar({ configurada: false, host: 'localhost' }), false);
  assert.equal(apiSinPublicar({ configurada: true, host: 'niettzche.github.io' }), false);
});

test('apiDisponible: en la demo pública responde al instante, sin red', async () => {
  const fetchOriginal = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = async () => { llamadas += 1; throw new Error('no debería llamarse'); };
  try {
    const t0 = Date.now();
    const r = await apiDisponible({ host: 'niettzche.github.io' });
    assert.deepEqual(r, { ok: false, tipo: 'no_publicada' });
    assert.equal(llamadas, 0);
    assert.ok(Date.now() - t0 < 50);
  } finally { globalThis.fetch = fetchOriginal; }
});

test('apiDisponible: en localhost sondea /health y se rinde a tiempo si no contesta', async () => {
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (url, { signal }) => new Promise((_, rechazar) => signal.addEventListener('abort', () => rechazar(new Error('abortado'))));
  try {
    const t0 = Date.now();
    const r = await apiDisponible({ host: 'localhost', espera: 60 });
    assert.deepEqual(r, { ok: false, tipo: 'espera' });
    assert.ok(Date.now() - t0 < 1000);
    globalThis.fetch = async (url) => ({ ok: /\/health$/.test(url), status: 200 });
    assert.deepEqual(await apiDisponible({ host: 'localhost' }), { ok: true });
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    assert.deepEqual(await apiDisponible({ host: 'localhost' }), { ok: false, tipo: 'red' });
  } finally { globalThis.fetch = fetchOriginal; }
});
