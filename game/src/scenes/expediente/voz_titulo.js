// Voz del título (Mauricio dice «MARSCEPTION»), al estilo de las pantallas de título clásicas: suena al abrir el juego,
// una vez por visita. Audio editado desde su grabación: voz más grave, compresión, reverberación de sala y un golpe grave
// (game/public/audio/marsception_voz.{ogg,m4a}, 4.5 s). Los navegadores bloquean el audio hasta que el jugador interactúa:
// si el intento al aparecer el título falla, suena con la primera tecla o el primer toque. Respeta el silencio (tecla M).
import { estaSilenciado } from '../../fisica/sonido.js';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
let yaSono = false;
let audio = null;
let pendiente = null;

function crearAudio() {
  if (audio || typeof Audio === 'undefined') return audio;
  const a = new Audio();
  const ogg = a.canPlayType?.('audio/ogg; codecs="opus"');
  a.src = `${BASE}audio/${ogg ? 'marsception_voz.ogg' : 'marsception_voz.m4a'}`;
  a.preload = 'auto';
  a.volume = 0.9;
  audio = a;
  return a;
}

function quitarPendiente() {
  if (!pendiente) return;
  globalThis.removeEventListener?.('keydown', pendiente, true);
  globalThis.removeEventListener?.('pointerdown', pendiente, true);
  pendiente = null;
}

function tocar() {
  if (yaSono || estaSilenciado()) { quitarPendiente(); return Promise.resolve(false); }
  const a = crearAudio();
  if (!a) return Promise.resolve(false);
  try {
    a.currentTime = 0;
    return Promise.resolve(a.play()).then(() => { yaSono = true; quitarPendiente(); return true; }, () => false);
  } catch { return Promise.resolve(false); }
}

/** Llamar al mostrar la pantalla de inicio. Intenta sonar ya; si el navegador lo bloquea, espera la primera interacción. */
export function vozTitulo() {
  if (yaSono || estaSilenciado()) return;
  tocar().then((ok) => {
    if (ok || yaSono || pendiente) return;
    pendiente = () => { tocar(); };
    globalThis.addEventListener?.('keydown', pendiente, true);
    globalThis.addEventListener?.('pointerdown', pendiente, true);
  });
}

/** Al salir de la pantalla de inicio sin haber sonado (p. ej. con el juego silenciado) ya no se intenta más. */
export function olvidarVozTitulo() { quitarPendiente(); }
