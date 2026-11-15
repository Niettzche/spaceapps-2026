// Dueño: frente expediente. Configuración de mis escenas (se puede cambiar sin tocar archivos del integrador).
// Variables de entorno de Vite (archivo game/.env.local, NO se sube): VITE_API_URL, VITE_WEB_URL.

const env = import.meta.env || {};

// API del modelo (FastAPI en el VPS). El juego funciona sin ella: el Explorador avisa si no responde.
export const API_URL = String(env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
// true si el build trae VITE_API_URL. Sin ella el juego NO sondea ninguna API (ni en localhost): modo sin API.
// Demo pública: VITE_API_URL=/api (web/scripts/build-demo.mjs). Local con API: VITE_API_URL=http://localhost:8000 en .env.local.
export const API_CONFIGURADA = !!env.VITE_API_URL;
// Sondeo GET /health al abrir el Explorador: si no contesta en este tiempo, se avisa que la consulta en vivo no está.
export const ESPERA_SONDEO_API_MS = 4000;

// Página pública (web/). Si no está configurada, el botón de ficha se muestra deshabilitado con su nota.
export const WEB_URL = env.VITE_WEB_URL ? String(env.VITE_WEB_URL) : null;

// Destino por defecto del menú (AGENTS.md §4: el jugador elige; Marte va primero).
export const DESTINO_POR_DEFECTO = 'jezero';
// Orden en que se ofrecen los destinos en el menú.
export const ORDEN_DESTINOS = ['jezero', 'polo_sur_lunar'];

// Umbral para proponer un sitio desde el Explorador (P) — AGENTS.md §6.4. Es el mismo que usa la API (api/main.py, 0.4).
// Con 0.6 ningún análogo conocido podía proponerse: el total más alto es 0.556 (model/VALIDATION.md, «Umbral del explorador libre»).
export const UMBRAL_PROPUESTA = 0.4;
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
// Pantalla de carga (arte de Mauricio, assets/pantallas/carga_fondo.png, 320 × 180 con el logo y el marco vacío de la
// barra). Excepción explícita al límite de arriba: se carga primero, en preload(), pese el que pese, para dibujar la barra
// sobre ella. Hoy pesa 11 KB. `hueco`: rectángulo vacío de la barra en px de arte (assets/fuente/titulo.mjs: x 64..255,
// y 147..150); se escala igual que la imagen. Si la imagen falta o falla, el Boot dibuja la misma barra sobre fondo liso.
export const FONDO_CARGA = { clave: 'pantallas/carga_fondo', ancho: 320, hueco: { x: 64, y: 147, w: 192, h: 4 } };

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
