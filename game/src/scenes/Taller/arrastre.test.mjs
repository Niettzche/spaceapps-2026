// Pruebas del armado por arrastre (Taller/arrastre.js), de las piezas nuevas del libro y de las bloqueadas.
// Correr desde la raíz del repo: node game/src/scenes/Taller/arrastre.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PESTANAS, tarjetasDe, pestanaDeRanura, socketsPara, socketPreferido, poner, quitar, mover, ambosEjes, costoDe, nombreCorto,
  ponerRueda,
} from './arrastre.js';
import { BLOQUEADAS, RAZONES } from './bloqueadas.js';
import { RANURAS, DISENO_POR_DEFECTO, comoMapa, comoDiseno, resumen, validar } from './diseno.js';
import { recomendar } from '../../feedback/reglas.js';
import { setIdioma } from '../../i18n.js';

setIdioma('es');
const catalogo = JSON.parse(readFileSync(new URL('../../content/parts.json', import.meta.url), 'utf-8'));
const porId = Object.fromEntries(catalogo.map((p) => [p.id, p]));
const base = () => comoMapa(DISENO_POR_DEFECTO);
let n = 0;
const caso = (nombre, fn) => { fn(); n += 1; console.log(`✓ ${nombre}`); };

caso('pestañas: toda pieza jugable está en exactamente una pestaña; cada página cabe (6 tarjetas)', () => {
  const vistas = PESTANAS.filter((t) => !t.bloqueadas).flatMap((t) => tarjetasDe(t.id, catalogo).map((p) => p.id));
  assert.deepEqual([...vistas].sort(), catalogo.map((p) => p.id).sort());
  for (const t of PESTANAS.filter((x) => !x.bloqueadas)) assert.ok(tarjetasDe(t.id, catalogo).length <= 6, t.id);
  for (const r of RANURAS) assert.ok(pestanaDeRanura(r.id), r.id);
  assert.equal(pestanaDeRanura('motor'), 'energia');
  assert.equal(pestanaDeRanura('rueda_tras'), 'movilidad');
});

caso('bloqueadas: tipos de robot RT-002…RT-006 y habilidades sin mecánica, con razón; no son jugables', () => {
  const ids = BLOQUEADAS.map((b) => b.excel).join(' ');
  for (const rt of ['RT-002', 'RT-003', 'RT-004', 'RT-005', 'RT-006', 'AB-001', 'AB-003']) assert.ok(ids.includes(rt), rt);
  const tarjetas = tarjetasDe('bloqueadas', catalogo);
  assert.equal(tarjetas.length, BLOQUEADAS.length);
  for (const b of tarjetas) {
    assert.ok(b.bloqueada && RAZONES[b.razon], b.id);
    assert.ok(b.nombre && b.nombre_en && b.detalle && b.detalle_en, b.id);
    assert.deepEqual(socketsPara(b), [], b.id);
    assert.equal(poner(base(), b, 'modulo').motivo, 'bloqueada');
    assert.ok(!porId[b.id], `${b.id} no debe estar en parts.json`);
    assert.ok(nombreCorto(b).length <= 12 && nombreCorto(b, true).length <= 12, b.id);
  }
  for (const r of ['RT-002', 'RT-003']) assert.equal(BLOQUEADAS.find((b) => b.excel.startsWith(r)).razon, 'sin_referencia');
});

caso('sockets válidos: ruedas en los 2 ejes, el resto en su ranura', () => {
  assert.deepEqual(socketsPara(porId.rueda_ancha), ['rueda_del', 'rueda_tras']);
  assert.deepEqual(socketsPara(porId.motor_potente), ['motor']);
  assert.deepEqual(socketsPara(porId.auto_rescate), ['modulo']);
  assert.equal(socketPreferido(porId.rueda_ancha, 'motor', base()), 'rueda_del');
  assert.equal(socketPreferido(porId.rueda_ancha, 'rueda_tras', base()), 'rueda_tras');
  assert.equal(socketPreferido(porId.bateria_grande, 'chasis', base()), 'bateria');
});

caso('poner / quitar / mover no modifican el mapa recibido y el costo sigue en tiempo real', () => {
  const m = base();
  const copia = { ...m };
  assert.equal(costoDe(m, catalogo), 730);
  const r1 = poner(m, porId.rueda_ancha, 'rueda_del');
  assert.ok(r1.ok);
  assert.equal(r1.antes, 'rueda_estandar');
  assert.deepEqual(m, copia);
  assert.equal(costoDe(r1.mapa, catalogo), 810); // +2 × (120 − 80)
  const r2 = poner(r1.mapa, porId.rueda_ancha, 'rueda_tras');
  assert.equal(costoDe(r2.mapa, catalogo), 890);
  assert.equal(poner(r2.mapa, porId.rueda_ancha, 'rueda_tras').motivo, 'igual');
  assert.equal(poner(m, porId.rueda_ancha, 'motor').motivo, 'no_cabe'); // soltar en un socket inválido
  const q = quitar(r2.mapa, 'bateria');
  assert.ok(q.ok && !q.mapa.bateria && q.antes === 'bateria_chica');
  assert.equal(costoDe(q.mapa, catalogo), 800);
  assert.ok(validar(comoDiseno(q.mapa), catalogo, 1000).some((e) => e.includes('Batería')));
  assert.equal(quitar(q.mapa, 'bateria').ok, false);
  const mv = mover(r2.mapa, 'rueda_del', 'rueda_tras', catalogo);
  assert.equal(mv.ok, false); // misma rueda: no cambia
  const mv2 = mover({ ...m, rueda_del: 'rueda_tacos' }, 'rueda_del', 'rueda_tras', catalogo);
  assert.ok(mv2.ok && mv2.mapa.rueda_tras === 'rueda_tacos' && !mv2.mapa.rueda_del);
  assert.equal(mover(m, 'motor', 'bateria', catalogo).ok, false);
});

caso('igual en ambos ejes copia la rueda del eje elegido', () => {
  const m = { ...base(), rueda_del: 'rueda_ancha' };
  const r = ambosEjes(m, 'rueda_del');
  assert.ok(r.ok && r.mapa.rueda_tras === 'rueda_ancha' && r.otro === 'rueda_tras');
  assert.equal(ambosEjes(r.mapa, 'rueda_del').ok, false);
  const r2 = ambosEjes({ ...base(), rueda_tras: 'rueda_malla' }, 'motor'); // sin eje elegido: la delantera
  assert.equal(r2.mapa.rueda_tras, 'rueda_estandar');
});

caso('exceder el presupuesto invalida el diseño (Probar se deshabilita)', () => {
  const m = { ...base(), chasis: 'chasis_titanio', rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' };
  assert.equal(costoDe(m, catalogo), 1040);
  assert.ok(validar(comoDiseno(m), catalogo, 1000).some((e) => e.includes('Excede')));
});

caso('piezas nuevas del libro: fuente o (P), cambian una propiedad explicable y caben con el robot mínimo', () => {
  for (const id of ['chasis_titanio', 'chasis_carbono', 'rueda_nitinol', 'auto_rescate']) {
    const p = porId[id];
    assert.ok(p && p.nombre_en && p.fuente, id);
    assert.match(p.nota, /valor de juego \(P\)/, id);
  }
  const res = (cambios) => resumen(comoDiseno({ ...base(), ...cambios }), catalogo);
  // Titanio: densidad 4430 vs 2700 y límite elástico 828 vs 276 (hoja Materials) → más masa y 3× resistencia.
  assert.equal(porId.chasis_titanio.masa, Math.round(20 * 4430 / 2700));
  assert.equal(porId.chasis_titanio.resistencia, 40 * 828 / 276);
  assert.equal(porId.chasis_carbono.masa, Math.round(20 * 1590 / 2700));
  assert.ok(res({ chasis: 'chasis_carbono' }).masa < res({}).masa);
  // Nitinol: amortigua; auto-rescate: aparece en el resumen.
  assert.equal(res({ rueda_del: 'rueda_nitinol', rueda_tras: 'rueda_nitinol' }).amortiguacion, 0.5);
  assert.equal(res({ rueda_del: 'rueda_nitinol' }).amortiguacion, 0.25);
  assert.equal(res({}).amortiguacion, 0);
  assert.equal(res({ modulo: 'auto_rescate' }).auto_rescate.agarre, 1.5);
  // Presupuesto 1,000 (P): estas combinaciones caben.
  for (const c of [{ rueda_del: 'rueda_nitinol', rueda_tras: 'rueda_nitinol' }, { chasis: 'chasis_carbono', rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' },
    { modulo: 'auto_rescate', rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' }, { chasis: 'chasis_titanio', rueda_del: 'rueda_malla', rueda_tras: 'rueda_malla' }]) {
    assert.deepEqual(validar(comoDiseno({ ...base(), ...c }), catalogo, 1000), [], JSON.stringify(c));
  }
});

caso('feedback: el camino dorado sigue recomendando ruedas anchas primero; auto-rescate solo con ruedas adecuadas', () => {
  const ev = (k, sup = 'arena') => Array.from({ length: k }, (_, i) => ({ t: i * 3, tipo: 'patinaje', detalle: sup }));
  const estandar = DISENO_POR_DEFECTO;
  const r1 = recomendar({ eventos: ev(4), diseno: estandar }, 'atascado');
  assert.equal(r1[0].id, 'rueda_ancha');
  assert.ok(!r1.some((r) => r.id === 'auto_rescate'));
  const anchas = comoDiseno({ ...base(), rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' });
  const r2 = recomendar({ eventos: ev(4), diseno: anchas }, 'atascado');
  assert.equal(r2[0].id, 'auto_rescate');
  assert.deepEqual(r2[0].cambio, { ranuras: ['modulo'], pieza: 'auto_rescate' });
  assert.ok(!recomendar({ eventos: ev(12), diseno: anchas }, 'meta').some((r) => r.id === 'auto_rescate'), 'no tras una prueba superada');
  const r3 = recomendar({ eventos: [...ev(1), { t: 9, tipo: 'auto_rescate', detalle: '1' }], diseno: comoDiseno({ ...base(), modulo: 'auto_rescate' }) }, 'meta');
  assert.ok(r3.some((r) => r.id === 'auto_rescate_uso' && !r.cambio));
  const golpes = Array.from({ length: 5 }, (_, i) => ({ t: i, tipo: 'golpe_carga', detalle: '3 m/s' }));
  const r4 = recomendar({ eventos: golpes, integridad_carga: 0.7, diseno: comoDiseno({ ...base(), carga: 'soporte_amortiguado' }) }, 'meta');
  assert.ok(r4.some((r) => r.id === 'rueda_nitinol'));
});

caso('soltar una rueda la pone en los dos ejes; con «separar» solo en uno; el segundo arrastre es inocuo', () => {
  const ancha = porId.rueda_ancha;
  const r1 = ponerRueda(base(), ancha, 'rueda_del');
  assert.ok(r1.ok && r1.ambos);
  assert.equal(r1.mapa.rueda_del, 'rueda_ancha');
  assert.equal(r1.mapa.rueda_tras, 'rueda_ancha');
  assert.equal(r1.otro, 'rueda_tras');
  // Segundo arrastre al otro eje (como la e2e): no cambia nada.
  const r2 = ponerRueda(r1.mapa, ancha, 'rueda_tras');
  assert.equal(r2.ok, false);
  assert.equal(r2.motivo, 'igual');
  assert.deepEqual(r2.mapa, r1.mapa);
  // Separar: solo el eje donde se suelta.
  const r3 = ponerRueda(base(), ancha, 'rueda_tras', { separar: true });
  assert.ok(r3.ok && !r3.ambos);
  assert.equal(r3.mapa.rueda_tras, 'rueda_ancha');
  assert.equal(r3.mapa.rueda_del, base().rueda_del);
  // Con ejes mezclados, soltar sin separar los vuelve a unir.
  const r4 = ponerRueda(r3.mapa, ancha, 'rueda_del');
  assert.ok(r4.ok && r4.mapa.rueda_del === 'rueda_ancha' && r4.mapa.rueda_tras === 'rueda_ancha');
  // Otras piezas no cambian de comportamiento; una rueda no cabe en el motor.
  const r5 = ponerRueda(base(), porId.motor_potente, 'motor');
  assert.ok(r5.ok && !r5.ambos);
  assert.equal(ponerRueda(base(), ancha, 'motor').ok, false);
});

console.log(`\n${n} casos OK`);
