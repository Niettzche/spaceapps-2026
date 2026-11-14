// Dueño: frente expediente. Guardado de la partida en localStorage para "Continuar" (AGENTS.md §8: sin cuenta).
// No cambia la forma de `partida` (main.js, del integrador): solo copia sus campos y los restaura en el mismo objeto.
// Los sitios ya pagados con ticket viven aquí (estado propio del frente), no en `partida`.

import { serializarPartida, leerGuardado, usarTicket } from './logica.js';

const CLAVE = 'mision_cero.partida.v1';

const estado = { desbloqueados: [], activa: false, autoguardado: false };

function almacen() {
  try { return window.localStorage; } catch { return null; }
}

export function guardar(partida) {
  const ls = almacen();
  if (!ls || !estado.activa) return false;
  try { ls.setItem(CLAVE, JSON.stringify(serializarPartida(partida, estado.desbloqueados))); return true; } catch { return false; }
}

export function guardadoDisponible(destinos) {
  const ls = almacen();
  if (!ls) return null;
  try { return leerGuardado(ls.getItem(CLAVE), { destinos }); } catch { return null; }
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
  estado.desbloqueados = g.desbloqueados;
  activar(partida);
  return true;
}

/** Reinicia la partida: restaura tickets y presupuesto, vacía diseño, sitio y resultados (sin duplicar recursos). */
export function nuevaPartida(partida, destino, { presupuesto, tickets }) {
  partida.destino = destino;
  partida.presupuesto = presupuesto;
  partida.tickets = tickets;
  partida.diseno = [];
  partida.sitio = null;
  partida.resultados = [];
  estado.desbloqueados = [];
  activar(partida);
  guardar(partida);
}

export function sitioPagado(sitioId) {
  return estado.desbloqueados.includes(sitioId);
}

/** Gasta un ticket (si hace falta) y fija el sitio de la partida. Devuelve el resultado de `usarTicket`. */
export function elegirSitio(partida, sitio) {
  const r = usarTicket({ tickets: partida.tickets, desbloqueados: estado.desbloqueados }, sitio.id);
  if (!r.ok) return r;
  partida.tickets = r.tickets;
  estado.desbloqueados = r.desbloqueados;
  partida.sitio = sitio;
  guardar(partida);
  return r;
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
