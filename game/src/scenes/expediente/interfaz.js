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
};
export const FUENTE = 'monospace';

export function texto(scene, x, y, contenido, { size = 14, color = COLOR.texto, origen = [0, 0], ancho, alinear = 'left', estilo = 'normal' } = {}) {
  const t = scene.add.text(x, y, contenido, {
    fontFamily: FUENTE, fontSize: `${size}px`, color, align: alinear, fontStyle: estilo,
    wordWrap: ancho ? { width: ancho, useAdvancedWrap: true } : undefined,
  });
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
 */
export function boton(scene, x, y, etiqueta, alPulsar, {
  size = 16, origen = [0.5, 0.5], habilitado = true, marco = true, color = COLOR.acento, ancho, numero = null, sugerido = false,
} = {}) {
  const t = texto(scene, x, y, '', { size, color, origen, ancho });
  const b = {
    obj: t, etiqueta, habilitado, enfocado: false, color, numero, sugerido,
    activar() { if (b.habilitado) alPulsar(); },
    setHabilitado(v) { b.habilitado = v; b.pintar(); return b; },
    setEtiqueta(s) { b.etiqueta = s; b.pintar(); return b; },
    setNumero(n) { b.numero = n; b.pintar(); return b; },
    setSugerido(v) { b.sugerido = v; b.pintar(); return b; },
    setColor(c) { b.color = c; b.pintar(); return b; },
    enfocar(v) { b.enfocado = v; b.pintar(); },
    rotulo() {
      const s = `${b.numero ? `${b.numero} · ` : ''}${b.etiqueta}${b.sugerido ? ' ⏎' : ''}`;
      return marco ? `[ ${s} ]` : s;
    },
    pintar() {
      const c = !b.habilitado ? COLOR.muyTenue : b.enfocado ? COLOR.foco : b.sugerido ? COLOR.sugerido : b.color;
      t.setColor(c);
      t.setText((b.enfocado ? '▶ ' : '') + b.rotulo());
    },
  };
  t.setInteractive({ useHandCursor: true });
  t.on('pointerdown', () => b.activar());
  t.on('pointerover', () => { if (b.habilitado && scene.teclado) scene.teclado.enfocar(b); });
  b.pintar();
  return b;
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
