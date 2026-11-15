// Dueño: frente expediente. Dibujo en Phaser del fondo animado del Menú, sobre el planificador puro de Leo
// (ambiente_plan.js, PR #76). Todo es ILUSTRACIÓN (sin valor científico): asteroides, un cometa, planetas o el Sol pasando
// detrás de Marte, una galaxia lejana, destellos sobre Marte y el agujero negro al volver de un nivel.
// Con `prefers-reduced-motion: reduce` solo queda una galaxia quieta.
import Phaser from 'phaser';
import {
  crearRng, entre, esperaMs, elegirEvento, elegirGalaxia, elegirDestello, posicionAgujero, evaluarRegreso,
  variantesAsteroide, MAXIMO, DURACION_EVENTO_S, DURACION_GALAXIA_S, DESTELLOS,
} from './ambiente_plan.js';

// Marte del fondo de título (assets/titulo/titulo_fondo.png: centro 160,108 y radio 76 en 320×180, dibujado ×3).
// Por defecto, el Marte del fondo de título; la pantalla de inicio (su Marte grande que gira cae justo encima) y el menú de
// opciones (Marte asomando bajo la nave) pasan el suyo con `marte`.
export const MARTE_TITULO = { x: 480, y: 324, r: 228 };
const PROFUNDIDAD = -8.6; // sobre el fondo oscurecido (-9) y detrás de las estrellas y del texto
const PASO_MS = 40; // ~25 fps: suficiente para movimiento lento y barato
const P = 3; // tamaño del pixel de arte

const COLORES_EVENTO = {
  mercurio: [0x9a9a9a, 0x6e6e6e], venus: [0xe8d39a, 0xb89a5a], tierra: [0x3d7bd9, 0x3fae6a], jupiter: [0xd8a676, 0x9c6b45],
  saturno: [0xe3cf8f, 0xa98e52], urano: [0x8fe3e0, 0x5fb3b8], neptuno: [0x3e5fd6, 0x2a3f9a], sol: [0xffd166, 0xffa94d],
};

// Línea base de resultados al salir del Menú (para la regla del agujero negro). Vive en el módulo: sobrevive al reinicio
// de la escena, no al recargar la página.
let resultadosAlSalir = null;

const reducido = () => {
  try { return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; } catch { return false; }
};

export class FondoMenu {
  /**
   * @param {Phaser.Scene} scene  escena del Menú
   * @param {{ resultados: number, semilla?: number, marte?: {x:number,y:number,r:number} }} o  `resultados` = partida.resultados.length al entrar
   */
  constructor(scene, { resultados = 0, semilla, marte = MARTE_TITULO } = {}) {
    this.scene = scene;
    const MARTE = this.marte = marte;
    const s = Number(new URLSearchParams(globalThis.location?.search ?? '').get('semilla')) || semilla || Date.now();
    this.rng = crearRng(s);
    this.g = scene.add.graphics().setDepth(PROFUNDIDAD);
    // Lo que pasa "detrás de Marte" se recorta con una máscara inversa del disco de Marte.
    this.gDetras = scene.add.graphics().setDepth(PROFUNDIDAD - 0.1);
    const forma = scene.make.graphics({ add: false });
    forma.fillStyle(0xffffff).fillCircle(MARTE.x, MARTE.y, MARTE.r);
    const mascara = forma.createGeometryMask();
    mascara.setInvertAlpha(true);
    this.gDetras.setMask(mascara);
    this.mascara = forma;

    this.formas = variantesAsteroide(this.rng, 8);
    this.asteroides = [];
    this.cometa = null;
    this.evento = null;
    this.galaxia = null;
    this.destellos = [];
    this.agujero = null;
    this.t = 0;
    this.prox = { asteroide: 800, cometa: esperaMs(this.rng, 'cometa') / 3, evento: esperaMs(this.rng, 'evento') / 6, galaxia: 0, destello: 1500 };

    // Agujero negro: solo al volver de un nivel con más resultados que al salir (regla de Leo).
    if (evaluarRegreso(resultadosAlSalir, resultados)) this.crearAgujero();
    resultadosAlSalir = resultados;

    if (reducido()) { this.nuevaGalaxia(); this.dibujar(); return; }
    this.reloj = scene.time.addEvent({ delay: PASO_MS, loop: true, callback: () => this.paso(PASO_MS) });
    scene.events.once('shutdown', () => this.destruir());
  }

  /** Llamar al salir del Menú hacia un nivel (o al cambiar de vista no hace falta: la línea base ya quedó). */
  static marcarSalida(resultados) { resultadosAlSalir = resultados; }

  destruir() {
    this.reloj?.remove();
    if (this.g?.scene) this.g.destroy();
    if (this.gDetras?.scene) this.gDetras.destroy();
    this.mascara?.destroy();
    this.g = null; this.gDetras = null;
  }

  paso(dt) {
    // limpiar() del Menú destruye todos los objetos al cambiar de vista: si ya no existen, se apaga el reloj.
    if (!this.g || !this.g.scene) { this.destruir(); return; }
    this.t += dt;
    const r = this.rng;
    for (const k of Object.keys(this.prox)) this.prox[k] -= dt;
    if (this.prox.asteroide <= 0) {
      if (this.asteroides.length < MAXIMO.asteroides) this.nuevoAsteroide();
      this.prox.asteroide = esperaMs(r, 'asteroide');
    }
    if (this.prox.cometa <= 0) {
      if (!this.cometa) this.nuevoCometa();
      this.prox.cometa = esperaMs(r, 'cometa');
    }
    if (this.prox.evento <= 0) {
      if (!this.evento) this.nuevoEvento();
      this.prox.evento = esperaMs(r, 'evento');
    }
    if (this.prox.galaxia <= 0) {
      if (!this.galaxia) this.nuevaGalaxia();
      this.prox.galaxia = esperaMs(r, 'galaxia');
    }
    if (this.prox.destello <= 0) {
      this.nuevoDestello();
      this.prox.destello = entre(r, [2500, 6000]);
    }
    const s = dt / 1000;
    this.asteroides = this.asteroides.filter((a) => { a.x += a.vx * s; a.y += a.vy * s; a.ang += a.va * s; return a.x > -60 && a.x < 1020 && a.y > -60 && a.y < 600; });
    if (this.cometa) { this.cometa.t += s; if (this.cometa.t > this.cometa.dur) this.cometa = null; }
    if (this.evento) { this.evento.t += s; if (this.evento.t > this.evento.dur) this.evento = null; }
    if (this.galaxia) { this.galaxia.t += s; if (this.galaxia.t > this.galaxia.dur) this.galaxia = null; }
    this.destellos = this.destellos.filter((d) => (d.t += s) < d.dur);
    if (this.agujero) { this.agujero.t += s; if (this.agujero.t > this.agujero.dur) this.agujero = null; }
    this.dibujar();
  }

  nuevoAsteroide() {
    const r = this.rng;
    const izq = r() < 0.5;
    this.asteroides.push({
      x: izq ? -40 : 1000, y: entre(r, [40, 500]), vx: (izq ? 1 : -1) * entre(r, [25, 60]), vy: entre(r, [-12, 12]),
      ang: r() * 6.28, va: entre(r, [-1, 1]), tam: entre(r, [7, 13]), forma: this.formas[Math.floor(r() * this.formas.length)],
    });
  }

  nuevoCometa() {
    const r = this.rng;
    const x0 = entre(r, [100, 860]);
    this.cometa = { x0, y0: entre(r, [30, 140]), dx: (r() < 0.5 ? -1 : 1) * entre(r, [220, 380]), dy: entre(r, [60, 140]), t: 0, dur: entre(r, [2.5, 4]) };
  }

  nuevoEvento() {
    const r = this.rng;
    const MARTE = this.marte;
    const id = elegirEvento(r);
    const dur = entre(r, DURACION_EVENTO_S);
    const izq = r() < 0.5;
    const radio = id === 'sol' ? 26 : id === 'jupiter' || id === 'saturno' ? 18 : 11;
    // Cruza detrás de Marte, a la altura de su mitad superior.
    this.evento = { id, t: 0, dur, x0: izq ? MARTE.x - MARTE.r - 80 : MARTE.x + MARTE.r + 80, x1: izq ? MARTE.x + MARTE.r + 80 : MARTE.x - MARTE.r - 80, y: entre(r, [MARTE.y - MARTE.r * 0.9, MARTE.y - MARTE.r * 0.2]), radio };
  }

  nuevaGalaxia() {
    const r = this.rng;
    const lado = r() < 0.5 ? entre(r, [80, 220]) : entre(r, [740, 880]);
    this.galaxia = { id: elegirGalaxia(r, this.galaxia?.id ?? this.ultimaGalaxia ?? null), x: lado, y: entre(r, [70, 200]), t: 0, dur: entre(r, DURACION_GALAXIA_S), ang: entre(r, [-0.6, 0.6]) };
    this.ultimaGalaxia = this.galaxia.id;
    // Puntos de la galaxia (fijos durante su vida).
    this.galaxia.puntos = Array.from({ length: 70 }, () => {
      const a = r() * 6.28; const d = Math.pow(r(), 1.6);
      return [Math.cos(a) * d * 46, Math.sin(a) * d * 14, r()];
    });
  }

  nuevoDestello() {
    const r = this.rng;
    const MARTE = this.marte;
    const a = r() * 6.28; const d = Math.sqrt(r()) * MARTE.r * 0.85;
    this.destellos.push({ x: MARTE.x + Math.cos(a) * d, y: MARTE.y + Math.sin(a) * d, color: DESTELLOS[elegirDestello(r)], t: 0, dur: 0.6 });
  }

  crearAgujero() {
    const p = posicionAgujero(this.rng);
    this.agujero = { x: p.x, y: p.y, t: 0, dur: 9 };
  }

  dibujar() {
    const g = this.g; const gd = this.gDetras;
    if (!g) return;
    g.clear(); gd.clear();
    const px = (x) => Math.round(x / P) * P;
    // Galaxia: nube de puntos que aparece y se desvanece.
    if (this.galaxia) {
      const G = this.galaxia; const vida = Math.min(1, G.t / 8, (G.dur - G.t) / 8) || 0.6;
      const c = Math.cos(G.ang), s = Math.sin(G.ang);
      for (const [x, y, k] of G.puntos) {
        g.fillStyle(k > 0.85 ? 0xffffff : 0xc9a7ff, Math.max(0.12, vida * (0.25 + k * 0.4)));
        g.fillRect(px(G.x + x * c - y * s), px(G.y + x * s + y * c), P, P);
      }
    }
    // Planeta o Sol detrás de Marte (recortado por la máscara).
    if (this.evento) {
      const E = this.evento; const k = E.t / E.dur;
      const x = E.x0 + (E.x1 - E.x0) * k; const [c1, c2] = COLORES_EVENTO[E.id];
      if (E.id === 'sol') { gd.fillStyle(0xffd166, 0.18); gd.fillCircle(x, E.y, E.radio * 2); }
      gd.fillStyle(c1, 0.9); gd.fillCircle(px(x), px(E.y), E.radio);
      gd.fillStyle(c2, 0.9); gd.fillRect(px(x - E.radio * 0.7), px(E.y), Math.round(E.radio * 1.4 / P) * P, P);
      if (E.id === 'saturno') { gd.lineStyle(P, 0xe3cf8f, 0.8); gd.strokeEllipse(px(x), px(E.y), E.radio * 3.6, E.radio * 0.9); }
    }
    // Asteroides: polígonos de Leo, girando.
    for (const a of this.asteroides) {
      const pts = a.forma.map(([x, y]) => ({ x: a.x + (x * Math.cos(a.ang) - y * Math.sin(a.ang)) * a.tam, y: a.y + (x * Math.sin(a.ang) + y * Math.cos(a.ang)) * a.tam }));
      g.fillStyle(0x6e6a78, 0.85); g.fillPoints(pts, true);
      g.fillStyle(0xa8a2b6, 0.85); g.fillRect(px(a.x - a.tam * 0.3), px(a.y - a.tam * 0.3), P, P);
    }
    // Cometa: cabeza y cola.
    if (this.cometa) {
      const C = this.cometa; const k = C.t / C.dur;
      const hx = C.x0 + C.dx * k; const hy = C.y0 + C.dy * k;
      for (let i = 0; i < 14; i++) {
        const f = i / 14;
        g.fillStyle(0xbfe9ff, (1 - f) * 0.7 * Math.min(1, (1 - k) * 4));
        g.fillRect(px(hx - C.dx * 0.12 * f), px(hy - C.dy * 0.12 * f), P, P);
      }
      g.fillStyle(0xffffff, 1); g.fillRect(px(hx), px(hy), P * 2, P * 2);
    }
    // Destellos sobre Marte: cruz de 4 puntas que crece y se apaga.
    for (const d of this.destellos) {
      const k = d.t / d.dur; const a = Math.sin(k * Math.PI);
      const col = Phaser.Display.Color.HexStringToColor(d.color).color;
      g.fillStyle(col, a); const L = Math.round(1 + a * 2) * P;
      g.fillRect(px(d.x) - L, px(d.y), L * 2 + P, P); g.fillRect(px(d.x), px(d.y) - L, P, L * 2 + P);
    }
    // Agujero negro: disco oscuro con anillo de acreción que gira, aparece y se va.
    if (this.agujero) {
      const A = this.agujero; const vida = Math.min(1, A.t / 1.5, (A.dur - A.t) / 1.5);
      const r = 22 * vida;
      g.fillStyle(0xffa94d, 0.35 * vida); g.fillEllipse(A.x, A.y, r * 4.2, r * 1.3);
      g.lineStyle(P, 0xc9a7ff, 0.8 * vida); g.strokeEllipse(A.x, A.y, r * 3.4 + Math.sin(A.t * 3) * 4, r * 1.1);
      g.fillStyle(0x000000, 1 * vida); g.fillCircle(A.x, A.y, r);
    }
  }
}
