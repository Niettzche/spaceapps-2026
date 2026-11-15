// Dueño: frente juego (pantalla de inicio). Piezas en Phaser de la pantalla de inicio y del menú de opciones (Menu.js):
// - Pantalla de inicio basada en el GIF de título de Mauricio: Marte grande que gira (marte_grande.js), logo con brillo
//   (assets/menu/logo_brillo.png), lema con colores y «PRESIONA ENTER» en la fuente pixel (assets/fuentes/pixel.*).
// - Fondo del menú de opciones: la nave (assets/pantallas/menu_nave.png si existe; si no, nave_pixeles.js) y el zoom de la
//   cámara hacia su escotilla al elegir una opción.
// Todo es ILUSTRACIÓN (arte del juego). Con prefers-reduced-motion: nada gira ni parpadea y el zoom es un fundido.
import Phaser from 'phaser';
import pixelXml from '../../../../assets/fuentes/pixel.xml?raw';
import pixelTituloXml from '../../../../assets/fuentes/pixel_titulo.xml?raw';
import { crearMarteGrande } from './marte_grande.js';
import { ARTE_NAVE, pintarFondoNave } from './nave_pixeles.js';
import { movimientoReducido, soltarTweensAlDestruir } from './efectos.js';
import { texto } from './interfaz.js';
import { MARTE_TITULO } from './fondo_menu.js';

const ESCALA = 3; // un pixel de arte = 3 px del juego (fondos de 320 × 180)

// ---------- fuente pixel (BMFont de Mauricio) ----------
const FUENTES = { pixel: ['fuentes/pixel', pixelXml], pixel_titulo: ['fuentes/pixel_titulo', pixelTituloXml] };

/**
 * Registra la fuente BMFont a partir de la textura que ya precargó el Boot (assets/fuentes/<nombre>.png) y del XML.
 * Devuelve la clave de la fuente o null si falta la textura (entonces se usa el texto normal).
 */
export function fuentePixel(scene, nombre = 'pixel') {
  const clave = `inicio_${nombre}`;
  if (scene.cache.bitmapFont.exists(clave)) return clave;
  const [tex, xml] = FUENTES[nombre];
  if (!scene.textures.exists(tex) || typeof DOMParser === 'undefined') return null;
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const textura = scene.textures.get(tex);
    const data = Phaser.GameObjects.BitmapText.ParseXMLBitmapFont(doc, textura.get(), 0, 0, textura);
    scene.cache.bitmapFont.add(clave, { data, texture: tex, frame: null });
    return clave;
  } catch (e) {
    console.warn('[inicio] no se pudo registrar la fuente', nombre, e);
    return null;
  }
}

/**
 * Línea de texto en pixel con tramos de colores: `tramos` = [[texto, color], ...]. Centrada en x.
 * Respaldo sin la fuente: texto normal (monoespaciado) del mismo color por tramo.
 */
export function lineaPixel(scene, x, y, tramos, { escala = 3, profundidad = 2 } = {}) {
  const fuente = fuentePixel(scene);
  const objs = tramos.map(([s, c]) => {
    const o = fuente
      ? scene.add.bitmapText(0, y, fuente, s).setScale(escala).setTint(Phaser.Display.Color.HexStringToColor(c).color)
      : texto(scene, 0, y, s, { size: 7 * escala, color: c });
    return o.setOrigin(0, 0.5).setDepth(profundidad);
  });
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
  const f = fuentePixel(scene, 'pixel_titulo');
  if (f) return scene.add.bitmapText(x, y, f, 'MARSCEPTION').setOrigin(0.5).setScale(Math.max(1, Math.round(escala / 1.5))).setDepth(2);
  return texto(scene, x, y, 'MARSCEPTION', { size: 40, origen: [0.5, 0.5] }).setDepth(2);
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

