// Prueba de las reglas del taller. Correr desde la raíz del repo: node game/src/scenes/Taller/diseno.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RANURAS, DISENO_POR_DEFECTO, resumen, validar, comoMapa, comoDiseno, piezasPara } from './diseno.js';
import { MASA_CARGA_KG } from '../../fisica/diseno.js';
import { gastoPorSegundo } from '../../fisica/energia.js';

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

caso('agarre = promedio de los ejes; mezclar ruedas avisa (con las dos anchas es más seguro)', () => {
  const mezcla = resumen(con({ rueda_del: 'rueda_ancha' }), catalogo);
  assert.equal(mezcla.agarre.arena, 0.65); // (0.9 + 0.4) / 2: el eje ancho sí aporta
  assert.equal(mezcla.agarre_ejes.del.arena, 0.9);
  assert.equal(mezcla.agarre_ejes.tras.arena, 0.4);
  assert.equal(mezcla.ejes_distintos, true);
  const dosAnchas = resumen(con({ rueda_del: 'rueda_ancha', rueda_tras: 'rueda_ancha' }), catalogo);
  assert.equal(dosAnchas.agarre.arena, 0.9);
  assert.equal(dosAnchas.ejes_distintos, false);
  assert.ok(dosAnchas.agarre.arena > mezcla.agarre.arena);
});

caso('la carga (10 kg) baja la autonomía pero no cambia costo ni masa del robot', () => {
  const sin = resumen(DISENO_POR_DEFECTO, catalogo);
  const conCarga = resumen(DISENO_POR_DEFECTO, catalogo, { masaCarga: MASA_CARGA_KG });
  assert.equal(MASA_CARGA_KG, 10);
  assert.equal(conCarga.masa, 59); // contrato con la física: masa = solo el robot
  assert.equal(conCarga.costo, sin.costo);
  assert.equal(conCarga.masa_con_carga, 69);
  // misma regla que fisica/energia.js: 100 / (0.6 × (1 + 69/100)) ≈ 98.6 s
  assert.ok(Math.abs(conCarga.autonomia_s - 100 / gastoPorSegundo({ consumo: 0.6 }, 69, 1)) < 1e-9);
  assert.ok(conCarga.autonomia_s < sin.autonomia_s);
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
