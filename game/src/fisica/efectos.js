// Efectos visuales de la prueba y la misión (polvo, arena al patinar, chispas, destellos, explosión, humo, celebración).
// Recorrido crea un `Efectos` y le pasa los eventos del robot. Cada efecto se describe con
// { tipo, x, y, superficie, intensidad, dir } en coordenadas de mundo.
//
// Visual: si en /assets hay una hoja `fx_<tipo>` (PNG + JSON de pixelfx/Aseprite, o tira horizontal de cuadros
// cuadrados sin JSON), se reproduce esa animación. Si no, se dibuja un efecto provisional con partículas cuadradas
// de tamaño múltiplo de 3 px de pantalla (1 px de arte × 3). Ver docs/juego/ASSETS_ARTE.md, "Efectos".
// Colores, cantidades y umbrales = valores de juego (P), provisionales hasta las paletas de arte.
import Phaser from 'phaser';
import { m, PX_POR_M, ZOOM_ARTE, FACTOR_GRAVEDAD, velAMs } from './escala.js';
import { COLOR_SUPERFICIE } from './terreno.js';
import { PATINA_SEG } from './robot.js';
import { UMBRAL_CHASIS_MS } from './danio.js';

const M = Phaser.Physics.Matter.Matter;

// Hojas de efectos encontradas en /assets al compilar (vite). Sin archivos, el objeto queda vacío y no se pide nada.
const ARCHIVOS_FX = import.meta.glob('../../../assets/**/fx_*.{png,json}', { eager: true, query: '?url', import: 'default' });

/** { fx_patinaje: { png, json? }, ... } a partir de las rutas encontradas. */
function indexarHojas(archivos) {
  const hojas = {};
  for (const [ruta, url] of Object.entries(archivos)) {
    const [, nombre, ext] = ruta.match(/\/(fx_[^/]+)\.(png|json)$/) ?? [];
    if (!nombre) continue;
    (hojas[nombre] ??= {})[ext] = url;
  }
  for (const k of Object.keys(hojas)) if (!hojas[k].png) delete hojas[k]; // un JSON sin imagen no sirve
  return hojas;
}
const HOJAS = indexarHojas(ARCHIVOS_FX);
const PREFIJO_TEXTURA = 'efx:'; // evita choques con otras texturas del juego
const PREFIJO_ANIM = 'efx-anim:';
const FPS_POR_DEFECTO = 15;

const PX = ZOOM_ARTE; // 1 px de arte en pantalla
const PIXEL = '__efectos_px'; // textura de 1 × 1 blanca; las partículas se escalan a 3, 6, 9 px

// Polvo continuo: partículas por segundo por m/s de la rueda, con tope. (P)
const POLVO_POR_MS = 5;
const POLVO_MAX = 36;
const POLVO_MIN_MS = 0.6; // por debajo de esta velocidad la rueda no levanta polvo
// Arena al patinar: chorro fuerte y continuo desde la rueda que patina (el aviso visual del camino dorado). (P)
const PATINA_POR_SEG = 70;
const PATINA_RAFAGA = 18; // ráfaga extra al empezar a patinar
// Sacudida de cámara (fracción del ancho de pantalla: 3 px = 3/960). (P)
const SACUDIDA_GOLPE_MS = UMBRAL_CHASIS_MS + 2; // golpes de chasis por encima de esto sacuden la cámara
const MAX_SPRITES = 48; // tope de hojas de efecto vivas a la vez
const SPRITE_CONTINUO_MS = { polvo: 110, patinaje: 70 }; // separación mínima entre hojas continuas por rueda

const PALETA_FIESTA = [0xffd166, 0x4cc38a, 0x6fb3ff, 0xff6b6b, 0xffffff];
const PALETA_CHISPA = [0xffffff, 0xfff1a8, 0xffd166, 0xff9b3d];
const PALETA_FUEGO = [0xfff1a8, 0xffd166, 0xff9b3d, 0xd94a3a, 0x3a3340];
const PALETA_HUMO = [0x3a3a44, 0x55555f, 0x77777f];

const elegir = (lista) => lista[(Math.random() * lista.length) | 0];
const colorMezcla = (c, factor) => {
  const col = Phaser.Display.Color.ValueToColor(c);
  return (factor >= 0 ? col.clone().lighten(factor * 100) : col.clone().darken(-factor * 100)).color;
};

/** Paletas de polvo [claro, base, oscuro] por mundo y superficie, a partir de los colores del terreno. (P) */
function paletasPolvo() {
  const out = {};
  for (const [mundo, sup] of Object.entries(COLOR_SUPERFICIE)) {
    out[mundo] = {};
    for (const [tipo, c] of Object.entries(sup)) out[mundo][tipo] = [colorMezcla(c, 0.22), colorMezcla(c, 0.1), c, colorMezcla(c, -0.25)];
  }
  return out;
}

export class Efectos {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} o  mundo ('tierra'|'marte'|'luna'), gravedad (m/s²), robot (Robot), superficieDe(xMundo)
   */
  constructor(scene, o) {
    this.scene = scene;
    this.mundo = o.mundo ?? 'tierra';
    this.robot = o.robot;
    this.superficieDe = o.superficieDe ?? (() => 'compacto');
    // Gravedad de las partículas en px/s², con el mismo factor de juego que la física.
    this.gPx = (o.gravedad ?? 9.81) * PX_POR_M * FACTOR_GRAVEDAD;
    // En la Luna no hay aire: el polvo sigue arcos balísticos y no flota.
    this.sinAire = this.mundo === 'luna';
    this.paletas = paletasPolvo();
    this.acum = new Map(); // acumuladores de emisión continua por rueda
    this.patinaba = new Map();
    this.ultimoSprite = new Map();
    this.sprites = new Set();
    this.timers = [];
    this.vivo = true;

    this._texturaPixel();
    this._crearEmisores();
    this._cargarHojas();
  }

  // ---------------------------------------------------------------- API

  /**
   * Reproduce un efecto en coordenadas de mundo.
   * @param {{ tipo: string, x: number, y: number, superficie?: string, intensidad?: number, dir?: number, n?: number, fuente?: string }} ev
   *   intensidad: 0..1 (o m/s en golpes); dir: -1/1 hacia dónde salen las partículas; n: partículas (emisión continua).
   */
  emitir(ev) {
    if (!this.vivo) return;
    if (this._reproducirHoja(ev)) return;
    const f = this.provisionales[ev.tipo];
    if (f) f.call(this, ev);
  }

  /** Puente con la telemetría del robot: (tipo, detalle) → efecto en la rueda, el chasis o la carga. */
  alTelemetria(tipo, detalle = '') {
    const r = this.robot;
    if (!r || !this.vivo) return;
    const intensidad = Number.parseFloat(detalle) || 0; // golpes: "4.2 m/s"
    if (tipo === 'golpe_chasis' || tipo === 'chasis_destruido') {
      const p = puntoBajo(r.chasis);
      this.emitir({ tipo, x: p.x, y: p.y, superficie: this.superficieDe(p.x), intensidad });
    } else if (tipo === 'golpe_carga' || tipo === 'carga_perdida') {
      const { x, y } = r.carga.position;
      this.emitir({ tipo, x, y, superficie: this.superficieDe(x), intensidad });
    } else if (tipo === 'energia_agotada') {
      this.emitir({ tipo, x: r.x, y: r.y, superficie: this.superficieDe(r.x) });
    }
    // 'patinaje' llega cada cuadro: el chorro de arena lo emite actualizar() desde la rueda que patina.
  }

  /** Cada cuadro: polvo de las ruedas en el suelo (∝ velocidad) y arena de la rueda que patina. */
  actualizar(dtMs, robot = this.robot) {
    if (!this.vivo || !robot) return;
    const dt = dtMs / 1000;
    robot.ruedas.forEach((w, i) => {
      const clave = `r${i}`;
      const enSuelo = robot.t - w.ultimoContacto < 0.15;
      const omega = M.Body.getAngularVelocity(w.cuerpo);
      const v = M.Body.getVelocity(w.cuerpo);
      const x = w.cuerpo.position.x;
      const y = w.cuerpo.position.y + w.radio; // punto de contacto (aprox.: bajo el centro)
      const superficie = w.superficie ?? this.superficieDe(x);
      const patina = enSuelo && w.tPatina > PATINA_SEG;
      if (patina) {
        // La rueda gira hacia adelante y lanza la arena hacia atrás.
        const dir = omega >= 0 ? -1 : 1;
        if (!this.patinaba.get(clave)) this.emitir({ tipo: 'patinaje', x, y, superficie, dir, n: PATINA_RAFAGA, fuente: clave, intensidad: 1 });
        const n = this._continuo(clave, PATINA_POR_SEG, dt);
        if (n) this.emitir({ tipo: 'patinaje', x, y, superficie, dir, n, fuente: clave, intensidad: Math.min(1, w.deslizamiento / 4) });
      } else if (enSuelo) {
        const vMs = velAMs(Math.abs(v.x));
        if (vMs > POLVO_MIN_MS) {
          const n = this._continuo(clave, Math.min(POLVO_MAX, vMs * POLVO_POR_MS), dt);
          const dir = v.x >= 0 ? -1 : 1;
          if (n) this.emitir({ tipo: 'polvo', x, y, superficie, dir, n, fuente: clave, intensidad: Math.min(1, vMs / 8) });
        }
      }
      this.patinaba.set(clave, patina);
    });
  }

  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    for (const t of this.timers) t.remove(false);
    this.timers.length = 0;
    for (const s of this.sprites) s.destroy();
    this.sprites.clear();
    for (const e of Object.values(this.emisores ?? {})) e.destroy();
    this.emisores = {};
    this.flashes?.destroy();
    this.scene.load?.off('complete', this._alCargar, this);
  }

  /** Para el preload de una escena: pide las hojas fx_* que existan (sin archivos, no pide nada). */
  static precargar(scene) {
    for (const [nombre, h] of Object.entries(HOJAS)) {
      const clave = PREFIJO_TEXTURA + nombre;
      if (scene.textures.exists(clave)) continue;
      if (h.json) scene.load.atlas(clave, h.png, h.json);
      else scene.load.image(clave, h.png);
    }
  }

  // ---------------------------------------------------------------- emisión continua

  _continuo(clave, porSegundo, dt) {
    const a = (this.acum.get(clave) ?? 0) + porSegundo * dt;
    const n = Math.floor(a);
    this.acum.set(clave, a - n);
    return n;
  }

  // ---------------------------------------------------------------- hojas de sprites (pixelfx / Aseprite)

  _cargarHojas() {
    if (!Object.keys(HOJAS).length) return;
    const pendientes = Object.keys(HOJAS).filter((n) => !this.scene.textures.exists(PREFIJO_TEXTURA + n));
    if (!pendientes.length) return this._prepararAnimaciones();
    // Creado en create(): el loader ya terminó y se puede volver a arrancar. Mientras carga, se usan los provisionales.
    Efectos.precargar(this.scene);
    this.scene.load.once('complete', this._alCargar, this);
    if (!this.scene.load.isLoading()) this.scene.load.start();
  }

  _alCargar() {
    if (this.vivo) this._prepararAnimaciones();
  }

  /** Crea una animación por hoja: frames del JSON (orden natural) o tira horizontal de cuadros cuadrados. */
  _prepararAnimaciones() {
    const { textures, anims } = this.scene;
    for (const [nombre, h] of Object.entries(HOJAS)) {
      const clave = PREFIJO_TEXTURA + nombre;
      if (!textures.exists(clave) || anims.exists(PREFIJO_ANIM + nombre)) continue;
      const tex = textures.get(clave);
      let nombres;
      if (h.json) {
        nombres = tex.getFrameNames().sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      } else {
        const base = tex.get();
        const lado = base.height;
        const cuadros = lado > 0 && base.width % lado === 0 ? base.width / lado : 1;
        nombres = [];
        if (cuadros > 1) for (let i = 0; i < cuadros; i++) { tex.add(i, 0, i * lado, 0, lado, lado); nombres.push(i); }
        else nombres.push('__BASE');
      }
      const dur = tex.get(nombres[0])?.customData?.duration;
      anims.create({
        key: PREFIJO_ANIM + nombre,
        frames: nombres.map((frame) => ({ key: clave, frame })),
        frameRate: dur ? 1000 / dur : FPS_POR_DEFECTO,
        repeat: 0,
      });
    }
  }

  /** Busca la hoja más específica: fx_<tipo>_<mundo>_<superficie>, fx_<tipo>_<superficie>, fx_<tipo>_<mundo>, fx_<tipo>. */
  _hojaPara(ev) {
    const t = `fx_${ev.tipo}`;
    const s = ev.superficie;
    const candidatas = [s && `${t}_${this.mundo}_${s}`, s && `${t}_${s}`, `${t}_${this.mundo}`, t];
    return candidatas.find((n) => n && this.scene.anims.exists(PREFIJO_ANIM + n));
  }

  _reproducirHoja(ev) {
    if (!Object.keys(HOJAS).length) return false;
    const nombre = this._hojaPara(ev);
    if (!nombre) return false;
    const continuo = SPRITE_CONTINUO_MS[ev.tipo];
    if (continuo) {
      const ahora = this.scene.time.now;
      const clave = `${ev.tipo}|${ev.fuente ?? ''}`;
      if (ahora - (this.ultimoSprite.get(clave) ?? -Infinity) < continuo) return true;
      this.ultimoSprite.set(clave, ahora);
    }
    if (this.sprites.size >= MAX_SPRITES) return true;
    // Polvo y arena nacen del suelo (origen abajo al centro); el resto, centrado en el punto del evento.
    // Polvo y arena van detrás del robot (profundidad 9, como las partículas de arena) para no tapar el chasis.
    const deSuelo = ev.tipo === 'polvo' || ev.tipo === 'patinaje';
    const s = this.scene.add.sprite(ev.x, ev.y, PREFIJO_TEXTURA + nombre)
      .setOrigin(0.5, deSuelo ? 1 : 0.5).setScale(PX).setDepth(deSuelo ? 9 : 11)
      .setFlipX((ev.dir ?? 1) > 0 && deSuelo); // la hoja se dibuja con el polvo saliendo hacia la izquierda (robot a la derecha)
    this.sprites.add(s);
    s.once('animationcomplete', () => { this.sprites.delete(s); s.destroy(); });
    s.play(PREFIJO_ANIM + nombre);
    if (ev.tipo === 'chasis_destruido' || ev.tipo === 'golpe_chasis') this._sacudir(ev);
    return true;
  }

  // ---------------------------------------------------------------- provisionales (partículas cuadradas)

  _texturaPixel() {
    if (this.scene.textures.exists(PIXEL)) return;
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 1, 1);
    g.generateTexture(PIXEL, 1, 1);
    g.destroy();
  }

  /**
   * Un emisor por familia, sin flujo propio: se dispara con emitParticleAt.
   * Tinte, tamaño, ángulo y velocidad se leen de this.cfg en el momento de emitir.
   */
  _crearEmisores() {
    const self = this;
    this.cfg = {};
    const tamano = (lista) => ({
      onEmit: (p) => { p.s0 = elegir(lista); return p.s0; },
      // Se encoge en pasos de 3 px (sin tamaños fraccionarios).
      onUpdate: (p, _k, t) => Math.max(PX, Math.ceil((p.s0 * (1 - t * 0.8)) / PX) * PX),
    });
    const crear = (nombre, extra) => this.scene.add.particles(0, 0, PIXEL, {
      emitting: false,
      tint: { onEmit: () => elegir(self.cfg[nombre].colores) },
      angle: { onEmit: () => Phaser.Math.Between(...self.cfg[nombre].angulo) },
      speed: { onEmit: () => Phaser.Math.Between(...self.cfg[nombre].vel) },
      lifespan: { onEmit: () => Phaser.Math.Between(...self.cfg[nombre].vida) },
      // Desvanecido en escalones (pixel art): opaco, medio y fuera.
      alpha: { onEmit: () => 1, onUpdate: (_p, _k, t) => (t < 0.65 ? 1 : t < 0.88 ? 0.6 : 0.3) },
      ...extra,
    }).setDepth(11);
    // gravityY de cada familia: polvo flota un poco en la Tierra y Marte; en la Luna cae como la arena. (P)
    const gPolvo = this.sinAire ? this.gPx * 0.6 : -m(0.6);
    this.emisores = {
      polvo: crear('polvo', { scale: tamano([PX, PX, 2 * PX]), gravityY: gPolvo, maxAliveParticles: 220 }),
      // La arena va detrás del robot (profundidad 9) para que el chorro no tape el chasis.
      arena: crear('arena', { scale: tamano([PX, 2 * PX, 2 * PX, 3 * PX]), gravityY: this.gPx * 0.7, maxAliveParticles: 360 }).setDepth(9),
      chispa: crear('chispa', { scale: tamano([PX, PX, 2 * PX]), gravityY: this.gPx * 0.5, maxAliveParticles: 120 }),
      escombro: crear('escombro', { scale: tamano([2 * PX, 3 * PX]), gravityY: this.gPx, maxAliveParticles: 120 }),
      humo: crear('humo', { scale: tamano([2 * PX, 3 * PX, 4 * PX]), gravityY: -m(1.2), maxAliveParticles: 120 }),
      fiesta: crear('fiesta', { scale: tamano([PX, 2 * PX]), gravityY: this.gPx * 0.35, maxAliveParticles: 200 }),
    };
    // Destellos: rectángulos que se apagan con un tween (se reutiliza un solo Graphics por destello).
    this.flashes = this.scene.add.group();
  }

  /** Configura una familia y emite n partículas en (x, y). angulo en grados de Phaser (0 = derecha, 90 = abajo). */
  _particulas(familia, x, y, n, { colores, angulo, vel, vida }) {
    const e = this.emisores[familia];
    if (!e || n <= 0) return;
    this.cfg[familia] = { colores, angulo, vel, vida };
    e.emitParticleAt(Math.round(x), Math.round(y), n);
  }

  _paleta(superficie) {
    const p = this.paletas[this.mundo] ?? this.paletas.tierra;
    return p?.[superficie] ?? p?.compacto ?? [0xaaaaaa];
  }

  _destello(x, y, ancho, alto, color = 0xffffff, ms = 160) {
    const r = this.scene.add.rectangle(Math.round(x), Math.round(y), ancho, alto, color, 0.9).setDepth(12);
    this.flashes.add(r);
    this.scene.tweens.add({
      targets: r, alpha: 0, duration: ms, ease: 'Stepped', easeParams: [3],
      onComplete: () => { this.flashes?.remove(r, true, true); },
    });
  }

  _sacudir(ev) {
    const cam = this.scene.cameras.main;
    if (ev.tipo === 'chasis_destruido') cam.shake(320, (3 * PX) / 960);
    else if (ev.tipo === 'golpe_chasis' && (ev.intensidad ?? 0) >= SACUDIDA_GOLPE_MS) cam.shake(140, (2 * PX) / 960);
  }

  _repetir(veces, cadaMs, fn) {
    const t = this.scene.time.addEvent({ delay: cadaMs, repeat: veces - 1, callback: fn });
    this.timers.push(t);
    // Se quita de la lista al terminar para no acumular referencias.
    this.scene.time.delayedCall(veces * cadaMs + 20, () => { this.timers = this.timers.filter((x) => x !== t); });
  }

  provisionales = {
    polvo(ev) {
      const c = this._paleta(ev.superficie);
      const atras = (ev.dir ?? -1) < 0;
      // Nube baja que sale hacia atrás de la rueda.
      this._particulas('polvo', ev.x, ev.y - PX, ev.n ?? 1, {
        colores: c, angulo: atras ? [190, 235] : [305, 350], vel: [m(0.6), m(1.6 + 2 * (ev.intensidad ?? 0))], vida: [350, 650],
      });
    },

    patinaje(ev) {
      const c = this._paleta(ev.superficie);
      // Granos claros y oscuros para que el chorro se lea encima del mismo suelo y del cielo.
      const colores = [c[0], c[0], 0xfff4dc, c[1], c[3], c[3]];
      const dir = (ev.dir ?? -1) < 0 ? -1 : 1;
      const fuerza = 0.7 + 0.3 * (ev.intensidad ?? 1);
      // Chorro alto hacia atrás ("cola de gallo"), desde el borde trasero de la rueda, a ras del suelo.
      const x0 = ev.x + dir * m(0.35);
      const y0 = ev.y - m(0.25);
      this._particulas('arena', x0, y0, ev.n ?? 1, {
        colores, angulo: dir < 0 ? [205, 255] : [285, 335], vel: [m(4 * fuerza), m(10 * fuerza)], vida: [500, 900],
      });
      // Nube baja de polvo que se queda en la rueda.
      this._particulas('polvo', x0, y0, Math.ceil((ev.n ?? 1) / 2), {
        colores: c, angulo: [180, 360], vel: [m(0.6), m(2.2)], vida: [500, 900],
      });
    },

    golpe_chasis(ev) {
      const fuerte = Math.min(1, Math.max(0, ((ev.intensidad ?? UMBRAL_CHASIS_MS) - UMBRAL_CHASIS_MS) / 6));
      if (ev.superficie === 'roca') {
        this._particulas('chispa', ev.x, ev.y, Math.round(10 + 20 * fuerte), {
          colores: PALETA_CHISPA, angulo: [190, 350], vel: [m(3), m(8 + 6 * fuerte)], vida: [150, 350],
        });
        this._destello(ev.x, ev.y, 3 * PX, 3 * PX, 0xfff1a8, 90);
      }
      this._particulas('polvo', ev.x, ev.y, Math.round(8 + 14 * fuerte), {
        colores: this._paleta(ev.superficie), angulo: [180, 360], vel: [m(1), m(3 + 3 * fuerte)], vida: [300, 600],
      });
      this._sacudir(ev);
    },

    golpe_carga(ev) {
      const r = this.robot;
      const ancho = r ? Math.round((r.carga.bounds.max.x - r.carga.bounds.min.x) / PX) * PX : 8 * PX;
      const alto = r ? Math.round((r.carga.bounds.max.y - r.carga.bounds.min.y) / PX) * PX : 6 * PX;
      this._destello(ev.x, ev.y, ancho + 2 * PX, alto + 2 * PX, 0xffffff, 180);
      this._particulas('chispa', ev.x, ev.y, 8, { colores: [0xffffff, 0xffd166], angulo: [200, 340], vel: [m(1.5), m(4)], vida: [150, 300] });
    },

    carga_perdida(ev) {
      this._particulas('polvo', ev.x, ev.y, 18, { colores: this._paleta(ev.superficie), angulo: [180, 360], vel: [m(1), m(4)], vida: [350, 700] });
      this._particulas('escombro', ev.x, ev.y, 6, { colores: [0xffd166, 0xd94a3a, 0x7a4040], angulo: [210, 330], vel: [m(2), m(5)], vida: [400, 700] });
      this._destello(ev.x, ev.y, 9 * PX, 6 * PX, 0xff9b9b, 160);
    },

    chasis_destruido(ev) {
      const r = this.robot;
      const x = r?.x ?? ev.x;
      const y = r?.y ?? ev.y;
      this._destello(x, y, 30 * PX, 12 * PX, 0xfff1a8, 220);
      this._particulas('escombro', x, y, 36, { colores: PALETA_FUEGO, angulo: [180, 360], vel: [m(3), m(10)], vida: [500, 1100] });
      this._particulas('escombro', x, y, 10, { colores: [0xdfe3ee, 0x9aa4c7, 0x5a3a3a], angulo: [200, 340], vel: [m(4), m(9)], vida: [700, 1200] });
      this._particulas('chispa', x, y, 24, { colores: PALETA_CHISPA, angulo: [0, 360], vel: [m(4), m(11)], vida: [200, 450] });
      this._repetir(6, 140, () => {
        const rr = this.robot;
        this._particulas('humo', rr?.x ?? x, (rr?.y ?? y) - m(0.3), 4, { colores: PALETA_HUMO, angulo: [250, 290], vel: [m(0.5), m(1.5)], vida: [700, 1200] });
      });
      this._sacudir(ev);
    },

    energia_agotada() {
      // Humo que sube del chasis durante ~1.6 s (motor que se apaga).
      this._repetir(10, 160, () => {
        const r = this.robot;
        if (!r) return;
        this._particulas('humo', r.x - m(0.6), r.y - m(0.4), 2, { colores: PALETA_HUMO, angulo: [255, 285], vel: [m(0.4), m(1.2)], vida: [800, 1300] });
      });
    },

    entrega(ev) {
      this._celebrar(ev, 40);
    },

    meta(ev) {
      this._celebrar(ev, 28);
    },
  };

  _celebrar(ev, n) {
    this._particulas('fiesta', ev.x, ev.y, n, { colores: PALETA_FIESTA, angulo: [240, 300], vel: [m(4), m(9)], vida: [900, 1500] });
    this._repetir(3, 260, () => {
      this._particulas('fiesta', ev.x + Phaser.Math.Between(-m(1.5), m(1.5)), ev.y, Math.round(n / 2), {
        colores: PALETA_FIESTA, angulo: [235, 305], vel: [m(3), m(8)], vida: [800, 1300],
      });
    });
  }
}

/** Punto más bajo del chasis (donde suele tocar el suelo al golpear). */
function puntoBajo(cuerpo) {
  let mejor = cuerpo.position;
  for (const parte of cuerpo.parts) for (const v of parte.vertices) if (v.y > mejor.y) mejor = v;
  return { x: mejor.x, y: mejor.y };
}
