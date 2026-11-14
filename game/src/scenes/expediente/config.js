// Dueño: frente expediente. Configuración de mis escenas (se puede cambiar sin tocar archivos del integrador).
// Variables de entorno de Vite (archivo game/.env.local, NO se sube): VITE_API_URL, VITE_WEB_URL.

const env = import.meta.env || {};

// API del modelo (FastAPI en el VPS). El juego funciona sin ella: el Explorador avisa si no responde.
export const API_URL = String(env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

// Página pública (web/). Si no está configurada, el botón de ficha se muestra deshabilitado con su nota.
export const WEB_URL = env.VITE_WEB_URL ? String(env.VITE_WEB_URL) : null;

// Destino por defecto del menú (AGENTS.md §4: el jugador elige; Marte va primero).
export const DESTINO_POR_DEFECTO = 'jezero';
// Orden en que se ofrecen los destinos en el menú.
export const ORDEN_DESTINOS = ['jezero', 'polo_sur_lunar'];

// Umbral para proponer un sitio desde el Explorador (P) — AGENTS.md §6.4. La API aplica el suyo también.
export const UMBRAL_PROPUESTA = 0.6;
// NASA POWER puede tardar: espera generosa antes de declarar que la API no responde.
export const ESPERA_API_MS = 45000;

export function urlFicha(sitioId) {
  if (!WEB_URL) return null;
  const u = new URL(WEB_URL, window.location.href);
  u.searchParams.set('sitio', sitioId);
  return u.toString();
}
