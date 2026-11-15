// Kit de interfaz en pixel art (arte de Mauricio, #79) para Taller, Prueba/Misión (HUD) y Resultados (docs/juego/DISENO.md §2).
// Todo tiene respaldo: si falta una textura (o el renderizador no es WebGL, donde NineSlice no dibuja) se usan figuras.
// Texturas (las precarga el Boot con la ruta sin extensión como clave):
//   ui/ui_boton[_encima|_presionado|_desactivado]  12 × 12, cortes de 4 · ui/ui_panel 16 × 16, borde 3
//   ui/ui_chip_cian · ui/ui_chip_rojo  8 × 8, cortes de 3 · ui/ui_marco_barra  6 × 6, cortes de 2
//   iconos/ico_*  16 × 16 (keywords)
import Phaser from 'phaser';
import { P, num } from '../expediente/componentes.js';
import { FUENTE } from '../expediente/interfaz.js';
import { sonarBoton } from '../../fisica/sonido.js';

export { P, num };
export const VERDE_SUGERIDO = '#4cc38a'; // el mismo verde de la opción sugerida en los menús (interfaz.js COLOR.sugerido)
const ESCALA_BOTON = 3;

const webgl = (scene) => scene.sys.game.renderer?.type === Phaser.WEBGL;
/** ¿Se puede usar esta textura como 9-slice? */
export const hay9 = (scene, clave) => webgl(scene) && scene.textures.exists(clave);

/**
 * 9-slice a escala entera de arte (nítido): `w` × `h` en px de pantalla se redondean al múltiplo de `escala`.
 * Devuelve el objeto (origen 0,0) o null si falta la textura.
 */
export function nueve(scene, clave, x, y, w, h, corte, escala = ESCALA_BOTON) {
  if (!hay9(scene, clave)) return null;
  const aw = Math.max(2 * corte + 1, Math.round(w / escala));
  const ah = Math.max(2 * corte + 1, Math.round(h / escala));
  return scene.add.nineslice(x, y, clave, undefined, aw, ah, corte, corte, corte, corte).setOrigin(0, 0).setScale(escala);
}

/** Texto con la fuente del juego (nunca < 14 px: DISENO.md §2.1). */
export function txt(scene, x, y, contenido, { size = 16, color = P.texto, origen = [0, 0], ancho, estilo = 'normal', alinear = 'left', interlineado = 0, borde = false } = {}) {
  const t = scene.add.text(x, y, contenido, {
    fontFamily: FUENTE, fontSize: `${Math.max(14, size)}px`, color, fontStyle: estilo, align: alinear, lineSpacing: interlineado,
    wordWrap: ancho ? { width: ancho, useAdvancedWrap: true } : undefined,
    ...(borde ? { stroke: '#0b0d17', strokeThickness: 4 } : {}),
  });
  return t.setOrigin(origen[0], origen[1]);
}

/** Panel con marco de arte (ui_panel ×3); respaldo: rectángulo con borde. Origen arriba a la izquierda. */
export function panel(scene, x, y, w, h, { alfa = 1, relleno = P.panel, borde = P.borde } = {}) {
  const ns = nueve(scene, 'ui/ui_panel', x, y, w, h, 3, 3);
  if (ns) return ns.setAlpha(alfa);
  return scene.add.rectangle(x, y, w, h, relleno, alfa).setOrigin(0, 0).setStrokeStyle(2, borde);
}

/**
 * Chip: etiqueta corta en una caja. tipo 'cian' (dato) o 'rojo' (límite/falta) usan el arte 9-slice ×2;
 * cualquier otro color dibuja un borde de ese color. Devuelve { objs, ancho, alto }.
 */
export function chip(scene, x, y, etiqueta, { tipo = null, color, size = 14, pad = 8 } = {}) {
  const c = color ?? (tipo === 'rojo' ? P.riesgo : tipo === 'cian' ? P.dato : P.sec);
  const t = txt(scene, x + pad, y + 4, etiqueta, { size, color: c });
  const ancho = Math.ceil(t.width) + pad * 2;
  const alto = Math.ceil(t.height) + 8;
  const clave = tipo ? `ui/ui_chip_${tipo}` : null;
  let caja = clave ? nueve(scene, clave, x, y, ancho, alto, 3, 2) : null;
  if (!caja) caja = scene.add.rectangle(x, y, ancho, alto, 0x0b0d17, 0.85).setOrigin(0, 0).setStrokeStyle(2, num(c), 0.95);
  scene.children.moveBelow(caja, t);
  return { objs: [caja, t], ancho, alto, texto: t };
}

/** Fila de chips sin pasar de xMax; los que no caben se resumen en un chip «+N». Devuelve { objs, ancho, alto }. */
export function filaChips(scene, x, y, chips, xMax, { gap = 8 } = {}) {
  const objs = [];
  let cx = x;
  let alto = 0;
  for (let i = 0; i < chips.length; i++) {
    const c = chips[i];
    const ch = chip(scene, cx, y, c.texto, c);
    const resto = chips.length - i - 1;
    // Reserva lugar para «+N» si todavía quedan chips después de este.
    const reserva = resto > 0 ? 48 : 0;
    if (cx + ch.ancho + reserva > xMax && cx > x) {
      ch.objs.forEach((o) => o.destroy());
      const mas = chip(scene, cx, y, `+${chips.length - i}`, { color: c.color, tipo: c.tipo });
      objs.push(...mas.objs);
      cx += mas.ancho + gap;
      break;
    }
    objs.push(...ch.objs);
    alto = Math.max(alto, ch.alto);
    cx += ch.ancho + gap;
  }
  return { objs, ancho: cx - x - gap, alto };
}

/** Barra 0–1 con marco de arte (ui_marco_barra ×2); el número se escribe aparte (nunca solo color). */
export function barra(scene, x, y, w, h, frac, color) {
  const marco = nueve(scene, 'ui/ui_marco_barra', x, y, w, h, 2, 2);
  const objs = [];
  let ix = x, iy = y, iw = w, ih = h;
  if (marco) { objs.push(marco); ix += 4; iy += 4; iw -= 8; ih -= 8; }
  else objs.push(scene.add.rectangle(x, y, w, h, P.barraFondo).setOrigin(0, 0).setStrokeStyle(1, P.borde));
  const relleno = scene.add.rectangle(ix, iy, 0, Math.max(2, ih), num(color)).setOrigin(0, 0);
  const fijar = (f, c = color) => {
    const v = typeof f === 'number' && Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : 0;
    relleno.width = Math.round(iw * v);
    relleno.setFillStyle(num(c));
  };
  fijar(frac);
  objs.push(relleno);
  return { objs, fijar, relleno };
}

/** Ícono de arte (iconos/ico_* o cualquier textura) escalado; respaldo: un glifo de texto. */
export function icono(scene, x, y, clave, { escala = 2, respaldo = '•', color = P.sec, size = 18 } = {}) {
  if (clave && scene.textures.exists(clave)) return scene.add.image(x, y, clave).setScale(escala);
  return txt(scene, x, y, respaldo, { size, color, origen: [0.5, 0.5] });
}

/**
 * Botón con caja de arte en 4 estados (ui_boton, _encima, _presionado, _desactivado; ×3). El texto va centrado en la caja.
 * Devuelve { obj (Text), caja, activar, setHabilitado, setEtiqueta, setColor, setSugerido, marcarFoco, ancho, alto }.
 * - `numero`: atajo visible «1 · …»; `sugerido`: texto verde y « ⏎» (lo que hace Enter).
 * - Zona táctil: la caja (≥ 64 × 44); `zonaExtra` = [dx, dy] px de más por lado sin cambiar el dibujo.
 * - origen: [0.5, 0.5] centra la caja en (x, y); [0, 0.5] la ancla por la izquierda; [1, 0.5] por la derecha.
 */
export function boton(scene, x, y, etiqueta, alPulsar, {
  size = 16, color = P.accion, numero = null, sugerido = false, habilitado = true, origen = [0.5, 0.5],
  anchoMin = 64, alto = 45, pad = 14, zonaExtra = [0, 0], sonar = true, reservaFoco = true,
} = {}) {
  const t = txt(scene, 0, 0, '', { size, color, origen: [0.5, 0.5] });
  const conArte = hay9(scene, 'ui/ui_boton');
  let caja = null;
  let bx = x;
  let by = y;
  const b = {
    obj: t, etiqueta, numero, sugerido, habilitado, color, sobre: false, foco: false, presionado: false, ancho: 0, alto,
    rotulo() { return `${b.foco ? '▶ ' : ''}${b.numero ? `${b.numero} · ` : ''}${b.etiqueta}${b.sugerido ? ' ⏎' : ''}`; },
    activar() {
      if (!b.habilitado || scene.cameras?.main?.fadeEffect?.isRunning) return;
      if (sonar) sonarBoton();
      alPulsar();
    },
    setHabilitado(v) { b.habilitado = v; b.pintar(); return b; },
    setEtiqueta(s) { b.etiqueta = s; b.pintar(); return b; },
    setColor(c) { b.color = c; b.pintar(); return b; },
    setSugerido(v) { b.sugerido = v; b.pintar(); return b; },
    marcarFoco(v) { b.foco = v; b.pintar(); return b; },
    /** Mueve el punto de anclaje del botón (mismo `origen`). */
    mover(nx, ny = by) { bx = nx; by = ny; b.pintar(); return b; },
    setVisible(v) { t.setVisible(v); caja?.setVisible(v); return b; },
    pintar() {
      if (!t.active) return;
      t.setText(b.rotulo());
      t.setColor(!b.habilitado ? P.sec : b.foco ? P.bien : b.sobre ? P.texto : b.sugerido ? VERDE_SUGERIDO : b.color);
      // Ancho fijo con el espacio de «▶ » reservado: la caja no salta al recibir el foco.
      const anchoTexto = Math.ceil(t.width + (b.foco || !reservaFoco ? 0 : size * 1.2));
      const w = Math.max(anchoMin, anchoTexto + 2 * pad);
      const ancho = conArte ? Math.ceil(w / ESCALA_BOTON) * ESCALA_BOTON : w;
      const h = conArte ? Math.ceil(alto / ESCALA_BOTON) * ESCALA_BOTON : alto;
      if (!b.ancho) b.ancho = ancho; // el ancho se fija la primera vez (con el rótulo más largo posible si se pasa anchoMin)
      b.ancho = Math.max(b.ancho, ancho);
      b.alto = h;
      const x0 = bx - origen[0] * b.ancho;
      const y0 = by - origen[1] * h;
      if (conArte) {
        const clave = !b.habilitado ? 'ui/ui_boton_desactivado' : b.presionado ? 'ui/ui_boton_presionado'
          : (b.sobre || b.foco) ? 'ui/ui_boton_encima' : 'ui/ui_boton';
        const k = scene.textures.exists(clave) ? clave : 'ui/ui_boton';
        if (!caja) caja = scene.add.nineslice(x0, y0, k, undefined, b.ancho / ESCALA_BOTON, h / ESCALA_BOTON, 4, 4, 4, 4).setOrigin(0, 0).setScale(ESCALA_BOTON);
        else if (caja.texture.key !== k) { caja.setTexture(k); caja.updateUVs(); }
        caja.setPosition(x0, y0);
        if (caja.width !== b.ancho / ESCALA_BOTON) caja.width = b.ancho / ESCALA_BOTON;
      } else {
        if (!caja) caja = scene.add.rectangle(x0, y0, b.ancho, h, 0x262d4a, 0.96).setOrigin(0, 0);
        caja.setPosition(x0, y0).setSize(b.ancho, h);
        caja.setFillStyle(!b.habilitado ? 0x171b2e : (b.sobre || b.foco) ? 0x3a4468 : 0x262d4a, 0.96)
          .setStrokeStyle((b.sobre || b.foco) ? 2 : 1, num(!b.habilitado ? P.sec : (b.sobre || b.foco) ? P.accion : b.color));
      }
      // El texto baja 2 px al presionar (la caja de arte tiene el bisel abajo).
      t.setPosition(Math.round(x0 + b.ancho / 2), Math.round(y0 + h / 2 - (conArte ? 2 : 0) + (b.presionado ? 2 : 0)));
      if (!caja.input) {
        caja.setInteractive({ useHandCursor: true });
        caja.on('pointerover', () => { b.sobre = true; b.pintar(); });
        caja.on('pointerout', () => { b.sobre = false; b.presionado = false; b.pintar(); });
        caja.on('pointerdown', () => {
          if (!b.habilitado) return;
          b.presionado = true; b.pintar();
          scene.time.delayedCall(90, () => { b.presionado = false; b.pintar(); });
          b.activar();
        });
        t.once('destroy', () => { if (caja?.active) caja.destroy(); });
      }
      // Zona táctil: la caja más `zonaExtra` (coordenadas locales de la caja, sin escalar).
      const s = conArte ? ESCALA_BOTON : 1;
      const zw = Math.max(b.ancho, 64) + 2 * zonaExtra[0];
      const zh = Math.max(h, 44) + 2 * zonaExtra[1];
      caja.input.hitArea.setTo(-(zw - b.ancho) / 2 / s, -(zh - h) / 2 / s, zw / s, zh / s);
      caja.input.customHitArea = true;
      caja.input.cursor = b.habilitado ? 'pointer' : 'default';
      scene.children.moveBelow(caja, t);
      caja.setDepth(t.depth);
    },
  };
  b.pintar();
  b.caja = caja;
  return b;
}

/** Fija profundidad y factor de desplazamiento (HUD) a un botón y su caja. */
export function fijarBoton(b, depth, scroll = 0) {
  b.obj.setDepth(depth + 0.1).setScrollFactor(scroll);
  b.caja.setDepth(depth).setScrollFactor(scroll);
  return b;
}
