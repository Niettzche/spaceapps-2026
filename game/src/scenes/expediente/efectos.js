// Dueño: frente expediente. Efectos del Menú: estrellas que titilan, planetas que giran y ayudas para tweens.
// Con `prefers-reduced-motion: reduce` no hay animación: las estrellas quedan fijas y los planetas en su primer cuadro.
import { tiraPlaneta } from './planeta_pixeles.js';

export function movimientoReducido() {
  try { return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; } catch { return false; }
}

/** Al destruir el objeto se detienen sus tweens (limpiar() destruye todo al cambiar de vista). */
export function soltarTweensAlDestruir(scene, obj) {
  obj.once('destroy', () => scene.tweens?.killTweensOf(obj));
  return obj;
}

// Generador pseudoaleatorio fijo: las estrellas quedan en el mismo lugar en todas las vistas.
function aleatorio(semilla) {
  let s = semilla >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// Marte del fondo (assets/titulo/titulo_fondo.png: centro (160, 108) y radio 76 en 320 × 180, pintado ×3).
const MARTE_FONDO = { x: 480, y: 324, r: 228 + 14 };

/**
 * Estrellas pequeñas sobre el fondo del Menú (debajo de todo, profundidad -8). Pixel art: cuadros de 3 px (un pixel
 * del fondo ×3). No caen sobre el Marte del fondo ni cerca de ningún texto ya dibujado (se llama al final de la vista).
 */
export function estrellas(scene, { cantidad = 26, semilla = 7, margen = 10 } = {}) {
  const evitar = scene.children.list.filter((o) => o.type === 'Text' && o.visible).map((o) => o.getBounds());
  const libre = (x, y) => evitar.every((b) => x < b.x - margen || x > b.right + margen || y < b.y - margen || y > b.bottom + margen);
  const r = aleatorio(semilla);
  const quieto = movimientoReducido();
  const lista = [];
  let intentos = 0;
  while (lista.length < cantidad && intentos++ < 500) {
    const x = Math.round((8 + r() * 944) / 3) * 3, y = Math.round((8 + r() * 524) / 3) * 3;
    if (Math.hypot(x - MARTE_FONDO.x, y - MARTE_FONDO.y) < MARTE_FONDO.r || !libre(x, y)) continue;
    const grande = r() < 0.2;
    const color = r() < 0.5 ? 0xffffff : 0xcfc4ff;
    let e;
    if (grande) {
      // Estrella en cruz (5 pixeles de 3 px).
      e = scene.add.container(x, y, [
        scene.add.rectangle(0, 0, 3, 9, color), scene.add.rectangle(0, 0, 9, 3, color),
      ]);
    } else e = scene.add.rectangle(x, y, 3, 3, color);
    e.setDepth(-8).setAlpha(quieto ? 0.5 : 0.15 + r() * 0.3);
    if (!quieto) {
      soltarTweensAlDestruir(scene, e);
      scene.tweens.add({
        targets: e, alpha: 0.55 + r() * 0.35, duration: 900 + r() * 1800, delay: r() * 2000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    lista.push(e);
  }
  return lista;
}

const CUADROS_CODIGO = 48; // cuadros por vuelta del planeta generado en código
const TAM_CODIGO = 48; // px de arte por cuadro (se muestra ×3)
export const FPS_PLANETA = 8;

/**
 * Textura y animación del planeta de un mundo ('marte' | 'luna'). Usa el spritesheet del frente arte si existe
 * (assets/menu/planeta_<mundo>.png → textura 'menu/planeta_<mundo>', tira horizontal de cuadros cuadrados); si no, lo
 * genera en código una sola vez por juego. Devuelve { clave, anim, cuadros, tam, deArte }.
 */
export function prepararPlaneta(scene, mundo) {
  const deArte = `menu/planeta_${mundo}`;
  const generada = `planeta_codigo_${mundo}`;
  let clave;
  let tex;
  if (scene.textures.exists(deArte)) {
    clave = deArte;
    tex = scene.textures.get(clave);
    if (!tex.has(0)) {
      const img = tex.getSourceImage();
      const lado = img.height;
      const n = Math.max(1, Math.floor(img.width / lado));
      for (let i = 0; i < n; i++) tex.add(i, 0, i * lado, 0, lado, lado);
    }
  } else {
    clave = generada;
    if (!scene.textures.exists(clave)) {
      const tira = tiraPlaneta(mundo, { tam: TAM_CODIGO, cuadros: CUADROS_CODIGO });
      const canvas = scene.textures.createCanvas(clave, tira.ancho, tira.alto);
      const ctx = canvas.getContext();
      ctx.putImageData(new ImageData(tira.datos, tira.ancho, tira.alto), 0, 0);
      canvas.refresh();
      for (let i = 0; i < tira.cuadros; i++) canvas.add(i, 0, i * tira.tam, 0, tira.tam, tira.tam);
    }
    tex = scene.textures.get(clave);
  }
  const nombres = tex.getFrameNames().filter((f) => /^\d+$/.test(f)).map(Number).sort((a, b) => a - b);
  const anim = `${clave}_girar`;
  if (!scene.anims.exists(anim)) {
    scene.anims.create({ key: anim, frames: nombres.map((f) => ({ key: clave, frame: f })), frameRate: FPS_PLANETA, repeat: -1 });
  }
  return { clave, anim, cuadros: nombres.length, tam: tex.get(0).width, deArte: clave === deArte };
}

/**
 * Planeta que gira (sprite) de `lado` px en pantalla. Respeta reduced-motion (queda quieto en el primer cuadro).
 * Devuelve { sprite, rapido(v), elegir() }: `rapido` acelera el giro al pasar el ratón; `elegir` hace el giro final.
 */
export function planetaGirando(scene, x, y, mundo, { lado = 144, inicio = 0 } = {}) {
  const p = prepararPlaneta(scene, mundo);
  const quieto = movimientoReducido();
  const s = scene.add.sprite(x, y, p.clave, 0).setDisplaySize(lado, lado);
  soltarTweensAlDestruir(scene, s);
  const escala = s.scaleX;
  if (!quieto) s.play({ key: p.anim, startFrame: Math.floor(inicio * p.cuadros) % p.cuadros });
  // Halo morado que respira detrás del planeta.
  const halo = scene.add.circle(x, y, lado * 0.56, 0x7a4cff, 0.12);
  halo.setDepth(s.depth - 1);
  if (!quieto) {
    soltarTweensAlDestruir(scene, halo);
    scene.tweens.add({ targets: halo, alpha: 0.24, scale: 1.04, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  s.once('destroy', () => halo.destroy());
  let elegido = false;
  return {
    sprite: s,
    rapido(v) {
      if (quieto || elegido || !s.active) return;
      s.anims.timeScale = v ? 3 : 1;
      scene.tweens.killTweensOf(s);
      scene.tweens.add({ targets: s, scaleX: escala * (v ? 1.06 : 1), scaleY: escala * (v ? 1.06 : 1), duration: 120, ease: 'Quad.easeOut' });
    },
    /** Giro rápido y acercamiento al elegir; `listo` se llama al terminar (inmediato con reduced-motion). */
    elegir(listo) {
      elegido = true;
      if (quieto || !s.active) { listo(); return; }
      s.anims.timeScale = 6;
      scene.tweens.killTweensOf(s);
      scene.tweens.add({ targets: s, scaleX: escala * 1.2, scaleY: escala * 1.2, duration: 260, ease: 'Back.easeIn', onComplete: listo });
    },
  };
}
