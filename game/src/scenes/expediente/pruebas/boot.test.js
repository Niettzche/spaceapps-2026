// Pruebas del Boot: medición acotada, regla de precarga con el arte REAL de /assets y datos curiosos.
// Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planDePrecarga, medirConLimite } from '../precarga.js';
import { LIMITE_PRECARGA_BYTES, EXTENSIONES_SIN_PRECARGA } from '../config.js';
import { datosCuriosos, datoEnTurno } from '../datos_curiosos.js';
import { GRAVEDAD } from '../../../config/world.js';
import { ambienteDeDestino } from '../../../fisica/ambiente.js';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '../../../../../assets');
const archivos = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? archivos(p) : [p];
});

test('Boot: ningún PNG real de /assets se salta (todo el arte del juego queda cargado antes del Menú)', () => {
  const lista = archivos(ASSETS).filter((p) => /\.(png|jpe?g|webp)$/i.test(p))
    .map((p) => ({ archivo: relative(ASSETS, p).replace(/\\/g, '/'), bytes: statSync(p).size }));
  assert.ok(lista.length > 0, 'assets/ no tiene imágenes');
  const { saltar } = planDePrecarga(lista, { limiteBytes: LIMITE_PRECARGA_BYTES, extensionesExcluidas: EXTENSIONES_SIN_PRECARGA });
  assert.deepEqual(saltar.map((a) => `${a.archivo} (${a.bytes} B)`), []);
  // Íconos del HUD de Prueba y Misión (fisica/hud.js) y la portada
  const nombres = new Set(lista.map((a) => a.archivo));
  for (const f of ['ui/ui_icono_energia.png', 'ui/ui_icono_carga.png', 'ui/ui_icono_chasis.png', 'ui/ui_marco_barra.png', 'titulo/titulo.png']) {
    assert.ok(nombres.has(f), `falta ${f}`);
  }
});

test('Boot: la medición respeta el plazo total y la concurrencia; lo no medido queda en null (y se carga)', async () => {
  const items = Array.from({ length: 40 }, (_, i) => ({ archivo: `a${i}.png`, bytes: null }));
  let activas = 0;
  let maximo = 0;
  const lento = (item, espera) => new Promise((r) => {
    activas++; maximo = Math.max(maximo, activas);
    setTimeout(() => { activas--; r(100); }, Math.min(espera, 60));
  });
  const t0 = Date.now();
  const r = await medirConLimite(items, lento, { concurrencia: 4, plazoMs: 200, esperaMs: 1000 });
  const dur = Date.now() - t0;
  assert.ok(dur < 400, `tardó ${dur} ms`);
  assert.ok(maximo <= 4, `hubo ${maximo} peticiones a la vez`);
  assert.equal(r.agotado, true);
  assert.ok(r.medidos > 0 && r.medidos < 40);
  assert.ok(items.some((a) => a.bytes === null));
  // Lo no medido se carga: la regla no salta archivos sin tamaño
  const { cargar } = planDePrecarga(items, { limiteBytes: 300 * 1024, extensionesExcluidas: ['gif'] });
  assert.equal(cargar.length, 40);
});

test('Boot: medición rápida termina antes del plazo y sin marcarlo agotado', async () => {
  const items = [{ archivo: 'a.png', bytes: null }, { archivo: 'b.png', bytes: null }];
  const r = await medirConLimite(items, async () => 10, { plazoMs: 1000 });
  assert.deepEqual(r, { medidos: 2, agotado: false });
  assert.deepEqual(await medirConLimite([], async () => 1), { medidos: 0, agotado: false });
});

test('datos curiosos: salen de los valores del repo y nunca de números escritos a mano', () => {
  const lista = datosCuriosos({
    gravedad: GRAVEDAD,
    presionJezeroKPa: ambienteDeDestino('jezero')?.presion_kPa,
    sombraLunaC: ambienteDeDestino('polo_sur_lunar')?.temperatura_sombra_C,
    detector: { encontrados: 9, conocidos: 11 },
    sitios: 12,
  });
  assert.equal(lista.length, 6);
  assert.match(lista[0].es, /38 %/); // 3.71 / 9.81
  assert.match(lista[1].es, /17 %/); // 1.62 / 9.81
  assert.match(lista[2].es, /718 Pa: 0\.7 %/);
  assert.match(lista[3].es, /−?-?248 °C/);
  for (const d of lista) assert.ok(d.es && d.en);
  // Sin valores: no se inventa nada
  assert.deepEqual(datosCuriosos({ gravedad: { tierra: 9.81 }, presionJezeroKPa: null }), []);
});

test('datos curiosos: rotan cada periodo y dan la vuelta', () => {
  const l = ['a', 'b', 'c'];
  assert.equal(datoEnTurno(l, 0, 1000), 0);
  assert.equal(datoEnTurno(l, 1999, 1000), 1);
  assert.equal(datoEnTurno(l, 3000, 1000), 0);
  assert.equal(datoEnTurno([], 5000), -1);
});
