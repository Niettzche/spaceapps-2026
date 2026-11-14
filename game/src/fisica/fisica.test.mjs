// Pruebas de las funciones puras del frente juego. Correr: node game/src/fisica/fisica.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolverDiseno, DISENO_POR_DEFECTO, RANURAS, RANURAS_OBLIGATORIAS, RUEDAS_POR_RANURA } from './diseno.js';
import * as taller from '../scenes/Taller/diseno.js';
import { SUPERFICIES, generarPerfil, perfilDesdeElevaciones, perfilDeSitio, perfilDeDestino, ventanaRepresentativa, superficieEn, alturaEn, pendienteMaxima } from './perfil.js';
import { danioCarga, danioChasis } from './danio.js';
import { gastoPorSegundo } from './energia.js';
import { puntuar } from '../feedback/puntuacion.js';
import { recomendar } from '../feedback/reglas.js';

const piezas = JSON.parse(readFileSync(new URL('../content/parts.json', import.meta.url)));
let n = 0;
const caso = (nombre, fn) => { fn(); n++; console.log('✓', nombre); };

caso('diseño por defecto cuesta 730 (ruedas × 2)', () => assert.equal(resolverDiseno(DISENO_POR_DEFECTO, piezas).costo, 730));
caso('ranura vacía se completa y se reporta', () => {
  const r = resolverDiseno([{ ranura: 'chasis', pieza: 'chasis_reforzado' }], piezas);
  assert.equal(r.porRanura.chasis.id, 'chasis_reforzado');
  assert.ok(r.completadas.includes('motor'));
});
caso('fuente única: ranuras, obligatorias, × 2 y diseño por defecto = los del taller', () => {
  assert.deepEqual(Object.keys(RANURAS), taller.RANURAS.map((r) => r.id));
  for (const r of taller.RANURAS) assert.equal(RANURAS[r.id], r.sistema);
  assert.deepEqual(RANURAS_OBLIGATORIAS, taller.RANURAS.filter((r) => r.obligatoria).map((r) => r.id));
  assert.equal(RUEDAS_POR_RANURA, 2);
  assert.equal(DISENO_POR_DEFECTO, taller.DISENO_POR_DEFECTO);
});
caso('costo y masa coinciden con el resumen del taller (masa por defecto 59)', () => {
  assert.equal(resolverDiseno(DISENO_POR_DEFECTO, piezas).masa, 59);
  const d = DISENO_POR_DEFECTO.map((x) => (x.ranura === 'rueda_del' ? { ...x, pieza: 'rueda_ancha' } : x)).concat({ ranura: 'modulo', pieza: 'panel_solar' });
  const r = resolverDiseno(d, piezas);
  const t = taller.resumen(d, piezas);
  assert.equal(r.costo, t.costo);
  assert.equal(r.masa, t.masa);
});
caso('atributos que lee robot.js existen en parts.json', () => {
  const tiene = (sistema, campos) => piezas.filter((p) => p.sistema === sistema).forEach((p) => campos.forEach((c) => assert.equal(typeof p[c], 'number', `${p.id}.${c}`)));
  tiene('movilidad', ['masa', 'radio_m']);
  for (const p of piezas.filter((x) => x.sistema === 'movilidad')) for (const s of SUPERFICIES) assert.equal(typeof p.agarre[s], 'number', `${p.id}.agarre.${s}`);
  tiene('estructura', ['masa', 'resistencia']);
  tiene('potencia', ['masa', 'fuerza', 'consumo']);
  tiene('energia', ['masa', 'capacidad']);
  tiene('carga', ['masa', 'proteccion']);
});
caso('pieza en ranura equivocada es inválida', () => assert.equal(resolverDiseno([{ ranura: 'motor', pieza: 'rueda_ancha' }], piezas).invalidas.length, 1));
caso('perfil generado es determinista', () => assert.deepEqual(generarPerfil({ tipo: 'dunas', semilla: 7 }).y_m, generarPerfil({ tipo: 'dunas', semilla: 7 }).y_m));
caso('dunas: cara empinada > 25° (separa rueda estándar de ancha)', () => assert.ok(pendienteMaxima(generarPerfil({ tipo: 'dunas', semilla: 3 })) > 25));
caso('perfil real: paso, exageración y planos de inicio/fin', () => {
  const p = perfilDesdeElevaciones([100, 110, 105], { paso_m: 10, exageracion: 2, fuente: 'test' });
  assert.equal(p.ilustrativo, false);
  assert.equal(alturaEn(p, 18 + 10), 20);
  assert.equal(superficieEn(p, 1), 'compacto');
});
caso('nivel con formato de niveles.json (superficie_tramos, desde_m)', () => {
  const p = perfilDeSitio({ id: 'x', nivel: { perfil_elevacion_m: [0, 1, 2, 3], paso_m: 30, superficie_tramos: [{ desde_m: 0, hasta_m: 60, tipo: 'roca' }, { desde_m: 60, hasta_m: 90, tipo: 'arena' }] } });
  assert.equal(p.ilustrativo, false);
  assert.equal(superficieEn(p, 18 + 10), 'roca');
  assert.equal(superficieEn(p, 18 + 70), 'arena');
});
caso('transecto largo: ventana real de 250 m sin deformar', () => {
  const elev = Array.from({ length: 101 }, (_, i) => Math.sin(i / 5) * 3);
  const p = perfilDesdeElevaciones(elev, { paso_m: 30 });
  assert.equal(p.ventana.hasta_m - p.ventana.desde_m, 250);
  assert.match(p.nota, /tramo real de 250 m/);
});
caso('caras de duna recreadas solo en arena y declaradas', () => {
  const elev = Array.from({ length: 101 }, () => 0);
  const arena = perfilDesdeElevaciones(elev, { paso_m: 30, superficies: [{ desde: 0, hasta: 3000, tipo: 'arena' }], dunasRecreadas: true });
  const roca = perfilDesdeElevaciones(elev, { paso_m: 30, superficies: [{ desde: 0, hasta: 3000, tipo: 'roca' }], dunasRecreadas: true });
  assert.ok(pendienteMaxima(arena) > 28 && arena.recreacion.length === 1 && /recreadas/.test(arena.nota));
  assert.ok(pendienteMaxima(roca) < 1 && roca.recreacion.length === 0);
});
caso('misión real: ventana con la pendiente media más parecida a la típica del destino', () => {
  // 12 segmentos de 80 m: 2° ×5, 9° ×4, 25° ×3. Objetivo 8.6° → la ventana que empieza en el segmento 5 (media 9°).
  const grados = [2, 2, 2, 2, 2, 9, 9, 9, 9, 25, 25, 25];
  const elev = [0];
  for (const g of grados) elev.push(elev.at(-1) + 80 * Math.tan((g * Math.PI) / 180));
  const v = ventanaRepresentativa(elev, 80, 250, 8.6);
  assert.equal(v.i0, 5);
  assert.ok(Math.abs(v.media - 9) < 1e-9);
  assert.equal(ventanaRepresentativa(elev, 80, 250, undefined), null);
  const p = perfilDeDestino({ id: 'x', mundo: 'luna', variables: { pendiente: { valor: 8.6 } }, nivel: { perfil_elevacion_m: elev, paso_m: 80, fuente: 'test' } });
  assert.equal(p.ilustrativo, false);
  assert.equal(p.ventana.desde_m, 400);
  assert.equal(p.largo_m, 18 + 250 + 30);
  assert.match(p.nota, /desde el m 400\) de un transecto de 960 m, elegido por su pendiente media/);
});
caso('misión ilustrativa: arena, inclinación media = pendiente típica del destino, sin paredes de más de 25°', () => {
  for (const [mundo, g] of [['luna', 8.63], ['marte', 3.56]]) {
    const p = perfilDeDestino({ id: mundo, mundo, variables: { pendiente: { valor: g, fuente: 'test' } } });
    const jugable = p.largo_m - 18 - 30;
    const subidaMedia = (Math.atan2(p.y_m.at(-1) - p.y_m[0], jugable) * 180) / Math.PI;
    assert.ok(p.ilustrativo && Math.abs(subidaMedia - g) < 1, `${mundo}: ${subidaMedia}`);
    assert.ok(pendienteMaxima(p) < 25, `${mundo}: ${pendienteMaxima(p)}`);
    assert.equal(superficieEn(p, 30), 'arena');
    assert.match(p.nota, /pendiente típica medida/);
  }
});
caso('daño: bajo el umbral no daña; protección reduce', () => {
  assert.equal(danioChasis(3), 0);
  assert.ok(danioCarga(4, 0.8) < danioCarga(4, 0.4));
});
caso('energía: detenido no gasta', () => assert.equal(gastoPorSegundo({ consumo: 1 }, 80, 0), 0));
caso('puntuación: máximo 1000, sin entrega 0', () => {
  assert.equal(puntuar({ entrega: true, integridad_carga: 1, energia_restante: 1, costo: 0 }, 1000).total, 1000);
  assert.equal(puntuar({ entrega: false, integridad_carga: 1, energia_restante: 1, costo: 0 }, 1000).total, 0);
});
caso('feedback: patinaje en arena con rueda estándar → rueda ancha', () => {
  const recs = recomendar({ eventos: [{ t: 1, tipo: 'patinaje', detalle: 'arena' }], diseno: DISENO_POR_DEFECTO, integridad_carga: 1 });
  assert.equal(recs[0].id, 'rueda_ancha');
});
caso('feedback: no recomienda lo que ya tiene', () => {
  const d = DISENO_POR_DEFECTO.map((x) => (x.ranura.startsWith('rueda') ? { ...x, pieza: 'rueda_ancha' } : x));
  assert.equal(recomendar({ eventos: [{ t: 1, tipo: 'patinaje', detalle: 'arena' }], diseno: d, integridad_carga: 1 }).length, 0);
});
console.log(`${n} casos OK`);

// Agarre real del suelo (suelos.js)
import { agarreSuelo, rangoAgarreSuelo, sueloProvisional, notaSuelo, AGARRE_PROVISIONAL, USAR_SUELO_TIERRA } from './suelos.js';
caso('suelo: Marte drift tan(18°) ≈ 0.325; roca de Marte con tope 1; sin dato = provisional (P)', () => {
  assert.ok(Math.abs(agarreSuelo('marte', 'arena') - Math.tan((18 * Math.PI) / 180)) < 1e-9);
  assert.equal(agarreSuelo('marte', 'roca'), 1);
  const [a, b] = rangoAgarreSuelo('luna', 'arena');
  assert.ok(a > 0.57 && b < 1.2);
  assert.equal(agarreSuelo('tierra', 'roca'), AGARRE_PROVISIONAL);
  assert.equal(sueloProvisional('tierra', 'compacto'), true);
  assert.equal(sueloProvisional('luna', 'roca'), true);
});
caso('suelo: arena de duna de la Tierra = tan(31°) con fuente (BM-004), o provisional si se desactiva', () => {
  if (USAR_SUELO_TIERRA) {
    assert.ok(Math.abs(agarreSuelo('tierra', 'arena') - Math.tan((31 * Math.PI) / 180)) < 1e-9); // ≈ 0.601
    assert.equal(sueloProvisional('tierra', 'arena'), false);
  } else {
    assert.equal(agarreSuelo('tierra', 'arena'), AGARRE_PROVISIONAL);
  }
  const nota = notaSuelo('tierra', [{ tipo: 'arena' }, { tipo: 'roca' }]);
  assert.ok(nota.includes('roca: agarre provisional (P)'));
  assert.equal(notaSuelo('tierra', []), null);
});
console.log(`${n} casos OK (con suelos)`);

// Dónde se rompe la analogía (feedback/analogia.js)
import { compararAnalogia } from '../feedback/analogia.js';
caso('analogía: gravedad, patinaje y límites del destino', () => {
  const prueba = { resultado: { distancia_m: 250, energia_restante: 0.4, eventos: [{ t: 1, tipo: 'patinaje', detalle: 'arena' }] } };
  const mision = { resultado: { distancia_m: 250, energia_restante: 0.2, eventos: [{ t: 1, tipo: 'patinaje' }, { t: 4, tipo: 'patinaje' }] } };
  const luna = { mundo: 'luna', gravedad_ms2: 1.62, no_reproducible_en_tierra: ['gravedad', 'vacio', 'radiacion'] };
  const l = compararAnalogia(prueba, mision, luna);
  assert.ok(l[0].includes('1.62') && l.some((x) => x.includes('1 momentos en la prueba, 2 en la misión')));
  assert.ok(l.some((x) => x.includes('vacío, radiación')) && l.some((x) => x.includes('regolito')));
  assert.ok(compararAnalogia(null, mision, luna).some((x) => x.includes('Sin una prueba')));
});
console.log(`${n} casos OK (con analogía)`);
