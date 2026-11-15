// Música del juego (docs/juego/MUSICA.md, pistas de Leo en game/public/audio/): menú, Tierra, Luna y Marte.
//   · Menú: empieza al terminar la animación de inicio y sigue (Expediente, Taller, Explorador) hasta que entra otra.
//   · Tierra: prueba terrestre. Luna / Marte: misión en ese destino.
//   · Al terminar un nivel (pase o no) la canción sigue en Resultados; cambia al volver al Taller (menú), al salir al
//     menú o al entrar a otro nivel o destino.
//   · Si una canción entra, la otra sale (fundido cruzado). Siempre en bucle.
//   · Volumen propio (0–100 %, se guarda en este navegador) y botón para quitarla: apartado «Música» del menú
//     (Menu.vistaMusica). La M de las pruebas (silencio general, fisica/sonido.js) también la calla.
// Se reproduce con Web Audio (AudioBufferSourceNode con loop): las pistas cortas (Tierra 7 s, Marte 7 s) vuelven a
// empezar sin hueco, cosa que <audio loop> no garantiza. El AudioContext se crea con el primer gesto (política de
// autoplay); lo que se pida antes suena en cuanto exista. Sin Web Audio (headless, navegador viejo) todo queda en
// silencio sin errores. Volúmenes y fundidos = valores de juego (P).
// Sin importar fisica/sonido.js (que trae Phaser): el silencio general se lee de la misma clave y llega por un evento.
const CLAVE_SILENCIO = 'marsception.silencio'; // = fisica/sonido.js

export const PISTAS = ['menu', 'tierra', 'luna', 'marte'];

// Ganancia por pista para que suenen parejas (volumen medio medido con ffmpeg volumedetect: menú −17.3 dB,
// Tierra −22.1, Luna −15.2, Marte −18.4; se llevan a ≈ −20 dB). (P)
const NIVEL_PISTA = { menu: 0.73, tierra: 1.27, luna: 0.58, marte: 0.83 };
// Música por debajo de los efectos (el motor y los golpes se tienen que oír). (P)
const NIVEL_MUSICA = 0.32;
export const VOLUMEN_POR_DEFECTO = 60; // %
const FUNDIDO_SALIDA_S = 0.7;
const FUNDIDO_ENTRADA_S = 1.0;

const CLAVE_VOLUMEN = 'marsception.musica.volumen';
const CLAVE_QUITADA = 'marsception.musica.quitada';

/** Volumen guardado (0–100, en pasos de 10). Fuera de rango o ilegible → valor por defecto. */
export function normalizarVolumen(v) {
  const n = Math.round(Number(v) / 10) * 10;
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : VOLUMEN_POR_DEFECTO;
}

/** Ganancia final de una pista: 0 si la música está quitada o el juego en silencio. */
export function ganancia(pista, { volumen, quitada, silencio }) {
  if (quitada || silencio || !NIVEL_PISTA[pista]) return 0;
  return NIVEL_MUSICA * NIVEL_PISTA[pista] * (normalizarVolumen(volumen) / 100);
}

/** Pista de un mundo del juego ('tierra' | 'luna' | 'marte'); cualquier otro valor → null (no cambia la música). */
export function pistaDeMundo(mundo) {
  return mundo === 'tierra' || mundo === 'luna' || mundo === 'marte' ? mundo : null;
}

function leer(clave) {
  try { return globalThis.localStorage?.getItem(clave) ?? null; } catch { return null; }
}
function escribir(clave, valor) {
  try { globalThis.localStorage?.setItem(clave, String(valor)); } catch { /* sin almacenamiento */ }
}

let volumen = leer(CLAVE_VOLUMEN) == null ? VOLUMEN_POR_DEFECTO : normalizarVolumen(leer(CLAVE_VOLUMEN));
let quitada = leer(CLAVE_QUITADA) === '1';
let silencio = leer(CLAVE_SILENCIO) === '1';
const estaSilenciado = () => silencio;
let actual = null; // pista pedida (aunque aún no suene)
let ctx = null;
let sonando = null; // { pista, fuente, gain }
const buffers = new Map(); // pista → Promise<AudioBuffer|null>
const oyentes = new Set();

const base = () => {
  try { return import.meta.env?.BASE_URL ?? '/'; } catch { return '/'; }
};

function formato() {
  try {
    const a = globalThis.document?.createElement('audio');
    return a?.canPlayType?.('audio/ogg; codecs="opus"') ? 'ogg' : 'm4a';
  } catch { return 'm4a'; }
}

function contexto() {
  try {
    if (!ctx) {
      const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended' && !globalThis.document?.hidden) ctx.resume().catch(() => {});
  } catch { ctx = null; }
  return ctx;
}

async function decodificar(c, url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const datos = await r.arrayBuffer();
  // Safari viejo solo tiene la versión con callbacks.
  return await new Promise((ok, mal) => {
    const p = c.decodeAudioData(datos, ok, mal);
    if (p?.then) p.then(ok, mal);
  });
}

function cargar(c, pista) {
  if (!buffers.has(pista)) {
    const ext = formato();
    const url = (e) => `${base()}audio/musica_${pista}.${e}`;
    // Si el navegador dice que sabe Opus pero no lo decodifica, se intenta la versión AAC.
    const p = decodificar(c, url(ext))
      .catch(() => (ext === 'ogg' ? decodificar(c, url('m4a')) : null))
      .catch(() => null);
    buffers.set(pista, p);
  }
  return buffers.get(pista);
}

function nivelActual(pista) {
  return ganancia(pista, { volumen, quitada, silencio: estaSilenciado() });
}

function aplicarNivel(s = 0.15) {
  try {
    if (sonando && ctx) sonando.gain.gain.setTargetAtTime(nivelActual(sonando.pista), ctx.currentTime, s);
  } catch { /* sin audio */ }
  for (const f of oyentes) f(estado());
}

function soltar(s, fundido) {
  if (!s || !ctx) return;
  try {
    const t = ctx.currentTime;
    s.gain.gain.cancelScheduledValues(t);
    s.gain.gain.setValueAtTime(s.gain.gain.value, t);
    s.gain.gain.linearRampToValueAtTime(0, t + fundido);
    s.fuente.stop(t + fundido + 0.05);
  } catch { /* ya detenida */ }
}

async function arrancar(pista) {
  const c = ctx && ctx.state !== 'closed' ? ctx : null;
  if (!c) return; // sin gesto todavía: suena en cuanto se cree el contexto (ver `gesto`)
  const buf = await cargar(c, pista);
  if (!buf || actual !== pista || sonando?.pista === pista) return; // entretanto se pidió otra pista
  soltar(sonando, FUNDIDO_SALIDA_S);
  try {
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.connect(c.destination);
    const fuente = c.createBufferSource();
    fuente.buffer = buf;
    fuente.loop = true;
    fuente.connect(gain);
    fuente.start();
    gain.gain.linearRampToValueAtTime(nivelActual(pista), c.currentTime + FUNDIDO_ENTRADA_S);
    sonando = { pista, fuente, gain };
  } catch { sonando = null; }
}

/**
 * Pide una pista ('menu' | 'tierra' | 'luna' | 'marte'). Si ya es la que suena, no hace nada (así la canción sigue
 * en Resultados o al reiniciar una escena). null o una pista desconocida no cambian nada.
 */
export function tocarMusica(pista) {
  if (!PISTAS.includes(pista) || actual === pista) return;
  actual = pista;
  arrancar(pista);
}

/** Detiene la música (con fundido). */
export function detenerMusica() {
  actual = null;
  soltar(sonando, FUNDIDO_SALIDA_S);
  sonando = null;
}

export function estado() {
  return { pista: actual, volumen, quitada, silencio: estaSilenciado() };
}

/** Cambia el volumen en `paso` puntos (±10) y lo guarda. Subir el volumen con la música quitada la vuelve a poner. */
export function cambiarVolumenMusica(paso) {
  volumen = normalizarVolumen(volumen + paso);
  escribir(CLAVE_VOLUMEN, volumen);
  if (paso > 0 && quitada) { quitada = false; escribir(CLAVE_QUITADA, '0'); }
  aplicarNivel();
  return volumen;
}

/** Quita o vuelve a poner la música (se guarda). */
export function alternarMusica() {
  quitada = !quitada;
  escribir(CLAVE_QUITADA, quitada ? '1' : '0');
  aplicarNivel(0.08);
  return quitada;
}

/** Avisa con `f(estado)` cada vez que cambia el volumen o el silencio. Devuelve la función para dejar de escuchar. */
export function alCambiarMusica(f) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

if (typeof window !== 'undefined') {
  // Primer gesto: crea el contexto y arranca lo que se haya pedido antes.
  const gesto = () => {
    const nuevo = !ctx;
    if (contexto() && nuevo && actual) arrancar(actual);
  };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, gesto, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    try {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
    } catch { /* sin audio */ }
  });
  window.addEventListener('marsception:silencio', (ev) => { silencio = !!ev.detail; aplicarNivel(0.03); });
}
