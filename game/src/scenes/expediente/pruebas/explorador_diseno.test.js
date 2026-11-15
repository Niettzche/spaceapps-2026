// Pruebas del diseño del Explorador y del Boot (docs/juego/DISENO.md): contraste de la paleta y barras de similitud.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETA, contraste } from '../paleta.js';
import { anchoBarra, palabrasClave } from '../medidor.js';

test('paleta: todo color de texto tiene contraste ≥ 4.5:1 sobre el fondo y sobre los paneles (WCAG AA)', () => {
  const textos = ['texto', 'secundario', 'accion', 'bien', 'riesgo', 'dato'];
  for (const fondo of ['fondo', 'panel']) {
    for (const t of textos) {
      const c = contraste(PALETA[t], PALETA[fondo]);
      assert.ok(c >= 4.5, `${t} sobre ${fondo}: ${c.toFixed(2)}:1`);
    }
  }
  // Texto oscuro sobre el botón principal (amarillo)
  assert.ok(contraste(PALETA.fondo, PALETA.accion) >= 4.5);
  // DISENO.md: el secundario nuevo llega a ≥ 6.4:1 en todos los fondos
  assert.ok(contraste(PALETA.secundario, PALETA.panel) >= 6.4);
});

test('barra de similitud: 0–100 %, recortada a los extremos y sin barra si no hay dato', () => {
  assert.equal(anchoBarra(0.46), 46);
  assert.equal(anchoBarra(0), 0);
  assert.equal(anchoBarra(1.2), 100);
  assert.equal(anchoBarra(-0.1), 0);
  assert.equal(anchoBarra(null), null);
  assert.equal(anchoBarra(Number.NaN), null);
});

test('palabras clave: máximo 6 palabras; la frase completa queda para el detalle', () => {
  assert.equal(palabrasClave('Dunas formadas por viento'), 'Dunas formadas por viento');
  assert.equal(palabrasClave('Probable tajo minero a cielo abierto según OpenStreetMap'), 'Probable tajo minero a cielo abierto…');
  assert.equal(palabrasClave(''), '');
});
