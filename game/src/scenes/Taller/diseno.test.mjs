// Prueba de las reglas del taller. Correr desde la raíz del repo: node game/src/scenes/Taller/diseno.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RANURAS, DISENO_POR_DEFECTO, resumen, validar, comoMapa, comoDiseno, piezasPara } from './diseno.js';

const catalogo = JSON.parse(readFileSync(new URL('../../content/parts.json', import.meta.url), 'utf-8'));
const PRESUPUESTO = 1000;
const con = (cambios) => comoDiseno({ ...comoMapa(DISENO_POR_DEFECTO), ...cambios });
let n = 0;
const caso = (nombre, fn) => { fn(); n += 1; console.log(`✓ ${nombre}`); };

caso('7 ranuras del contrato, 6 obligatorias, ruedas × 2', () => {
  assert.deepEqual(RANURAS.map((r) => r.id), ['chasis', 'rueda_del', 'rueda_tras', 'motor', 'bateria', 'carga', 'modulo']);
  assert.equal(RANURAS.filter((r) => r.obligatoria).length, 6);
  assert.deepEqual(RANURAS.filter((r) => r.multiplicador === 2).map((r) => r.id), ['rueda_del', 'rueda_tras']);
});

caso('todas las piezas del diseño por defecto existen', () => {
  for (const e of DISENO_POR_DEFECTO) assert.ok(catalogo.find((p) => p.id === e.pieza), e.pieza);
});

caso('robot mínimo con ruedas estándar = 730 y es válido', () => {
  assert.equal(resumen(DISENO_POR_DEFECTO, catalogo).costo, 730);
  assert.deepEqual(validar(DISENO_POR_DEFECTO, catalogo, PRESUPUESTO), []);
});

caso('masa de ruedas cuenta × 2 (20 + 4·6 + 7 + 5 + 3 = 59)', () => {
  assert.equal(resumen(DISENO_POR_DEFECTO, catalogo).masa, 59);
});

caso('camino dorado: ruedas anchas en ambos ejes = 890 y válido', () => {
  const d = con({ rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' });
  assert.equal(resumen(d, catalogo).costo, 890);
  assert.deepEqual(validar(d, catalogo, PRESUPUESTO), []);
});

caso('agarre = el peor de los dos ejes (la posición importa)', () => {
  const d = con({ rueda_del: 'rueda_ancha' });
  const a = resumen(d, catalogo).agarre;
  assert.equal(a.arena, 0.4);
  assert.equal(resumen(con({ rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' }), catalogo).agarre.arena, 0.9);
});

caso('exceder el presupuesto bloquea', () => {
  const d = con({ chasis: 'chasis_reforzado', motor: 'motor_potente', bateria: 'bateria_grande', rueda_del: 'rueda_tacos', rueda_tras: 'rueda_tacos' });
  assert.ok(resumen(d, catalogo).costo > PRESUPUESTO);
  assert.ok(validar(d, catalogo, PRESUPUESTO).some((e) => e.startsWith('Excede')));
});

caso('falta de chasis bloquea y quitar baja el costo', () => {
  const sin = DISENO_POR_DEFECTO.filter((e) => e.ranura !== 'chasis');
  assert.ok(validar(sin, catalogo, PRESUPUESTO).includes('Falta: Chasis'));
  assert.equal(resumen(sin, catalogo).costo, 730 - 150);
});

caso('pieza en ranura equivocada o inexistente bloquea', () => {
  assert.ok(validar(con({ motor: 'rueda_ancha' }), catalogo, PRESUPUESTO).length > 0);
  assert.ok(validar(con({ motor: 'no_existe' }), catalogo, PRESUPUESTO).length > 0);
});

caso('el módulo es opcional y se cobra', () => {
  const d = con({ modulo: 'panel_solar' });
  assert.deepEqual(validar(d, catalogo, PRESUPUESTO), []);
  assert.equal(resumen(d, catalogo).costo, 730 + 150);
});

caso('cada ranura obligatoria tiene al menos una pieza en el catálogo', () => {
  for (const r of RANURAS) assert.ok(piezasPara(r.id, catalogo).length > 0, r.id);
});

caso('ruedas declaran radio_m y agarre en las 3 superficies', () => {
  for (const p of piezasPara('rueda_del', catalogo)) {
    assert.equal(typeof p.radio_m, 'number', p.id);
    for (const s of ['arena', 'roca', 'compacto']) assert.equal(typeof p.agarre[s], 'number', `${p.id}.${s}`);
  }
});

caso('comoDiseno respeta el formato [{ranura, pieza}] y omite vacías', () => {
  assert.deepEqual(comoDiseno({ motor: 'motor_potente', chasis: 'chasis_ligero', modulo: null }),
    [{ ranura: 'chasis', pieza: 'chasis_ligero' }, { ranura: 'motor', pieza: 'motor_potente' }]);
});

console.log(`\n${n} casos OK`);
