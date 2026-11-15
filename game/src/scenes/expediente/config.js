// Dueño: frente expediente. Configuración de mis escenas (se puede cambiar sin tocar archivos del integrador).
// Variables de entorno de Vite (archivo game/.env.local, NO se sube): VITE_API_URL, VITE_WEB_URL.

const env = import.meta.env || {};

// API del modelo (FastAPI en el VPS). El juego funciona sin ella: el Explorador avisa si no responde.
export const API_URL = String(env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
// true si el build trae VITE_API_URL. Sin ella, la API por defecto (localhost:8000) solo existe en una máquina de desarrollo.
export const API_CONFIGURADA = !!env.VITE_API_URL;
// Sondeo GET /health al abrir el Explorador: si no contesta en este tiempo, se avisa que la consulta en vivo no está.
export const ESPERA_SONDEO_API_MS = 4000;

// Página pública (web/). Si no está configurada, el botón de ficha se muestra deshabilitado con su nota.
export const WEB_URL = env.VITE_WEB_URL ? String(env.VITE_WEB_URL) : null;

// Destino por defecto del menú (AGENTS.md §4: el jugador elige; Marte va primero).
export const DESTINO_POR_DEFECTO = 'jezero';
// Orden en que se ofrecen los destinos en el menú.
export const ORDEN_DESTINOS = ['jezero', 'polo_sur_lunar'];

// Umbral para proponer un sitio desde el Explorador (P) — AGENTS.md §6.4. La API aplica el suyo también.
export const UMBRAL_PROPUESTA = 0.6;
// NASA POWER puede tardar: espera generosa antes de declarar que la API no responde.
export const ESPERA_API_MS = 90000; // medido: ~60 s por punto con NASA POWER + MODIS

// Explorador SIN API (AGENTS.md §3 regla 7). Radio para dar por encontrado un sitio del catálogo precalculado (P).
export const RADIO_CATALOGO_KM = 25;
// Clima en vivo directo de NASA POWER desde el navegador (API pública con CORS, sin llave). Responde en ~0.1–1 s.
export const ESPERA_POWER_MS = 8000;

// Boot: no precarga formatos pesados ni archivos mayores a este límite (P). El arte del juego en /assets pesa hoy
// ≤ 23 KB por archivo; 300 KB deja margen para fondos grandes y frena GIF o video que se cuelen en /assets.
export const LIMITE_PRECARGA_BYTES = 300 * 1024;
export const EXTENSIONES_SIN_PRECARGA = ['gif', 'mp4', 'webm'];

/**
 * Enlace a la ficha completa en web/. Manda `sitio=<id del sitio>` y, si el id es de una detección del detector
 * (mx0007, g00003), también `ficha=<ID en mayúsculas>` que es como web/ nombra sus fichas (web/public/data/fichas.json).
 * Propuesta al integrador: que web/ abra la ficha o el sitio al leer esos parámetros.
 */
export function urlFicha(sitio) {
  if (!WEB_URL || !sitio?.id) return null;
  try {
    const u = new URL(WEB_URL, window.location.href);
    u.searchParams.set('sitio', sitio.id);
    if (/^(mx|g)\d+$/.test(sitio.id)) u.searchParams.set('ficha', sitio.id.toUpperCase());
    u.hash = 'mapa';
    return u.toString();
  } catch {
    return null;
  }
}

// Validación del detector de cráteres (AGENTS.md §6.3; informe/validacion_detector.pdf): cráteres mexicanos conocidos
// que encuentra. Se muestra como dato curioso en la pantalla de carga.
export const DETECTOR_VALIDACION = { encontrados: 9, conocidos: 11 };
