// Pruebas de las funciones puras del frente juego. Correr: node game/src/fisica/fisica.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolverDiseno, DISENO_POR_DEFECTO } from './diseno.js';
import { generarPerfil, perfilDesdeElevaciones, perfilDeSitio, superficieEn, alturaEn, pendienteMaxima } from './perfil.js';
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
