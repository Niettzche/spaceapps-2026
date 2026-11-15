// Explorador sin API: catálogo precalculado y clima de NASA POWER. Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  distanciaKm, buscarEnCatalogo, formatoDistancia, urlPower, leerClimaPower, similitudClima, similitudDimension, DIMENSIONES_CLIMA,
} from '../catalogo.js';
import { RADIO_CATALOGO_KM } from '../config.js';

const raiz = new URL('../../../../../', import.meta.url);
const SITIOS = readdirSync(new URL('data/sites/', raiz)).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(`data/sites/${f}`, raiz), 'utf8')));
const destino = (id) => JSON.parse(readFileSync(new URL(`data/targets/${id}.json`, raiz), 'utf8'));

test('distanciaKm: gran círculo (1° de meridiano ≈ 111.2 km; antípodas ≈ media vuelta)', () => {
  assert.equal(distanciaKm({ lat: 10, lon: 20 }, { lat: 10, lon: 20 }), 0);
  assert.ok(Math.abs(distanciaKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) - 111.19) < 0.01);
  assert.ok(Math.abs(distanciaKm({ lat: 0, lon: 0 }, { lat: 0, lon: 180 }) - Math.PI * 6371.0088) < 0.01);
  // Cruza el antimeridiano por el camino corto.
  assert.ok(distanciaKm({ lat: 0, lon: 179.5 }, { lat: 0, lon: -179.5 }) < 112);
});

test('buscarEnCatalogo: dentro del radio devuelve el sitio; ignora sitios sin coordenadas', () => {
  const sitios = [{ id: 'a', lat: 31.0, lon: -106.0 }, { id: 'b', lat: 31.5, lon: -106.0 }, { id: 'sin', lat: null, lon: null }];
  const r = buscarEnCatalogo(sitios, { lat: 31.05, lon: -106.0 }, { radioKm: 25 });
  assert.equal(r.encontrado.sitio.id, 'a');
  assert.ok(Math.abs(r.encontrado.distanciaKm - 5.56) < 0.01);
  assert.deepEqual(r.cercanos.map((c) => c.sitio.id), ['a', 'b']);
  assert.equal(r.total, 2);
});

test('buscarEnCatalogo: umbral inclusivo; fuera del radio no hay sitio pero sí los 3 más cercanos', () => {
  const sitios = [{ id: 'a', lat: 0, lon: 0 }, { id: 'b', lat: 0, lon: 1 }, { id: 'c', lat: 0, lon: 2 }, { id: 'd', lat: 0, lon: 3 }];
  const justo = distanciaKm({ lat: 0, lon: 0 }, { lat: 0, lon: -0.2 });
  assert.equal(buscarEnCatalogo(sitios, { lat: 0, lon: -0.2 }, { radioKm: justo }).encontrado.sitio.id, 'a');
  const r = buscarEnCatalogo(sitios, { lat: 0, lon: -0.2 }, { radioKm: justo - 0.001 });
  assert.equal(r.encontrado, null);
  assert.deepEqual(r.cercanos.map((c) => c.sitio.id), ['a', 'b', 'c']);
  assert.equal(buscarEnCatalogo([], { lat: 0, lon: 0 }, { radioKm: 25 }).encontrado, null);
});

test('catálogo real: Samalayuca y Pinacate se encuentran; Amazonas y el océano quedan fuera', () => {
  assert.equal(RADIO_CATALOGO_KM, 25);
  const busca = (lat, lon) => buscarEnCatalogo(SITIOS, { lat, lon }, { radioKm: RADIO_CATALOGO_KM });
  assert.equal(busca(31.35, -106.47).encontrado?.sitio.id, 'samalayuca');
  assert.equal(busca(31.84, -113.39).encontrado?.sitio.id, 'pinacate');
  const amazonas = busca(-3.47, -62.37);
  assert.equal(amazonas.encontrado, null);
  assert.equal(amazonas.cercanos.length, 3);
  assert.ok(amazonas.cercanos[0].distanciaKm > 1000);
  assert.equal(busca(0, -140).encontrado, null);
});

test('formatoDistancia', () => {
  assert.equal(formatoDistancia(0.44), '0.4 km');
  assert.equal(formatoDistancia(12.345), '12.3 km');
  assert.equal(formatoDistancia(1234.6), '1235 km');
  assert.equal(formatoDistancia(NaN), '—');
});

test('urlPower: misma consulta que model/features.py', () => {
  const u = new URL(urlPower(31.351234, -106.47));
  assert.equal(u.origin + u.pathname, 'https://power.larc.nasa.gov/api/temporal/climatology/point');
  assert.equal(u.searchParams.get('parameters'), 'T2M_RANGE,PRECTOTCORR');
  assert.equal(u.searchParams.get('community'), 'AG');
  assert.equal(u.searchParams.get('latitude'), '31.3512');
  assert.equal(u.searchParams.get('longitude'), '-106.47');
});

test('leerClimaPower: valores ANN, periodo y relleno -999 como faltante', () => {
  const js = {
    properties: { parameter: { T2M_RANGE: { ANN: 14.78 }, PRECTOTCORR: { ANN: -999 } } },
    header: { fill_value: -999, range: '25-year Meteorological and Solar Monthly & Annual Climatologies (January 2001 - December 2025)' },
  };
  const c = leerClimaPower(js);
  assert.deepEqual(c.oscilacion_termica, { valor: 14.78, unidad: 'K', fuente: 'NASA POWER T2M_RANGE (climatología anual)', fecha: '2001-2025' });
  assert.equal(c.precipitacion.valor, null);
  assert.equal(leerClimaPower({ properties: { parameter: { T2M_RANGE: { ANN: -999 } } } }), null);
  assert.equal(leerClimaPower(null), null);
  assert.equal(leerClimaPower({ messages: ['error'] }), null);
});

test('DIMENSIONES_CLIMA coincide con model/score.py', () => {
  const py = readFileSync(new URL('model/score.py', raiz), 'utf8');
  for (const [k, { escala, rango_tierra: [lo, hi] }] of Object.entries(DIMENSIONES_CLIMA)) {
    const linea = py.split('\n').find((l) => l.includes(`"${k}"`));
    assert.ok(linea, k);
    assert.match(linea, new RegExp(`"escala":\\s*${escala.toFixed(1)}`));
    assert.match(linea, new RegExp(`"rango_tierra":\\s*\\(${lo.toFixed(1)},\\s*${hi == null ? 'None' : hi.toFixed(1)}\\)`));
  }
});

test('similitudClima: fórmula exp(-|t-d|/escala) y recorte al máximo terrestre (40 K)', () => {
  const jezero = destino('jezero');
  const luna = destino('polo_sur_lunar');
  const tierra = { oscilacion_termica: { valor: 14.78, unidad: 'K' }, precipitacion: { valor: 0.69, unidad: 'mm/día' } };
  const [osc, pre] = similitudClima(tierra, jezero.variables);
  // Jezero 55 K > 40 K: se compara contra 40.
  assert.deepEqual(osc.recorte, { destino: 55, extremo: 40 });
  assert.equal(osc.similitud, Math.round(Math.exp(-(40 - 14.78) / 20) * 1e4) / 1e4);
  assert.equal(pre.recorte, null);
  assert.equal(pre.similitud, Math.round(Math.exp(-0.69) * 1e4) / 1e4);
  // Luna 176 K también se recorta a 40 K: misma similitud térmica.
  assert.equal(similitudClima(tierra, luna.variables)[0].similitud, osc.similitud);
  // Dato faltante o unidad distinta: sin similitud (nunca se inventa).
  const [o2, p2] = similitudClima({ oscilacion_termica: { valor: null, unidad: 'K' }, precipitacion: { valor: 1, unidad: 'mm/h' } }, jezero.variables);
  assert.equal(o2.similitud, null);
  assert.equal(p2.similitud, null);
  assert.equal(similitudDimension(5, -1, { escala: 1, rango_tierra: [0, null] }).recorte.extremo, 0);
});
