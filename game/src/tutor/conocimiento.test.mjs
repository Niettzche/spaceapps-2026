// Pruebas de las respuestas por reglas de ANA con los JSON reales de data/. Correr desde game/:
//   node --test src/tutor/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { setIdioma } from '../i18n.js';
import { preguntasSugeridas, respuestaPorReglas, saludo, sinIA } from './conocimiento.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../../../data/${ruta}`, import.meta.url), 'utf8'));
const jezero = leer('targets/jezero.json');
const luna = leer('targets/polo_sur_lunar.json');
const samalayuca = leer('sites/samalayuca.json');
const sitios = readdirSync(new URL('../../../data/sites/', import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => leer(`sites/${f}`));
const destinos = { jezero, polo_sur_lunar: luna };

test('con sitio: 4 preguntas del sitio; sin sitio: 4 del método', () => {
  setIdioma('es');
  assert.deepEqual(preguntasSugeridas({ sitio: samalayuca, destino: jezero }).map((p) => p.id), ['analogo', 'parecido', 'rompe', 'datos']);
  assert.deepEqual(preguntasSugeridas().map((p) => p.id), ['analogo', 'modelo', 'validacion', 'tierra']);
  assert.match(saludo({ sitio: samalayuca, destino: jezero }), /Samalayuca/);
});

test('Samalayuca: el parecido usa la similitud real y su fuente; la ruptura nombra la gravedad', () => {
  setIdioma('es');
  const ctx = { sitio: samalayuca, destino: jezero };
  const p = respuestaPorReglas('parecido', ctx);
  assert.match(p, /46 % de similitud total con Marte/);
  assert.match(p, /Pendiente media/); // la dimensión más parecida en los datos (0.7141)
  assert.match(p, /Copernicus/);
  assert.match(p, /no es la probabilidad/);
  const r = respuestaPorReglas('rompe', ctx);
  assert.match(r, /gravedad/);
  assert.match(r, /3\.71 m\/s²/);
  assert.match(r, /Oscilación térmica diaria/); // la menos parecida (0.2834)
  assert.match(r, /extremo terrestre/);
  assert.match(respuestaPorReglas('datos', ctx), /NASA POWER/);
});

test('en inglés también responde y no deja frases en español de la plantilla', () => {
  setIdioma('en');
  const p = respuestaPorReglas('parecido', { sitio: samalayuca, destino: jezero });
  assert.match(p, /total similarity with Mars/);
  assert.match(respuestaPorReglas('tierra', { destino: luna }), /1\.62 m\/s² vs\. 9\.81/);
  setIdioma('es');
});

test('todas las preguntas responden texto para cada sitio de data/ con su destino, sin "undefined" ni "NaN"', () => {
  for (const idioma of ['es', 'en']) {
    setIdioma(idioma);
    for (const s of sitios) {
      const d = destinos[s.destino_ref];
      if (!d) continue;
      for (const { id } of preguntasSugeridas({ sitio: s, destino: d })) {
        const t = respuestaPorReglas(id, { sitio: s, destino: d });
        assert.equal(typeof t, 'string', `${s.id} ${id}`);
        assert.ok(t.length > 20, `${s.id} ${id}`);
        assert.doesNotMatch(t, /undefined|NaN|\[object/, `${s.id} ${id}: ${t}`);
      }
    }
    for (const { id } of preguntasSugeridas()) assert.ok(respuestaPorReglas(id, {}));
  }
  setIdioma('es');
});

test('sin sitio, las preguntas del sitio no inventan una respuesta', () => {
  assert.equal(respuestaPorReglas('parecido', {}), null);
  assert.equal(respuestaPorReglas('desconocida', {}), null);
  assert.match(sinIA('limite'), /respiro/);
});

test('Cananea (B3): el parecido empieza por la forma y el gemelo, no por la vegetación; sin cortes ni repeticiones', () => {
  setIdioma('es');
  const cananea = leer('sites/mx0023.json');
  const ctx = { sitio: cananea, destino: luna };
  const p = respuestaPorReglas('parecido', ctx);
  assert.match(p, /Lo que más pesa es la forma \(d\/D 0\.096\)/);
  assert.match(p, /la asigna a la Luna con 87 %/);
  assert.match(p, /gemelo más cercano: un cráter lunar de 0\.84 km y 80 m/);
  assert.doesNotMatch(p, /Vegetaci[oó]n|NDVI/);
  assert.doesNotMatch(p, /…/); // la frase de uso ya no se corta
  assert.equal(p.match(/no geol[oó]gico/g).length, 1);
  // La frase «La analogía se rompe…» del modelo pasa, completa, a «¿Dónde se rompe?».
  assert.match(respuestaPorReglas('rompe', ctx), /La analogía se rompe por ser un hueco artificial escalonado.+no es el problema\./);
});

test('sin forma, el argumento principal no es una variable que vale 0 en el destino', () => {
  setIdioma('es');
  for (const s of sitios) {
    const d = destinos[s.destino_ref];
    if (!d || typeof s.similitud?.por_dimension?.forma === 'number') continue;
    const p = respuestaPorReglas('parecido', { sitio: s, destino: d });
    assert.doesNotMatch(p, /Lo que más se parece: (Vegetación|Precipitación)/, `${s.id}: ${p}`);
  }
});
