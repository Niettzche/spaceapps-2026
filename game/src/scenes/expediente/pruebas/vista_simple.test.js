// Pruebas de la vista simple del Expediente (vista_simple.js): vista guardada, frase, 3 íconos y tutorial corto.
// Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setIdioma } from '../../../i18n.js';
import {
  CLAVE_VISTA, leerVista, guardarVista, _reiniciarVista, fraseSimple, temperaturaCorta, iconosSimples, pasosTutorialSimple,
  CLAVE_TUTORIAL_SIMPLE, debeMostrarTutorialSimple, marcaTutorialSimple } from '../vista_simple.js';
import { CLAVES_TUTORIAL } from '../../comun/tutorial.js';
import { ambienteDeSitio } from '../../../fisica/ambiente.js';
import { NIVELES_DESTACADOS } from '../../../content/niveles_destacados.js';

setIdioma('es');

function almacen(datos = {}) {
  return { datos, getItem: (k) => datos[k] ?? null, setItem: (k, v) => { datos[k] = String(v); } };
}
const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };

test('vista: simple por defecto; se recuerda la elegida; sin almacenamiento, la de la sesión', () => {
  _reiniciarVista();
  assert.equal(leerVista(almacen()), 'simple');
  const a = almacen();
  assert.equal(guardarVista('completa', a), true);
  assert.equal(a.datos[CLAVE_VISTA], 'completa');
  assert.equal(leerVista(a), 'completa');
  assert.equal(leerVista(almacen({ [CLAVE_VISTA]: 'otra' })), 'completa', 'valor raro → la de la sesión');
  assert.equal(guardarVista('rara', a), false);
  _reiniciarVista();
  assert.equal(guardarVista('completa', roto), false);
  assert.equal(leerVista(roto), 'completa');
  _reiniciarVista();
  assert.equal(leerVista(roto), 'simple');
});

test('frase: «Qué entrena» corto de los niveles destacados; si no, proceso → uso; null si no hay nada', () => {
  assert.deepEqual(fraseSimple({ id: 'samalayuca' }, NIVELES_DESTACADOS.samalayuca), { texto: 'Dunas de arena suelta', entrena: true });
  assert.deepEqual(fraseSimple({ id: 'x', proceso: 'Dunas (eólicas)', uso_exploracion: 'Movilidad' }, undefined), { texto: 'Dunas → Movilidad', entrena: false });
  assert.equal(fraseSimple({ id: 'x' }, undefined), null);
  setIdioma('en');
  assert.equal(fraseSimple({ id: 'samalayuca' }, NIVELES_DESTACADOS.samalayuca).texto, 'Loose-sand dunes without sinking');
  setIdioma('es');
});

test('íconos: suelo · pendiente · temperatura del sitio; sin clima propio no se inventa la temperatura', () => {
  const rec = { suelo: 'arena + roca', pendiente: '12°', subida: '30 m' };
  const amb = ambienteDeSitio('samalayuca');
  const i = iconosSimples(rec, amb);
  assert.deepEqual(i.map((x) => x.clave), ['suelo', 'pendiente', 'temperatura']);
  assert.equal(i[0].valor, 'arena');
  assert.equal(i[2].valor, temperaturaCorta(amb));
  assert.match(i[2].valor, /^−?\d+…−?\d+ °C$/);
  // Sitio sin clima (referencia genérica de la Tierra): la temperatura no sale; entra la subida.
  const sinClima = iconosSimples(rec, ambienteDeSitio('no_existe'));
  assert.deepEqual(sinClima.map((x) => x.clave), ['suelo', 'pendiente', 'subida']);
  assert.equal(temperaturaCorta(ambienteDeSitio('no_existe')), null);
  assert.deepEqual(iconosSimples(null, null), []);
  assert.equal(temperaturaCorta({ temperatura_min_C: -5, temperatura_max_C: 40 }), '−5…40 °C');
});

test('tutorial simple: 4 pasos (parecido · entrena · probar · detalles), su propia marca de «ya visto»', () => {
  const p = pasosTutorialSimple('Marte');
  assert.deepEqual(p.map((x) => x.zona), ['parecido', 'entrena', 'probar', 'detalles']);
  assert.match(p[0].texto, /Marte/);
  assert.match(p[3].texto, /Ver detalles/);
  assert.equal(CLAVE_TUTORIAL_SIMPLE, CLAVES_TUTORIAL.expediente_simple);
  assert.notEqual(CLAVE_TUTORIAL_SIMPLE, CLAVES_TUTORIAL.expediente);
  const a = almacen();
  marcaTutorialSimple()._reiniciarSesion();
  assert.equal(debeMostrarTutorialSimple(a), true);
  marcaTutorialSimple().marcarVisto(a);
  assert.equal(a.datos[CLAVE_TUTORIAL_SIMPLE], '1');
  assert.equal(debeMostrarTutorialSimple(a), false);
  marcaTutorialSimple()._reiniciarSesion();
  setIdioma('en');
  assert.match(pasosTutorialSimple('Mars')[3].texto, /See details/);
  setIdioma('es');
});
