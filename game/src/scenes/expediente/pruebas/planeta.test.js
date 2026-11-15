import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tiraPlaneta, pintarPlaneta } from '../planeta_pixeles.js';

const cuadro = (mundo, fase, tam = 48) => {
  const d = new Uint8ClampedArray(tam * tam * 4);
  pintarPlaneta(d, tam, 0, tam, mundo, fase);
  return d;
};

test('la tira tiene N cuadros cuadrados en horizontal (mismo formato que los spritesheets del frente arte)', () => {
  const t = tiraPlaneta('marte', { tam: 16, cuadros: 6 });
  assert.equal(t.ancho, 96);
  assert.equal(t.alto, 16);
  assert.equal(t.datos.length, 96 * 16 * 4);
});

test('el planeta es redondo: esquinas transparentes y centro opaco', () => {
  for (const mundo of ['marte', 'luna']) {
    const d = cuadro(mundo, 0);
    assert.equal(d[3], 0, `${mundo}: esquina`);
    const c = (24 * 48 + 24) * 4;
    assert.equal(d[c + 3], 255, `${mundo}: centro`);
  }
});

test('gira: cuadros distintos con otra fase y la vuelta completa cierra sin salto', () => {
  for (const mundo of ['marte', 'luna']) {
    assert.notDeepEqual(cuadro(mundo, 0), cuadro(mundo, 0.25), mundo);
    assert.deepEqual(cuadro(mundo, 0), cuadro(mundo, 1), mundo);
  }
});

test('Marte es rojizo y la Luna gris', () => {
  const media = (d) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let k = 0; k < d.length; k += 4) if (d[k + 3]) { r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; }
    return [r / n, g / n, b / n];
  };
  const [rm, gm, bm] = media(cuadro('marte', 0));
  assert.ok(rm > gm * 1.3 && rm > bm * 1.3, 'Marte rojo');
  const [rl, gl] = media(cuadro('luna', 0));
  assert.ok(Math.abs(rl - gl) < 12, 'Luna gris');
});
