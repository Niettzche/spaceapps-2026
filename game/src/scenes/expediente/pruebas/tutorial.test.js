// Pruebas del tutorial rápido del Expediente y del glosario para novatos.
// Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setIdioma } from '../../../i18n.js';
import {
  CLAVE_TUTORIAL, debeMostrarTutorial, marcarTutorialVisto, _reiniciarSesionTutorial, pasosTutorial, posicionBurbuja,
} from '../tutorial_expediente.js';
import { CLAVE_COMO_JUGAR } from '../como_jugar.js';
import { infoVariable, tecnicoConUnidad, leyendaTabla, explicaConfianza, explicaTotal, explicaSimilitud } from '../glosario.js';

setIdioma('es');

function almacen(inicial = {}) {
  const datos = { ...inicial };
  return { getItem: (k) => (k in datos ? datos[k] : null), setItem: (k, v) => { datos[k] = String(v); }, datos };
}

test('tutorial: sale la primera vez, no después; clave propia distinta de «Cómo jugar»', () => {
  _reiniciarSesionTutorial();
  assert.notEqual(CLAVE_TUTORIAL, CLAVE_COMO_JUGAR);
  const a = almacen({ [CLAVE_COMO_JUGAR]: '1' });
  assert.equal(debeMostrarTutorial(a), true);
  assert.equal(marcarTutorialVisto(a), true);
  assert.equal(a.datos[CLAVE_TUTORIAL], '1');
  _reiniciarSesionTutorial();
  assert.equal(debeMostrarTutorial(a), false);
  _reiniciarSesionTutorial();
});

test('tutorial: sin almacenamiento (modo privado) se recuerda durante la sesión y no truena', () => {
  _reiniciarSesionTutorial();
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.equal(debeMostrarTutorial(roto), true);
  assert.equal(marcarTutorialVisto(roto), false);
  assert.equal(debeMostrarTutorial(roto), false);
  _reiniciarSesionTutorial();
  assert.equal(debeMostrarTutorial(null), true);
  _reiniciarSesionTutorial();
});

test('tutorial: 7 pasos (similitud, tabla, límites, recorrido, datos, descubrir, probar) en es y en; cortos y con el destino', () => {
  for (const l of ['es', 'en']) {
    setIdioma(l);
    const mundo = l === 'es' ? 'Marte' : 'Mars';
    const p = pasosTutorial(mundo);
    assert.deepEqual(p.map((x) => x.zona), ['similitud', 'tabla', 'limites', 'recorrido', 'datos', 'descubrir', 'probar']);
    for (const x of p) {
      assert.ok(x.titulo && x.texto);
      assert.ok(x.texto.length <= 170, `${l}: paso «${x.zona}» demasiado largo (${x.texto.length})`);
      // No inventa cifras: los únicos números son «100 %» (definición) y «1 ticket».
      const numeros = x.texto.replace(/100 %/g, '').replace(/1 ticket/g, '').match(/\d/g);
      assert.equal(numeros, null, `${l}: paso «${x.zona}» trae cifras`);
    }
    assert.ok(p[0].texto.includes(mundo) && p[1].texto.includes(mundo) && p[3].texto.includes(mundo));
  }
  setIdioma('es');
});

test('burbuja: debajo de una zona de arriba, encima de una de abajo, siempre dentro de la pantalla', () => {
  const burbuja = { w: 560, h: 180 };
  const arriba = posicionBurbuja({ x: 730, y: 0, w: 220, h: 76 }, burbuja);
  assert.equal(arriba.abajo, true);
  assert.ok(arriba.y >= 76 && arriba.x + 560 <= 952 && arriba.x >= 8);
  const abajo = posicionBurbuja({ x: 660, y: 497, w: 290, h: 36 }, burbuja);
  assert.equal(abajo.abajo, false);
  assert.ok(abajo.y + 180 <= 497 && abajo.y >= 8);
  const centro = posicionBurbuja(null, burbuja);
  assert.equal(centro.abajo, null);
});

test('glosario: nombre llano, pregunta, técnico e íconos para cada variable de los datos', () => {
  const claves = ['forma', 'oscilacion_termica', 'precipitacion', 'ndvi', 'ndvi_p90', 'pendiente', 'diametro', 'profundidad',
    'profundidad_diametro', 'borde', 'borde_levantado'];
  for (const l of ['es', 'en']) {
    setIdioma(l);
    for (const k of claves) {
      const i = infoVariable(k);
      assert.ok(i.llano && i.llano.length <= 18, `${l} ${k}: nombre llano «${i.llano}»`);
      assert.ok(i.pregunta?.endsWith('?'), `${l} ${k}: pregunta`);
      assert.ok(i.tecnico && i.iconos.length && i.glifo, `${l} ${k}`);
      assert.equal(/\d/.test(i.pregunta), false, `${l} ${k}: la pregunta no lleva cifras`);
    }
  }
  setIdioma('es');
  assert.equal(infoVariable('ndvi').llano, 'Plantas');
  assert.equal(infoVariable('ndvi').pregunta, '¿Cuánta vegetación hay?');
  assert.equal(infoVariable('ndvi').tecnico, 'Vegetación (NDVI)');
  assert.equal(infoVariable('oscilacion_termica').pregunta, '¿Cuánto cambia la temperatura en un día?');
  assert.equal(infoVariable('forma', { mina: true }).llano, 'Forma del tajo');
  assert.equal(infoVariable('forma', { mina: true }).tecnico, 'Forma del tajo minero');
  // Clave desconocida: sin pregunta inventada, nombre técnico humanizado.
  assert.deepEqual([infoVariable('otra_cosa').llano, infoVariable('otra_cosa').pregunta], ['Otra cosa', null]);
});

test('glosario: técnico con unidad, leyenda y explicaciones (confianza = cobertura, no probabilidad)', () => {
  setIdioma('es');
  assert.equal(tecnicoConUnidad(infoVariable('precipitacion'), 'mm/día'), 'Precipitación (mm/día)');
  assert.equal(tecnicoConUnidad(infoVariable('ndvi'), '-'), 'Vegetación (NDVI)');
  assert.equal(tecnicoConUnidad(infoVariable('ndvi'), null), 'Vegetación (NDVI)');
  assert.match(leyendaTabla('Marte'), /^100 % = igual a Marte/);
  assert.match(explicaSimilitud('Luna'), /100 % = igual a Luna/);
  assert.match(explicaConfianza(), /No es la probabilidad/);
  assert.match(explicaTotal('Marte'), /No es la probabilidad de éxito/);
  setIdioma('en');
  assert.equal(tecnicoConUnidad(infoVariable('precipitacion'), 'mm/día'), 'Precipitation (mm/day)');
  assert.match(explicaConfianza(), /not the chance/);
  setIdioma('es');
});
