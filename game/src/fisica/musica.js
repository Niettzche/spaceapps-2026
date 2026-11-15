// Música del juego (pistas de Leo, convertidas por Diego: game/public/audio/musica_<menu|tierra|marte|luna>.{ogg,m4a}).
// Reglas (docs/juego/MUSICA.md): bucle sin cortes, una canción entra mientras la otra sale (fundido cruzado), no tapa los
// efectos, volumen y apagado propios (separados del silencio de efectos, tecla M), y al terminar un nivel la canción sigue
// (Resultados no la cambia) hasta volver al Taller, salir o ir a otro mundo.
// Web Audio con su propio AudioContext: AudioBufferSourceNode con loop = bucle exacto, sin el hueco del <audio loop>.
// Los navegadores no dejan sonar antes del primer gesto: la pista pedida queda pendiente y entra en cuanto hay uno.

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
export const PISTAS = ['menu', 'tierra', 'marte', 'luna'];
const CLAVE_VOL = 'marsception.musica.volumen';
const NIVELES = [1, 0.66, 0.33, 0]; // pasos del control (100 %, 66 %, 33 %, apagada)
const GANANCIA_MAX = 0.32; // con el volumen al 100 %: por debajo de los efectos (maestro de efectos 0.35, P)
const FUNDIDO_S = 1.4;

let ctx = null;
let maestro = null;
let volumen = leerVolumen();
let deseada = null; // pista que debería sonar
let actual = null; // { nombre, fuente, gan }
const buffers = new Map(); // nombre → Promise<AudioBuffer|null>
const oyentes = new Set();

function leerVolumen() {
  try {
    const v = Number(globalThis.localStorage?.getItem(CLAVE_VOL));
    return Number.isFinite(v) && v >= 0 && v <= 1 && globalThis.localStorage?.getItem(CLAVE_VOL) != null ? v : 0.66;
  } catch { return 0.66; }
}

function url(nombre) {
  let ogg = false;
  try { ogg = !!globalThis.document?.createElement('audio').canPlayType?.('audio/ogg; codecs="opus"'); } catch { /* sin DOM */ }
  return `${BASE}audio/musica_${nombre}.${ogg ? 'ogg' : 'm4a'}`;
}

function contexto() {
  try {
    if (!ctx) {
      const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      maestro = ctx.createGain();
      maestro.gain.value = volumen * GANANCIA_MAX;
      maestro.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && !globalThis.document?.hidden) ctx.resume().catch(() => {});
  } catch { ctx = null; }
  return ctx;
}

function cargar(nombre) {
  if (!buffers.has(nombre)) {
    const p = (async () => {
      try {
        const c = contexto();
        if (!c || typeof fetch === 'undefined') return null;
        const r = await fetch(url(nombre));
        if (!r.ok) return null;
        const datos = await r.arrayBuffer();
        return await new Promise((ok) => c.decodeAudioData(datos, ok, () => ok(null)));
      } catch { return null; }
    })();
    buffers.set(nombre, p);
  }
  return buffers.get(nombre);
}

async function aplicar() {
  const nombre = deseada;
  if (actual?.nombre === nombre) return;
  const c = contexto();
  if (!c || c.state !== 'running') return; // sin gesto todavía: entra con el primero
  // Sale la anterior con fundido.
  if (actual) {
    const viejo = actual;
    actual = null;
    try {
      const t = c.currentTime;
      viejo.gan.gain.cancelScheduledValues(t);
      viejo.gan.gain.setValueAtTime(viejo.gan.gain.value, t);
      viejo.gan.gain.linearRampToValueAtTime(0, t + FUNDIDO_S);
      viejo.fuente.stop(t + FUNDIDO_S + 0.05);
    } catch { /* ya detenida */ }
  }
  if (!nombre) return;
  const buf = await cargar(nombre);
  if (!buf || deseada !== nombre || actual?.nombre === nombre) return;
  try {
    const fuente = c.createBufferSource();
    fuente.buffer = buf;
    fuente.loop = true;
    const gan = c.createGain();
    const t = c.currentTime;
    gan.gain.setValueAtTime(0, t);
    gan.gain.linearRampToValueAtTime(1, t + FUNDIDO_S);
    fuente.connect(gan).connect(maestro);
    fuente.start(t);
    actual = { nombre, fuente, gan };
  } catch { /* sin audio */ }
}

if (typeof window !== 'undefined') {
  const gesto = () => { if (contexto()?.state === 'running' || ctx) setTimeout(aplicar, 0); };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, gesto, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    try {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else ctx.resume().then(aplicar).catch(() => {});
    } catch { /* sin audio */ }
  });
}

/** Pide una pista ('menu' | 'tierra' | 'marte' | 'luna' | null para silencio). Si ya suena, no hace nada. */
export function musica(nombre) {
  deseada = PISTAS.includes(nombre) ? nombre : null;
  if (deseada) cargar(deseada); // empieza a descargar aunque aún no haya gesto
  aplicar();
}

export const pistaActual = () => actual?.nombre ?? null;
export const volumenMusica = () => volumen;

/** Siguiente paso del control (100 → 66 → 33 → apagada → 100 %). Se guarda en el navegador. */
export function siguienteVolumen() {
  const i = NIVELES.findIndex((v) => Math.abs(v - volumen) < 0.02);
  volumen = NIVELES[(i + 1) % NIVELES.length];
  try { globalThis.localStorage?.setItem(CLAVE_VOL, String(volumen)); } catch { /* sin almacenamiento */ }
  try { if (maestro) maestro.gain.setTargetAtTime(volumen * GANANCIA_MAX, ctx.currentTime, 0.05); } catch { /* sin audio */ }
  for (const f of oyentes) f(volumen);
  return volumen;
}

/** Texto del control: «Música 66 %» / «Música: apagada». */
export function textoMusica(tr) {
  return volumen <= 0 ? tr('Música: apagada', 'Music: off') : tr(`Música ${Math.round(volumen * 100)} %`, `Music ${Math.round(volumen * 100)} %`);
}

export function alCambiarMusica(f) { oyentes.add(f); return () => oyentes.delete(f); }

/** Pista que corresponde a cada escena (null = no cambiar: Resultados conserva la del nivel). */
export function pistaDeEscena(clave, mundo) {
  if (clave === 'Prueba') return 'tierra';
  if (clave === 'Mision') return mundo === 'luna' ? 'luna' : 'marte';
  if (clave === 'Expediente' || clave === 'Explorador' || clave === 'Taller') return 'menu';
  return null;
}
