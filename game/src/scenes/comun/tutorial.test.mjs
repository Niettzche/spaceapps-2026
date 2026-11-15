// Pruebas de la lógica común del tutorial guiado (comun/tutorial.js).
// Correr desde game/:  node --test src/scenes/comun/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setIdioma } from '../../i18n.js';
import { CLAVES_TUTORIAL, marcaTutorial, posicionBurbuja, pasosResumen, pasosPrueba, pasosMision } from './tutorial.js';
import { CLAVE_TUTORIAL, debeMostrarTutorial, marcarTutorialVisto, _reiniciarSesionTutorial } from '../expediente/tutorial_expediente.js';
import { CLAVE_COMO_JUGAR } from '../expediente/como_jugar.js';

setIdioma('es');

function almacen(inicial = {}) {
  const datos = { ...inicial };
  return {
    getItem: (k) => (k in datos ? datos[k] : null), setItem: (k, v) => { datos[k] = String(v); }, removeItem: (k) => { delete datos[k]; }, datos,
  };
}

test('claves: una por tutorial, todas distintas y distintas de «Cómo jugar»; el Expediente conserva la suya', () => {
  const v = Object.values(CLAVES_TUTORIAL);
  assert.equal(new Set(v).size, v.length);
  assert.ok(!v.includes(CLAVE_COMO_JUGAR));
  assert.equal(CLAVES_TUTORIAL.expediente, 'marsception.tutorial_expediente.visto');
  assert.equal(CLAVE_TUTORIAL, CLAVES_TUTORIAL.expediente);
  for (const k of ['resumen', 'expediente', 'taller', 'prueba', 'mision']) assert.match(CLAVES_TUTORIAL[k], /^marsception\.tutorial_[a-z]+\.visto$/);
});

test('marca: sale la primera vez, se recuerda, se puede olvidar; cada clave aparte', () => {
  const a = almacen();
  const p = marcaTutorial(CLAVES_TUTORIAL.prueba);
  const m = marcaTutorial(CLAVES_TUTORIAL.mision);
  assert.equal(marcaTutorial(CLAVES_TUTORIAL.prueba), p, 'una sola marca por clave');
  p._reiniciarSesion(); m._reiniciarSesion();
  assert.equal(p.debeMostrar(a), true);
  assert.equal(p.marcarVisto(a), true);
  assert.equal(a.datos[CLAVES_TUTORIAL.prueba], '1');
  p._reiniciarSesion();
  assert.equal(p.debeMostrar(a), false);
  assert.equal(m.debeMostrar(a), true, 'la misión no se marca con la prueba');
  assert.equal(p.olvidar(a), true);
  assert.equal(p.debeMostrar(a), true);
  p._reiniciarSesion(); m._reiniciarSesion();
});

test('marca: sin almacenamiento (modo privado) se recuerda durante la sesión y no truena', () => {
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } };
  const r = marcaTutorial(CLAVES_TUTORIAL.resumen);
  r._reiniciarSesion();
  assert.equal(r.debeMostrar(roto), true);
  assert.equal(r.marcarVisto(roto), false);
  assert.equal(r.debeMostrar(roto), false);
  assert.equal(r.olvidar(roto), false);
  r._reiniciarSesion();
  assert.equal(r.debeMostrar(null), true);
  r._reiniciarSesion();
});

test('Expediente: sigue usando su clave a través de la marca común', () => {
  _reiniciarSesionTutorial();
  const a = almacen();
  assert.equal(debeMostrarTutorial(a), true);
  marcarTutorialVisto(a);
  assert.equal(a.datos[CLAVES_TUTORIAL.expediente], '1');
  _reiniciarSesionTutorial();
  assert.equal(debeMostrarTutorial(a), false);
  _reiniciarSesionTutorial();
});

test('resumen: 4 viñetas con su imagen y una frase corta; el destino aparece en la primera y la última', () => {
  for (const l of ['es', 'en']) {
    setIdioma(l);
    for (const [mundo, nombre] of [['marte', l === 'es' ? 'Marte' : 'Mars'], ['luna', l === 'es' ? 'la Luna' : 'the Moon'], [null, l === 'es' ? 'la Luna o Marte' : 'the Moon or Mars']]) {
      const v = pasosResumen(mundo);
      assert.deepEqual(v.map((x) => x.imagen), [1, 2, 3, 4].map((i) => `tutorial/tutorial_${i}`));
      for (const x of v) {
        assert.ok(x.texto.length <= 60, `${l}: «${x.texto}» demasiado larga`);
        assert.equal(/\d/.test(x.texto), false, `${l}: «${x.texto}» trae cifras`);
      }
      assert.ok(v[0].texto.includes(nombre) && v[3].texto.includes(nombre), `${l} ${mundo}`);
    }
  }
  setIdioma('es');
});

test('prueba: 2 pasos (controles, meta) con teclas y flechas táctiles; sin cifras', () => {
  for (const l of ['es', 'en']) {
    setIdioma(l);
    const p = pasosPrueba();
    assert.deepEqual(p.map((x) => x.zona), ['controles', 'meta']);
    assert.match(p[0].texto, /→/);
    assert.match(p[0].texto, /←/);
    assert.match(p[0].texto, /botones|buttons/);
    for (const x of p) {
      assert.ok(x.titulo && x.texto.length <= 140, `${l} ${x.zona}`);
      assert.equal(/\d/.test(x.texto), false);
    }
  }
  setIdioma('es');
});

test('misión: «pesas menos, frena antes» con el % de gravedad de los datos y la zona de entrega con sus 2 s', () => {
  setIdioma('es');
  const p = pasosMision({ mundo: 'marte', gravedad: 3.71, gravedadTierra: 9.81, segundosEntrega: 2 });
  assert.deepEqual(p.map((x) => x.zona), ['frenar', 'entrega']);
  assert.match(p[0].titulo, /frena antes/);
  assert.match(p[0].texto, /En Marte pesas menos \(38 % de tu peso en la Tierra\)/);
  assert.match(p[1].texto, /2 s/);
  assert.match(pasosMision({ mundo: 'luna', gravedad: 1.62 })[0].texto, /En la Luna pesas menos \(17 %/);
  // Sin dato de gravedad, sin número inventado.
  assert.equal(/\d/.test(pasosMision({ mundo: 'luna', gravedad: null })[0].texto), false);
  setIdioma('en');
  assert.match(pasosMision({ mundo: 'marte', gravedad: 3.71 })[0].titulo, /brake early/);
  setIdioma('es');
});

test('burbuja: debajo de una zona de arriba, encima de una de abajo, siempre dentro de la pantalla', () => {
  const burbuja = { w: 560, h: 180 };
  const barra = posicionBurbuja({ x: 760, y: 84, w: 182, h: 20 }, burbuja);
  assert.equal(barra.abajo, true);
  assert.ok(barra.y >= 104 && barra.x + 560 <= 952);
  const flechas = posicionBurbuja({ x: 20, y: 425, w: 920, h: 90 }, burbuja);
  assert.equal(flechas.abajo, false);
  assert.ok(flechas.y + 180 <= 425 && flechas.y >= 8);
});
