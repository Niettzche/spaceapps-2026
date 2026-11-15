// Dueño: frente taller. Historial de cambios del diseño (Deshacer / Rehacer), sin Phaser (se prueba con node).
// Cada estado es un mapa { ranura: idPieza } (el mismo que usa el Taller); se guarda una copia, nunca la referencia.
// Cada paso lleva el `cambio` que llevó a ese estado (p. ej. { ranura, texto }) para que el Taller avise qué se deshizo.

export const LIMITE_HISTORIAL = 50;

const copia = (mapa) => {
  const m = {};
  for (const [k, v] of Object.entries(mapa || {})) if (v != null && v !== '') m[k] = v;
  return m;
};

/** Mismo diseño (ignora ranuras vacías y el orden de las claves). */
export function iguales(a, b) {
  const x = copia(a);
  const y = copia(b);
  const kx = Object.keys(x);
  return kx.length === Object.keys(y).length && kx.every((k) => x[k] === y[k]);
}

/** Ranuras cuya pieza cambió entre dos mapas, en el orden de `orden` (si se da) o alfabético. */
export function diferencias(antes, despues, orden = null) {
  const a = copia(antes);
  const d = copia(despues);
  const todas = [...new Set([...Object.keys(a), ...Object.keys(d)])].filter((k) => a[k] !== d[k]);
  if (!orden) return todas.sort();
  const pos = (k) => { const i = orden.indexOf(k); return i < 0 ? orden.length : i; };
  return todas.sort((p, q) => pos(p) - pos(q) || (p < q ? -1 : 1));
}

export class Historial {
  constructor(inicial, { limite = LIMITE_HISTORIAL } = {}) {
    this.limite = Math.max(1, limite);
    this.pasado = [];
    this.presente = { estado: copia(inicial), cambio: null };
    this.futuro = [];
  }

  /** Copia del estado actual. */
  get actual() { return copia(this.presente.estado); }
  get puedeDeshacer() { return this.pasado.length > 0; }
  get puedeRehacer() { return this.futuro.length > 0; }

  /** Registra un estado nuevo. Si es igual al actual no hace nada (false). Borra lo que se podía rehacer. */
  registrar(estado, cambio = null) {
    if (iguales(estado, this.presente.estado)) return false;
    this.pasado.push(this.presente);
    if (this.pasado.length > this.limite) this.pasado.shift();
    this.presente = { estado: copia(estado), cambio };
    this.futuro = [];
    return true;
  }

  /** Vuelve al estado anterior. Devuelve { estado, cambio } (cambio = lo que se deshizo) o null si no hay. */
  deshacer() {
    if (!this.pasado.length) return null;
    const deshecho = this.presente;
    this.futuro.push(deshecho);
    this.presente = this.pasado.pop();
    return { estado: copia(this.presente.estado), cambio: deshecho.cambio };
  }

  /** Repite el último cambio deshecho. Devuelve { estado, cambio } o null si no hay. */
  rehacer() {
    if (!this.futuro.length) return null;
    this.pasado.push(this.presente);
    this.presente = this.futuro.pop();
    return { estado: copia(this.presente.estado), cambio: this.presente.cambio };
  }
}

/**
 * Historial al abrir el Taller. `entrada` es el diseño con el que se abre (mapa).
 * Si en esta misma partida (`clave`) el Taller se cerró con otro diseño (`memoria.mapa`) y algo lo cambió afuera
 * (p. ej. "Aplicar y al taller" en Resultados), ese diseño anterior es la base y el cambio queda como primer paso:
 * Deshacer lo revierte. En cualquier otro caso el historial empieza vacío con `entrada`.
 * `cambioExterno(antes, despues)` arma el `cambio` que se guarda para ese primer paso.
 */
export function historialAlEntrar(memoria, entrada, clave, cambioExterno = () => null, opciones = {}) {
  if (memoria && memoria.clave === clave && memoria.mapa && !iguales(memoria.mapa, entrada)) {
    const h = new Historial(memoria.mapa, opciones);
    h.registrar(entrada, cambioExterno(copia(memoria.mapa), copia(entrada)));
    return h;
  }
  return new Historial(entrada, opciones);
}
