// Pruebas del flujo de tickets (AGENTS.md §4): partida nueva, gastar, repetir sitio pagado, guardar/Continuar,
// volver al Menú y reiniciarPartida (main.js). Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// localStorage y eventos mínimos del navegador para guardado.js (Node no los trae).
const memoria = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
    setItem: (k, v) => memoria.set(k, String(v)),
    removeItem: (k) => memoria.delete(k),
  },
  addEventListener() {},
};
globalThis.document = { addEventListener() {}, visibilityState: 'visible' };

const { nuevaPartida, elegirSitio, sitioPagado, restaurar, guardar, guardadoDisponible } = await import('../guardado.js');
const { conciliarTickets, leerGuardado, serializarPartida } = await import('../logica.js');
const { TICKETS_POR_PARTIDA, PRESUPUESTO_INICIAL } = await import('../../../config/world.js');

const DESTINOS = { jezero: {}, polo_sur_lunar: {} };
const SITIOS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
const [A, B, C, D] = SITIOS;
// Igual que main.js (no se importa: arrastra Phaser).
const estadoInicial = () => ({ destino: 'jezero', presupuesto: PRESUPUESTO_INICIAL, tickets: TICKETS_POR_PARTIDA, diseno: [], sitio: null, resultados: [] });
function reiniciarPartida(partida) {
  for (const key of Object.keys(partida)) delete partida[key];
  Object.assign(partida, estadoInicial());
  return partida;
}
const empezar = (p, destino = 'jezero') => nuevaPartida(p, destino, { presupuesto: PRESUPUESTO_INICIAL, tickets: TICKETS_POR_PARTIDA });

beforeEach(() => memoria.clear());

test('partida nueva: 3 tickets, ningún sitio pagado, y queda guardada', () => {
  const p = estadoInicial();
  empezar(p);
  assert.equal(p.tickets, 3);
  assert.equal(sitioPagado(p, 'a'), false);
  const g = guardadoDisponible(DESTINOS);
  assert.equal(g.tickets, 3);
  assert.deepEqual(g.desbloqueados, []);
});

test('probar un sitio nuevo gasta 1; volver a probarlo no gasta; sin tickets solo se prueban los pagados', () => {
  const p = estadoInicial();
  empezar(p);
  assert.equal(elegirSitio(p, A).gastado, true);
  assert.equal(p.tickets, 2);
  const otra = elegirSitio(p, A);
  assert.equal(otra.ok, true); assert.equal(otra.gastado, false);
  assert.equal(p.tickets, 2);
  elegirSitio(p, B); elegirSitio(p, C);
  assert.equal(p.tickets, 0);
  const sin = elegirSitio(p, D);
  assert.equal(sin.ok, false); assert.equal(sin.motivo, 'sin_tickets');
  assert.equal(p.sitio.id, 'c'); // no cambia el sitio si no se pudo pagar
  assert.equal(elegirSitio(p, A).ok, true);
  assert.equal(p.tickets, 0);
  assert.equal(guardadoDisponible(DESTINOS).tickets, 0);
});

test('Continuar (página nueva) restaura los mismos tickets y sitios pagados', () => {
  const p = estadoInicial();
  empezar(p, 'polo_sur_lunar');
  elegirSitio(p, A);
  elegirSitio(p, B);
  const nueva = estadoInicial(); // lo que hay en memoria al recargar la página
  assert.equal(restaurar(nueva, SITIOS, DESTINOS), true);
  assert.equal(nueva.tickets, 1);
  assert.equal(nueva.destino, 'polo_sur_lunar');
  assert.equal(nueva.sitio.id, 'b');
  assert.equal(sitioPagado(nueva, 'a'), true);
  assert.equal(elegirSitio(nueva, A).gastado, false);
  assert.equal(nueva.tickets, 1);
});

test('volver al Menú: guardar pone al día diseño y resultados sin tocar los tickets', () => {
  const p = estadoInicial();
  empezar(p);
  elegirSitio(p, A);
  p.diseno = [{ ranura: 'r1', pieza: 'rueda_ancha' }];
  p.resultados.push({ tipo: 'prueba' });
  guardar(p); // lo que hace Menu.create() con una partida activa
  const nueva = estadoInicial();
  restaurar(nueva, SITIOS, DESTINOS);
  assert.equal(nueva.tickets, 2);
  assert.deepEqual(nueva.diseno, p.diseno);
  assert.equal(nueva.resultados.length, 1);
});

test('Nueva partida tras gastar: vuelve a 3 y los sitios pagados de la anterior ya no son gratis', () => {
  const p = estadoInicial();
  empezar(p);
  elegirSitio(p, A); elegirSitio(p, B);
  empezar(p, 'polo_sur_lunar');
  assert.equal(p.tickets, 3);
  assert.equal(sitioPagado(p, 'a'), false);
  assert.equal(elegirSitio(p, A).gastado, true);
  assert.equal(p.tickets, 2);
});

test('reiniciarPartida (main.js) también olvida los sitios pagados; el guardado queda coherente', () => {
  const p = estadoInicial();
  empezar(p);
  elegirSitio(p, A); elegirSitio(p, B);
  reiniciarPartida(p);
  assert.equal(p.tickets, 3);
  assert.equal(sitioPagado(p, 'a'), false); // antes: seguía pagado (lista aparte en guardado.js)
  guardar(p); // autoguardado al ocultar la pestaña
  const g = guardadoDisponible(DESTINOS);
  assert.equal(g.tickets, 3);
  assert.deepEqual(g.desbloqueados, []); // antes: 3 tickets + 2 sitios pagados = 5 pruebas
});

test('conciliarTickets: el sitio en juego cuenta como pagado y tickets + pagados ≤ 3', () => {
  assert.deepEqual(conciliarTickets({ tickets: 2, desbloqueados: ['a'], sitio: 'a' }, 3), { tickets: 2, desbloqueados: ['a'] });
  // Guardado sin lista de pagados (formato anterior): el sitio en juego ya se pagó.
  assert.deepEqual(conciliarTickets({ tickets: 2, sitio: 'a' }, 3), { tickets: 2, desbloqueados: ['a'] });
  assert.deepEqual(conciliarTickets({ tickets: 3, desbloqueados: ['a', 'b'], sitio: null }, 3), { tickets: 1, desbloqueados: ['a', 'b'] });
  assert.equal(conciliarTickets({ tickets: 7, desbloqueados: [] }, 3).tickets, 3);
  assert.equal(conciliarTickets({ tickets: -2, desbloqueados: [] }, 3).tickets, 0);
  assert.equal(conciliarTickets({ tickets: 1.7, desbloqueados: [] }, 3).tickets, 1);
  assert.equal(conciliarTickets({ tickets: Number.NaN, desbloqueados: [] }, 3).tickets, 0);
  assert.deepEqual(conciliarTickets({ tickets: 1, desbloqueados: ['a', 'a', 5, ''] }, 3).desbloqueados, ['a']);
});

test('leerGuardado con maxTickets repara guardados editados o viejos', () => {
  const base = serializarPartida({ destino: 'jezero', presupuesto: 1000, tickets: 9, diseno: [], sitio: { id: 'a' }, resultados: [] }, []);
  const g = leerGuardado(JSON.stringify(base), { destinos: DESTINOS, maxTickets: 3 });
  assert.equal(g.tickets, 2);
  assert.deepEqual(g.desbloqueados, ['a']);
  // Sin maxTickets se conserva el comportamiento anterior (lo usa logica.test.js).
  assert.equal(leerGuardado(JSON.stringify(base), { destinos: DESTINOS }).tickets, 9);
});

test('el guardado escrito a mano con 9 tickets no se muestra como 9 al Continuar', () => {
  memoria.set('mision_cero.partida.v1', JSON.stringify({ version: 1, destino: 'jezero', presupuesto: 1000, tickets: 9, diseno: [], sitio: null, resultados: [], desbloqueados: [] }));
  const p = estadoInicial();
  restaurar(p, SITIOS, DESTINOS);
  assert.equal(p.tickets, 3);
});
