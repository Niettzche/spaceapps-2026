// Dueño: frente expediente. Cliente mínimo de la API del modelo (api/main.py). El juego NO depende de ella:
// cualquier fallo se devuelve como { ok: false, tipo, mensaje } para que la interfaz lo explique.
import { API_URL, ESPERA_API_MS } from './config.js';
import { tr } from '../../i18n.js';

async function post(ruta, cuerpo, { espera = ESPERA_API_MS, senal } = {}) {
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort('espera'), espera);
  if (senal) senal.addEventListener('abort', () => ctrl.abort('cancelado'), { once: true });
  try {
    const r = await fetch(`${API_URL}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: ctrl.signal,
    });
    let datos = null;
    try { datos = await r.json(); } catch { /* respuesta sin JSON */ }
    if (!r.ok) {
      const detalle = typeof datos?.detail === 'string' ? datos.detail : `HTTP ${r.status}`;
      return { ok: false, tipo: 'http', estado: r.status, mensaje: detalle };
    }
    return { ok: true, datos };
  } catch (e) {
    if (ctrl.signal.aborted && ctrl.signal.reason === 'cancelado') return { ok: false, tipo: 'cancelado', mensaje: tr('Consulta cancelada.', 'Request cancelled.') };
    if (ctrl.signal.aborted) return { ok: false, tipo: 'espera', mensaje: tr(`La API no respondió en ${Math.round(espera / 1000)} s.`, `The API did not answer within ${Math.round(espera / 1000)} s.`) };
    return { ok: false, tipo: 'red', mensaje: tr('No se pudo conectar con la API del modelo.', 'Could not connect to the model API.') };
  } finally {
    clearTimeout(reloj);
  }
}

/** POST /score → similitud por dimensión de un punto cualquiera contra el destino. */
export const consultarPunto = ({ lat, lon, destino }, opciones) => post('/score', { lat, lon, destino }, opciones);

/** POST /submit → guarda la propuesta como `propuesto_usuario` (pendiente de revisión). */
export const proponerSitio = ({ lat, lon, destino, nombre, autor }, opciones) =>
  post('/submit', { lat, lon, destino, nombre, ...(autor ? { autor } : {}) }, opciones);

export { API_URL };
