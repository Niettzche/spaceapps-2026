// «Por qué el modelo eligió este lugar» y modo «Descubrir». Correr desde game/:  node --test src/scenes/expediente/pruebas/
// Con los datos REALES de data/sites: nada se inventa, lo que falta dice «sin dato».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  tieneNivel, tipoDeSitio, origenDeSitio, textoOrigen, gemeloForma, probabilidadLuna, porQueModelo, chipsPorQue, filtrarDescubrir,
  resumenDescubrir, siguienteTipo, nombreCorto, decodificarMascara, proyectar, conocidoMasCercano, porQuePunto, TIPOS,
} from '../descubrir.js';
import { MAPA_TIERRA } from '../mapa_tierra.js';
import { sitiosParaDestino } from '../logica.js';
import { setIdioma } from '../../../i18n.js';

const raiz = new URL('../../../../../', import.meta.url);
const SITIOS = readdirSync(new URL('data/sites/', raiz)).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(`data/sites/${f}`, raiz), 'utf8')));
const CONOCIDOS = JSON.parse(readFileSync(new URL('data/known_analogs.json', raiz), 'utf8'));
const sitio = (id) => SITIOS.find((s) => s.id === id);

test('tipoDeSitio: lee `proceso` (mina, impacto, volcán/maar, dunas); lo demás queda sin verificar', () => {
  setIdioma('es');
  assert.equal(tipoDeSitio(sitio('mx0207')), 'mina');
  assert.equal(tipoDeSitio(sitio('tenoumer')), 'impacto');
  assert.equal(tipoDeSitio(sitio('g00281')), 'volcan'); // «(maar)»
  assert.equal(tipoDeSitio(sitio('g00266')), 'volcan'); // «probable volcánico»
  assert.equal(tipoDeSitio(sitio('pinacate')), 'volcan');
  assert.equal(tipoDeSitio(sitio('mx0261')), 'volcan');
  assert.equal(tipoDeSitio(sitio('samalayuca')), 'dunas');
  assert.equal(tipoDeSitio(sitio('mx0000')), 'sin_verificar'); // «maar erosionado» no cuenta como volcán
  for (const s of SITIOS) assert.ok(TIPOS.includes(tipoDeSitio(s)), s.id);
});

test('origenDeSitio: curado · control positivo · búsqueda en zonas áridas · propuesta', () => {
  setIdioma('es');
  assert.equal(origenDeSitio(sitio('samalayuca')), 'curado');
  assert.equal(origenDeSitio(sitio('pinacate')), 'curado');
  assert.equal(origenDeSitio(sitio('tenoumer')), 'control');
  assert.equal(origenDeSitio(sitio('g00266')), 'busqueda');
  assert.equal(origenDeSitio({ estado: 'propuesto_usuario' }), 'usuario');
  assert.match(textoOrigen(sitio('mx0019')), /México/);
  assert.match(textoOrigen(sitio('g00266')), /Zonas áridas del mundo · Arabia Saudita/);
  setIdioma('en');
  assert.match(textoOrigen(sitio('g00266')), /Global arid-zone search · Saudi Arabia/);
  setIdioma('es');
});

test('gemeloForma y probabilidadLuna salen de las notas del modelo (no se inventan)', () => {
  const g = gemeloForma(sitio('g00266'));
  assert.deepEqual(g, { nombre: 'Cráter Gale', mundo: 'marte', diametroKm: 1.06, profundidadM: 22, dD: 0.021 });
  assert.equal(gemeloForma(sitio('tenoumer')).nombre, 'Meridiani (Opportunity)'); // paréntesis dentro del nombre
  assert.equal(gemeloForma(sitio('samalayuca')), null);
  assert.equal(probabilidadLuna(sitio('g00266')), 0.1507);
  assert.equal(probabilidadLuna(sitio('pinacate')), 0.972);
  assert.equal(probabilidadLuna(sitio('samalayuca')), null);
});

test('porQueModelo: filas con valores de data/sites; «sin dato» o «no aplica» cuando falta', () => {
  setIdioma('es');
  const f = Object.fromEntries(porQueModelo(sitio('g00266'), { entrena: { es: 'Cruzar toba', en: 'Cross tuff' } }).map((x) => [x.clave, x]));
  assert.match(f.forma.valor, /d\/D 0\.021 · gemelo: Cráter Gale \(Marte\) d\/D 0\.021/);
  assert.match(f.modelo.valor, /forma 85 % marciana/);
  assert.match(f.borde.valor, /sí, \+38\.2 m/);
  assert.match(f.arido.valor, /pasa: NDVI p90 0\.136 < 0\.35/);
  assert.equal(f.arido.color, 'bien');
  assert.equal(f.novedoso.valor, 'sin verificar'); // novedoso: null
  assert.equal(f.entrena.valor, 'Cruzar toba');
  // Samalayuca: sin forma (dunas) ni NDVI p90 → lo dice.
  const sam = Object.fromEntries(porQueModelo(sitio('samalayuca')).map((x) => [x.clave, x]));
  assert.match(sam.forma.valor, /no aplica/);
  assert.equal(sam.modelo, undefined);
  assert.equal(sam.borde.valor, 'sin dato');
  assert.match(sam.arido.valor, /NDVI p90 sin dato · NDVI medio/);
  assert.equal(sam.entrena, undefined);
  // Mina con borde negativo y novedoso.
  const mina = Object.fromEntries(porQueModelo(sitio('mx0019')).map((x) => [x.clave, x]));
  assert.match(mina.borde.valor, /^no \(−2\.7 m\)/);
  assert.match(mina.novedoso.valor, /^SÍ/);
  setIdioma('en');
  const en = Object.fromEntries(porQueModelo(sitio('g00266')).map((x) => [x.clave, x]));
  assert.match(en.forma.valor, /twin: Gale crater \(Mars\)/);
  assert.match(en.modelo.valor, /shape 85 % Mars-like/);
  setIdioma('es');
});

test('chipsPorQue: solo lo que hay', () => {
  setIdioma('es');
  assert.deepEqual(chipsPorQue(sitio('mx0019')).map((c) => c.texto), ['d/D 0.12', 'SIN BORDE', 'ÁRIDO ✓', 'NOVEDOSO']);
  assert.deepEqual(chipsPorQue(sitio('samalayuca')), []);
});

test('Descubrir: todos los del destino, filtros jugables · novedosos · tipo, y el ciclo de tipo salta tipos vacíos', () => {
  const marte = sitiosParaDestino(SITIOS, 'jezero');
  const luna = sitiosParaDestino(SITIOS, 'polo_sur_lunar');
  assert.equal(marte.length + luna.length, SITIOS.filter((s) => s.destino_ref).length);
  const jug = filtrarDescubrir(marte, { jugables: true });
  assert.ok(jug.length > 0 && jug.every(tieneNivel));
  assert.ok(jug.some((s) => s.id === 'samalayuca') && jug.some((s) => s.id === 'g00266'));
  assert.ok(filtrarDescubrir(luna, { novedosos: true }).every((s) => s.novedoso === true));
  assert.ok(filtrarDescubrir(luna, { tipo: 'mina' }).every((s) => tipoDeSitio(s) === 'mina'));
  // El orden del modelo se respeta.
  const f = filtrarDescubrir(marte, {});
  assert.deepEqual(f.map((s) => s.id), marte.map((s) => s.id));
  const r = resumenDescubrir(luna);
  assert.equal(r.total, luna.length);
  assert.equal(Object.values(r.porTipo).reduce((a, b) => a + b, 0), luna.length);
  assert.equal(r.porTipo.dunas, 0);
  let t = 'todos';
  const vistos = [];
  for (let i = 0; i < 6; i++) { t = siguienteTipo(t, r.porTipo); vistos.push(t); }
  assert.ok(!vistos.includes('dunas'));
  assert.equal(vistos[vistos.indexOf('todos') - 1] !== undefined || vistos.includes('todos'), true);
});

test('nombreCorto: las detecciones sin nombre caben en la lista', () => {
  setIdioma('es');
  assert.equal(nombreCorto(sitio('mx0000')), 'Depresión MX0000');
  // G00003 es un probable tajo (tipo mina): el nombre corto no contradice el subtítulo.
  assert.equal(nombreCorto(sitio('g00003')), 'Tajo G00003');
  setIdioma('en');
  assert.equal(nombreCorto(sitio('mx0000')), 'Depression MX0000');
  assert.equal(nombreCorto(sitio('g00003')), 'Pit G00003');
  setIdioma('es');
  assert.equal(nombreCorto(sitio('mx0019')), 'La Herradura (Son.)');
});

test('minimapa: la máscara decodifica a 160 × 60 y todos los sitios caen dentro del mapa', () => {
  const m = decodificarMascara(MAPA_TIERRA);
  assert.equal(m.length, MAPA_TIERRA.alto);
  assert.ok(m.every((f) => f.length === MAPA_TIERRA.ancho));
  const caja = { x: 0, y: 0, w: 640, h: 240 };
  const opc = { lon: MAPA_TIERRA.lon, lat: MAPA_TIERRA.lat };
  for (const s of SITIOS.filter((x) => Number.isFinite(x.lat))) {
    const p = proyectar(s.lat, s.lon, caja, opc);
    assert.ok(p, `${s.id} fuera del mapa`);
    // Los sitios del modelo están en tierra (o junto a la costa, a una celda de 2.25°).
    const c = Math.floor(p.x / 4); const r = Math.floor(p.y / 4);
    const cerca = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => m[r + dy]?.[c + dx]));
    assert.ok(cerca, `${s.id} no cae en tierra`);
  }
  assert.deepEqual(proyectar(0, 0, caja, { lon: [-180, 180], lat: [90, -90] }), { x: 320, y: 120 });
  assert.equal(proyectar(89, 0, caja, opc), null);
});

test('Explorador: un punto nuevo de la API usa el formato de la tarjeta; novedoso por distancia a la lista conocida', () => {
  setIdioma('es');
  const meteor = conocidoMasCercano({ lat: 35.03, lon: -111.02 }, CONOCIDOS);
  assert.match(meteor.analogo.nombre, /Meteor Crater/);
  assert.ok(meteor.distanciaKm < 5);
  const datos = { variables: { ndvi: { valor: 0.08 } }, similitud: { total: 0.5, vetado: false } };
  const lejos = Object.fromEntries(porQuePunto(datos, { lat: 23.5, lon: 12.0 }, CONOCIDOS).map((x) => [x.clave, x]));
  assert.match(lejos.novedoso.valor, /^posible: ningún análogo conocido a < 50 km/);
  assert.match(lejos.forma.valor, /^sin dato/);
  assert.match(lejos.arido.valor, /NDVI medio 0\.08/);
  const junto = Object.fromEntries(porQuePunto({ similitud: { vetado: true }, variables: { ndvi: { valor: 0.7 } } }, { lat: 35.03, lon: -111.02 }, CONOCIDOS).map((x) => [x.clave, x]));
  assert.match(junto.novedoso.valor, /^no: a .* de Meteor Crater/);
  assert.match(junto.arido.valor, /^VETADO/);
});
