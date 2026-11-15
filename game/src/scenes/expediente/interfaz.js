import Phaser from 'phaser';

// Dueño: frente expediente. Kit de interfaz de MIS escenas (Boot, Menú, Expediente, Explorador).
// No reemplaza ui.js (del integrador): agrega foco visible y navegación por teclado (AGENTS.md §12: accesible).

export const COLOR = {
  texto: '#ffffff',
  tenue: '#9aa4c7',
  muyTenue: '#6c7393',
  acento: '#ffd166',
  foco: '#06d6a0',
  alerta: '#ef476f',
  panel: 0x141831,
  borde: 0x2a3160,
  resalte: 0x1f2550,
  sugerido: '#4cc38a', // mismo verde que la opción sugerida de Resultados.js
  sobre: '#ffffff', // texto bajo el ratón
  fondoSobre: '#2a3160', // fondo del texto bajo el ratón
};
export const FUENTE = 'monospace';
// Fuente de los textos de interfaz: sans de sistema (sin CDN ni archivos: funciona sin conexión). Ver docs/estado/expediente.md.
export const FUENTE_TEXTO = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';
// Zona táctil mínima (px del juego). En horizontal en un teléfono (escala ≈ 0.72) 44 px del juego ≈ 32 px reales.
export const ZONA_MIN = { ancho: 64, alto: 44 };

/** Ancho en px de un texto con la fuente de interfaz (para alinear resaltados sobre texto proporcional). */
export function anchoTexto(scene, contenido, size = 14) {
  const m = scene.add.text(0, 0, contenido, { fontFamily: FUENTE_TEXTO, fontSize: `${size}px` });
  const w = m.width;
  m.destroy();
  return w;
}

/** Texto suavizado: filtro lineal en la textura (pixelArt:true lo deja nítido y pixelado). */
const suavizar = (t) => t.texture?.setFilter(Phaser.Textures.FilterMode.LINEAR);

export function texto(scene, x, y, contenido, { size = 14, color = COLOR.texto, origen = [0, 0], ancho, alinear = 'left', estilo = 'normal' } = {}) {
  const t = scene.add.text(x, y, contenido, {
    fontFamily: FUENTE_TEXTO, fontSize: `${size}px`, color, align: alinear, fontStyle: estilo,
    wordWrap: ancho ? { width: ancho, useAdvancedWrap: true } : undefined,
  });
  suavizar(t);
  return t.setOrigin(origen[0], origen[1]);
}

export function panel(scene, x, y, w, h, { relleno = COLOR.panel, borde = COLOR.borde } = {}) {
  return scene.add.rectangle(x, y, w, h, relleno).setOrigin(0, 0).setStrokeStyle(1, borde);
}

/**
 * Botón de texto con foco. Devuelve un objeto { obj, activar(), setHabilitado(), setEtiqueta(), enfocar() }.
 * `marco`: true para formato "[ texto ]" (como ui.js); false para elementos de lista.
 * `numero`: atajo de teclado; se muestra como "1 · texto" (igual que Resultados.js).
 * `sugerido`: opción que ejecuta Enter si nada tiene foco; se marca con " ⏎" en verde (igual que Resultados.js).
 * `anchoMin` / `altoMin`: tamaño mínimo de la zona táctil en px del juego (más grande que el texto, sin cambiar cómo se ve).
 */
export function boton(scene, x, y, etiqueta, alPulsar, {
  size = 16, origen = [0.5, 0.5], habilitado = true, marco = true, color = COLOR.acento, ancho, numero = null, sugerido = false,
  anchoMin = ZONA_MIN.ancho, altoMin = ZONA_MIN.alto,
} = {}) {
  const t = texto(scene, x, y, '', { size, color, origen, ancho });
  const b = {
    obj: t, etiqueta, habilitado, enfocado: false, sobre: false, color, numero, sugerido,
    // Durante el fundido de salida no se aceptan más pulsaciones (evita, p. ej., gastar un segundo ticket).
    activar() { if (b.habilitado && !enTransicion(scene)) alPulsar(); },
    setHabilitado(v) { b.habilitado = v; b.pintar(); return b; },
    setEtiqueta(s) { b.etiqueta = s; b.pintar(); return b; },
    setNumero(n) { b.numero = n; b.pintar(); return b; },
    setSugerido(v) { b.sugerido = v; b.pintar(); return b; },
    setColor(c) { b.color = c; b.pintar(); return b; },
    enfocar(v) { b.enfocado = v; b.pintar(); },
    marcarSobre(v) { if (b.sobre === v) return; b.sobre = v; b.pintar(); },
    rotulo() {
      const s = `${b.numero ? `${b.numero} · ` : ''}${b.etiqueta}${b.sugerido ? ' ⏎' : ''}`;
      return marco ? `[ ${s} ]` : s;
    },
    pintar() {
      // Foco de teclado (▶, verde) y ratón encima (blanco con fondo) son estados distintos: el ratón no mueve el foco.
      // El foco de teclado solo se dibuja en modo teclado (después de usar flechas/Tab): con ratón, un solo resaltado,
      // el de la opción bajo el cursor. Antes quedaba «Continuar» en verde mientras el ratón marcaba otra (retro de Leo).
      const sobre = b.sobre && b.habilitado;
      const foco = b.enfocado && scene.modoTeclado;
      const c = !b.habilitado ? COLOR.muyTenue : foco ? COLOR.foco : sobre ? COLOR.sobre : b.sugerido ? COLOR.sugerido : b.color;
      t.setColor(c);
      t.setBackgroundColor(sobre ? COLOR.fondoSobre : null);
      t.setText((foco ? '▶ ' : '') + b.rotulo());
      suavizar(t);
      b.ajustarZona();
    },
    // La zona táctil crece desde el punto de origen del texto (centrada, o hacia la derecha/abajo si el origen es 0).
    ajustarZona() {
      if (!t.input) return;
      const w = Math.max(t.width, anchoMin);
      const h = Math.max(t.height, altoMin);
      t.input.hitArea.setTo(-(w - t.width) * t.originX, -(h - t.height) * t.originY, w, h);
    },
  };
  t.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, 1, 1), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  t.on('pointerdown', () => b.activar());
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
  // Los objetos marcados con setData('ambiente', true) (fondo animado del Menú) sobreviven al cambiar de vista.
  scene.children.list.slice().filter((o) => !o.getData?.('ambiente')).forEach((o) => o.destroy());
  if (scene.teclado) { scene.teclado.items = []; scene.teclado.actual = null; scene.teclado.atajos = []; }
}
