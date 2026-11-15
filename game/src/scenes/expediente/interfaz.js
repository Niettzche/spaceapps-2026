import Phaser from 'phaser';
import { sonarBoton } from '../../fisica/sonido.js';
import { movimientoReducido, soltarTweensAlDestruir } from './efectos.js';
import { textoPixel, FUENTE_RESPALDO } from '../comun/fuente.js';

// Dueño: frente expediente. Kit de interfaz de MIS escenas (Boot, Menú, Expediente, Explorador).
// No reemplaza ui.js (del integrador): agrega foco visible y navegación por teclado (AGENTS.md §12: accesible).

export const COLOR = {
  texto: '#ffffff',
  tenue: '#9aa4c7',
  muyTenue: '#a3abcc', // texto secundario: ≥ 5.4:1 en todos los fondos (antes #6c7393, 3.1:1 en filas resaltadas)
  acento: '#ffd166',
  foco: '#06d6a0',
  alerta: '#ff7a93', // riesgo / límite: ≥ 5:1 (antes #ef476f, 3.4:1 sobre fondoSobre)
  decoracion: 0x6c7393, // solo para líneas y marcos (no texto): el gris oscuro de antes
  panel: 0x141831,
  borde: 0x2a3160,
  resalte: 0x1f2550,
  sugerido: '#4cc38a', // mismo verde que la opción sugerida de Resultados.js
  sobre: '#ffffff', // texto bajo el ratón
  fondoSobre: '#2a3160', // fondo del texto bajo el ratón
};
export const FUENTE = FUENTE_RESPALDO; // respaldo de la fuente pixel (comun/fuente.js)
// Zona táctil mínima (px del juego). En horizontal en un teléfono (escala ≈ 0.72) 44 px del juego ≈ 32 px reales.
export const ZONA_MIN = { ancho: 64, alto: 44 };

/** Texto con la fuente pixel del juego (BitmapText ×2 o más; respaldo monospace). Ver comun/fuente.js. */
export function texto(scene, x, y, contenido, { size = 14, color = COLOR.texto, origen = [0, 0], ancho, alinear = 'left', estilo = 'normal', titulo = false } = {}) {
  return textoPixel(scene, x, y, contenido, { size, color, origen, ancho, alinear, estilo, titulo });
}

export function panel(scene, x, y, w, h, { relleno = COLOR.panel, borde = COLOR.borde } = {}) {
  return scene.add.rectangle(x, y, w, h, relleno).setOrigin(0, 0).setStrokeStyle(1, borde);
}

/**
 * Caja de arte 9-slice a escala entera (kit de Mauricio): 'ui/ui_tarjeta' (cortes 4), 'ui/ui_panel' (3),
 * 'ui/ui_titulo_placa' (6 a los lados, 5 arriba/abajo), 'ui/ui_ayuda' (3). Origen arriba a la izquierda.
 * Respaldo sin textura o sin WebGL: el panel plano de siempre. Devuelve el objeto.
 */
const CORTES = { 'ui/ui_tarjeta': [4, 4, 4, 4], 'ui/ui_chip_rojo': [3, 3, 3, 3], 'ui/ui_chip_cian': [3, 3, 3, 3], 'ui/ui_panel': [3, 3, 3, 3], 'ui/ui_titulo_placa': [6, 6, 5, 5], 'ui/ui_ayuda': [3, 3, 3, 3] };
export function cajaArte(scene, clave, x, y, w, h, { escala = 3, alfa = 1 } = {}) {
  const c = CORTES[clave] ?? [4, 4, 4, 4];
  if (hayArte(scene, clave)) {
    const aw = Math.max(c[0] + c[1] + 1, Math.round(w / escala));
    const ah = Math.max(c[2] + c[3] + 1, Math.round(h / escala));
    return scene.add.nineslice(Math.round(x), Math.round(y), clave, undefined, aw, ah, c[0], c[1], c[2], c[3])
      .setOrigin(0, 0).setScale(escala).setAlpha(alfa);
  }
  return panel(scene, x, y, w, h).setAlpha(alfa);
}

/** Título de pantalla con la fuente del logo sobre la placa de arte (ui_titulo_placa); devuelve { texto, placa }. */
export function tituloPlaca(scene, x, y, contenido, { size = 30, padX = 30, padY = 12 } = {}) {
  const t = texto(scene, x, y, contenido, { size, titulo: true, origen: [0.5, 0.5] });
  const placa = cajaArte(scene, 'ui/ui_titulo_placa', x - t.width / 2 - padX, y - t.height / 2 - padY, t.width + 2 * padX, t.height + 2 * padY);
  scene.children.moveBelow(placa, t);
  return { texto: t, placa };
}

// Caja de los botones con marco: arte de Mauricio (ui/ui_boton[_encima|_presionado|_desactivado], 9-slice 12 × 12,
// cortes de 4, dibujado ×3: el mismo botón que Taller/HUD/Resultados en comun/pixel.js). Relleno oscuro: el texto
// amarillo/verde/blanco tiene contraste AA. Respaldo sin la textura (o sin WebGL): la caja dibujada de antes.
const CAJA = {
  relleno: 0x262d4a, rellenoSobre: 0x3a4468, rellenoApagado: 0x171b2e,
  brillo: 0x4a5468, brilloSobre: 0x6a7690, sombra: 0x10131f, contorno: 0x0e0c16,
};
const ESCALA_ARTE = 3;
const hex = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);
const hayArte = (scene, clave) => scene.sys.game.renderer?.type === Phaser.WEBGL && scene.textures.exists(clave);

/**
 * Botón con foco. Devuelve un objeto { obj, activar(), setHabilitado(), setEtiqueta(), enfocar() }.
 * `marco`: true = botón con caja de arte (ui_boton en sus 4 estados); false = elemento de lista (solo texto, fondo al pasar).
 *   La caja es un objeto aparte que sigue al texto (posición, escala, visibilidad, contenedor y destrucción):
 *   `obj` sigue siendo el texto (BitmapText con la fuente pixel), así que quien lo mete en un contenedor (Expediente) no cambia.
 * `numero`: atajo de teclado; se muestra como "1 · texto" (igual que Resultados.js).
 * `sugerido`: opción que ejecuta Enter si nada tiene foco; se marca con " ⏎" y texto verde (igual que Resultados.js).
 * `anchoMin` / `altoMin`: tamaño mínimo de la zona táctil en px del juego (más grande que el dibujo, sin cambiarlo).
 * `anchoCaja`: ancho mínimo de la caja (para una columna de botones del mismo ancho); el texto va centrado.
 * `crecer`: al pasar el ratón el botón crece a ×1.05 (tween corto) y vuelve al salir. Por defecto solo los de marco
 *   (en las filas de una lista crecería hacia la columna de al lado). Sin animación con prefers-reduced-motion.
 * `alSobre(v)`: aviso cuando el ratón entra (true) o sale (false), p. ej. para animar el planeta de una tarjeta.
 * `alEnfocar(v)`: aviso cuando el botón gana (true) o pierde (false) el resaltado, sea por ratón o por teclado
 *   (p. ej. para mostrar una ayuda de 1 línea).
 * Al pulsar suena `sonarBoton()` (fisica/sonido.js; respeta el silencio con M).
 */
export function boton(scene, x, y, etiqueta, alPulsar, {
  size = 16, origen = [0.5, 0.5], habilitado = true, marco = true, color = COLOR.acento, ancho, numero = null, sugerido = false,
  anchoMin = ZONA_MIN.ancho, altoMin = ZONA_MIN.alto, crecer = marco, alSobre = null, alEnfocar = null, anchoCaja = 0,
} = {}) {
  const t = texto(scene, x, y, '', { size, color, origen, ancho, alinear: marco ? 'center' : 'left' });
  const pad = marco ? { x: Math.round(size * 0.75), y: 8 } : { x: 4, y: 3 };
  const caja = cajaDeBoton(scene, t, { pad, anchoCaja, lista: !marco });
  const animar = crecer && !movimientoReducido();
  if (animar) soltarTweensAlDestruir(scene, t);
  let resaltado = false;
  const b = {
    obj: t, caja: caja.obj, etiqueta, habilitado, enfocado: false, sobre: false, presionado: false, color, numero, sugerido,
    // Durante el fundido de salida no se aceptan más pulsaciones (evita, p. ej., gastar un segundo ticket).
    activar() {
      if (!b.habilitado || enTransicion(scene)) return;
      sonarBoton();
      alPulsar();
    },
    setHabilitado(v) { b.habilitado = v; b.pintar(); return b; },
    setEtiqueta(s) { b.etiqueta = s; b.pintar(); return b; },
    setNumero(n) { b.numero = n; b.pintar(); return b; },
    setSugerido(v) { b.sugerido = v; b.pintar(); return b; },
    setColor(c) { b.color = c; b.pintar(); return b; },
    enfocar(v) { b.enfocado = v; b.pintar(); },
    marcarSobre(v) {
      if (b.sobre === v) return;
      b.sobre = v;
      if (!v) b.presionado = false;
      b.pintar();
      if (animar && t.active) {
        scene.tweens.killTweensOf(t);
        const e = v && b.habilitado ? 1.05 : 1;
        scene.tweens.add({ targets: t, scaleX: e, scaleY: e, duration: 90, ease: 'Quad.easeOut' });
      }
      alSobre?.(v && b.habilitado);
    },
    rotulo() {
      return `${b.numero ? `${b.numero} · ` : ''}${b.etiqueta}${b.sugerido ? ' ⏎' : ''}`;
    },
    pintar() {
      if (!t.active) return;
      // Foco de teclado (▶, verde) y ratón encima (blanco, caja resaltada) son estados distintos: el ratón no mueve el foco.
      // El foco de teclado solo se dibuja en modo teclado (después de usar flechas/Tab): con ratón, un solo resaltado,
      // el de la opción bajo el cursor. Antes quedaba «Continuar» en verde mientras el ratón marcaba otra (retro de Leo).
      const sobre = b.sobre && b.habilitado;
      const foco = b.enfocado && scene.modoTeclado;
      const c = !b.habilitado ? COLOR.muyTenue : foco ? COLOR.foco : sobre ? COLOR.sobre : b.sugerido ? COLOR.sugerido : b.color;
      t.setColor(c);
      t.setText((foco ? '▶ ' : '') + b.rotulo());
      // Un único resaltado: la caja «encima» (borde amarillo) para el ratón o el foco de teclado.
      caja.dibujar({ borde: foco || sobre ? c : b.color, sobre: sobre || foco, habilitado: b.habilitado, presionado: b.presionado && b.habilitado });
      b.ajustarZona();
      const r = (sobre || foco) && b.habilitado;
      if (r !== resaltado) { resaltado = r; alEnfocar?.(r); }
    },
    // La zona táctil cubre la caja y crece hasta anchoMin × altoMin alrededor de su centro (coordenadas locales del texto).
    ajustarZona() {
      if (!t.input) return;
      const m = caja.medidas();
      const sx = t.scaleX || 1, sy = t.scaleY || 1;
      const w = Math.max(m.w, anchoMin), h = Math.max(m.h, altoMin);
      const izq = t.x - t.originX * t.width, arr = t.y - t.originY * t.height;
      const cx = m.x0 + m.w / 2 - izq, cy = m.y0 + m.h / 2 - arr;
      t.input.hitArea.setTo((cx - w / 2) / sx, (cy - h / 2) / sy, w / sx, h / sy);
    },
  };
  t.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, 1, 1), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  t.on('pointerdown', () => {
    if (b.habilitado && marco) {
      b.presionado = true; b.pintar();
      scene.time.delayedCall(90, () => { b.presionado = false; b.pintar(); });
    }
    b.activar();
  });
  // Antes 'pointerover' movía el foco de teclado y nada lo quitaba al salir: el resaltado quedaba pegado hasta que
  // otra opción tomaba el foco. Ahora el ratón solo marca/desmarca su propio estado.
  t.on('pointerover', () => {
    // El ratón manda: sale del modo teclado y el foco sigue al cursor (Enter activa lo que está bajo el ratón).
    const cambio = scene.modoTeclado;
    scene.modoTeclado = false;
    if (b.habilitado && scene.teclado?.items.includes(b)) scene.teclado.enfocar(b);
    b.marcarSobre(true);
    if (cambio) scene.teclado?.items.forEach((x) => x.pintar());
  });
  t.on('pointerout', () => b.marcarSobre(false));
  b.pintar();
  return b;
}

/**
 * Caja detrás del texto de un botón: 9-slice de arte (marco) o rectángulo de fondo al pasar (lista). Cada cuadro
 * (postupdate) copia posición, tamaño (con la escala del tween), visibilidad, transparencia y profundidad del texto y
 * se coloca justo debajo de él, en su mismo contenedor si lo tiene. Se destruye con el texto.
 */
function cajaDeBoton(scene, t, { pad, anchoCaja = 0, lista = false }) {
  const arte = !lista && hayArte(scene, 'ui/ui_boton');
  const obj = arte
    ? scene.add.nineslice(0, 0, 'ui/ui_boton', undefined, 12, 12, 4, 4, 4, 4).setOrigin(0, 0).setScale(ESCALA_ARTE)
    : scene.add.graphics();
  let estado = { sobre: false, habilitado: true, borde: COLOR.acento, presionado: false };
  let ultimo = '';
  const medidas = () => {
    const tw = t.width, th = t.height;
    let w = Math.max(anchoCaja * (t.scaleX || 1), tw + 2 * pad.x);
    let h = th + 2 * pad.y;
    if (arte) { w = Math.ceil(w / ESCALA_ARTE) * ESCALA_ARTE; h = Math.ceil(h / ESCALA_ARTE) * ESCALA_ARTE; }
    const izq = t.x - t.originX * tw, arr = t.y - t.originY * th;
    const x0 = Math.round(izq - pad.x + t.originX * (tw + 2 * pad.x - w));
    const y0 = Math.round(arr - pad.y + t.originY * (th + 2 * pad.y - h)) + (arte ? 2 : 0); // el bisel del arte va abajo
    return { x0, y0, w, h };
  };
  const dibujar = () => {
    const m = medidas();
    const { sobre, habilitado, presionado } = estado;
    const firma = `${m.x0},${m.y0},${m.w},${m.h},${sobre},${habilitado},${presionado},${estado.borde}`;
    if (firma === ultimo) return;
    ultimo = firma;
    if (arte) {
      const clave = !habilitado ? 'ui/ui_boton_desactivado' : presionado ? 'ui/ui_boton_presionado' : sobre ? 'ui/ui_boton_encima' : 'ui/ui_boton';
      const k = scene.textures.exists(clave) ? clave : 'ui/ui_boton';
      if (obj.texture.key !== k) { obj.setTexture(k); obj.updateUVs?.(); }
      obj.setPosition(m.x0, m.y0).setSize(m.w / ESCALA_ARTE, m.h / ESCALA_ARTE);
      return;
    }
    const g = obj;
    g.clear();
    const { x0, y0, w, h } = m;
    if (lista) {
      if (sobre && habilitado) g.fillStyle(hex(COLOR.fondoSobre), 1).fillRect(x0, y0, w, h);
      return;
    }
    g.fillStyle(CAJA.contorno, 1).fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
    g.fillStyle(!habilitado ? CAJA.rellenoApagado : sobre ? CAJA.rellenoSobre : CAJA.relleno, habilitado ? 0.96 : 0.85).fillRect(x0, y0, w, h);
    if (habilitado) {
      g.fillStyle(sobre ? CAJA.brilloSobre : CAJA.brillo, 1).fillRect(x0 + 2, y0 + 2, w - 4, 2);
      g.fillStyle(CAJA.sombra, 1).fillRect(x0 + 2, y0 + h - 4, w - 4, 2);
    }
    g.lineStyle(sobre ? 2 : 1, habilitado ? hex(estado.borde) : COLOR.decoracion, habilitado ? 1 : 0.7).strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
  };
  const seguir = () => {
    if (!t.active || !obj.active) return;
    const padre = t.parentContainer || null;
    // Container.addAt saca la caja de la lista de la escena (contenedor exclusivo). El caso contrario no ocurre.
    if (padre && obj.parentContainer !== padre) padre.addAt(obj, padre.getIndex(t));
    const l = padre ? padre.list : scene.children.list;
    if (l.indexOf(obj) !== l.indexOf(t) - 1) (padre || scene.children).moveBelow(obj, t);
    // setDepth reordena la lista de la escena: solo si cambió.
    if (obj.depth !== t.depth) obj.setDepth(t.depth);
    obj.setVisible(t.visible).setAlpha(t.alpha).setScrollFactor(t.scrollFactorX, t.scrollFactorY);
    dibujar();
  };
  scene.events.on('postupdate', seguir);
  t.once('destroy', () => {
    scene.events.off('postupdate', seguir);
    if (obj.active) obj.destroy();
  });
  return {
    obj,
    medidas,
    dibujar(e) { estado = e; seguir(); dibujar(); },
  };
}

/**
 * Franja oscura detrás de un texto secundario que va sobre el arte del fondo (Marte, nebulosa): así su contraste no
 * depende de lo que pase detrás (≥ 4.5:1 con COLOR.tenue / muyTenue). Devuelve el texto.
 */
export function conFondo(scene, t, { margen = 8, alfa = 0.85 } = {}) {
  const b = t.getBounds();
  scene.add.rectangle(b.centerX, b.centerY, b.width + 2 * margen, b.height + margen, COLOR.panel, alfa).setDepth(t.depth - 0.5);
  return t;
}

/**
 * Ayuda de 1 línea en un lugar fijo (no se mueve con el botón): `mostrar(texto)` la pone, `mostrar('')` la oculta.
 * La usan los botones con `alEnfocar` para que la frase larga no viva debajo de cada uno (DISENO.md §3).
 */
export function ayudaFija(scene, x, y, { ancho = 760, size = 16, color = COLOR.texto, porDefecto = '' } = {}) {
  // Caja de ayuda de Mauricio (ui_ayuda, 9-slice 10 × 10 ×2); respaldo: rectángulo con borde.
  const arte = hayArte(scene, 'ui/ui_ayuda');
  const fondo = arte
    ? scene.add.nineslice(x, y, 'ui/ui_ayuda', undefined, 10, 10, 3, 3, 3, 3).setScale(2).setVisible(false)
    : scene.add.rectangle(x, y, ancho, size + 18, COLOR.panel, 0.92).setStrokeStyle(1, COLOR.borde).setVisible(false);
  const t = texto(scene, x, y, '', { size, color, origen: [0.5, 0.5], ancho: ancho - 24, alinear: 'center' });
  const medir = (w, h) => {
    if (arte) { fondo.setSize(Math.ceil(w / 2), Math.ceil(h / 2)); fondo.setOrigin(0.5, 0.5); } else fondo.setSize(w, h).setOrigin(0.5, 0.5);
  };
  let actual = null;
  if (porDefecto) {
    t.setText(porDefecto).setColor(COLOR.tenue);
    fondo.setVisible(true);
    medir(Math.min(ancho, t.width + 32), Math.max(size + 18, t.height + 14));
  }
  return {
    texto: t,
    mostrar(s, de = null) {
      // Al pasar de un botón a otro, el «salir» del primero puede llegar después del «entrar» del segundo:
      // solo se oculta si quien la pide es quien la puso.
      if (!s && de && actual !== de) return;
      actual = s ? de : null;
      if (!t.active) return;
      // Sin ayuda activa se ve el texto por defecto (tenue), si lo hay.
      t.setText(s || porDefecto).setColor(s ? color : COLOR.tenue);
      fondo.setVisible(!!(s || porDefecto));
      medir(Math.min(ancho, t.width + 32), Math.max(size + 18, t.height + 14));
    },
  };
}

/** true mientras la cámara de la escena hace el fundido de salida de irA (ui.js). */
export function enTransicion(scene) {
  return !!scene.cameras?.main?.fadeEffect?.isRunning;
}

/**
 * Navegación por teclado: flechas / Tab para mover el foco, Enter o Espacio para activar, Esc para volver.
 * Atajos numéricos como en Resultados.js: las teclas 1–9 activan el botón con ese número (ver `numerar`).
 * Enter ejecuta la opción enfocada o, si no hay foco, la sugerida.
 * Se ignora mientras el foco del navegador está en un campo HTML (Explorador).
 */
export class Teclado {
  constructor(scene, { alEscape } = {}) {
    this.scene = scene;
    this.items = [];
    this.actual = null;
    this.alEscape = alEscape;
    this.extra = {};
    this.atajos = [];
    this.manejador = (ev) => this.tecla(ev);
    // Las escenas de Phaser se reutilizan al reiniciarse: suelta el manejador de la visita anterior.
    scene.teclado?.soltar();
    scene.input.keyboard.on('keydown', this.manejador);
    scene.events.once('shutdown', () => this.soltar());
    scene.teclado = this;
  }

  soltar() {
    this.scene.input?.keyboard?.off('keydown', this.manejador);
    this.items = [];
    this.actual = null;
    this.atajos = [];
  }

  /** Asigna los atajos 1–9 a estos botones (en orden) y muestra el número en su etiqueta. */
  numerar(botones) {
    // No se tocan los atajos anteriores: al redibujar una vista, esos botones ya fueron destruidos.
    this.atajos = botones.slice(0, 9);
    this.atajos.forEach((b, i) => b?.setNumero(i + 1));
  }

  /** Reemplaza los elementos navegables (en orden). Conserva el foco si el elemento sigue presente. */
  poner(items, preferido) {
    this.items = items.filter(Boolean);
    const destino = [preferido, this.actual].find((b) => b && this.items.includes(b) && b.habilitado)
      || this.items.find((b) => b.habilitado) || null;
    this.items.forEach((b) => b.enfocar(false));
    this.actual = null;
    if (destino) this.enfocar(destino);
  }

  enfocar(b) {
    if (this.actual && this.actual !== b) this.actual.enfocar(false);
    this.actual = b;
    b.enfocar(true);
  }

  mover(paso) {
    const vivos = this.items.filter((b) => b.habilitado);
    if (!vivos.length) return;
    const i = vivos.indexOf(this.actual);
    const sig = vivos[(i + paso + vivos.length) % vivos.length] || vivos[0];
    this.enfocar(sig);
  }

  tecla(ev) {
    const el = typeof document !== 'undefined' ? document.activeElement : null;
    if (el && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName)) return;
    if (enTransicion(this.scene)) return;
    // Con Shift presionado, Phaser vuelve a emitir el mismo evento nativo varias veces: se atiende una sola vez.
    if (this.vistos?.has(ev)) return;
    (this.vistos ??= new WeakSet()).add(ev);
    const k = ev.key;
    if (this.extra[k]) { ev.preventDefault?.(); this.extra[k](ev); return; }
    if (/^[1-9]$/.test(k)) {
      const b = this.atajos[Number(k) - 1];
      if (b?.habilitado) { ev.preventDefault?.(); this.enfocar(b); b.activar(); }
      return;
    }
    if (/^(Arrow(Up|Down|Left|Right)|Tab)$/.test(k) && !this.scene.modoTeclado) {
      // Primera tecla de navegación: se muestra el foco donde está, sin moverlo todavía.
      ev.preventDefault?.();
      this.scene.modoTeclado = true;
      this.items.forEach((b) => b.pintar());
      if (!this.actual) this.mover(1);
      return;
    }
    if (k === 'ArrowDown' || k === 'ArrowRight' || (k === 'Tab' && !ev.shiftKey)) { ev.preventDefault?.(); this.mover(1); }
    else if (k === 'ArrowUp' || k === 'ArrowLeft' || (k === 'Tab' && ev.shiftKey)) { ev.preventDefault?.(); this.mover(-1); }
    else if (k === 'Enter' || k === ' ') {
      ev.preventDefault?.();
      (this.actual || this.items.find((b) => b.sugerido && b.habilitado))?.activar();
    }
    else if (k === 'Escape' && this.alEscape) this.alEscape();
  }
}

/** Borra todo lo dibujado por la escena (para escenas con varias vistas). */
export function limpiar(scene) {
  // DisplayList.removeAll() no destruye: se destruye cada objeto para no dejar texturas huérfanas.
  scene.children.list.slice().forEach((o) => o.destroy());
  if (scene.teclado) { scene.teclado.items = []; scene.teclado.actual = null; scene.teclado.atajos = []; }
}
