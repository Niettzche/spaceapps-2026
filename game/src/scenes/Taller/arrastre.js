// Dueño: frente taller. Reglas del armado por arrastre (sin Phaser, se prueban con node): pestañas de la bandeja, sockets
// válidos de cada pieza, poner / quitar / mover una pieza y "igual en ambos ejes". Taller.js solo dibuja y anima.
// Trabajan sobre el mapa { ranura: idPieza } del Taller (diseno.js comoMapa); nunca modifican el mapa recibido.
import { RANURAS, costoEnRanura } from './diseno.js';
import { BLOQUEADAS } from './bloqueadas.js';

/** Pestañas de la bandeja, por sistema. `sistemas` = sistemas de parts.json que muestra; `bloqueadas` = las del libro sin mecánica. */
export const PESTANAS = [
  { id: 'movilidad', nombre: 'Movilidad', nombre_en: 'Mobility', sistemas: ['movilidad'] },
  { id: 'estructura', nombre: 'Estructura', nombre_en: 'Structure', sistemas: ['estructura'] },
  { id: 'energia', nombre: 'Energía', nombre_en: 'Power', sistemas: ['energia', 'potencia'] },
  { id: 'proteccion', nombre: 'Protección', nombre_en: 'Protection', sistemas: ['carga'] },
  { id: 'modulo', nombre: 'Módulo', nombre_en: 'Module', sistemas: ['modulo'] },
  { id: 'bloqueadas', nombre: 'Bloqueadas', nombre_en: 'Locked', sistemas: [], bloqueadas: true },
];

/** Tarjetas de una pestaña: piezas jugables (en el orden de parts.json) o las bloqueadas ({ ...b, bloqueada: true }). */
export function tarjetasDe(idPestana, catalogo) {
  const t = PESTANAS.find((p) => p.id === idPestana);
  if (!t) return [];
  if (t.bloqueadas) return BLOQUEADAS.map((b) => ({ ...b, bloqueada: true }));
  // Por sistema en el orden de la pestaña (en Energía: baterías y luego motores).
  return t.sistemas.flatMap((s) => catalogo.filter((p) => p.sistema === s));
}

/** Pestaña donde está la pieza que va en una ranura. */
export function pestanaDeRanura(idRanura) {
  const r = RANURAS.find((x) => x.id === idRanura);
  return r ? PESTANAS.find((t) => t.sistemas.includes(r.sistema))?.id ?? null : null;
}

/** Ranuras (sockets) donde cabe una pieza; [] si es bloqueada o no existe. */
export function socketsPara(pieza) {
  if (!pieza || pieza.bloqueada) return [];
  return RANURAS.filter((r) => r.sistema === pieza.sistema).map((r) => r.id);
}

/**
 * Socket donde va una pieza al "ponerla" sin arrastrar (Enter, doble toque): el elegido si la acepta; si no, el primero
 * que la acepte y esté vacío o tenga otra pieza; si ya está puesta en todos, el primero.
 */
export function socketPreferido(pieza, elegido, mapa = {}) {
  const validos = socketsPara(pieza);
  if (!validos.length) return null;
  if (validos.includes(elegido)) return elegido;
  return validos.find((r) => mapa[r] !== pieza.id) ?? validos[0];
}

/**
 * Pone una pieza en un socket. Devuelve { ok, mapa, antes, motivo }: `antes` = pieza que había (o null).
 * motivo: 'bloqueada' | 'no_cabe' | 'igual' cuando ok es false.
 */
export function poner(mapa, pieza, idRanura) {
  if (!pieza) return { ok: false, mapa, antes: null, motivo: 'no_cabe' };
  if (pieza.bloqueada) return { ok: false, mapa, antes: null, motivo: 'bloqueada' };
  if (!socketsPara(pieza).includes(idRanura)) return { ok: false, mapa, antes: null, motivo: 'no_cabe' };
  const antes = mapa[idRanura] ?? null;
  if (antes === pieza.id) return { ok: false, mapa, antes, motivo: 'igual' };
  return { ok: true, mapa: { ...mapa, [idRanura]: pieza.id }, antes, motivo: null };
}

export const EJES = ['rueda_del', 'rueda_tras'];

/**
 * Pone una rueda en un eje. Por defecto (retro de Leo, 15 nov) la rueda va a LOS DOS ejes con una sola acción; con
 * `separar` (Mayús al soltar o el modo «Separar ejes») solo al eje donde se soltó. Para cualquier otra pieza es `poner`.
 * Devuelve lo mismo que `poner` más `ambos` (true si cambió los dos ejes) y `otro` (el otro eje).
 */
export function ponerRueda(mapa, pieza, idRanura, { separar = false } = {}) {
  if (separar || !EJES.includes(idRanura) || !pieza || pieza.bloqueada || !socketsPara(pieza).includes(idRanura)) {
    return { ...poner(mapa, pieza, idRanura), ambos: false, otro: null };
  }
  const otro = idRanura === 'rueda_del' ? 'rueda_tras' : 'rueda_del';
  const antes = mapa[idRanura] ?? null;
  if (mapa[idRanura] === pieza.id && mapa[otro] === pieza.id) return { ok: false, mapa, antes, motivo: 'igual', ambos: true, otro };
  return { ok: true, mapa: { ...mapa, [idRanura]: pieza.id, [otro]: pieza.id }, antes, motivo: null, ambos: true, otro };
}

/** Quita la pieza de un socket. { ok, mapa, antes }. */
export function quitar(mapa, idRanura) {
  const antes = mapa[idRanura] ?? null;
  if (!antes) return { ok: false, mapa, antes };
  const nuevo = { ...mapa };
  delete nuevo[idRanura];
  return { ok: true, mapa: nuevo, antes };
}

/**
 * Mueve la pieza de un socket a otro (arrastrarla del robot a otro socket válido): el origen queda vacío.
 * Si el destino es el mismo socket, no cambia nada.
 */
export function mover(mapa, desde, hacia, catalogo) {
  const id = mapa[desde];
  if (!id || desde === hacia) return { ok: false, mapa, antes: null };
  const pieza = catalogo.find((p) => p.id === id);
  const r = poner(mapa, pieza, hacia);
  if (!r.ok) return r;
  const nuevo = { ...r.mapa };
  delete nuevo[desde];
  return { ok: true, mapa: nuevo, antes: r.antes };
}

/** "Igual en ambos ejes": copia la rueda del eje `desde` (o la delantera) al otro. */
export function ambosEjes(mapa, desde = 'rueda_del') {
  const origen = ['rueda_del', 'rueda_tras'].includes(desde) && mapa[desde] ? desde : (mapa.rueda_del ? 'rueda_del' : 'rueda_tras');
  const otro = origen === 'rueda_del' ? 'rueda_tras' : 'rueda_del';
  const id = mapa[origen];
  if (!id || mapa[otro] === id) return { ok: false, mapa, origen, otro };
  return { ok: true, mapa: { ...mapa, [otro]: id }, origen, otro };
}

/** Costo del mapa (mismas reglas que resumen: ruedas × 2). */
export function costoDe(mapa, catalogo) {
  const porId = Object.fromEntries(catalogo.map((p) => [p.id, p]));
  return RANURAS.reduce((s, r) => s + costoEnRanura(r.id, porId[mapa[r.id]]), 0);
}

/** Nombre corto para tarjetas y sockets (≤ 12 letras; la ranura ya dice si es motor o batería); si no está en la tabla, el nombre completo. */
const CORTOS = {
  rueda_estandar: ['Estándar', 'Standard'], rueda_ancha: ['Ancha', 'Wide'], rueda_tacos: ['Con tacos', 'Cleated'],
  rueda_malla: ['Malla LRV', 'LRV mesh'], rueda_nitinol: ['Nitinol', 'Nitinol'],
  chasis_ligero: ['Ligero', 'Light'], chasis_reforzado: ['Reforzado', 'Reinforced'], chasis_titanio: ['Titanio', 'Titanium'],
  chasis_carbono: ['Carbono', 'Carbon'],
  bateria_chica: ['Chica', 'Small'], bateria_mediana: ['Mediana', 'Medium'], bateria_grande: ['Grande', 'Large'],
  motor_eficiente: ['Eficiente', 'Efficient'], motor_equilibrado: ['Equilibrado', 'Balanced'], motor_potente: ['Potente', 'Powerful'],
  soporte_basico: ['Básico', 'Basic'], soporte_correas: ['Correas', 'Straps'], soporte_amortiguado: ['Amortiguado', 'Cushioned'],
  panel_solar: ['Panel solar', 'Solar panel'], panel_solar_grande: ['Panel ×2', 'Big panel'],
  calentador_bateria: ['Calentador', 'Heater'], radiador: ['Radiador', 'Radiator'], auto_rescate: ['Rescate', 'Self-rescue'],
  // Bloqueadas (Taller/bloqueadas.js)
  orugas: ['Orugas', 'Tracks'], patas: ['Patas', 'Legs'], rappel: ['Rappel', 'Rappel'], rotor: ['Rotor', 'Rotor'],
  serpiente: ['Serpiente', 'Snake'], direccion_independiente: ['Dirección', 'Steering'], sellos_polvo: ['Sellos polvo', 'Dust seals'],
  sensor_sol: ['Ruta con sol', 'Sun route'], hibernacion: ['Hibernación', 'Hibernation'], blindaje: ['Blindaje', 'Shielding'],
  rueda_goma: ['Rueda goma', 'Rubber tire'],
};
export function nombreCorto(pieza, en = false) {
  const c = CORTOS[pieza.id];
  if (c) return c[en ? 1 : 0];
  return (en && pieza.nombre_en) || pieza.nombre;
}
