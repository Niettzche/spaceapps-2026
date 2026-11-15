// Sonido de la prueba y la misión, sintetizado con Web Audio (sin archivos de audio): estilo chiptune, discreto.
// Recorrido crea un `Sonido` y le pasa, cada cuadro, el robot y el acelerador; también los eventos de telemetría.
//   · Motor: zumbido continuo cuyo tono y volumen siguen al acelerador y a la velocidad; calla sin energía o al terminar.
//   · Patinaje: "shhh" de arena (ruido filtrado) mientras alguna rueda patina.
//   · Golpes: chasis (golpe sordo), carga (tic metálico), chasis destruido (crujido), sin energía (tono que baja),
//     carga perdida (golpe grave).
//   · Fin: arpegio que sube al llegar a la meta o entregar; tono de fallo en los demás finales.
//   · sonarBoton(): pitido de interfaz para las escenas.
// Volumen general 0.35; M o el botón "♪" silencian (se guarda en localStorage). El AudioContext se crea o reanuda
// con el primer gesto (pointerdown / keydown), por la política de autoplay. Sin Web Audio (headless, navegador
// antiguo), todo queda en silencio sin lanzar errores. Volúmenes, tonos y filtros = valores de juego (P).
import { textoPixel } from '../scenes/comun/fuente.js';
import { tr } from '../i18n.js';
import { PATINA_SEG } from './robot.js';

const VOLUMEN = 0.35;
const CLAVE_SILENCIO = 'marsception.silencio';
const SEG_ENTRE_IGUALES = 0.09; // el mismo golpe no se repite antes de esto (s)

// Cada mundo filtra lo que se oye del recorrido (no la interfaz). (P)
// En el vacío no hay sonido: lo que se oye es la vibración que siente el robot (sorda, grave, más baja).
// En Marte el aire es ~1 % de la presión terrestre: el sonido llega más débil y sin agudos.
const MUNDO = {
  tierra: { corte: 18000, patina: 1, motor: 1 },
  marte: { corte: 3500, patina: 0.7, motor: 0.85 },
  luna: { corte: 700, patina: 0.5, motor: 0.7 },
};

// ---- Estado global (compartido por todas las escenas) ----
let ctx = null;
let maestro = null;
let ruidoBuf = null;
let silencio = leerSilencio();
const oyentes = new Set(); // callbacks que se avisan al cambiar el silencio (etiquetas de los botones)

function leerSilencio() {
  try { return globalThis.localStorage?.getItem(CLAVE_SILENCIO) === '1'; } catch { return false; }
}

/** Crea (o reanuda) el AudioContext. Solo debe llamarse desde un gesto del usuario o cuando ya existe. */
function asegurarContexto() {
  try {
    if (!ctx) {
      const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      maestro = ctx.createGain();
      maestro.gain.value = silencio ? 0 : VOLUMEN;
      maestro.connect(ctx.destination);
      // 1 s de ruido blanco para la arena y los golpes.
      ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = ruidoBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended' && !globalThis.document?.hidden) ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Contexto listo para sonar ahora (no lo crea: sin gesto previo, devuelve null). */
const listo = () => (ctx && ctx.state === 'running' ? ctx : null);

if (typeof window !== 'undefined') {
  const gesto = () => asegurarContexto();
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, gesto, { capture: true, passive: true });
  // Pestaña oculta: Phaser deja de actualizar, así que el motor quedaría sonando fijo. Se suspende el audio.
  document.addEventListener('visibilitychange', () => {
    try {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
    } catch { /* sin audio */ }
  });
}

export function estaSilenciado() { return silencio; }

/** Alterna el silencio general y lo guarda. */
export function alternarSilencio() {
  silencio = !silencio;
  try { globalThis.localStorage?.setItem(CLAVE_SILENCIO, silencio ? '1' : '0'); } catch { /* sin almacenamiento */ }
  try { if (maestro) maestro.gain.setTargetAtTime(silencio ? 0 : VOLUMEN, ctx.currentTime, 0.02); } catch { /* sin audio */ }
  for (const f of oyentes) f(silencio);
  // La música (audio/musica.js) también calla con el silencio general.
  try { globalThis.dispatchEvent?.(new CustomEvent('marsception:silencio', { detail: silencio })); } catch { /* sin eventos */ }
  return silencio;
}

// ---- Piezas de síntesis ----

/** Nota con envolvente: frecuencia f0 → f1 (exponencial) en `dur` s. `pasos` = escalones chiptune en vez de rampa. */
function tono(c, destino, { tipo = 'square', f0, f1 = f0, dur, vol, t = 0, ataque = 0.004, pasos = null }) {
  const t0 = c.currentTime + t;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  if (pasos) pasos.forEach((f, i) => o.frequency.setValueAtTime(f, t0 + (i * dur) / pasos.length));
  else {
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(destino);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** Ráfaga de ruido filtrado con envolvente. */
function ruido(c, destino, { filtro = 'lowpass', f = 800, q = 0.7, dur, vol, t = 0 }) {
  const t0 = c.currentTime + t;
  const s = c.createBufferSource();
  s.buffer = ruidoBuf;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const bq = c.createBiquadFilter();
  bq.type = filtro;
  bq.frequency.value = f;
  bq.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(bq).connect(g).connect(destino);
  s.start(t0, Math.random() * 0.5);
  s.stop(t0 + dur + 0.02);
}

/** Sonidos sueltos: (contexto, destino, intensidad 0..1) → programa las notas. Exportados para grabarlos fuera de línea. */
export const EFECTOS_SONIDO = {
  golpe_chasis(c, d, i = 0.5) { // golpe sordo
    const v = 0.25 + 0.35 * i;
    tono(c, d, { tipo: 'triangle', f0: 150, f1: 45, dur: 0.18, vol: v });
    ruido(c, d, { f: 320, dur: 0.08, vol: v * 0.6 });
  },
  golpe_carga(c, d, i = 0.5) { // tic metálico, corto
    const v = 0.06 + 0.08 * i;
    tono(c, d, { f0: 1760, f1: 1480, dur: 0.05, vol: v });
    tono(c, d, { tipo: 'triangle', f0: 2637, dur: 0.07, vol: v * 0.7, t: 0.005 });
  },
  chasis_destruido(c, d) { // crujido: ruido medio + caída grave + chasquidos
    ruido(c, d, { filtro: 'bandpass', f: 900, q: 0.8, dur: 0.5, vol: 0.5 });
    tono(c, d, { f0: 220, f1: 38, dur: 0.45, vol: 0.18 });
    for (const t of [0.05, 0.13, 0.22, 0.3]) ruido(c, d, { filtro: 'highpass', f: 2000, dur: 0.04, vol: 0.25, t });
  },
  energia_agotada(c, d) { // tono que baja en escalones, como un juguete sin pilas
    tono(c, d, { f0: 440, dur: 0.75, vol: 0.12, pasos: [440, 370, 311, 262, 220, 175, 131, 98] });
  },
  sobrecalentamiento(c, d) { // dos pitidos de alarma cortos
    tono(c, d, { f0: 880, dur: 0.09, vol: 0.08 });
    tono(c, d, { f0: 880, dur: 0.09, vol: 0.08, t: 0.16 });
  },
  carga_perdida(c, d) { // golpe grave y hueco
    tono(c, d, { tipo: 'triangle', f0: 110, f1: 40, dur: 0.3, vol: 0.5 });
    ruido(c, d, { f: 220, dur: 0.15, vol: 0.35 });
    tono(c, d, { f0: 330, f1: 165, dur: 0.12, vol: 0.06, t: 0.02 });
  },
  exito(c, d) { // arpegio que sube: Do Mi Sol Do'
    [523, 659, 784].forEach((f, k) => {
      tono(c, d, { f0: f, dur: 0.1, vol: 0.12, t: k * 0.09 });
      tono(c, d, { tipo: 'triangle', f0: f / 2, dur: 0.1, vol: 0.12, t: k * 0.09 });
    });
    tono(c, d, { f0: 1047, dur: 0.45, vol: 0.12, t: 0.27 });
    tono(c, d, { tipo: 'triangle', f0: 523, dur: 0.45, vol: 0.14, t: 0.27 });
  },
  fallo(c, d) { // tres notas que bajan, lentas
    [392, 330].forEach((f, k) => tono(c, d, { f0: f, dur: 0.17, vol: 0.1, t: k * 0.18 }));
    tono(c, d, { f0: 262, f1: 247, dur: 0.5, vol: 0.1, t: 0.36 });
    tono(c, d, { tipo: 'triangle', f0: 131, f1: 123, dur: 0.5, vol: 0.14, t: 0.36 });
  },
  boton(c, d) { // pitido corto de interfaz
    tono(c, d, { f0: 660, dur: 0.035, vol: 0.1 });
    tono(c, d, { f0: 990, dur: 0.05, vol: 0.1, t: 0.035 });
  },
};

/** Pitido de interfaz (botones). Seguro de llamar siempre. */
export function sonarBoton() {
  try {
    const c = asegurarContexto(); // se llama desde un gesto: puede crear el contexto
    if (c && maestro) EFECTOS_SONIDO.boton(c, maestro);
  } catch { /* sin audio */ }
}

// ---- Sonido de un recorrido ----

export class Sonido {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} o  mundo ('tierra'|'marte'|'luna')
   */
  constructor(scene, o = {}) {
    this.scene = scene;
    this.cfg = MUNDO[o.mundo] ?? MUNDO.tierra;
    this.terminado = false;
    this.bucles = null; // nodos del motor y la arena; se crean cuando el contexto ya suena
    this.ultimo = new Map(); // tipo → tiempo del último golpe (s de audio)
    this.tActualizado = 0;

    // Botón "♪" (18 px, DISENO.md §2.1) y tecla M. Recorrido lo coloca debajo de «Abandonar».
    // Fuente pixel (comun/fuente.js): no tiene «♪», así que el botón dice «M · sonido» / «M · silencio».
    this.boton = textoPixel(scene, 944, 70, '', { size: 14, color: '#a3abcc', origen: [1, 0.5] })
      .setScrollFactor(0).setDepth(95).setInteractive({ useHandCursor: true });
    this.boton.on('pointerdown', () => alternarSilencio());
    this.alTecla = () => alternarSilencio();
    scene.input.keyboard?.on('keydown-M', this.alTecla);
    this.alSilencio = (s) => {
      if (!this.boton?.active) return;
      this.boton.setText(this.boton.esPixel ? (s ? tr('M · silencio', 'M · muted') : tr('M · sonido', 'M · sound')) : (s ? '♪ ×' : '♪')).setAlpha(s ? 0.6 : 0.95);
      // Zona táctil ≥ 64 × 44 alrededor del texto (coordenadas locales).
      const w = Math.max(64, this.boton.width + 20), h = Math.max(44, this.boton.height + 16);
      this.boton.input.hitArea.setTo(-(w - this.boton.width) / 2, -(h - this.boton.height) / 2, w, h);
    };
    this.alSilencio(silencio);
    oyentes.add(this.alSilencio);

    // Escena en pausa o sin actualizar: callan los bucles (si no, el motor seguiría sonando fijo).
    this.callar = () => this._callarBucles(0.02);
    this.vigilar = () => { if (this.bucles && performance.now() - this.tActualizado > 100) this.callar(); };
    scene.events.on('pause', this.callar);
    scene.events.on('sleep', this.callar);
    scene.events.on('postupdate', this.vigilar); // tras scene.update(): si no se llamó a actualizar(), callar
  }

  _crearBucles(c, destino = maestro) {
    const salida = c.createBiquadFilter(); // filtro del mundo (Luna: sordo)
    salida.type = 'lowpass';
    salida.frequency.value = this.cfg.corte;
    salida.connect(destino);

    // Motor: diente de sierra + sub-octava cuadrada → paso bajo → trémolo (LFO) → volumen.
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    const sub = c.createOscillator();
    sub.type = 'square';
    const subG = c.createGain();
    subG.gain.value = 0.5;
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.Q.value = 2;
    const trem = c.createGain();
    trem.gain.value = 0.7;
    const lfo = c.createOscillator();
    lfo.type = 'square';
    const lfoG = c.createGain();
    lfoG.gain.value = 0.25;
    lfo.connect(lfoG).connect(trem.gain);
    const motorG = c.createGain();
    motorG.gain.value = 0;
    osc.connect(filtro);
    sub.connect(subG).connect(filtro);
    filtro.connect(trem).connect(motorG).connect(salida);

    // Arena: ruido en bucle → pasa banda (el "shhh") → volumen.
    const arena = c.createBufferSource();
    arena.buffer = ruidoBuf;
    arena.loop = true;
    const arenaF = c.createBiquadFilter();
    arenaF.type = 'bandpass';
    arenaF.frequency.value = Math.min(2600, this.cfg.corte * 0.7);
    arenaF.Q.value = 0.9;
    const arenaG = c.createGain();
    arenaG.gain.value = 0;
    arena.connect(arenaF).connect(arenaG).connect(salida);

    for (const n of [osc, sub, lfo, arena]) n.start();
    this.bucles = { salida, osc, sub, filtro, lfo, motorG, arena, arenaF, arenaG, fuentes: [osc, sub, lfo, arena] };
  }

  /** Cada cuadro: motor y arena según el robot. */
  actualizar(_dt, robot, acelerador = 0) {
    try {
      this.tActualizado = performance.now();
      const c = listo();
      if (!c || !maestro) return;
      if (!this.bucles) this._crearBucles(c);
      const b = this.bucles;
      const now = c.currentTime;
      const vivo = !this.terminado && !robot.sinEnergia && !robot.destruido;
      const a = Math.abs(acelerador);
      const v = Math.min(12, robot.velocidadMs ?? 0);
      // Motor: ralentí grave y bajo; sube con el acelerador y la velocidad. (P)
      const f = 46 + 22 * a + 9 * v;
      b.osc.frequency.setTargetAtTime(f, now, 0.08);
      b.sub.frequency.setTargetAtTime(f / 2, now, 0.08);
      b.filtro.frequency.setTargetAtTime(260 + 500 * a + 70 * v, now, 0.08);
      b.lfo.frequency.setTargetAtTime(7 + 2.5 * v + 6 * a, now, 0.1);
      const volMotor = vivo ? Math.min(0.11, 0.03 + 0.04 * a + 0.005 * v) * this.cfg.motor : 0;
      b.motorG.gain.setTargetAtTime(volMotor, now, vivo ? 0.06 : 0.25);
      // Arena: mientras alguna rueda patina; más fuerte cuanto más desliza.
      let desl = 0;
      for (const w of robot.ruedas ?? []) if (w.tPatina > PATINA_SEG) desl = Math.max(desl, w.deslizamiento || 0.5);
      const volArena = !this.terminado && desl > 0 ? (0.08 + 0.07 * Math.min(1, desl / 4)) * this.cfg.patina : 0;
      b.arenaG.gain.setTargetAtTime(volArena, now, volArena ? 0.03 : 0.08);
    } catch { /* sin audio */ }
  }

  /** Puente con la telemetría del robot: (tipo, detalle). */
  alTelemetria(tipo, detalle = '') {
    if (this.terminado) return;
    const f = EFECTOS_SONIDO[tipo];
    if (!f || tipo === 'boton') return;
    const c = listo();
    if (!c || !maestro) return;
    try {
      const previo = this.ultimo.get(tipo);
      if (previo !== undefined && c.currentTime - previo < SEG_ENTRE_IGUALES) return;
      this.ultimo.set(tipo, c.currentTime);
      const ms = Number.parseFloat(detalle) || 0; // golpes: "4.2 m/s"; sacudida: "sacudida 30 g" → NaN → 0
      const intensidad = Math.min(1, ms / 6) || 0.4;
      f(c, this.bucles?.salida ?? maestro, intensidad);
    } catch { /* sin audio */ }
  }

  /** Fin del recorrido: calla motor y arena; arpegio si hubo éxito, tono de fallo si no. */
  fin(exito, motivo = '') {
    if (this.terminado) return;
    this.terminado = true;
    this._callarBucles(0.15);
    const c = listo();
    if (!c || !maestro) return;
    try {
      // El jingle va directo al maestro (es música, no se filtra por el mundo). Tras un golpe, un respiro.
      const sonar = () => { try { (exito ? EFECTOS_SONIDO.exito : EFECTOS_SONIDO.fallo)(c, maestro); } catch { /* sin audio */ } };
      if (motivo === 'chasis_destruido' || motivo === 'carga_perdida') setTimeout(sonar, 400);
      else sonar();
    } catch { /* sin audio */ }
  }

  _callarBucles(tau) {
    try {
      if (!this.bucles || !ctx) return;
      const now = ctx.currentTime;
      this.bucles.motorG.gain.setTargetAtTime(0, now, tau);
      this.bucles.arenaG.gain.setTargetAtTime(0, now, tau);
    } catch { /* sin audio */ }
  }

  destruir() {
    oyentes.delete(this.alSilencio);
    this.scene.input.keyboard?.off('keydown-M', this.alTecla);
    this.scene.events.off('pause', this.callar);
    this.scene.events.off('sleep', this.callar);
    this.scene.events.off('postupdate', this.vigilar);
    const b = this.bucles;
    this.bucles = null;
    if (!b) return;
    try {
      const t = ctx.currentTime;
      b.motorG.gain.setTargetAtTime(0, t, 0.03);
      b.arenaG.gain.setTargetAtTime(0, t, 0.03);
      for (const n of b.fuentes) n.stop(t + 0.2);
      setTimeout(() => { try { b.salida.disconnect(); } catch { /* ya desconectado */ } }, 300);
    } catch { /* sin audio */ }
  }
}
