// Frente modelo. Cliente de POST /tutor (api/tutor.py). El juego NO depende de esto: cualquier fallo vuelve como
// { ok: false, tipo } y el panel responde con reglas (conocimiento.js). La llave del proveedor vive solo en el servidor.
import { API_URL, API_CONFIGURADA } from '../scenes/expediente/config.js';
import { apiSinPublicar } from '../scenes/expediente/logica.js';

export const ESPERA_TUTOR_MS = 30000;

/** ¿Vale la pena intentar la API? Solo si se configuró VITE_API_URL (la demo pública usa /api); sin ella, ni en localhost. */
export const tutorPublicado = (host = globalThis.location?.hostname, configurada = API_CONFIGURADA) => !apiSinPublicar({ configurada, host });

/**
 * Pregunta libre a la tutora. `cuerpo`: { pregunta, sitio, destino, pantalla, idioma, historial }.
 * Devuelve { ok: true, respuesta, modelo } o { ok: false, tipo: 'no_publicada' | 'sin_configurar' | 'limite' | 'http' | 'espera' | 'red' | 'cancelado' }.
 */
export async function preguntarTutor(cuerpo, { espera = ESPERA_TUTOR_MS, senal } = {}) {
  if (!tutorPublicado()) return { ok: false, tipo: 'no_publicada' };
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort('espera'), espera);
  if (senal) senal.addEventListener('abort', () => ctrl.abort('cancelado'), { once: true });
  try {
    const r = await fetch(`${API_URL}/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: ctrl.signal,
    });
    if (r.status === 503) return { ok: false, tipo: 'sin_configurar' };
    if (r.status === 429) return { ok: false, tipo: 'limite' };
    if (!r.ok) return { ok: false, tipo: 'http', estado: r.status };
    const datos = await r.json();
    if (typeof datos?.respuesta !== 'string' || !datos.respuesta.trim()) return { ok: false, tipo: 'http' };
    // fuente: 'llm' (respuesta del modelo, con firma del servidor) o 'filtro' (respuesta fija del filtro de seguridad).
    return { ok: true, respuesta: datos.respuesta.trim(), fuente: datos.fuente || 'llm', firma: datos.firma || null, modelo: datos.modelo || null };
  } catch {
    return { ok: false, tipo: ctrl.signal.aborted ? ctrl.signal.reason : 'red' };
  } finally {
    clearTimeout(reloj);
  }
}

/** GET /tutor → ¿hay llave en el servidor? Devuelve true/false (false también si la API no responde). */
export async function tutorDisponible({ espera = 4000 } = {}) {
  if (!tutorPublicado()) return false;
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort('espera'), espera);
  try {
    const r = await fetch(`${API_URL}/tutor`, { signal: ctrl.signal });
    return r.ok && (await r.json())?.disponible === true;
  } catch {
    return false;
  } finally {
    clearTimeout(reloj);
  }
}
