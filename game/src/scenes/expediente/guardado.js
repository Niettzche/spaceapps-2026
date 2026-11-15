// Dueño: frente expediente. Guardado de la partida en localStorage para "Continuar" (AGENTS.md §8: sin cuenta).
// Copia los campos de `partida` (main.js, del integrador) y los restaura en el mismo objeto.
// Los sitios ya pagados con ticket viven en `partida.desbloqueados`: así `reiniciarPartida()` (main.js), que borra
// todas las claves de `partida`, también los borra. Antes vivían aparte en este módulo y sobrevivían al reinicio:
// la partida volvía a 3 tickets pero conservaba los sitios pagados (y el guardado mezclaba ambos).

import { serializarPartida, leerGuardado, usarTicket } from './logica.js';
import { TICKETS_POR_PARTIDA } from '../../config/world.js';

const CLAVE = 'mision_cero.partida.v1';

const estado = { activa: false, autoguardado: false, sitioPedido: null };

function almacen() {
  try { return window.localStorage; } catch { return null; }
}

/** Sitios pagados de la partida (lista vacía si la partida es nueva o se reinició). */
export function desbloqueadosDe(partida) {
  return Array.isArray(partida?.desbloqueados) ? partida.desbloqueados : [];
}

export function guardar(partida) {
  const ls = almacen();
  if (!ls || !estado.activa) return false;
  try { ls.setItem(CLAVE, JSON.stringify(serializarPartida(partida, desbloqueadosDe(partida)))); return true; } catch { return false; }
}

export function guardadoDisponible(destinos) {
  const ls = almacen();
  if (!ls) return null;
  try { return leerGuardado(ls.getItem(CLAVE), { destinos, maxTickets: TICKETS_POR_PARTIDA }); } catch { return null; }
}

export function borrarGuardado() {
  try { almacen()?.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
}

/** Restaura el guardado dentro del MISMO objeto `partida` (las demás escenas lo importan por referencia). */
export function restaurar(partida, sitios, destinos) {
  const g = guardadoDisponible(destinos);
  if (!g) return false;
  partida.destino = g.destino;
  partida.presupuesto = g.presupuesto;
  partida.tickets = g.tickets;
  partida.diseno = g.diseno;
  partida.resultados = g.resultados;
  partida.sitio = sitios.find((s) => s.id === g.sitio) || null;
  partida.desbloqueados = g.desbloqueados;
  activar(partida);
  return true;
}

/** Reinicia la partida: restaura tickets y presupuesto, vacía diseño, sitio, resultados y sitios pagados. */
export function nuevaPartida(partida, destino, { presupuesto, tickets }) {
  partida.destino = destino;
  partida.presupuesto = presupuesto;
  partida.tickets = tickets;
  partida.diseno = [];
  partida.sitio = null;
  partida.resultados = [];
  partida.desbloqueados = [];
  activar(partida);
  guardar(partida);
}

export function sitioPagado(partida, sitioId) {
  return desbloqueadosDe(partida).includes(sitioId);
}

/** Gasta un ticket (si hace falta) y fija el sitio de la partida. Devuelve el resultado de `usarTicket`. */
export function elegirSitio(partida, sitio) {
  const r = usarTicket({ tickets: partida.tickets, desbloqueados: desbloqueadosDe(partida) }, sitio.id);
  if (!r.ok) return r;
  partida.tickets = r.tickets;
  partida.desbloqueados = r.desbloqueados;
  partida.sitio = sitio;
  guardar(partida);
  return r;
}

/**
 * El Explorador abre el Expediente de un sitio jugable del catálogo. Sin partida en curso, retoma la guardada o empieza
 * una nueva (como "Nueva partida"). El destino pasa a ser el gemelo del sitio (`destino_ref`); si el sitio en juego
 * era de otro destino, se suelta (los tickets y los sitios ya pagados se conservan). No gasta tickets.
 */
export function visitarSitio(partida, sitio, { sitios, destinos, presupuesto, tickets }) {
  if (!estado.activa && !restaurar(partida, sitios, destinos)) nuevaPartida(partida, sitio.destino_ref, { presupuesto, tickets });
  if (partida.destino !== sitio.destino_ref) {
    partida.destino = sitio.destino_ref;
    if (partida.sitio && partida.sitio.destino_ref !== sitio.destino_ref) partida.sitio = null;
  }
  guardar(partida);
  estado.sitioPedido = sitio.id;
}

/** Id del sitio que pidió el Explorador (una sola vez) o null. */
export function tomarSitioPedido() {
  const id = estado.sitioPedido;
  estado.sitioPedido = null;
  return id;
}

export function partidaActiva() {
  return estado.activa;
}

// Guarda también lo que cambien otras escenas (diseño, resultados) al ocultar o cerrar la pestaña.
function activar(partida) {
  estado.activa = true;
  if (estado.autoguardado || typeof window === 'undefined') return;
  estado.autoguardado = true;
  window.addEventListener('pagehide', () => guardar(partida));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardar(partida); });
}
