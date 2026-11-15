// Dueño: frente juego (pantalla de inicio). Piezas en Phaser de la pantalla de inicio y del menú de opciones (Menu.js):
// - Pantalla de inicio = el GIF de título de Mauricio (docs/media/marsception_1600x900.mp4, en 960 × 540): se reproduce como
//   video (game/public/video/inicio.webm, respaldo .mp4) sobre un cuadro fijo sacado del mismo video (inicio_cuadro.webp).
//   Con prefers-reduced-motion, o si el video no carga, queda el cuadro fijo: misma apariencia.
// - Transición al menú: salto (warp) hacia Marte con estrellas que se estiran en líneas y un destello (Estela, warp()).
// - Respaldo sin el cuadro: Marte grande que gira (marte_grande.js), logo con brillo y lema en la fuente pixel.
// - Fondo del menú de opciones y zoom a la escotilla: menu_nave.js (este archivo conserva el respaldo en código).
// Todo es ILUSTRACIÓN (arte del juego). Con prefers-reduced-motion: nada gira ni parpadea y las transiciones son fundidos.
import { crearMarteGrande } from './marte_grande.js';
import { ARTE_NAVE, pintarFondoNave } from './nave_pixeles.js';
import { movimientoReducido, soltarTweensAlDestruir } from './efectos.js';
import { textoPixel, hayFuente, FUENTE_CUERPO } from '../comun/fuente.js';
import { MARTE_TITULO } from './fondo_menu.js';

const ESCALA = 3; // un pixel de arte = 3 px del juego (fondos de 320 × 180)

// ---------- video de la pantalla de inicio (game/public/video/) ----------
const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/');
export const VIDEO_INICIO = {
  urls: [`${BASE}video/inicio.webm`, `${BASE}video/inicio.mp4`],
  cuadro: `${BASE}video/inicio_cuadro.webp`,
  clave: 'inicio_cuadro',
};

/** Para Menu.preload(): el cuadro fijo del video (≈ 100 kB) se carga antes de crear la vista; el video, después. */
export function precargarInicio(scene) {
  if (!scene.textures.exists(VIDEO_INICIO.clave)) scene.load.image(VIDEO_INICIO.clave, VIDEO_INICIO.cuadro);
}

/**
 * Fondo de la pantalla de inicio: el cuadro fijo del GIF de Mauricio y, encima, el video en bucle (mudo, en línea) que
 * aparece cuando ya tiene su primer cuadro. Devuelve { cuadro, video, objetos } o null si no hay cuadro (usar respaldo).
 */
export function videoInicio(scene) {
  if (!scene.textures.exists(VIDEO_INICIO.clave)) return null;
  const cuadro = scene.add.image(480, 270, VIDEO_INICIO.clave).setDepth(-10);
  cuadro.setScale(960 / cuadro.width, 540 / cuadro.height);
  const r = { cuadro, video: null, objetos: [cuadro] };
  if (movimientoReducido() || typeof document === 'undefined') return r;
  try {
    const v = scene.add.video(480, 270).setDepth(-9.9).setAlpha(0);
    const quitar = () => { if (v.active) v.destroy(); r.video = null; r.objetos = [cuadro]; };
    v.once('created', (_v, w, h) => { if (!v.active) return; v.setScale(960 / w, 540 / h).setAlpha(1); });
    v.once('error', quitar);
    v.once('unsupported', quitar);
    v.loadURL(VIDEO_INICIO.urls, true);
    v.play(true);
    r.video = v;
    r.objetos = [cuadro, v];
  } catch (e) {
    console.warn('[inicio] sin video, queda el cuadro fijo', e);
  }
  return r;
}

/**
 * Texto en la fuente pixel del juego (textoPixel de comun/fuente.js, una sola carga en el Boot) a escala entera:
 * escala 2 = mayúscula de 14 px, 3 = 21 px. Respaldo monospace si la fuente no cargó.
 */
export function textoPx(scene, x, y, s, { escala = 2, color = '#ffffff', origen = [0, 0.5], profundidad = 2 } = {}) {
  return textoPixel(scene, x, y, s, { size: escala * 9.5, color, origen }).setDepth(profundidad);
}
/** Cambia el color de un texto hecho con textoPx (BitmapText teñido o Text de respaldo). */
export function colorPx(o, color) {
  return o.setColor(color);
}

// ---------- salto (warp): estrellas que se estiran en líneas ----------
const COLORES_ESTELA = [0xffffff, 0xffffff, 0xcfc4ff, 0xc9a7ff, 0x80e0dc, 0xffd166];

/**
 * Estelas del salto: líneas que salen del centro y se alargan con la velocidad. `paso(dt, v, largo, alfa)` las mueve y
 * las dibuja; es un solo Graphics (barato) a ~30 fps. Profundidad alta y sin desplazamiento de cámara.
 */
export class Estela {
  constructor(scene, { x = 480, y = 270, n = 110, semilla = 11, profundidad = 60 } = {}) {
    this.scene = scene; this.c = { x, y };
    let s = semilla >>> 0;
    const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    this.r = r;
    this.ps = Array.from({ length: n }, () => this.nueva(true));
    this.g = scene.add.graphics().setDepth(profundidad).setScrollFactor(0);
  }
  nueva(inicio) {
    const r = this.r;
    return { a: r() * Math.PI * 2, d: inicio ? 20 + r() * 520 : 10 + r() * 60, k: 0.6 + r() * 0.8,
      c: COLORES_ESTELA[(r() * COLORES_ESTELA.length) | 0], w: r() < 0.25 ? 4 : 2 };
  }
  paso(dt, v, largo, alfa = 1) {
    const g = this.g; if (!g.active) return;
    g.clear();
    for (const p of this.ps) {
      p.d += v * p.k * dt;
      if (p.d > 640) Object.assign(p, this.nueva(false));
      const L = Math.max(2, largo * p.k * (p.d / 300));
      const cx = Math.cos(p.a), cy = Math.sin(p.a);
      const x1 = this.c.x + cx * p.d, y1 = this.c.y + cy * p.d;
      const x0 = this.c.x + cx * Math.max(0, p.d - L), y0 = this.c.y + cy * Math.max(0, p.d - L);
      g.lineStyle(p.w, p.c, alfa * Math.min(1, p.d / 120)).lineBetween(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1));
    }
  }
  destruir() { if (this.g.active) this.g.destroy(); }
}

/**
 * Salto de la pantalla de inicio al menú (≈ 1.1 s): el GIF se acerca a Marte acelerando, las estrellas se estiran en
 * líneas y un destello blanco cubre la pantalla; entonces `alDestello()` (con la pantalla en blanco). La interfaz
 * (profundidad ≥ 0) se desvanece primero. Devuelve la Estela (para que la vista nueva la deje frenar si quiere).
 */
export function warp(scene, objetivos, alDestello, { centro = { x: 480, y: 290 }, duracion = 1100 } = {}) {
  const ui = scene.children.list.filter((o) => o.depth >= 0 && o.alpha > 0);
  scene.tweens.add({ targets: ui, alpha: 0, duration: 160 });
  // Acercamiento a Marte (escala de las imágenes alrededor de su centro, sin tocar la cámara: así las estelas no se escalan).
  for (const o of objetivos) {
    const sx = o.scaleX, sy = o.scaleY;
    scene.tweens.addCounter({
      from: 0, to: 1, duration: duracion, ease: 'Cubic.easeIn',
      onUpdate: (tw) => {
        if (!o.active) return;
        const z = 1 + 2.4 * tw.getValue();
        o.setScale(sx * z, sy * z).setPosition(480 + (480 - centro.x) * (z - 1), 270 + (270 - centro.y) * (z - 1));
      },
    });
  }
  // Velo morado que crece para que las estelas se lean sobre el rojo de Marte.
  const velo = scene.add.rectangle(480, 270, 960, 540, 0x0d0a24, 0).setDepth(55);
  scene.tweens.add({ targets: velo, fillAlpha: 0.55, duration: duracion, ease: 'Quad.easeIn' });
  const estela = new Estela(scene, { x: centro.x, y: centro.y });
  let t = 0;
  const reloj = scene.time.addEvent({
    delay: 33, loop: true, callback: () => {
      t += 33;
      const k = Math.min(1, t / duracion);
      estela.paso(0.033, 120 + 1500 * k * k, 6 + 260 * k * k, Math.min(1, 0.3 + k));
    },
  });
  const blanco = scene.add.rectangle(480, 270, 960, 540, 0xffffff, 0).setDepth(70);
  scene.tweens.add({ targets: blanco, fillAlpha: 1, delay: duracion - 160, duration: 160, ease: 'Quad.easeIn',
    onComplete: () => { reloj.remove(); estela.destruir(); alDestello(); } });
}

/** Destello blanco que se desvanece (al llegar a la vista nueva tras el salto). */
export function destelloSalida(scene, duracion = 380) {
  const b = scene.add.rectangle(480, 270, 960, 540, 0xffffff, 1).setDepth(70).setScrollFactor(0);
  scene.tweens.add({ targets: b, fillAlpha: 0, duration: duracion, ease: 'Quad.easeOut', onComplete: () => b.destroy() });
  return b;
}

// ---------- fuente pixel (BMFont de Mauricio, cargada por el Boot: comun/fuente.js) ----------
/** Clave de la fuente bitmap ('pixel' o 'pixel_titulo') si se puede usar; null → texto normal. */
export function fuentePixel(scene, nombre = FUENTE_CUERPO) {
  return hayFuente(scene, nombre) ? nombre : null;
}

/**
 * Línea de texto en pixel con tramos de colores: `tramos` = [[texto, color], ...]. Centrada en x.
 * Respaldo sin la fuente: texto normal (monoespaciado) del mismo color por tramo.
 */
export function lineaPixel(scene, x, y, tramos, { escala = 3, profundidad = 2 } = {}) {
  const objs = tramos.map(([s, c]) => textoPx(scene, 0, y, s, { escala, color: c, profundidad }));
  const ancho = objs.reduce((s, o) => s + o.displayWidth, 0);
  let cx = Math.round(x - ancho / 2);
  for (const o of objs) { o.x = cx; cx += o.displayWidth; }
  return { objs, ancho, x0: Math.round(x - ancho / 2) };
}

// ---------- logo con brillo ----------
/** Logo MARSCEPTION con brillo (32 cuadros de 65 × 10; brillo 0–19, descanso 20–31). Respaldo: fuente de título o texto. */
export function logoBrillo(scene, x, y, escala = 9) {
  const clave = 'menu/logo_brillo';
  if (scene.textures.exists(clave)) {
    const tex = scene.textures.get(clave);
    const img = tex.getSourceImage();
    const n = 32, w = Math.floor(img.width / n);
    if (!tex.has('0')) for (let i = 0; i < n; i++) tex.add(i, 0, i * w, 0, w, img.height);
    if (!scene.anims.exists('logo_brillo')) {
      scene.anims.create({ key: 'logo_brillo', frames: Array.from({ length: n }, (_, i) => ({ key: clave, frame: i })), frameRate: 10, repeat: -1 });
    }
    const s = scene.add.sprite(x, y, clave, 20).setScale(escala).setDepth(2);
    if (!movimientoReducido()) s.play('logo_brillo');
    return s;
  }
  return textoPixel(scene, x, y, 'MARSCEPTION', { size: Math.max(28, escala * 6), origen: [0.5, 0.5], titulo: true }).setDepth(2);
}

// ---------- Marte grande que gira (pantalla de inicio) ----------
const FPS_MARTE = 15; // ≤ 30 fps
let marte = null; // tablas y pixeles: se preparan una sola vez por juego

/**
 * Marte grande girando sobre el Marte del fondo de título (mismo centro y radio, así el fondo vivo y las estrellas no
 * cambian). Un solo canvas de 160 × 160 que se repinta a 15 fps (1 pixel de arte por cuadro en el ecuador).
 */
export function marteGrande(scene, { centro = MARTE_TITULO, tam = 160 } = {}) {
  marte ??= crearMarteGrande(tam);
  const clave = 'inicio_marte_grande';
  let canvas = scene.textures.exists(clave) ? scene.textures.get(clave) : scene.textures.createCanvas(clave, tam, tam);
  const ctx = canvas.getContext();
  const imagen = new ImageData(marte.datos, tam, tam);
  let fase = marte.fase ?? 0;
  const pintar = () => { marte.pintar(fase); ctx.putImageData(imagen, 0, 0); canvas.refresh(); };
  pintar();
  const s = scene.add.image(centro.x, centro.y, clave).setScale(ESCALA).setDepth(-8.65);
  if (!movimientoReducido()) {
    const paso = 1 / (Math.PI * tam); // 1 pixel de arte por cuadro en el ecuador: una vuelta en ~33 s
    const reloj = scene.time.addEvent({ delay: 1000 / FPS_MARTE, loop: true, callback: () => { fase = (fase + paso) % 1; marte.fase = fase; pintar(); } });
    s.once('destroy', () => reloj.remove());
  }
  return s;
}

// ---------- la nave (menú de opciones) ----------
/**
 * Fondo de la nave: arte de Mauricio (pantallas/menu_nave, 320 × 180) o el respaldo en código. Opcional: un sprite
 * menu/nave sobre el cielo del respaldo, centrado en la escotilla. Devuelve dónde está la escotilla y el planeta (px del juego).
 */
export function fondoNave(scene) {
  const quieto = movimientoReducido();
  const e = { x: ARTE_NAVE.escotilla.x * ESCALA, y: ARTE_NAVE.escotilla.y * ESCALA };
  const p = ARTE_NAVE.planeta;
  const planeta = { x: p.x * ESCALA, y: p.y * ESCALA, r: p.r * ESCALA };
  const zona = { x: 160 * ESCALA, y: 36 * ESCALA, right: 960, bottom: 112 * ESCALA }; // nave con alas (sin estrellas encima)
  if (scene.textures.exists('pantallas/menu_nave')) {
    scene.add.image(480, 270, 'pantallas/menu_nave').setScale(ESCALA).setDepth(-10);
    return { escotilla: e, planeta, zona, deArte: true };
  }
  // Sprite opcional de Mauricio (assets/menu/nave.png) sobre el cielo del respaldo, centrado en la escotilla.
  const sprite = scene.textures.exists('menu/nave');
  const clave = sprite ? 'inicio_cielo_fondo' : 'inicio_nave_fondo';
  if (!scene.textures.exists(clave)) {
    const f = pintarFondoNave({ nave: !sprite });
    const canvas = scene.textures.createCanvas(clave, f.ancho, f.alto);
    canvas.getContext().putImageData(new ImageData(f.datos, f.ancho, f.alto), 0, 0);
    canvas.refresh();
  }
  scene.add.image(480, 270, clave).setScale(ESCALA).setDepth(-10);
  if (sprite) {
    scene.add.image(e.x, e.y, 'menu/nave').setScale(ESCALA).setDepth(-9.8);
    return { escotilla: e, planeta, zona, deArte: true };
  }
  // Luces de posición que parpadean y la luz de la escotilla que respira.
  for (const [i, l] of ARTE_NAVE.luces.entries()) {
    const luz = scene.add.rectangle(l.x * ESCALA, l.y * ESCALA, ESCALA * 2, ESCALA * 2, l.color).setOrigin(0, 0).setDepth(-9.5);
    if (quieto) continue;
    soltarTweensAlDestruir(scene, luz);
    scene.tweens.add({ targets: luz, alpha: 0.15, duration: 500, delay: i * 350, yoyo: true, repeat: -1, hold: 700, ease: 'Stepped' });
  }
  const brillo = scene.add.circle(e.x, e.y, 6 * ESCALA, 0xffd166, 0.18).setDepth(-9.5);
  if (!quieto) {
    soltarTweensAlDestruir(scene, brillo);
    scene.tweens.add({ targets: brillo, alpha: 0.32, scale: 1.25, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return { escotilla: e, planeta, zona, deArte: false };
}

let zoomActivo = null; // tween del zoom en curso (se detiene al restaurar la cámara)

/**
 * Zoom de la cámara hacia la escotilla de la nave (≈ 800 ms) con fundido al final; `alTerminar` se llama con la pantalla
 * en negro. Con prefers-reduced-motion: solo fundido. La interfaz se desvanece primero para que el zoom sea a la nave.
 */
export function zoomANave(scene, punto, alTerminar) {
  const cam = scene.cameras.main;
  cam.once('camerafadeoutcomplete', () => alTerminar());
  if (movimientoReducido()) { cam.fadeOut(220, 0, 0, 0); return; }
  const ui = scene.children.list.filter((o) => o.depth >= 0 && o.alpha > 0);
  scene.tweens.add({ targets: ui, alpha: 0, duration: 180, ease: 'Quad.easeOut' });
  // Zoom alrededor de la escotilla: se queda bajo la mirada todo el tiempo y llega poco a poco al centro de la pantalla.
  // Phaser escala alrededor del centro de la cámara (C): el punto P se ve en S si scroll = P − C − (S − C) / zoom.
  const C = { x: cam.width / 2, y: cam.height / 2 };
  const ZOOM = 8;
  zoomActivo?.stop();
  zoomActivo = scene.tweens.addCounter({
    from: 0, to: 1, duration: 780, ease: 'Quad.easeIn',
    onUpdate: (tw) => {
      const k = tw.getValue();
      const z = Math.pow(ZOOM, k);
      const sx = punto.x + (C.x - punto.x) * k, sy = punto.y + (C.y - punto.y) * k;
      cam.setZoom(z).setScroll(punto.x - C.x - (sx - C.x) / z, punto.y - C.y - (sy - C.y) / z);
    },
  });
  scene.time.delayedCall(560, () => cam.fadeOut(260, 0, 0, 0));
}

/** Deja la cámara como al inicio (sin zoom ni desplazamiento) y, si estaba en negro, la aclara. */
export function restaurarCamara(scene, { aclarar = false } = {}) {
  const cam = scene.cameras.main;
  zoomActivo?.stop();
  zoomActivo = null;
  cam.panEffect.reset();
  cam.zoomEffect.reset();
  cam.setZoom(1).setScroll(0, 0);
  if (aclarar) cam.fadeIn(260, 0, 0, 0);
}

