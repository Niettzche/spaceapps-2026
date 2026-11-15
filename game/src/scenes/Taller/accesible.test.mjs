// Pruebas de la accesibilidad del Taller (Taller/accesible.js) y de la lógica del tutorial (Taller/tutorial.js).
// Correr desde la raíz del repo: node game/src/scenes/Taller/accesible.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nivelAgarre, sueloPrincipal, anuncioCambio, estadoDiseno, textoPanel, crearRegionViva, hayVoz, leerEnVoz } from './accesible.js';
import {
  CLAVE_TUTORIAL_TALLER, debeMostrarTutorialTaller, marcarTutorialTallerVisto, pasosTutorialTaller, _reiniciarSesionTutorialTaller,
} from './tutorial.js';
import { RANURAS, DISENO_POR_DEFECTO, comoDiseno, comoMapa, resumen, validar } from './diseno.js';
import { setIdioma } from '../../i18n.js';

const catalogo = JSON.parse(readFileSync(new URL('../../content/parts.json', import.meta.url), 'utf-8'));
const porId = Object.fromEntries(catalogo.map((p) => [p.id, p]));
const ranura = Object.fromEntries(RANURAS.map((r) => [r.id, r]));
let n = 0;
const caso = (nombre, fn) => { fn(); n += 1; console.log(`✓ ${nombre}`); };

caso('nivel del agarre: bien ≥ 0.7, medio ≥ 0.5, bajo < 0.5, null sin dato', () => {
  assert.equal(nivelAgarre(0.9), 'bien');
  assert.equal(nivelAgarre(0.7), 'bien');
  assert.equal(nivelAgarre(0.6), 'medio');
  assert.equal(nivelAgarre(0.4), 'bajo');
  assert.equal(nivelAgarre(null), null);
  assert.equal(nivelAgarre(Number.NaN), null);
});

caso('suelo principal: el de más metros; null sin superficies', () => {
  assert.equal(sueloPrincipal({ nivel: { superficies: [{ desde: 0, hasta: 3000, tipo: 'arena' }] } }), 'arena');
  assert.equal(sueloPrincipal({ nivel: { superficies: [{ desde: 0, hasta: 100, tipo: 'arena' }, { desde: 100, hasta: 400, tipo: 'roca' }] } }), 'roca');
  assert.equal(sueloPrincipal({ nivel: {} }), null);
  assert.equal(sueloPrincipal(null), null);
  const samalayuca = JSON.parse(readFileSync(new URL('../../../../data/sites/samalayuca.json', import.meta.url), 'utf-8'));
  assert.equal(sueloPrincipal(samalayuca), 'arena');
});

caso('anuncio para el lector de pantalla (es): pieza, eje, presupuesto y estado', () => {
  setIdioma('es');
  const t = anuncioCambio({ accion: 'poner', pieza: porId.rueda_ancha, ranura: ranura.rueda_del, costo: 890, presupuesto: 1000, errores: [] });
  assert.equal(t, 'Rueda ancha para arena en el eje delantero. Presupuesto 890 de 1000. Listo para probar.');
  const q = anuncioCambio({ accion: 'quitar', ranura: ranura.bateria, costo: 700, presupuesto: 1000, errores: ['Falta: Batería'], faltan: ['Batería'] });
  assert.equal(q, 'Quitaste la batería. Presupuesto 700 de 1000. Falta: batería.');
  assert.equal(estadoDiseno(['x'], 1120, 1000), 'Excede por 120 créditos.');
});

caso('anuncio (en) y texto para «Leer» con las cifras del resumen', () => {
  setIdioma('en');
  const t = anuncioCambio({ accion: 'ejes', pieza: porId.rueda_ancha, costo: 890, presupuesto: 1000, errores: [] });
  assert.equal(t, 'Wide sand wheel on both axles. Budget 890 of 1000. Ready to test.');
  const d = comoDiseno(comoMapa(DISENO_POR_DEFECTO));
  const res = resumen(d, catalogo, { masaCarga: 10 });
  const leer = textoPanel(res, { presupuesto: 1000, errores: validar(d, catalogo, 1000, { en: true }), masaCarga: 10, suelo: 'arena' });
  assert.ok(leer.startsWith(`Budget: ${res.costo} of 1000 credits`), leer);
  assert.ok(leer.includes('Grip: sand 0.40'), leer);
  assert.ok(leer.includes("This place's ground is sand."), leer);
  assert.ok(leer.endsWith('Ready to test.'), leer);
  setIdioma('es');
});

caso('sin navegador: región viva y voz no fallan', () => {
  const r = crearRegionViva();
  r.decir('hola');
  r.destruir();
  assert.equal(hayVoz(), false);
  assert.equal(leerEnVoz('hola'), false);
});

caso('tutorial: se muestra hasta marcarlo; sin almacenamiento se recuerda en la sesión', () => {
  _reiniciarSesionTutorialTaller();
  const mem = new Map();
  const almacen = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(debeMostrarTutorialTaller(almacen), true);
  assert.equal(marcarTutorialTallerVisto(almacen), true);
  assert.equal(mem.get(CLAVE_TUTORIAL_TALLER), '1');
  _reiniciarSesionTutorialTaller();
  assert.equal(debeMostrarTutorialTaller(almacen), false);
  _reiniciarSesionTutorialTaller();
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.equal(debeMostrarTutorialTaller(roto), true);
  assert.equal(marcarTutorialTallerVisto(roto), false);
  assert.equal(debeMostrarTutorialTaller(roto), false); // visto en la sesión
  _reiniciarSesionTutorialTaller();
});

caso('tutorial: 4 pasos (rueda que espera, presupuesto, agarre con el suelo, probar)', () => {
  setIdioma('es');
  const p = pasosTutorialTaller('arena');
  assert.deepEqual(p.map((x) => x.zona), ['armar', 'presupuesto', 'agarre', 'probar']);
  assert.equal(p[0].espera, 'rueda');
  assert.ok(p.slice(1).every((x) => !x.espera));
  assert.ok(p[2].texto.includes('arena'));
  for (const x of p) assert.ok(x.titulo.split(' ').length <= 6, x.titulo); // keywords (DISENO.md §2.3)
  assert.ok(!p.some((x) => x.titulo.includes('Probar el robot'))); // no choca con el botón que busca la e2e
  setIdioma('en');
  assert.ok(pasosTutorialTaller(null)[2].texto.includes('ground'));
  setIdioma('es');
});

console.log(`${n} casos OK`);
