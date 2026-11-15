// Pruebas de la física 2 (terramecánica Bekker–Wong, funciones puras). Correr: node game/src/fisica/suelo_v2.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SUELOS_V2, sueloV2, lugarDeSitio, hundimientoEstatico, hundimientoConDeslizamiento, largoContacto, areaContacto, presionKPa,
  empujeMaximo, resistenciaCompactacion, estadoRueda, pesoPorRueda, anchoRueda, fichaFisicaV2,
} from './suelo_v2.js';
import { versionFisica, FISICA_POR_DEFECTO } from './version.js';
import { setIdioma } from '../i18n.js';

setIdioma('es');
const piezas = JSON.parse(readFileSync(new URL('../content/parts.json', import.meta.url)));
const pieza = (id) => piezas.find((p) => p.id === id);
let n = 0;
const caso = (nombre, fn) => { fn(); n++; console.log('✓', nombre); };
const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} ≠ ${b} ± ${tol}`);

const ARENA = sueloV2('tierra', 'arena', 'duna');
const W_TIERRA = pesoPorRueda(69, 9.81, 4); // robot del camino dorado ≈ 69 kg, 4 ruedas

caso('versión: ?fisica=2 activa la física 2; sin parámetro, la de por defecto', () => {
  assert.equal(versionFisica('?fisica=2'), 2);
  assert.equal(versionFisica('?fisica=1'), 1);
  assert.equal(versionFisica(''), FISICA_POR_DEFECTO);
  assert.equal(versionFisica('?fisica=9'), FISICA_POR_DEFECTO);
});

caso('arena seca de Wong (S59): φ 28°, c 1.04 kPa, n 1.1, k_c 0.99, k_φ 1528.43', () => {
  assert.equal(ARENA.id, 'arena_eolica');
  assert.deepEqual([ARENA.phi, ARENA.c_kPa, ARENA.bekker.n, ARENA.bekker.kc, ARENA.bekker.kphi], [28, 1.04, 1.1, 0.99, 1528.43]);
});

caso('hundimiento de Bekker (forma cerrada de Wong) coincide con el cálculo a mano', () => {
  // z0 = [3·0.169 / (1.9 · (0.99 + 0.2·1528.43) · √0.9)]^(2/3.2) ≈ 1.26 cm
  const z = hundimientoEstatico({ W: W_TIERRA, b: 0.2, r: 0.45, bekker: ARENA.bekker });
  cerca(z * 100, 1.26, 0.03, 'z (cm)');
});

caso('la rueda ancha se hunde menos y presiona menos que la estándar (mismo peso)', () => {
  const est = estadoRueda({ W: W_TIERRA, b: anchoRueda(pieza('rueda_estandar')), r: pieza('rueda_estandar').radio_m, suelo: ARENA });
  const anc = estadoRueda({ W: W_TIERRA, b: anchoRueda(pieza('rueda_ancha')), r: pieza('rueda_ancha').radio_m, suelo: ARENA });
  assert.ok(anc.z < est.z, `z ancha ${anc.z} < estándar ${est.z}`);
  assert.ok(anc.p_kPa < est.p_kPa, `p ancha ${anc.p_kPa} < estándar ${est.p_kPa}`);
  assert.ok(anc.A > est.A, 'más área de contacto');
  assert.ok(anc.muH > est.muH, 'más empuje por unidad de peso (término A·c)');
  assert.ok(anc.muR < est.muR, 'menos resistencia por compactación');
});

caso('empuje de Mohr–Coulomb: H = A·c + W·tan φ', () => {
  cerca(empujeMaximo({ A: 0, c_kPa: 5, W: 100, phi: 45 }), 100, 1e-9);
  cerca(empujeMaximo({ A: 0.02, c_kPa: 1, W: 100, phi: 45 }), 120, 1e-9);
});

caso('resistencia por compactación: 0 sin hundimiento y crece con z', () => {
  assert.equal(resistenciaCompactacion({ b: 0.2, z: 0, bekker: ARENA.bekker }), 0);
  const r1 = resistenciaCompactacion({ b: 0.2, z: 0.01, bekker: ARENA.bekker });
  const r2 = resistenciaCompactacion({ b: 0.2, z: 0.02, bekker: ARENA.bekker });
  assert.ok(r1 > 0 && r2 > 2 * r1, 'z^(n+1): al doble de hundimiento, más del doble de resistencia');
});

caso('suelo sin Bekker (roca, costra) no se hunde ni opone compactación', () => {
  const roca = sueloV2('marte', 'roca');
  const e = estadoRueda({ W: 60, b: 0.4, r: 0.5, suelo: roca, s: 1 });
  assert.equal(e.z, 0);
  assert.equal(e.Rc, 0);
  cerca(e.muH, Math.tan((roca.phi * Math.PI) / 180), 1e-9);
});

caso('patinar excava: el hundimiento crece con el deslizamiento', () => {
  const z0 = 0.01;
  assert.equal(hundimientoConDeslizamiento(z0, 0), z0);
  assert.ok(hundimientoConDeslizamiento(z0, 0.5) > z0);
  assert.equal(hundimientoConDeslizamiento(z0, 5), hundimientoConDeslizamiento(z0, 1), 's se acota a 1');
});

caso('contacto y presión: l = r·acos(1 − z/r), A = b·l, p = W/A', () => {
  cerca(largoContacto(0.5, 0.01), 0.5 * Math.acos(0.98), 1e-12);
  cerca(areaContacto(0.4, 0.5, 0.01), 0.4 * 0.5 * Math.acos(0.98), 1e-12);
  cerca(presionKPa(100, 0.02), 5, 1e-12);
});

caso('menos gravedad: menos empuje total, pero la cohesión pesa más (H/W sube)', () => {
  const lun = sueloV2('luna', 'arena');
  const tierra = estadoRueda({ W: pesoPorRueda(69, 9.81, 4), b: 0.4, r: 0.5, suelo: lun });
  const luna = estadoRueda({ W: pesoPorRueda(69, 1.62, 4), b: 0.4, r: 0.5, suelo: lun });
  assert.ok(luna.H < tierra.H);
  assert.ok(luna.muH > tierra.muH);
});

caso('suelos por mundo y lugar; los valores sin fuente se declaran (P)', () => {
  assert.equal(sueloV2('luna', 'arena').id, 'regolito_lunar');
  assert.equal(sueloV2('marte', 'arena').id, 'drift_marciano');
  assert.equal(sueloV2('marte', 'compacto').id, 'costra_marciana');
  assert.equal(sueloV2('tierra', 'compacto', 'volcanico').id, 'ceniza_volcanica');
  assert.equal(sueloV2('tierra', 'compacto', 'mina').id, 'suelo_firme');
  for (const [id, s] of Object.entries(SUELOS_V2)) {
    if (!s.fuente) assert.ok(s.p.includes('phi'), `${id}: sin fuente, φ debe ir como (P)`);
    if (!s.bekker) assert.ok(s.p.includes('bekker') || id.startsWith('roca'), `${id}: sin Bekker declarado`);
  }
});

caso('tipo de lugar desde el proceso del sitio', () => {
  assert.equal(lugarDeSitio({ proceso: 'Dunas formadas por viento (procesos eólicos)' }), 'duna');
  assert.equal(lugarDeSitio({ proceso: 'Vulcanismo basáltico y cráteres' }), 'volcanico');
  assert.equal(lugarDeSitio({ proceso: 'Probable tajo minero a cielo abierto' }), 'mina');
  assert.equal(lugarDeSitio(null), 'generico');
});

caso('todas las ruedas tienen ancho_m y radio_m en parts.json', () => {
  for (const p of piezas.filter((x) => x.sistema === 'movilidad')) {
    assert.ok(p.ancho_m > 0 && p.radio_m > 0, p.id);
  }
});

caso('ficha del panel I menciona las ecuaciones y los valores del nivel', () => {
  const f = fichaFisicaV2({ masaKg: 69, g: 9.81, ruedas: 4, pieza: pieza('rueda_estandar'), mundo: 'tierra', tipos: ['arena'], lugar: 'duna' });
  assert.match(f, /Bekker/);
  assert.match(f, /H = A·c \+ W·tanφ/);
  assert.match(f, /BM-004/);
  assert.match(f, /kPa/);
});

console.log(`\n${n} pruebas de física 2 pasaron`);
