// Dueño: frente expediente. Explorador SIN API (AGENTS.md §3 regla 7): lógica pura, sin Phaser ni navegador.
// 1) Catálogo precalculado: el sitio de data/sites/ más cercano a una coordenada (distancia de gran círculo).
// 2) Clima en vivo de NASA POWER (opcional): similitud SOLO de las dimensiones complementarias de clima, con la misma
//    fórmula, escalas y rangos que model/score.py. Sin forma del cráter no hay similitud total ni se puede proponer.
// Nunca se inventan valores: lo que falta queda en null.

/** Radio medio de la Tierra (IUGG), en km. */
export const RADIO_TIERRA_KM = 6371.0088;

/** Distancia de gran círculo (haversine) en km entre dos puntos { lat, lon } en grados. */
export function distanciaKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const conCoordenadas = (s) => s && Number.isFinite(s.lat) && Number.isFinite(s.lon);

/**
 * Busca en el catálogo el sitio más cercano a `punto`.
 * Devuelve { encontrado: { sitio, distanciaKm } | null, cercanos: [{ sitio, distanciaKm }] (los `cuantos` más cercanos,
 * de menor a mayor), total: sitios con coordenadas }. `encontrado` solo si el más cercano está a ≤ radioKm.
 */
export function buscarEnCatalogo(sitios, punto, { radioKm, cuantos = 3 } = {}) {
  const ordenados = (sitios || []).filter(conCoordenadas)
    .map((sitio) => ({ sitio, distanciaKm: distanciaKm(punto, sitio) }))
    .sort((x, y) => (x.distanciaKm - y.distanciaKm) || String(x.sitio.id).localeCompare(String(y.sitio.id)));
  const primero = ordenados[0] || null;
  const encontrado = primero && typeof radioKm === 'number' && primero.distanciaKm <= radioKm ? primero : null;
  return { encontrado, cercanos: ordenados.slice(0, cuantos), total: ordenados.length };
}

/** "0.4 km" · "12.3 km" · "1234 km". */
export function formatoDistancia(km) {
  if (!Number.isFinite(km)) return '—';
  return km < 100 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

// ---------- Clima en vivo (NASA POWER) ----------

export const POWER_URL = 'https://power.larc.nasa.gov/api/temporal/climatology/point';

/** Misma consulta que model/features.py (climatología por punto, comunidad AG, 4 decimales). */
export function urlPower(lat, lon) {
  const q = new URLSearchParams({
    parameters: 'T2M_RANGE,PRECTOTCORR', community: 'AG',
    latitude: String(Math.round(lat * 1e4) / 1e4), longitude: String(Math.round(lon * 1e4) / 1e4), format: 'JSON',
  });
  return `${POWER_URL}?${q}`;
}

/**
 * Respuesta de NASA POWER → variables con valor, unidad, fuente y fecha (mismo formato que model/features.py).
 * Devuelve null si no trae ningún valor válido (el valor de relleno de POWER, -999, cuenta como faltante).
 */
export function leerClimaPower(js) {
  const p = js?.properties?.parameter;
  if (!p) return null;
  const relleno = js?.header?.fill_value ?? -999;
  const valor = (x) => (typeof x === 'number' && Number.isFinite(x) && x !== relleno ? x : null);
  const anios = /(\d{4})\D+(\d{4})/.exec(String(js?.header?.range ?? ''));
  const fecha = anios ? `${anios[1]}-${anios[2]}` : null;
  const t = valor(p.T2M_RANGE?.ANN);
  const pr = valor(p.PRECTOTCORR?.ANN);
  if (t == null && pr == null) return null;
  return {
    oscilacion_termica: { valor: t, unidad: 'K', fuente: 'NASA POWER T2M_RANGE (climatología anual)', fecha },
    precipitacion: { valor: pr, unidad: 'mm/día', fuente: 'NASA POWER PRECTOTCORR (climatología anual)', fecha },
  };
}

// Copia de model/score.py (DIMENSIONES), solo las dimensiones de clima que da NASA POWER. Valores (P) del modelo:
// si cambian allá, cambiar aquí (la prueba lo compara con el archivo de Python).
export const DIMENSIONES_CLIMA = {
  oscilacion_termica: { escala: 20.0, rango_tierra: [0.0, 40.0] },
  precipitacion: { escala: 1.0, rango_tierra: [0.0, null] },
};

/**
 * s = exp(-|tierra - destino| / escala) (AGENTS.md §6.3). Si el destino está fuera del rango terrestre, se compara
 * contra el extremo terrestre y se informa en `recorte` ({ destino, extremo }).
 */
export function similitudDimension(tierra, destino, { escala, rango_tierra: [lo, hi] = [null, null] }) {
  let objetivo = destino;
  let recorte = null;
  if (lo != null && destino < lo) { objetivo = lo; recorte = { destino, extremo: lo }; }
  if (hi != null && destino > hi) { objetivo = hi; recorte = { destino, extremo: hi }; }
  return { s: Math.exp(-Math.abs(tierra - objetivo) / escala), recorte };
}

/**
 * Similitud parcial de clima: una entrada por dimensión de DIMENSIONES_CLIMA con
 * { tierra, destino, similitud (0..1 redondeada a 4 decimales, o null si falta un lado), recorte }.
 * No hay total: sin la forma del cráter (dimensión principal) no se calcula.
 */
export function similitudClima(tierraVars, destinoVars) {
  return Object.entries(DIMENSIONES_CLIMA).map(([clave, cfg]) => {
    const tierra = tierraVars?.[clave] ?? null;
    const destino = destinoVars?.[clave] ?? null;
    const t = tierra?.valor;
    const d = destino?.valor;
    if (typeof t !== 'number' || typeof d !== 'number' || (tierra.unidad && destino.unidad && tierra.unidad !== destino.unidad)) {
      return { clave, tierra, destino, similitud: null, recorte: null };
    }
    const { s, recorte } = similitudDimension(t, d, cfg);
    return { clave, tierra, destino, similitud: Math.round(s * 1e4) / 1e4, recorte };
  });
}
