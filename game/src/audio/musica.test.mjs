// Pruebas sin navegador de audio/musica.js: volumen, ganancia por pista y qué pista toca cada mundo.
// Sin Web Audio todo debe quedar en silencio sin lanzar errores. Correr: node src/audio/musica.test.mjs
import assert from 'node:assert/strict';
import {
  PISTAS, VOLUMEN_POR_DEFECTO, normalizarVolumen, ganancia, pistaDeMundo, tocarMusica, detenerMusica, estado,
  cambiarVolumenMusica, alternarMusica, alCambiarMusica,
} from './musica.js';

// Volumen: pasos de 10, entre 0 y 100; basura → valor por defecto.
assert.equal(normalizarVolumen(55), 60);
assert.equal(normalizarVolumen(-20), 0);
assert.equal(normalizarVolumen(250), 100);
assert.equal(normalizarVolumen('abc'), VOLUMEN_POR_DEFECTO);

// Ganancia: 0 si está quitada, en silencio o con volumen 0; crece con el volumen; las pistas quedan parejas.
const g = (pista, o = {}) => ganancia(pista, { volumen: 60, quitada: false, silencio: false, ...o });
assert.equal(g('menu', { quitada: true }), 0);
assert.equal(g('menu', { silencio: true }), 0);
assert.equal(g('menu', { volumen: 0 }), 0);
assert.equal(g('nada'), 0);
assert.ok(g('menu', { volumen: 100 }) > g('menu', { volumen: 50 }));
for (const p of PISTAS) assert.ok(g(p, { volumen: 100 }) > 0 && g(p, { volumen: 100 }) < 0.5, `${p}: debajo de los efectos`);
assert.ok(g('tierra') > g('luna'), 'la pista de la Tierra (más baja) se sube más que la de la Luna');

// Cada mundo con su pista; lo demás no cambia la música.
assert.equal(pistaDeMundo('tierra'), 'tierra');
assert.equal(pistaDeMundo('luna'), 'luna');
assert.equal(pistaDeMundo('marte'), 'marte');
assert.equal(pistaDeMundo('venus'), null);

// Sin Web Audio: pedir pistas no falla; la misma pista dos veces no reinicia; null no cambia nada.
tocarMusica('menu');
assert.equal(estado().pista, 'menu');
tocarMusica(null);
tocarMusica('desconocida');
assert.equal(estado().pista, 'menu');
tocarMusica('marte');
assert.equal(estado().pista, 'marte');
detenerMusica();
assert.equal(estado().pista, null);

// Volumen y quitar: avisan a los oyentes; subir el volumen con la música quitada la vuelve a poner.
const vistos = [];
const dejar = alCambiarMusica((e) => vistos.push(e));
const v0 = estado().volumen;
assert.equal(cambiarVolumenMusica(-10), Math.max(0, v0 - 10));
assert.equal(alternarMusica(), true);
assert.equal(estado().quitada, true);
cambiarVolumenMusica(10);
assert.equal(estado().quitada, false);
assert.equal(vistos.length, 3);
dejar();
cambiarVolumenMusica(-10);
assert.equal(vistos.length, 3);

console.log('ok musica');
