// Dueño: frente juego (pantalla de inicio). Menú de opciones sobre la estación de Mauricio (assets/pantallas/menu_nave.png
// y assets/menu/nave.png, ver assets/README.md):
// - escenarioNave(): el cielo con la Tierra y Marte (la estación se borra del fondo y se dibuja aparte con el sprite de
//   luces, así puede llegar desde lejos y flotar), estrellas que titilan y, al venir del salto, la llegada a la estación (≈ 1.1 s).
// - consolaMenu(): consola en pixel art (ui_tarjeta, ui_boton en 4 estados, fuente pixel) con 2 columnas de botones y una
//   línea de ayuda; teclas: flechas en rejilla, Tab, 1–5, Enter, Esc, L.
// - zoomEscotilla(): al elegir, la cámara entra por la escotilla (brillo, anillo, el iris se abre y todo queda en negro).
// Todo es ILUSTRACIÓN (arte del juego). Con prefers-reduced-motion: sin llegada, sin flotar y el zoom es un fundido.
import Phaser from 'phaser';
import { movimientoReducido, soltarTweensAlDestruir } from './efectos.js';
import { enTransicion } from './interfaz.js';
import { sonarBoton } from '../../fisica/sonido.js';
import { textoPx, colorPx, Estela, destelloSalida, fondoNave } from './inicio.js';

const E = 3; // pixel de arte → px del juego
// Estación en el arte (assets/README.md): sprite de 4 cuadros de 264 × 76 en x 28, y 46 de menu_nave; escotilla en (160, 93).
const NAVE = { x: 28, y: 46, w: 264, h: 76, cuadros: 4, escotilla: { x: 160, y: 93 } };
const CENTRO_NAVE = { x: (NAVE.x + NAVE.w / 2) * E, y: (NAVE.y + NAVE.h / 2) * E }; // (480, 252)
export const MARTE_NAVE = { x: 828, y: 114, r: 63 }; // Marte de menu_nave (276, 38, r 21 de arte)
const ZONA_NAVE = { x: 30 * E, y: 46 * E, right: 290 * E, bottom: 118 * E };
const ZONA_TIERRA = { x: 0, y: 296, right: 500, bottom: 540 };

const PALETA = {
  texto: '#ffffff', foco: '#ffd166', sugerido: '#4cc38a', apagado: '#9aa0bf', ayuda: '#c9a7ff', oscuro: '#0d0a24',
};
const webgl = (scene) => scene.sys.game.renderer?.type === Phaser.WEBGL;

/** El cielo de menu_nave sin la estación: cada pixel de la estación toma el color del cielo a sus lados (por fila). */
function cieloSinNave(scene) {
  const clave = 'menu_nave_cielo';
  if (scene.textures.exists(clave)) return clave;
  try {
    const fondo = scene.textures.get('pantallas/menu_nave').getSourceImage();
    const nave = scene.textures.get('menu/nave').getSourceImage();
    const canvas = scene.textures.createCanvas(clave, fondo.width, fondo.height);
    const ctx = canvas.getContext();
    ctx.drawImage(fondo, 0, 0);
    const c2 = document.createElement('canvas');
    c2.width = NAVE.w; c2.height = NAVE.h;
    c2.getContext('2d').drawImage(nave, 0, 0, NAVE.w, NAVE.h, 0, 0, NAVE.w, NAVE.h);
    const m = c2.getContext('2d').getImageData(0, 0, NAVE.w, NAVE.h).data;
    const img = ctx.getImageData(NAVE.x, NAVE.y, NAVE.w, NAVE.h);
    const d = img.data;
    const W = NAVE.w, H = NAVE.h;
    const tapado = (x, y) => m[(y * W + x) * 4 + 3] > 0;
    const luz = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    // 1) Por fila, interpolar entre el cielo a la izquierda y a la derecha (sin tomar estrellas como borde).
    const f = new Float32Array(W * H * 3);
    const hueco = [];
    // Color medio del cielo oscuro: reemplaza estrellas y el borde de la Tierra como fuente (si no, dejan manchas de luz).
    const base = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < W * H; i++) {
      if (m[i * 4 + 3] > 0 || luz(i * 4) >= 45) continue;
      for (let k = 0; k < 3; k++) base[k] += d[i * 4 + k];
      n++;
    }
    for (let k = 0; k < 3; k++) base[k] = n ? base[k] / n : 20;
    for (let i = 0; i < W * H; i++) {
      if (m[i * 4 + 3] > 0) { hueco.push(i); continue; }
      const claro = luz(i * 4) >= 45;
      for (let k = 0; k < 3; k++) f[i * 3 + k] = claro ? base[k] : d[i * 4 + k];
    }
    for (const i of hueco) {
      const x = i % W, y = (i / W) | 0;
      let a = x; while (a >= 0 && tapado(a, y)) a--;
      let b = x; while (b < W && tapado(b, y)) b++;
      const ia = a >= 0 ? (y * W + a) * 3 : null;
      const ib = b < W ? (y * W + b) * 3 : null;
      const t = ia !== null && ib !== null ? (x - a) / (b - a) : ia !== null ? 0 : 1;
      for (let k = 0; k < 3; k++) {
        const va = ia !== null ? f[ia + k] : f[ib + k];
        const vb = ib !== null ? f[ib + k] : f[ia + k];
        f[i * 3 + k] = va + (vb - va) * t;
      }
    }
    // 2) Difusión (promedio de los 4 vecinos) solo dentro del hueco: borra las bandas horizontales.
    for (let it = 0; it < 160; it++) {
      for (const i of hueco) {
        const x = i % W, y = (i / W) | 0;
        const a = (x > 0 ? i - 1 : i) * 3, b = (x < W - 1 ? i + 1 : i) * 3;
        const c = (y > 0 ? i - W : i) * 3, e = (y < H - 1 ? i + W : i) * 3;
        for (let k = 0; k < 3; k++) f[i * 3 + k] = (f[a + k] + f[b + k] + f[c + k] + f[e + k]) / 4;
      }
    }
    // 3) Tramado leve y algunas estrellas (fijas), como el resto del cielo.
    let s = 97;
    const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (const i of hueco) {
      const x = i % W, y = (i / W) | 0;
      const tr = ((x + y) & 1) ? 3 : -3;
      for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.max(0, Math.min(255, Math.round(f[i * 3 + k] + tr)));
      d[i * 4 + 3] = 255;
      if (r() < 0.006) { const c = r() < 0.5 ? [255, 255, 255] : [207, 196, 255]; for (let k = 0; k < 3; k++) d[i * 4 + k] = c[k]; }
    }
    ctx.putImageData(img, NAVE.x, NAVE.y);
    canvas.refresh();
    return clave;
  } catch (e) {
    console.warn('[menu] no se pudo preparar el cielo sin la estación', e);
    return null;
  }
}

/** Cuadros de la tira de luces (assets/menu/nave.png) y su animación. */
function prepararNave(scene) {
  const tex = scene.textures.get('menu/nave');
  if (!tex.has('0')) for (let i = 0; i < NAVE.cuadros; i++) tex.add(i, 0, i * NAVE.w, 0, NAVE.w, NAVE.h);
  if (!scene.anims.exists('nave_luces')) {
    scene.anims.create({ key: 'nave_luces', frames: Array.from({ length: NAVE.cuadros }, (_, i) => ({ key: 'menu/nave', frame: i })), frameRate: 3, repeat: -1 });
  }
}

/**
 * Fondo del menú de opciones. Con `llegada` (después del salto) la estación llega desde lejos, el cielo se asienta y las
 * estelas del salto frenan; `alLlegar` se llama al terminar (≈ 1.1 s; de inmediato sin animación).
 * Devuelve { sprite, escotilla(), zonas, marte }.
 */
export function escenarioNave(scene, { llegada = false, alLlegar = () => {} } = {}) {
  const quieto = movimientoReducido();
  const arte = scene.textures.exists('pantallas/menu_nave') && scene.textures.exists('menu/nave') && typeof document !== 'undefined';
  const cielo = arte ? cieloSinNave(scene) : null;
  if (!cielo) {
    // Respaldo: fondo de una pieza (arte de Mauricio o la nave en código) y zoom a su escotilla.
    const f = fondoNave(scene);
    scene.time.delayedCall(0, alLlegar);
    return { sprite: null, escotilla: () => f.escotilla, zonas: [f.zona], marte: f.planeta };
  }
  prepararNave(scene);
  const fondo = scene.add.image(480, 270, cielo).setScale(E).setDepth(-10);
  const s = scene.add.sprite(CENTRO_NAVE.x, CENTRO_NAVE.y, 'menu/nave', 0).setScale(E).setDepth(-8.4);
  if (!quieto) s.play('nave_luces');
  const flotar = () => {
    if (quieto || !s.active) return;
    soltarTweensAlDestruir(scene, s);
    scene.tweens.add({ targets: s, y: CENTRO_NAVE.y - E, duration: 1600, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [1], hold: 400, repeatDelay: 400 });
  };
  const r = {
    sprite: s,
    escotilla: () => ({ x: s.x + (NAVE.escotilla.x - NAVE.x - NAVE.w / 2) * E, y: s.y + (NAVE.escotilla.y - NAVE.y - NAVE.h / 2) * E }),
    zonas: [ZONA_NAVE, ZONA_TIERRA],
    marte: MARTE_NAVE,
  };
  if (!llegada || quieto) {
    flotar();
    scene.time.delayedCall(0, alLlegar);
    return r;
  }
  // Llegada: el cielo se asienta (zoom 1.25 → 1), la estación crece desde un punto y las estelas del salto frenan.
  const DUR = 1100;
  soltarTweensAlDestruir(scene, fondo);
  fondo.setScale(E * 1.25);
  scene.tweens.add({ targets: fondo, scale: E, duration: DUR, ease: 'Cubic.easeOut' });
  s.setScale(0.12).setAlpha(0).setY(CENTRO_NAVE.y - 30);
  scene.tweens.add({ targets: s, alpha: 1, duration: 260 });
  scene.tweens.add({ targets: s, scale: E, y: CENTRO_NAVE.y, duration: DUR, ease: 'Cubic.easeOut' });
  const estela = new Estela(scene, { x: CENTRO_NAVE.x, y: CENTRO_NAVE.y, n: 90, profundidad: -9 });
  let t = 0;
  const reloj = scene.time.addEvent({
    delay: 33, loop: true, callback: () => {
      t += 33;
      const k = Math.max(0, 1 - t / 900);
      if (!k) { reloj.remove(); estela.destruir(); return; }
      estela.paso(0.033, 60 + 1300 * k * k, 4 + 220 * k * k, k);
    },
  });
  s.once('destroy', () => { reloj.remove(); estela.destruir(); });
  destelloSalida(scene);
  scene.time.delayedCall(DUR, () => { flotar(); alLlegar(); });
  return r;
}

/**
 * Botón en pixel art: caja ui_boton (4 estados, 9-slice ×3), tecla a la izquierda (número o letra) y etiqueta en la fuente
 * pixel. Compatible con Teclado (interfaz.js): habilitado, sugerido, enfocar(), pintar(), activar(), setNumero().
 * `alEnfocar(v)`: resaltado por ratón o teclado (también si está deshabilitado, para mostrar la razón en la ayuda).
 */
export function botonPx(scene, x, y, w, h, etiqueta, alPulsar, { tecla = '', habilitado = true, alEnfocar = null, profundidad = 2 } = {}) {
  const conArte = webgl(scene) && scene.textures.exists('ui/ui_boton');
  const caja = conArte
    ? scene.add.nineslice(x, y, 'ui/ui_boton', undefined, w / E, h / E, 4, 4, 4, 4).setOrigin(0, 0).setScale(E)
    : scene.add.rectangle(x, y, w, h, 0x262b4e, 0.96).setOrigin(0, 0);
  caja.setDepth(profundidad);
  const cy = y + h / 2 - (conArte ? 2 : 0);
  const capa = scene.add.rectangle(x + 24, cy, 24, 24, 0x0d0a24).setStrokeStyle(2, 0x9b7bff).setDepth(profundidad + 0.1);
  const capaTxt = textoPx(scene, x + 24, cy, tecla, { origen: [0.5, 0.5], profundidad: profundidad + 0.2 });
  const t = textoPx(scene, x + 48, cy, etiqueta, { profundidad: profundidad + 0.2 });
  const flecha = scene.add.triangle(x + w - 22, cy, 0, 0, 0, 12, 9, 6, 0xffd166).setDepth(profundidad + 0.2).setVisible(false);
  const objs = [caja, capa, capaTxt, t, flecha];
  let resaltado = false;
  let presionado = false;
  const b = {
    obj: t, caja, objs, etiqueta, habilitado, sugerido: false, enfocado: false, sobre: false, numero: null,
    activar() {
      if (!b.habilitado || enTransicion(scene) || scene.zoomando) return;
      sonarBoton();
      alPulsar();
    },
    setHabilitado(v) { b.habilitado = v; b.pintar(); return b; },
    setSugerido(v) { b.sugerido = v; b.pintar(); return b; },
    setNumero(n) { b.numero = n; capaTxt.setText(String(n)); return b; },
    enfocar(v) { b.enfocado = v; b.pintar(); },
    pintar() {
      if (!t.active) return;
      const foco = b.habilitado && (b.sobre || (b.enfocado && scene.modoTeclado));
      const clave = !b.habilitado ? 'ui/ui_boton_desactivado' : presionado ? 'ui/ui_boton_presionado' : foco ? 'ui/ui_boton_encima' : 'ui/ui_boton';
      if (conArte && scene.textures.exists(clave) && caja.texture.key !== clave) { caja.setTexture(clave); caja.updateUVs?.(); }
      if (!conArte) caja.setFillStyle(!b.habilitado ? 0x181b28 : foco ? 0x30366a : 0x262b4e).setStrokeStyle(2, foco ? 0xffd166 : 0x9b7bff);
      t.setText(`${b.etiqueta}${b.sugerido && b.habilitado ? ' ⏎' : ''}`);
      colorPx(t, !b.habilitado ? PALETA.apagado : foco ? PALETA.foco : b.sugerido ? PALETA.sugerido : PALETA.texto);
      capa.setFillStyle(foco ? 0xffd166 : 0x0d0a24).setStrokeStyle(2, !b.habilitado ? 0x5a6080 : foco ? 0xffd166 : 0x9b7bff);
      colorPx(capaTxt, foco ? PALETA.oscuro : b.habilitado ? PALETA.ayuda : PALETA.apagado);
      flecha.setVisible(foco);
      const r = b.sobre || (b.enfocado && scene.modoTeclado && b.habilitado);
      if (r !== resaltado) { resaltado = r; alEnfocar?.(r); }
    },
  };
  // Zona táctil: la caja con 1 px de más arriba y abajo (≥ 44 px de alto).
  caja.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, -1 / E, w / E, (h + 2) / E), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  if (!conArte) caja.input.hitArea.setTo(0, -1, w, h + 2);
  caja.on('pointerover', () => {
    const cambio = scene.modoTeclado;
    scene.modoTeclado = false;
    if (b.habilitado && scene.teclado?.items.includes(b)) scene.teclado.enfocar(b);
    b.sobre = true;
    b.pintar();
    if (cambio) scene.teclado?.items.forEach((x) => x.pintar());
  });
  caja.on('pointerout', () => { b.sobre = false; presionado = false; b.pintar(); });
  caja.on('pointerdown', () => {
    if (!b.habilitado) return;
    presionado = true; b.pintar();
    scene.time.delayedCall(90, () => { presionado = false; b.pintar(); });
    b.activar();
  });
  // La flecha del resaltado empuja 3 px (no con movimiento reducido).
  if (!movimientoReducido()) {
    soltarTweensAlDestruir(scene, flecha);
    scene.tweens.add({ targets: flecha, x: flecha.x + E, duration: 260, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [1], hold: 140 });
  }
  b.pintar();
  return b;
}

/**
 * Consola del menú: tarjeta de arte abajo (debajo de la estación), línea de ayuda arriba y 2 columnas × 3 filas de botones.
 * `opciones` = [{ etiqueta, accion, pista, habilitado?, tecla? }] (máx. 6). Devuelve { botones, ayuda(texto), objs }.
 */
export function consolaMenu(scene, opciones, { ayudaPorDefecto = '' } = {}) {
  const X = 18, Y = 354, W = 924, H = 180;
  const objs = [];
  const tarjeta = webgl(scene) && scene.textures.exists('ui/ui_tarjeta')
    ? scene.add.nineslice(X, Y, 'ui/ui_tarjeta', undefined, W / E, H / E, 4, 4, 4, 4).setOrigin(0, 0).setScale(E).setAlpha(0.94)
    : scene.add.rectangle(X, Y, W, H, 0x141830, 0.94).setOrigin(0, 0).setStrokeStyle(3, 0x2a3160);
  tarjeta.setDepth(1);
  // Brillo morado arriba (como el borde de los planetas) y una raya bajo la ayuda.
  const brillo = scene.add.rectangle(X + 12, Y + 6, W - 24, 3, 0x7a4cff, 0.75).setOrigin(0, 0).setDepth(1.1);
  const raya = scene.add.rectangle(X + 12, Y + 36, W - 24, 3, 0x2a3160, 1).setOrigin(0, 0).setDepth(1.1);
  const ayudaTxt = textoPx(scene, 480, Y + 22, ayudaPorDefecto, { origen: [0.5, 0.5], color: PALETA.ayuda });
  objs.push(tarjeta, brillo, raya, ayudaTxt);
  let quien = null;
  const recortar = (s) => (s.length > 74 ? `${s.slice(0, 73)}…` : s);
  const ayuda = (s, de = null) => {
    if (!s && de && quien !== de) return;
    quien = s ? de : null;
    if (!ayudaTxt.active) return;
    ayudaTxt.setText(recortar(s || ayudaPorDefecto));
    colorPx(ayudaTxt, s ? PALETA.texto : PALETA.ayuda);
  };
  const ancho = 444, alto = 42;
  const botones = opciones.map((o, i) => {
    const x = X + 12 + (i % 2) * (ancho + 12);
    const y = Y + 40 + Math.floor(i / 2) * (alto + 3);
    const b = botonPx(scene, x, y, ancho, alto, o.etiqueta, o.accion, {
      tecla: o.tecla ?? String(i + 1), habilitado: o.habilitado ?? true, alEnfocar: (v) => ayuda(v ? o.pista : '', b),
    });
    objs.push(...b.objs);
    return b;
  });
  return { botones, ayuda, objs };
}

/**
 * Flechas ↑↓ en la rejilla de 2 columnas (← → y Tab ya mueven de uno en uno en Teclado): salta a la fila de arriba/abajo,
 * saltando las opciones deshabilitadas. Se instala en teclado.extra.
 */
export function flechasRejilla(scene, columnas = 2) {
  const mover = (paso) => (ev) => {
    const tk = scene.teclado;
    if (!tk?.items.length) return;
    if (!scene.modoTeclado) { scene.modoTeclado = true; tk.items.forEach((b) => b.pintar()); if (!tk.actual) tk.mover(1); return; }
    const n = tk.items.length;
    let i = Math.max(0, tk.items.indexOf(tk.actual));
    for (let k = 0; k < n; k++) {
      i = (i + paso * columnas + n * columnas) % n;
      if (tk.items[i].habilitado) { tk.enfocar(tk.items[i]); return; }
    }
    ev?.preventDefault?.();
  };
  return { ArrowUp: mover(-1), ArrowDown: mover(1) };
}

/** Entrada de la interfaz: la consola sube y el logo baja (después de la llegada). Sin animación con movimiento reducido. */
export function entradaInterfaz(scene, { consola = [], logo = null, retraso = 0 } = {}) {
  if (movimientoReducido()) return;
  for (const o of consola) {
    const y = o.y;
    o.setY(y + 200);
    scene.tweens.add({ targets: o, y, duration: 520, delay: retraso, ease: 'Back.easeOut', easeParams: [0.9] });
  }
  if (logo) {
    const y = logo.y;
    logo.setY(-60);
    scene.tweens.add({ targets: logo, y, duration: 560, delay: retraso + 80, ease: 'Back.easeOut', easeParams: [1.2] });
  }
}

let zoomActivo = null;

/**
 * Zoom a la escotilla (≈ 1.2 s): la interfaz se va, la escotilla brilla y lanza dos anillos, la cámara acelera hacia ella,
 * el iris se abre con un destello y la pantalla queda en negro; entonces `alTerminar()`. Con movimiento reducido: fundido.
 */
export function zoomEscotilla(scene, nave, alTerminar) {
  const cam = scene.cameras.main;
  if (movimientoReducido()) {
    cam.once('camerafadeoutcomplete', () => alTerminar());
    cam.fadeOut(220, 0, 0, 0);
    return;
  }
  const p = nave?.escotilla?.() ?? { x: 480, y: 279 };
  if (nave?.sprite) { scene.tweens.killTweensOf(nave.sprite); }
  const ui = scene.children.list.filter((o) => o.depth >= 0 && o.alpha > 0);
  scene.tweens.add({ targets: ui, alpha: 0, duration: 200, ease: 'Quad.easeIn' });
  // Luz en el cristal de la escotilla y anillos amarillos (las franjas del anillo de Mauricio).
  const luz = scene.add.circle(p.x, p.y, 24, 0xfff3b0, 0).setDepth(-8.3);
  scene.tweens.add({ targets: luz, fillAlpha: 0.9, duration: 420, ease: 'Quad.easeOut' });
  for (const [i, retraso] of [0, 200].entries()) {
    const anillo = scene.add.circle(p.x, p.y, 36, 0x000000, 0).setStrokeStyle(3, i ? 0xffffff : 0xffd166, 1).setDepth(-8.25);
    scene.tweens.add({ targets: anillo, scale: 2.2, alpha: 0, delay: retraso, duration: 520, ease: 'Quad.easeOut' });
  }
  // El iris se abre: un disco oscuro crece desde el centro del cristal con un borde blanco que destella.
  const iris = scene.add.circle(p.x, p.y, 10, 0x05030f, 1).setDepth(-8.2).setScale(0).setStrokeStyle(1.5, 0xffffff, 1);
  scene.tweens.add({ targets: iris, scale: 2.4, delay: 520, duration: 360, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: iris, scale: 9, delay: 900, duration: 300, ease: 'Quad.easeIn' });
  // Cámara: zoom exponencial (×1 → ×16) que acelera, con la escotilla llegando al centro de la pantalla.
  const C = { x: cam.width / 2, y: cam.height / 2 };
  const ZOOM = 16;
  zoomActivo?.stop();
  zoomActivo = scene.tweens.addCounter({
    from: 0, to: 1, duration: 1200, ease: 'Quad.easeIn',
    onUpdate: (tw) => {
      const k = tw.getValue();
      const z = Math.pow(ZOOM, k);
      const sx = p.x + (C.x - p.x) * Math.min(1, k * 1.6), sy = p.y + (C.y - p.y) * Math.min(1, k * 1.6);
      cam.setZoom(z).setScroll(p.x - C.x - (sx - C.x) / z, p.y - C.y - (sy - C.y) / z);
    },
    onComplete: () => { zoomActivo = null; alTerminar(); },
  });
}

/** Detiene el zoom en curso (al reiniciar la escena a media animación). */
export function detenerZoom() { zoomActivo?.stop(); zoomActivo = null; }
