// Prueba de las piezas nuevas del taller (propiedades derivadas) y de la personalización cosmética.
// Correr desde la raíz del repo: node game/src/scenes/Taller/piezas.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RANURAS, DISENO_POR_DEFECTO, resumen, validar, comoMapa, comoDiseno, piezasPara, efectosEn } from './diseno.js';
import { Historial } from './historial.js';
import {
  PINTURAS, PINTURA_POR_DEFECTO, LARGO_NOMBRE, normalizar, normalizarNombre, siguientePintura, fijar, cargar, personalizacionDe,
  personalizacionActual, _olvidar,
} from './personalizacion.js';
import { MASA_CARGA_KG } from '../../fisica/diseno.js';
import { factorFrio, ambienteDeDestino, ambienteDeSitio, REGLAS, temperaturaEquilibrio } from '../../fisica/ambiente.js';
import { recomendar } from '../../feedback/reglas.js';
import { setIdioma } from '../../i18n.js';

setIdioma('es');
const catalogo = JSON.parse(readFileSync(new URL('../../content/parts.json', import.meta.url), 'utf-8'));
const porId = Object.fromEntries(catalogo.map((p) => [p.id, p]));
const PRESUPUESTO = 1000;
const con = (cambios) => comoDiseno({ ...comoMapa(DISENO_POR_DEFECTO), ...cambios });
const res = (cambios) => resumen(con(cambios), catalogo, { masaCarga: MASA_CARGA_KG });
const NUEVAS = ['rueda_malla', 'bateria_mediana', 'motor_equilibrado', 'soporte_correas', 'panel_solar_grande', 'calentador_bateria', 'radiador'];
const JEZERO = ambienteDeDestino('jezero', 'marte');
const LUNA = ambienteDeDestino('polo_sur_lunar', 'luna');
let n = 0;
const caso = (nombre, fn) => { fn(); n += 1; console.log(`✓ ${nombre}`); };

caso('piezas nuevas: existen, bilingües, valor de juego y caben en una ranura', () => {
  for (const id of NUEVAS) {
    const p = porId[id];
    assert.ok(p, id);
    assert.ok(p.nombre && p.nombre_en, `${id}: nombre y nombre_en`);
    assert.match(p.nota, /valor de juego \(P\)/, id);
    assert.ok(RANURAS.some((r) => r.sistema === p.sistema), `${id}: ranura`);
    assert.match(p.id, /^[a-z0-9_]+$/);
  }
  assert.equal(new Set(catalogo.map((p) => p.id)).size, catalogo.length, 'ids únicos');
  // El catálogo de cada ranura cabe en las 4 filas del Taller.
  for (const r of RANURAS) assert.ok(piezasPara(r.id, catalogo).length <= 4, r.id);
});

caso('las piezas del camino dorado no cambiaron (calibración de juego)', () => {
  assert.deepEqual(porId.rueda_estandar.agarre, { arena: 0.4, roca: 0.6, compacto: 0.8 });
  assert.deepEqual(porId.rueda_ancha.agarre, { arena: 0.9, roca: 0.5, compacto: 0.7 });
  assert.equal(resumen(DISENO_POR_DEFECTO, catalogo).costo, 730);
  assert.equal(resumen(con({ rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' }), catalogo).costo, 890);
});

caso('con ruedas anchas sigue cabiendo el calentador o el radiador (≤ 1,000)', () => {
  for (const modulo of ['calentador_bateria', 'radiador']) {
    const d = con({ rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha', modulo });
    assert.deepEqual(validar(d, catalogo, PRESUPUESTO), [], modulo);
  }
});

caso('rueda de malla: más agarre en arena que la estándar, más ligera que la ancha y más grande', () => {
  const malla = res({ rueda_del: 'rueda_malla', rueda_tras: 'rueda_malla' });
  const est = res({});
  const ancha = res({ rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' });
  assert.ok(malla.agarre.arena > est.agarre.arena && malla.agarre.arena < ancha.agarre.arena);
  assert.ok(malla.agarre.roca < est.agarre.roca);
  assert.ok(malla.masa < est.masa && malla.masa < ancha.masa);
  assert.ok(malla.autonomia_s > est.autonomia_s, 'más ligera → gasta menos');
  assert.ok(porId.rueda_malla.radio_m > porId.rueda_ancha.radio_m);
});

caso('batería mediana, motor equilibrado y soporte con correas quedan entre sus vecinos', () => {
  const a = (b) => res({ bateria: b }).autonomia_s;
  assert.ok(a('bateria_chica') < a('bateria_mediana') && a('bateria_mediana') < a('bateria_grande'));
  const m = (id) => res({ motor: id });
  assert.ok(m('motor_eficiente').fuerza < m('motor_equilibrado').fuerza && m('motor_equilibrado').fuerza < m('motor_potente').fuerza);
  assert.ok(m('motor_eficiente').autonomia_s > m('motor_equilibrado').autonomia_s && m('motor_equilibrado').autonomia_s > m('motor_potente').autonomia_s);
  const p = (id) => res({ carga: id }).proteccion;
  assert.ok(p('soporte_basico') < p('soporte_correas') && p('soporte_correas') < p('soporte_amortiguado'));
});

caso('factorFrio: sin calentador igual que antes; con calentador pierde menos', () => {
  for (const t of [-248, -83, -53, -10, 0, 0.3, 20]) {
    const viejo = Math.max(REGLAS.frio.piso, 1 - Math.max(0, REGLAS.frio.desde_C - t) * REGLAS.frio.perdida_por_C);
    assert.ok(Math.abs(factorFrio(t) - viejo) < 1e-12, `t=${t}`);
  }
  assert.ok(factorFrio(-83, REGLAS.frio, 0.75) > factorFrio(-83));
  assert.equal(factorFrio(-83, REGLAS.frio, 1), 1);
});

caso('calentador: en Jezero la batería arranca más llena; en la Tierra (Samalayuca) no cambia nada', () => {
  const sin = efectosEn(res({}), JEZERO);
  const conA = efectosEn(res({ modulo: 'calentador_bateria' }), JEZERO);
  // Regla de frío suave (−0.03 %/°C, piso 97 %): Jezero −83 °C → 97.5 %; con el calentador, 100 %.
  assert.ok(sin.bateria < 1 && sin.bateria >= REGLAS.frio.piso);
  assert.equal(conA.bateria, 1);
  assert.equal(conA.bateria_sin_modulo, sin.bateria);
  const tierra = efectosEn(res({ modulo: 'calentador_bateria' }), ambienteDeSitio('samalayuca'));
  assert.equal(tierra.bateria, 1);
});

caso('radiador: el motor caliente conserva más potencia en la Luna y en Marte; equilibrio más bajo', () => {
  for (const amb of [LUNA, JEZERO]) {
    const sin = efectosEn(res({}), amb);
    const conR = efectosEn(res({ modulo: 'radiador' }), amb);
    assert.ok(conR.potencia_caliente > sin.potencia_caliente * 1.8, `${amb.id}: ${sin.potencia_caliente} → ${conR.potencia_caliente}`);
    assert.ok(temperaturaEquilibrio(1, 0.6, amb, REGLAS.motor, porId.radiador.radiador) < temperaturaEquilibrio(1, 0.6, amb));
  }
  // En la Tierra el aire ya enfría: el motor nunca pierde potencia.
  assert.equal(efectosEn(res({ modulo: 'radiador' }), ambienteDeSitio('samalayuca')).potencia_caliente, 1);
});

caso('panel solar: recarga solo con panel y menos con luz rasante (Luna) que en Marte', () => {
  assert.equal(efectosEn(res({}), JEZERO).recarga_s, 0);
  assert.ok(efectosEn(res({ modulo: 'panel_solar' }), JEZERO).recarga_s > efectosEn(res({ modulo: 'panel_solar' }), LUNA).recarga_s);
  const chico = efectosEn(res({ modulo: 'panel_solar' }), JEZERO).recarga_s;
  assert.ok(Math.abs(efectosEn(res({ modulo: 'panel_solar_grande' }), JEZERO).recarga_s - 2 * chico) < 1e-12, 'el grande recarga el doble');
});

caso('feedback: frío + energía agotada → calentador (Aplicar y al taller pone el módulo)', () => {
  const ev = [{ t: 0, tipo: 'bateria_fria', detalle: '85 %' }, { t: 50, tipo: 'energia_agotada', detalle: 'bateria_chica' }];
  const r = recomendar({ eventos: ev, diseno: DISENO_POR_DEFECTO }, 'energia_agotada');
  const a = r.find((x) => x.id === 'calentador_bateria');
  assert.ok(a && a.cambio.ranuras[0] === 'modulo' && a.cambio.pieza === 'calentador_bateria');
  assert.match(a.evidencia, /85 %/);
  const conA = recomendar({ eventos: ev, diseno: con({ modulo: 'calentador_bateria' }) }, 'energia_agotada');
  assert.ok(!conA.some((x) => x.id === 'calentador_bateria'));
  // Sin frío no se recomienda el calentador.
  assert.ok(!recomendar({ eventos: ev.slice(1), diseno: DISENO_POR_DEFECTO }, 'energia_agotada').some((x) => x.id === 'calentador_bateria'));
});

caso('personalización: nombres limpios y pinturas válidas', () => {
  assert.equal(normalizarNombre('  Duna   1 '), 'Duna 1');
  assert.equal(normalizarNombre('<b>x</b>'), 'bx/b');
  assert.equal(normalizarNombre(''), null);
  assert.equal(normalizarNombre(42), null);
  assert.equal([...normalizarNombre('ñandú-🚀-muy-largo-de-verdad')].length, LARGO_NOMBRE);
  assert.deepEqual(normalizar({ pintura: 'neón', nombre: ' Ro ' }), { pintura: PINTURA_POR_DEFECTO, nombre: 'Ro' });
  assert.ok(PINTURAS.length >= 4 && PINTURAS.length <= 6);
  assert.equal(siguientePintura(PINTURAS.at(-1).id), PINTURAS[0].id);
  assert.equal(siguientePintura(PINTURAS[0].id, -1), PINTURAS.at(-1).id);
});

caso('personalización: se guarda en la partida y en el navegador, y no toca el diseño', () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  _olvidar();
  const partida = { diseno: DISENO_POR_DEFECTO };
  fijar(partida, { pintura: 'azul', nombre: 'Duna-1' });
  assert.deepEqual(partida.robot, { pintura: 'azul', nombre: 'Duna-1' });
  assert.deepEqual(partida.diseno, DISENO_POR_DEFECTO);
  _olvidar();
  assert.deepEqual(cargar(), { pintura: 'azul', nombre: 'Duna-1' }); // sobrevive a una partida nueva
  assert.deepEqual(personalizacionDe({}), { pintura: 'azul', nombre: 'Duna-1' });
  assert.deepEqual(personalizacionActual(), { pintura: 'azul', nombre: 'Duna-1' });
  mem.set('marsception.robot.v1', '{roto');
  _olvidar();
  assert.deepEqual(cargar(), { pintura: PINTURA_POR_DEFECTO, nombre: null }); // guardado corrupto → por defecto
});

caso('Deshacer/Rehacer cubren la pintura y el nombre; comoDiseno los ignora', () => {
  const base = { ...comoMapa(DISENO_POR_DEFECTO), pintura: 'gris' };
  const h = new Historial(base);
  h.registrar({ ...base, pintura: 'rojo' });
  h.registrar({ ...base, pintura: 'rojo', nombre: 'Ro', modulo: 'radiador' });
  assert.deepEqual(comoDiseno(h.actual), con({ modulo: 'radiador' }));
  assert.equal(h.deshacer().estado.nombre, undefined);
  assert.equal(h.deshacer().estado.pintura, 'gris');
  assert.equal(h.rehacer().estado.pintura, 'rojo');
});

console.log(`\n${n} casos OK`);
