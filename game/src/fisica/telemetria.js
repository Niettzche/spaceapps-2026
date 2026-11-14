// Telemetría de una partida → Result (data/schema/result.schema.json). Ver docs/juego/ESPECIFICACION.md §9–§12.

// Mismo evento (tipo + detalle) no se registra dos veces en menos de este tiempo (s), para no inundar la lista.
const ESPERA_REPETIDO_S = 2.5;

export class Telemetria {
  constructor() {
    this.eventos = [];
    this.ultimo = new Map();
  }

  /** Registra un evento { t, tipo, detalle }. Devuelve true si se guardó. */
  registrar(t, tipo, detalle = '') {
    const clave = `${tipo}|${detalle}`;
    const previo = this.ultimo.get(clave);
    if (previo !== undefined && t - previo < ESPERA_REPETIDO_S) return false;
    this.ultimo.set(clave, t);
    this.eventos.push({ t: Number(t.toFixed(2)), tipo, detalle });
    return true;
  }

  contar(tipo, detalle) {
    return this.eventos.filter((e) => e.tipo === tipo && (detalle === undefined || e.detalle === detalle)).length;
  }
}

/** Arma el objeto Result del contrato. Los números se acotan a los rangos del esquema. */
export function construirResultado({ sitio, destino, diseno, distancia_m, entrega, integridad_carga, energia_restante, costo, intentos, eventos }) {
  const acotar = (v) => Math.min(1, Math.max(0, Number(v.toFixed(3))));
  return {
    sitio: sitio ?? null,
    destino,
    diseno,
    distancia_m: Number(Math.max(0, distancia_m).toFixed(1)),
    entrega: Boolean(entrega),
    integridad_carga: acotar(integridad_carga),
    energia_restante: acotar(energia_restante),
    costo,
    intentos: Math.max(1, intentos),
    eventos,
  };
}
