// Pruebas de los niveles destacados (funciones puras): configuración, clima de NASA POWER, viento, elementos y eventos.
// node --test game/src/fisica/niveles_destacados.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NIVELES_DESTACADOS, MISIONES_DESTACADAS, configDeNivel } from '../content/niveles_destacados.js';
import CLIMA from '../content/clima_niveles.js';
import { ambienteDeSitio, ambienteDeDestino, DENSIDAD_AIRE_TIERRA } from './ambiente.js';
import { vientoAAltura, fuerzaArrastre, fuerzaAMatter, programaRafagas, vientoEn, datosViento, resumenViento, VIENTO, textoViento } from './viento.js';
import { generarElementos, factorParcheEn, superficieParcheEn, danioBloque, notaElementos } from './elementos_nivel.js';
import { programaEventos, activosEn, EVENTOS, crestasDe, notaEventos } from './eventos_fondo.js';
import { perfilDeSitio } from './perfil.js';
import { PX_POR_M, FACTOR_GRAVEDAD } from './escala.js';

const IDS = ['g00266', 'tenoumer', 'mx0023', 'pinacate', 'pingualuit', 'samalayuca', 'mx0261'];
const sitio = (id) => JSON.parse(readFileSync(new URL(`../../../data/sites/${id}.json`, import.meta.url)));
const piezas = JSON.parse(readFileSync(new URL('../content/parts.json', import.meta.url))).map((p) => p.id);

test('los 7 niveles destacados existen, son de tipos distintos y su fondo existe', () => {
  assert.deepEqual(Object.keys(NIVELES_DESTACADOS).sort(), [...IDS].sort());
  const tipos = IDS.map((id) => NIVELES_DESTACADOS[id].tipo);
  assert.equal(new Set(tipos).size, IDS.length);
  for (const id of IDS) {
    const c = NIVELES_DESTACADOS[id];
    assert.ok(c.entrena.es && c.entrena.en, `${id}: falta «qué entrena»`);
    assert.equal(c.destino, sitio(id).destino_ref, `${id}: destino distinto al del sitio`);
    for (const p of c.pieza_clave) assert.ok(piezas.includes(p), `${id}: pieza ${p} no existe`);
    readFileSync(new URL(`../../../assets/fondos/fondo_${c.fondo}_1.png`, import.meta.url));
    for (const P of c.parches) assert.ok(['arena', 'roca', 'compacto'].includes(P.superficie));
  }
});

test('configDeNivel: prueba por sitio, misión por destino, el resto null', () => {
  assert.equal(configDeNivel({ modo: 'prueba', sitioId: 'tenoumer' }), NIVELES_DESTACADOS.tenoumer);
  assert.equal(configDeNivel({ modo: 'prueba', sitioId: 'mx0207' }), null);
  assert.equal(configDeNivel({ modo: 'mision', destinoId: 'jezero' }), MISIONES_DESTACADAS.jezero);
  assert.equal(MISIONES_DESTACADAS.polo_sur_lunar.viento, null);
});

test('clima de NASA POWER: los 7 sitios, con fecha, y la densidad es la derivada de PS y T2M', () => {
  assert.match(CLIMA.fecha_consulta, /^\d{4}-\d{2}-\d{2}$/);
  for (const id of IDS) {
    const c = CLIMA.sitios[id];
    assert.ok(c, id);
    assert.ok(Math.abs(c.rho_kg_m3 - (c.ps_kPa * 1000) / (287.05 * (c.media_C + 273.15))) < 0.001);
    assert.ok(c.viento_max_ms >= c.viento_medio_ms);
    const s = sitio(id);
    assert.ok(Math.abs(c.lat - s.lat) < 1e-3 && Math.abs(c.lon - s.lon) < 1e-3, `${id}: coordenadas`);
  }
  // Mismo método que docs/taller/AMBIENTE.md: pinacate da lo mismo que la tabla.
  assert.equal(CLIMA.sitios.pinacate.min_tipica_C, 7.1);
  assert.equal(CLIMA.sitios.pinacate.max_tipica_C, 39.7);
});

test('ambiente: los sitios nuevos usan NASA POWER y los de la tabla conservan sus valores', () => {
  const p = ambienteDeSitio('pingualuit');
  assert.equal(p.temperatura_min_C, CLIMA.sitios.pingualuit.min_tipica_C);
  assert.equal(p.viento_medio_ms, CLIMA.sitios.pingualuit.viento_medio_ms);
  assert.match(p.fuentes[0], /NASA POWER/);
  const pin = ambienteDeSitio('pinacate');
  assert.equal(pin.densidad_aire_kg_m3, 1.143);
  assert.equal(pin.viento_max_ms, CLIMA.sitios.pinacate.viento_max_ms);
  // Samalayuca ya estaba en la tabla: conserva sus temperaturas (docs/taller/AMBIENTE.md) y solo recibe el viento.
  const sam = ambienteDeSitio('samalayuca');
  assert.equal(sam.temperatura_min_C, 0.3);
  assert.equal(sam.temperatura_max_C, 36.2);
  assert.equal(sam.densidad_aire_kg_m3, 1.045);
  assert.equal(sam.viento_medio_ms, CLIMA.sitios.samalayuca.viento_medio_ms);
  // Con el mismo método, NASA POWER reproduce la tabla de Samalayuca.
  assert.equal(CLIMA.sitios.samalayuca.min_tipica_C, 0.3);
  assert.equal(CLIMA.sitios.samalayuca.max_tipica_C, 36.2);
  assert.match(ambienteDeSitio('mx0261').fuentes[0], /NASA POWER/);
  assert.equal(ambienteDeSitio('mx0207').viento_medio_ms, null);
  assert.equal(ambienteDeDestino('jezero').viento_max_ms, 10);
});

test('viento: perfil logarítmico, arrastre ½ρv²CdA y escala de Matter igual a la de la gravedad', () => {
  assert.ok(Math.abs(vientoAAltura(10, 10) - 10) < 1e-9);
  assert.ok(vientoAAltura(10) < 10 && vientoAAltura(10) > 5);
  assert.ok(Math.abs(fuerzaArrastre(1.2, 10, 1, 1.5) - 90) < 1e-9);
  assert.equal(fuerzaArrastre(1.2, -10, 1, 1.5), -90);
  assert.equal(fuerzaArrastre(0, 30), 0); // Luna
  // 1 N sobre 1 kg = 1 m/s², igual que la gravedad del juego (g · px/m · FACTOR / 1e6).
  assert.ok(Math.abs(fuerzaAMatter(9.81) - (9.81 * PX_POR_M * FACTOR_GRAVEDAD) / 1e6) < 1e-15);
});

test('viento: en Marte (aire ~1.4 %) empuja ~1.4 % de lo que empujaría el mismo viento en la Tierra', () => {
  const marte = resumenViento(datosViento(ambienteDeDestino('jezero')), 69, 3.71);
  const tierra = resumenViento({ medio: null, max: 10, rho: DENSIDAD_AIRE_TIERRA }, 69, 9.81);
  assert.ok(marte.F / tierra.F < 0.02);
  assert.ok(marte.F < 2); // ráfaga de 10 m/s en Jezero: ~1 N
  assert.equal(datosViento(ambienteDeDestino('polo_sur_lunar')), null);
  assert.match(textoViento(ambienteDeDestino('jezero'), 69, 3.71), /Marte|Mars/);
  // Pingualuit, la ráfaga más fuerte de los 5: empuja una fracción visible del peso, pero menos de la mitad.
  const ping = resumenViento(datosViento(ambienteDeSitio('pingualuit')), 69, 9.81);
  assert.ok(ping.fraccionPeso > 0.1 && ping.fraccionPeso < 0.5, String(ping.fraccionPeso));
});

test('ráfagas deterministas, entre la media y el máximo', () => {
  const v = { medio: 5, max: 20 };
  const a = programaRafagas('x', v);
  assert.deepEqual(a, programaRafagas('x', v));
  assert.notDeepEqual(a, programaRafagas('y', v));
  assert.ok(a.length > 5);
  for (const g of a) {
    assert.ok(g.pico >= 5 && g.pico <= 20);
    const s = R(g.t1 - g.t0);
    assert.ok(s >= VIENTO.rafaga.dura_s[0] && s <= VIENTO.rafaga.dura_s[1]);
    assert.ok(Math.abs(Math.abs(vientoEn((g.t0 + g.t1) / 2, a, 5)) - g.pico) < 1e-9);
  }
  assert.equal(Math.abs(vientoEn(0, a, 5)), 5);
  assert.deepEqual(programaRafagas('x', { medio: null, max: null }), []);
});
const R = (x) => Math.round(x * 1e9) / 1e9;

test('elementos: deterministas, fuera de los planos, marcados como recreación y con el agarre del parche', () => {
  for (const id of IDS) {
    const perfil = perfilDeSitio(sitio(id));
    const l = generarElementos(perfil, NIVELES_DESTACADOS[id], id);
    assert.deepEqual(l, generarElementos(perfil, NIVELES_DESTACADOS[id], id));
    if (NIVELES_DESTACADOS[id].solo_visual) { assert.deepEqual(l, [], `${id}: solo visual, sin elementos`); continue; }
    assert.ok(l.length > 0, `${id}: sin elementos`);
    assert.ok(notaElementos(l));
    for (const o of l) {
      assert.equal(o.recreacion, true);
      const x0 = o.desde_m ?? o.x_m;
      const x1 = o.hasta_m ?? o.x_m;
      assert.ok(x0 >= 18 && x1 <= perfil.largo_m - 36, `${id}: ${o.clase} en un plano`);
      if (o.tipo === 'parche') {
        assert.equal(factorParcheEn(l, (o.desde_m + o.hasta_m) / 2), o.agarre);
        assert.equal(superficieParcheEn(l, (o.desde_m + o.hasta_m) / 2), o.superficie);
      }
    }
    // Los parches no se enciman.
    const p = l.filter((o) => o.tipo === 'parche').sort((a, b) => a.desde_m - b.desde_m);
    for (let i = 1; i < p.length; i++) assert.ok(p[i].desde_m >= p[i - 1].hasta_m);
  }
  assert.equal(factorParcheEn([], 50), 1);
  assert.equal(superficieParcheEn([], 50), null);
});

test('lava aa: sin daño despacio, daño lineal sobre el umbral', () => {
  const d = NIVELES_DESTACADOS.pinacate.bloques[0].danio;
  assert.equal(danioBloque(d, d.umbral_ms - 0.1), 0);
  assert.ok(Math.abs(danioBloque(d, d.umbral_ms + 2) - 2 * d.por_ms) < 1e-9);
  assert.equal(danioBloque(null, 20), 0);
});

test('eventos: deterministas, del tipo pedido y el desprendimiento por avance', () => {
  const a = programaEventos(['remolino', 'fobos'], 'jezero');
  assert.deepEqual(a, programaEventos(['remolino', 'fobos'], 'jezero'));
  assert.ok(a.some((e) => e.tipo === 'remolino') && a.some((e) => e.tipo === 'fobos'));
  for (const e of a) assert.ok(e.t1 > e.t0);
  const r = a.find((e) => e.tipo === 'remolino');
  assert.ok(activosEn(a, (r.t0 + r.t1) / 2).includes(r));
  const d = programaEventos(['desprendimiento'], 'mx0023');
  assert.equal(d.length, EVENTOS.desprendimiento.a_m.length);
  for (const e of d) assert.equal(e.radios.length, EVENTOS.desprendimiento.piedras);
  assert.deepEqual(programaEventos(['tierra'], 'luna'), [{ tipo: 'tierra', t0: 0, t1: Infinity }]);
});

test('Samalayuca (camino dorado de Marte): solo ambiente, el viento no empuja y los eventos no tocan la física', () => {
  const c = NIVELES_DESTACADOS.samalayuca;
  assert.equal(c.solo_visual, true);
  assert.equal(c.viento.empuja, false);
  assert.deepEqual(c.parches, []);
  assert.deepEqual(c.bloques, []);
  const perfil = perfilDeSitio(sitio('samalayuca'));
  const l = generarElementos(perfil, c, 'samalayuca');
  assert.equal(factorParcheEn(l, 100), 1);
  assert.equal(superficieParcheEn(l, 100), null);
  // Hay crestas de duna (perfil del DEM + caras recreadas) para que la arena se vuele de ellas.
  assert.ok(crestasDe(perfil).length >= 3, String(crestasDe(perfil).length));
  assert.match(notaEventos(c.eventos, { soloVisual: true }), /solo visuales|visual only/);
  assert.ok(datosViento(ambienteDeSitio('samalayuca')), 'el viento real del sitio existe (se ve)');
});

test('Rincón de Parangueo: sal y lodo solo en el piso del lago (tramo compacto del DEM), viento con física, destino del sitio', () => {
  const c = NIVELES_DESTACADOS.mx0261;
  assert.equal(c.destino, 'polo_sur_lunar');
  assert.notEqual(c.viento.empuja, false);
  const perfil = perfilDeSitio(sitio('mx0261'));
  const piso = perfil.superficies.filter((t) => t.tipo === 'compacto');
  assert.ok(piso.length && piso[0].hasta - piso[0].desde > 50, 'la ventana incluye el piso del lago');
  const l = generarElementos(perfil, c, 'mx0261');
  const clases = new Set(l.map((o) => o.clase));
  assert.ok(clases.has('sal') && clases.has('lodo'));
  const enPiso = (x) => piso.some((t) => x >= t.desde && x <= t.hasta);
  for (const o of l) assert.ok(enPiso(o.desde_m) && enPiso(o.hasta_m), `${o.clase} ${o.desde_m}-${o.hasta_m} fuera del piso`);
  assert.equal(l.find((o) => o.clase === 'lodo').superficie, 'arena'); // se hunde (Bekker de arena genérica, P)
  assert.equal(l.find((o) => o.clase === 'sal').superficie, 'compacto');
  for (const t of ['espejismo', 'polvo_salino']) assert.ok(programaEventos([t], 'mx0261').length > 3, t);
});

test('remolinos: ~1 % menos luz en la mayoría y 15 % en los fuertes (MR-083), sin mover el programa', async () => {
  const { factorRemolino } = await import('./eventos_fondo.js');
  const l = programaEventos(['remolino'], 'jezero', 2000).filter((e) => e.tipo === 'remolino');
  const f = l.map(factorRemolino);
  for (const x of f) assert.ok(x === EVENTOS.remolino.luz || x === EVENTOS.remolino.luz_fuerte);
  assert.ok(EVENTOS.remolino.luz >= 0.99 && EVENTOS.remolino.luz_fuerte >= 0.85);
  const fuertes = f.filter((x) => x < 0.99).length / f.length;
  assert.ok(fuertes > 0.05 && fuertes < 0.4, String(fuertes));
});
