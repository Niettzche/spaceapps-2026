// Pruebas del frente expediente. Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sitiosParaDestino, filasComparacion, limitesDe, usarTicket, serializarPartida, leerGuardado,
  validarCoordenadas, validarCoordenadasHemisferio, aHemisferio, formatoCoordenada, puedeProponer, validarNombrePropuesta, formatoValor, esDemostracion, SIN_DATO,
} from '../logica.js';

const destino = {
  id: 'jezero', mundo: 'marte', gravedad_ms2: 3.71,
  variables: {
    oscilacion_termica: { valor: null, unidad: 'K', fuente: 'MEDA', fecha: null },
    ndvi: { valor: 0, unidad: '-', fuente: 'Sin vegetación', fecha: null },
    pendiente: { valor: 5, unidad: 'grados', fuente: 'MOLA', fecha: null },
  },
  no_reproducible_en_tierra: ['gravedad', 'presion_atmosferica', 'radiacion'],
};
const sitio = {
  id: 'a', nombre: 'A', estado: 'candidato_modelo', destino_ref: 'jezero', prueba_util: null,
  variables: {
    forma: { valor: 0.8, unidad: '0-1', fuente: 'modelo' },
    profundidad_diametro: { valor: 0.14, unidad: '-', fuente: 'Copernicus' },
    diametro: { valor: 1.4, unidad: 'km', fuente: 'Copernicus' },
    oscilacion_termica: { valor: 14.5, unidad: 'K', fuente: 'NASA POWER', fecha: '2001-2025' },
    ndvi: { valor: 0.13, unidad: '-', fuente: 'MODIS' },
    pendiente: { valor: 2, unidad: '°', fuente: 'DEM' },
  },
  similitud: { total: 0.6, por_dimension: { forma: 0.8, ndvi: 0.4 }, confianza: 1 },
  limites: ['gravedad', 'presion', 'oscilacion_termica: destino por encima del máximo terrestre'],
};

test('sitiosParaDestino filtra por destino y ordena por similitud de mayor a menor', () => {
  const lista = [
    { id: 'x', nombre: 'X', estado: 'candidato_modelo', destino_ref: 'jezero', prueba_util: null, similitud: { total: 0.9 } },
    { id: 'y', nombre: 'Y', estado: 'documentado', destino_ref: 'jezero', prueba_util: 'agarre', similitud: { total: 0.4 } },
    { id: 'z', nombre: 'Z', estado: 'candidato_modelo', destino_ref: 'polo_sur_lunar', prueba_util: null, similitud: { total: 0.99 } },
    { id: 'w', nombre: 'W', estado: 'candidato_modelo', destino_ref: 'jezero', prueba_util: null, similitud: { total: null } },
  ];
  // Un sitio curado (y) ya no se adelanta a uno con más similitud (x).
  assert.deepEqual(sitiosParaDestino(lista, 'jezero').map((s) => s.id), ['x', 'y', 'w']);
});

test('un sitio ilustrativo, demo o sin similitud nunca queda primero', () => {
  const lista = [
    // Caso de main: sitio_3 es curado (prueba_util) pero ilustrativo y sin similitud.
    { id: 'sitio_3', nombre: 'A tercer sitio', estado: 'ilustrativo', destino_ref: 'jezero', prueba_util: 'energia', similitud: { total: null } },
    // Ilustrativo CON similitud alta: tampoco encabeza.
    { id: 'ilus', nombre: 'B ilustrativo', estado: 'ilustrativo', destino_ref: 'jezero', prueba_util: 'agarre', similitud: { total: 0.99 } },
    { id: 'demo', nombre: 'C demo', estado: 'documentado', demo: true, destino_ref: 'jezero', prueba_util: null, similitud: { total: 0.95 } },
    { id: 'pinacate', nombre: 'Pinacate', estado: 'documentado', destino_ref: 'jezero', prueba_util: 'relieve', similitud: { total: 0.149 } },
    { id: 'samalayuca', nombre: 'Samalayuca', estado: 'candidato_modelo', destino_ref: 'jezero', prueba_util: 'agarre', similitud: { total: 0.4605 } },
  ];
  const ids = sitiosParaDestino(lista, 'jezero').map((s) => s.id);
  assert.deepEqual(ids.slice(0, 2), ['samalayuca', 'pinacate']);
  assert.deepEqual(ids.slice(2).sort(), ['demo', 'ilus', 'sitio_3']);
  // Solo hay sitios sin similitud real: el orden es por nombre y no falla.
  assert.deepEqual(sitiosParaDestino(lista.slice(0, 2), 'jezero').map((s) => s.id), ['sitio_3', 'ilus']);
});

test('filasComparacion: forma primero, misma variable en ambos lados, sin inventar', () => {
  const { filas, soloTierra } = filasComparacion(sitio, destino);
  assert.deepEqual(filas.map((f) => f.clave), ['forma', 'oscilacion_termica', 'ndvi', 'pendiente']);
  const osc = filas.find((f) => f.clave === 'oscilacion_termica');
  assert.equal(osc.destino.valor, null); // el destino no tiene dato: no se rellena
  assert.equal(osc.similitud, null);
  assert.equal(filas[0].tierra.valor, 0.14); // forma muestra profundidad/diámetro del lado Tierra
  assert.equal(filas[0].similitud, 0.8);
  assert.equal(filas.find((f) => f.clave === 'pendiente').mismaUnidad, false); // ° vs grados → se advierte
  assert.deepEqual(soloTierra.map((x) => x.clave), ['diametro']);
});

test('sin forma en el sitio no aparece la fila de forma', () => {
  const s = { ...sitio, variables: { ndvi: sitio.variables.ndvi }, similitud: { por_dimension: {} } };
  assert.ok(!filasComparacion(s, destino).filas.some((f) => f.clave === 'forma'));
});

test('limitesDe une destino y sitio sin duplicar presión', () => {
  const l = limitesDe(sitio, destino);
  assert.deepEqual(l.noReproducible.map((x) => x.clave), ['gravedad', 'presion_atmosferica', 'radiacion']);
  assert.equal(l.notas.length, 1);
});

test('tickets: se gastan, no bajan de cero, repetir sitio no cuesta', () => {
  let e = { tickets: 1, desbloqueados: [] };
  const r1 = usarTicket(e, 'a');
  assert.equal(r1.ok, true); assert.equal(r1.gastado, true); assert.equal(r1.tickets, 0);
  const r2 = usarTicket(r1, 'a');
  assert.equal(r2.ok, true); assert.equal(r2.gastado, false); assert.equal(r2.tickets, 0);
  const r3 = usarTicket(r1, 'b');
  assert.equal(r3.ok, false); assert.equal(r3.motivo, 'sin_tickets'); assert.equal(r3.tickets, 0);
  assert.deepEqual(e, { tickets: 1, desbloqueados: [] }); // no muta
});

test('guardado: ida y vuelta, y rechaza basura', () => {
  const p = { destino: 'jezero', presupuesto: 900, tickets: 2, diseno: [{ ranura: 'r1', pieza: 'p' }], sitio: { id: 'a' }, resultados: [] };
  const g = leerGuardado(JSON.stringify(serializarPartida(p, ['a'])), { destinos: { jezero: {} } });
  assert.equal(g.sitio, 'a'); assert.equal(g.tickets, 2); assert.deepEqual(g.desbloqueados, ['a']);
  assert.equal(leerGuardado('{no json'), null);
  assert.equal(leerGuardado(JSON.stringify({ version: 99 })), null);
  assert.equal(leerGuardado(JSON.stringify(serializarPartida({ ...p, destino: 'pluton' })), { destinos: { jezero: {} } }), null);
});

test('validarCoordenadas', () => {
  assert.deepEqual(validarCoordenadas('31.84', '-113.39'), { ok: true, lat: 31.84, lon: -113.39 });
  assert.equal(validarCoordenadas('31,5', '10').lat, 31.5);
  assert.equal(validarCoordenadas('91', '0').ok, false);
  assert.equal(validarCoordenadas('0', '-181').ok, false);
  assert.equal(validarCoordenadas('', '0').ok, false);
  assert.equal(validarCoordenadas('abc', '0').ok, false);
  assert.equal(validarCoordenadas('1e5', '0').ok, false);
});

test('puedeProponer exige permiso de la API y umbral', () => {
  assert.equal(puedeProponer({ puede_proponer: true, similitud: { total: 0.61 } }, 0.6), true);
  assert.equal(puedeProponer({ puede_proponer: true, similitud: { total: 0.5 } }, 0.6), false);
  assert.equal(puedeProponer({ puede_proponer: false, similitud: { total: 0.9 } }, 0.6), false);
  assert.equal(puedeProponer({ puede_proponer: true, similitud: { total: null } }, 0.6), false);
});

test('formatos y marcas', () => {
  assert.equal(formatoValor(null), SIN_DATO);
  assert.equal(formatoValor({ valor: null, unidad: 'K' }), SIN_DATO);
  assert.equal(formatoValor({ valor: 14.513, unidad: 'K' }), '14.51 K');
  assert.equal(formatoValor({ valor: 0, unidad: '-' }), '0');
  assert.equal(esDemostracion({ estado: 'ilustrativo' }), true);
  assert.equal(esDemostracion({ estado: 'documentado', demo: true }), true);
  assert.equal(esDemostracion({ estado: 'documentado' }), false);
  assert.equal(validarNombrePropuesta('  ab ').ok, false);
  assert.equal(validarNombrePropuesta('Cráter X').nombre, 'Cráter X');
});

test('hemisferio: S y O se convierten a grados negativos antes de llamar a /score', () => {
  assert.deepEqual(validarCoordenadasHemisferio({ lat: '31.84', latHem: 'N', lon: '113.39', lonHem: 'O' }), { ok: true, lat: 31.84, lon: -113.39 });
  assert.deepEqual(validarCoordenadasHemisferio({ lat: '22,9', latHem: 'S', lon: '41.14', lonHem: 'E' }), { ok: true, lat: -22.9, lon: 41.14 });
  // 0 no lleva signo aunque el hemisferio sea S u O
  const cero = validarCoordenadasHemisferio({ lat: '0', latHem: 'S', lon: '0', lonHem: 'O' });
  assert.ok(cero.ok && Object.is(cero.lat, 0) && Object.is(cero.lon, 0));
});

test('hemisferio: rechaza signo, rangos fuera y hemisferio sin elegir', () => {
  assert.equal(validarCoordenadasHemisferio({ lat: '-31', latHem: 'N', lon: '10', lonHem: 'E' }).ok, false);
  assert.equal(validarCoordenadasHemisferio({ lat: '91', latHem: 'N', lon: '10', lonHem: 'E' }).ok, false);
  assert.equal(validarCoordenadasHemisferio({ lat: '10', latHem: 'N', lon: '181', lonHem: 'E' }).ok, false);
  assert.equal(validarCoordenadasHemisferio({ lat: '10', latHem: '', lon: '10', lonHem: 'E' }).ok, false);
  assert.equal(validarCoordenadasHemisferio({ lat: '10', latHem: 'N', lon: '10', lonHem: 'W' }).ok, false);
  assert.equal(validarCoordenadasHemisferio({ lat: 'abc', latHem: 'N', lon: '10', lonHem: 'E' }).ok, false);
});

test('aHemisferio y formatoCoordenada: ida y vuelta con un sitio del catálogo', () => {
  const h = aHemisferio(-21.92, -68.832);
  assert.deepEqual(h, { lat: 21.92, latHem: 'S', lon: 68.832, lonHem: 'O' });
  const v = validarCoordenadasHemisferio({ lat: String(h.lat), latHem: h.latHem, lon: String(h.lon), lonHem: h.lonHem });
  assert.deepEqual(v, { ok: true, lat: -21.92, lon: -68.832 });
  assert.equal(formatoCoordenada(31.84, -113.39), '31.84° N, 113.39° O');
});
