import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearMarteGrande } from '../marte_grande.js';
import { ARTE_NAVE, pintarFondoNave } from '../nave_pixeles.js';

const alfa = (d, tam, x, y) => d[(y * tam + x) * 4 + 3];

test('Marte grande: redondo (esquinas transparentes, centro opaco) y gira con la fase', () => {
  const m = crearMarteGrande(64);
  const a = Uint8ClampedArray.from(m.pintar(0));
  assert.equal(alfa(a, 64, 0, 0), 0);
  assert.equal(alfa(a, 64, 32, 32), 255);
  const b = Uint8ClampedArray.from(m.pintar(0.25));
  assert.notDeepEqual(a, b);
  // La vuelta completa cierra sin salto.
  assert.deepEqual(Uint8ClampedArray.from(m.pintar(1)), a);
});

test('Marte grande: repintar un cuadro es barato (tablas precalculadas)', () => {
  const m = crearMarteGrande(160);
  for (let i = 0; i < 20; i++) m.pintar(i / 500); // calentamiento
  const t = performance.now();
  for (let i = 0; i < 60; i++) m.pintar(i / 500);
  const ms = (performance.now() - t) / 60;
  assert.ok(ms < 8, `${ms.toFixed(2)} ms por cuadro`);
});

test('nave: 320 × 180 opaco, escotilla iluminada en su punto y mitad izquierda oscura para los botones', () => {
  const f = pintarFondoNave();
  assert.equal(f.ancho, ARTE_NAVE.ancho);
  assert.equal(f.alto, ARTE_NAVE.alto);
  for (let k = 3; k < f.datos.length; k += 4) assert.equal(f.datos[k], 255);
  const px = (x, y) => { const k = (y * f.ancho + x) * 4; return [f.datos[k], f.datos[k + 1], f.datos[k + 2]]; };
  const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const e = ARTE_NAVE.escotilla;
  assert.ok(lum(px(e.x, e.y)) > 180, 'la escotilla tiene luz');
  // Promedio de la zona de botones (x < 150): cielo oscuro.
  let s = 0, n = 0;
  for (let y = 20; y < 170; y += 3) for (let x = 10; x < 150; x += 3) { s += lum(px(x, y)); n++; }
  assert.ok(s / n < 60, `zona de botones oscura (${(s / n).toFixed(0)})`);
  // Sin la nave (para el sprite menu/nave) la escotilla no se pinta.
  const cielo = pintarFondoNave({ nave: false });
  const k = (e.y * f.ancho + e.x) * 4;
  assert.ok(lum([cielo.datos[k], cielo.datos[k + 1], cielo.datos[k + 2]]) < 120);
});
