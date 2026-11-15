// Pruebas de la vista "Condiciones" del Expediente: solo muestra lo que devuelve fisica/ambiente.js, sin inventar.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { columnasCondiciones } from '../condiciones.js';
import { ambienteDeSitio, ambienteDeDestino, lineasAmbiente } from '../../../fisica/ambiente.js';
import { setIdioma } from '../../../i18n.js';

const leer = (carpeta, id) => JSON.parse(readFileSync(new URL(`../../../../../data/${carpeta}/${id}.json`, import.meta.url), 'utf-8'));

afterEach(() => setIdioma('es'));

test('condiciones: las líneas son exactamente las de lineasAmbiente (sitio y destino reales)', () => {
  setIdioma('es');
  const sitio = leer('sites', 'samalayuca');
  const destino = leer('targets', 'jezero');
  const c = columnasCondiciones(sitio, destino);
  assert.deepEqual(c.tierra.lineas, lineasAmbiente(ambienteDeSitio('samalayuca')));
  assert.deepEqual(c.destino.lineas, lineasAmbiente(ambienteDeDestino('jezero', destino.mundo)));
  assert.ok(c.tierra.lineas.length > 0 && c.destino.lineas.length > 0);
  assert.match(c.tierra.titulo, /^TIERRA · /);
  assert.match(c.destino.titulo, /^MARTE · /);
  assert.equal(c.tierra.referencia, false);
});

test('condiciones: Luna en inglés (mx0207 → polo sur lunar), mismas líneas que ambiente.js', () => {
  setIdioma('en');
  const sitio = leer('sites', 'mx0207');
  const destino = leer('targets', 'polo_sur_lunar');
  const c = columnasCondiciones(sitio, destino);
  assert.deepEqual(c.destino.lineas, lineasAmbiente(ambienteDeDestino('polo_sur_lunar', 'luna')));
  assert.match(c.destino.titulo, /^MOON · /);
  assert.ok(c.destino.lineas.some((l) => /grazing/.test(l))); // luz rasante del polo, dicha por ambiente.js
});

test('condiciones: sitio sin clima propio usa la referencia de ambiente.js (y lo marca); sin destino no inventa líneas', () => {
  setIdioma('es');
  const c = columnasCondiciones({ id: 'sitio_sin_clima', nombre: 'X' }, null);
  assert.equal(c.tierra.referencia, true);
  assert.deepEqual(c.tierra.lineas, lineasAmbiente(ambienteDeSitio('sitio_sin_clima')));
  assert.deepEqual(c.destino.lineas, []);
  assert.match(c.destino.titulo, /sin destino/);
});
