// HUD de la prueba y la misión, fijo a la cámara. Usa la UI de arte (assets/ui) si existe; si no, figuras.
import { tr } from '../i18n.js';
import { nombreSuperficie } from './suelos.js';
import { REGLAS } from './ambiente.js';
import * as K from '../scenes/comun/pixel.js'; // panel, íconos y botones de arte (DISENO.md §2)
import { ajustarAncho } from '../scenes/comun/fuente.js';

// Fuente pixel ×2 (renglón de 24 px): columna izquierda (título · subtítulo · nota), barras con ícono al centro y la
// lectura (velocidad, distancia, suelo) en 3 renglones cortos a la derecha.
const ANCHO_IZQ = 410;
const XB = 440; // columna de las barras
const ANCHO_PROGRESO = 900; // franja de progreso; la marca de meta va al final (x ≈ 922)
const TXT = (scene, x, y, s, o = {}) => K.txt(scene, x, y, s, { size: 14, color: '#cfd6ff', ...o });

export class Hud {
  constructor(scene, { titulo, subtitulo, aviso, nota }) {
    this.scene = scene;
    const fijo = (o) => o.setScrollFactor(0).setDepth(90);
    // Banda superior: panel de arte del HUD (ui_hud_panel, Mauricio: 9-slice con cortes 5 · 5 · 2 · 6, ×3); respaldo, rectángulo.
    const banda = K.hay9(scene, 'ui/ui_hud_panel')
      ? scene.add.nineslice(0, 0, 'ui/ui_hud_panel', undefined, 320, 29, 5, 5, 2, 6).setOrigin(0).setScale(3).setAlpha(0.94)
      : scene.add.rectangle(0, 0, 960, 88, 0x0b0d17, 0.78).setOrigin(0);
    fijo(banda);
    // Columna izquierda hasta x = 426: las barras empiezan en x = 440. Lo que no cabe se recorta con «…».
    fijo(ajustarAncho(TXT(scene, 16, 6, titulo, { size: 18, color: '#ffffff' }), ANCHO_IZQ));
    fijo(ajustarAncho(TXT(scene, 16, 30, subtitulo), ANCHO_IZQ));
    // Nota de datos: en el HUD solo una keyword corta («Suelo: arena · I datos», DISENO.md §3) a 14 px; el texto completo
    // (fuente, tramo real, recreaciones, ambiente) se abre con la tecla I o tocando la nota.
    if (aviso) {
      const t = fijo(TXT(scene, 16, 54, '', { color: '#ffd166' }));
      const pie = tr(' · I: datos', ' · I: details');
      let corto = nota || aviso;
      t.setText(corto + pie);
      while (t.width > ANCHO_IZQ && corto.length > 10) { corto = corto.slice(0, -2); t.setText(`${corto.trimEnd()}…${pie}`); }
      this._panelDatos(aviso);
      scene.input.keyboard.on('keydown-I', () => this.alternarDatos());
      t.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.alternarDatos());
      const alto = Math.max(44, t.height + 20); // zona táctil ≥ 44 px de alto (auditoría §4.3)
      t.input.hitArea.setTo(0, -(alto - t.height) / 2, t.width, alto);
    }

    this.barras = {};
    const hay = (k) => scene.textures.exists(k);
    // 4 barras con su ícono de arte (8 × 8 × 2), una cada 18 px; sin ícono, la inicial del nombre (nunca solo color).
    const fila = (i, icono, etiqueta) => {
      const y = 10 + i * 18;
      if (hay(icono)) fijo(scene.add.image(XB + 8, y, icono).setScale(2));
      else fijo(TXT(scene, XB + 8, y, etiqueta.slice(0, 1), { origen: [0.5, 0.5] }));
      return y;
    };
    [['energia', tr('Energía', 'Energy'), 0x4cc38a, 'ui/ui_icono_energia'], ['integridad', tr('Carga', 'Payload'), 0xffd166, 'ui/ui_icono_carga'],
      ['chasis', tr('Chasis', 'Chassis'), 0x9aa4c7, 'ui/ui_icono_chasis']].forEach(([clave, etiqueta, color, icono], i) => {
      const y = fila(i, icono, etiqueta);
      if (hay('ui/ui_marco_barra')) fijo(scene.add.nineslice(XB + 24, y, 'ui/ui_marco_barra', undefined, 76, 7, 2, 2, 2, 2).setOrigin(0, 0.5).setScale(2));
      else fijo(scene.add.rectangle(XB + 24, y, 152, 10, 0x2b2d3a).setOrigin(0, 0.5));
      this.barras[clave] = fijo(scene.add.rectangle(XB + 28, y, 144, 8, color).setOrigin(0, 0.5));
    });

    // Temperatura del motor (ambiente.js, regla b): 4.ª barra; se pone roja cerca del límite y el número lleva ⚠.
    const yM = fila(3, 'ui/ui_icono_temperatura', tr('Motor', 'Motor'));
    fijo(scene.add.rectangle(XB + 24, yM, 160, 6, 0x2b2d3a).setOrigin(0, 0.5));
    this.barraMotor = fijo(scene.add.rectangle(XB + 26, yM, 0, 4, 0x6fb3ff).setOrigin(0, 0.5));
    this.textoMotor = fijo(TXT(scene, XB + 192, yM, '', { origen: [0, 0.5] }));

    // Progreso hacia la meta o la zona de entrega (franja bajo el encabezado).
    fijo(scene.add.rectangle(16, 94, ANCHO_PROGRESO, 4, 0x2b2d3a).setOrigin(0, 0.5));
    this.progreso = fijo(scene.add.rectangle(16, 94, 0, 4, 0x4cc38a).setOrigin(0, 0.5));
    // «⚑» (la fuente pixel lo dibuja «»») sobre una caja oscura: el terreno de fondo no le quita contraste (auditoría §4.2).
    const meta = TXT(scene, 16 + ANCHO_PROGRESO + 8, 94, '⚑', { color: '#ffffff', origen: [0, 0.5] });
    fijo(scene.add.rectangle(meta.x - 6, 94, meta.width + 12, Math.max(24, meta.height + 8), 0x0b0d17, 0.9).setOrigin(0, 0.5)).setDepth(89.5);
    fijo(meta);
    this.lectura = fijo(TXT(scene, 944, 6, '', { alinear: 'right', origen: [1, 0] }));
    // Mensaje final grande con la fuente del logo (contorno propio): se lee sobre cualquier fondo.
    this.mensaje = fijo(K.txt(scene, 480, 200, '', { size: 33, titulo: true, alinear: 'center', ancho: 900, origen: [0.5, 0.5] }));
  }

  actualizar(estado, { distancia_m, meta_m }) {
    for (const [clave, barra] of Object.entries(this.barras)) barra.width = 144 * Math.max(0, Math.min(1, estado[clave]));
    this.progreso.width = ANCHO_PROGRESO * Math.max(0, Math.min(1, distancia_m / Math.max(1, meta_m)));
    if (estado.tMotor != null) {
      const lim = REGLAS.motor.limite_C;
      const f = Math.max(0, Math.min(1, (estado.tMotor + 60) / (lim + 60))); // escala visual de −60 °C al límite
      this.barraMotor.width = 156 * f;
      this.barraMotor.fillColor = estado.sobrecalentado ? 0xff6b6b : estado.tMotor >= lim - REGLAS.motor.aviso_C ? 0xffb347 : 0x6fb3ff;
      this.textoMotor.setText(`${estado.sobrecalentado ? '⚠ ' : ''}${Math.round(estado.tMotor)} °C`)
        .setColor(estado.sobrecalentado ? '#ff9b9b' : '#cfd6ff');
    }
    this.lectura.setText(
      `${estado.velocidadMs.toFixed(1)} m/s\n${Math.floor(distancia_m)}/${Math.floor(meta_m)} m\n${estado.patina ? tr('PATINA · ', 'SLIP · ') : ''}${nombreSuperficie(estado.superficie) ?? ''}`,
    );
  }

  /** Panel con la nota de datos completa (fuentes, tramo real, recreaciones). Se abre y cierra con I o tocando la nota. */
  _panelDatos(aviso) {
    const s = this.scene;
    const fijo = (o) => o.setScrollFactor(0).setDepth(102).setVisible(false); // encima de las flechas táctiles (101)
    // El texto completo no cabe en 540 px en los niveles con más datos (lo reportó Mauricio): se parte en páginas por
    // frases y la tecla I pasa a la siguiente; después de la última, cierra.
    const partes = String(aviso).split(/(?<=\. )|(?<= • )/);
    const medir = (txt) => { const t = TXT(s, -2000, -2000, txt, { ancho: 840 }); const h = t.getBounds().height; t.destroy(); return h; };
    const paginas = [];
    let actual = '';
    for (const p of partes) {
      if (actual && medir(actual + p) > 400) { paginas.push(actual.trim()); actual = p; } else actual += p;
    }
    if (actual.trim()) paginas.push(actual.trim());
    const n = paginas.length;
    this.datosPaginas = paginas.map((pag, k) => {
      const pie = k < n - 1 ? tr(`[I] siguiente (${k + 1}/${n})`, `[I] next (${k + 1}/${n})`) : tr(n > 1 ? `[I] cerrar (${n}/${n})` : '[I] cerrar', n > 1 ? `[I] close (${n}/${n})` : '[I] close');
      const t = fijo(TXT(s, 480, 270, tr(`Datos de este nivel\n\n${pag}\n\n${pie}`, `Data for this level\n\n${pag}\n\n${pie}`), {
        color: '#ffffff', ancho: 840, origen: [0.5, 0.5],
      }));
      const fondo = fijo(K.panel(s, 40, Math.round(270 - (t.height + 36) / 2), 880, t.height + 36, { alfa: 0.96 }));
      t.setDepth(103);
      return [fondo, t];
    });
    this.paginaDatos = -1; // -1 = cerrado
  }

  alternarDatos() {
    if (!this.datosPaginas?.length) return;
    this.datosPaginas[this.paginaDatos]?.forEach((o) => o.setVisible(false));
    this.paginaDatos = this.paginaDatos + 1 >= this.datosPaginas.length ? -1 : this.paginaDatos + 1;
    this.datosPaginas[this.paginaDatos]?.forEach((o) => o.setVisible(true));
  }

  /** Overlay de pausa. Devuelve los objetos para destruirlos al reanudar. */
  pausa(alContinuar, alAbandonar) {
    const s = this.scene;
    const fijo = (o) => o.setScrollFactor(0).setDepth(110);
    const fondo = fijo(s.add.rectangle(480, 270, 960, 540, 0x0b0d17, 0.7));
    const titulo = fijo(K.txt(s, 480, 200, tr('Pausa', 'Paused'), { size: 38, titulo: true, origen: [0.5, 0.5] }));
    // Botones de arte (los de todo el juego); su caja se destruye con el texto.
    const boton = (y, texto, color, fn) => K.fijarBoton(K.boton(s, 480, y, texto, fn, { size: 18, color, anchoMin: 340 }), 110).obj;
    const seguir = boton(280, tr('Continuar · Esc / Enter', 'Resume · Esc / Enter'), '#4cc38a', alContinuar);
    const salir = boton(336, tr('Abandonar · X', 'Quit · X'), '#ff9b9b', alAbandonar);
    return [fondo, titulo, seguir, salir];
  }

  mostrar(texto) {
    this.mensaje.setText(texto);
  }

  /**
   * Panel de instrucciones al empezar (DISENO.md §3): título + 3 keywords con ícono (objetivo · regla clave del lugar ·
   * controles) y una pista «I · datos». `filas`: [{ texto, icono, escala, respaldo }] (o cadenas). El detalle del ambiente
   * sigue en el panel de la tecla I. Se quita con ocultarInstrucciones() o solo a los 6 s.
   */
  instrucciones(titulo, filas, pista = null) {
    const s = this.scene;
    const prof = 96;
    const fijo = (o, d = prof + 1) => o.setScrollFactor(0).setDepth(d);
    const X0 = 170; const ANCHO = 620;
    const y0 = 104;
    const objs = [];
    const tTitulo = fijo(K.txt(s, 480, y0 + 20, titulo, { size: 22, estilo: 'bold', origen: [0.5, 0] }));
    objs.push(tTitulo);
    let y = tTitulo.y + tTitulo.height + 14;
    for (const f of filas.map((x) => (typeof x === 'string' ? { texto: x } : x))) {
      const t = fijo(K.txt(s, X0 + 72, y, f.texto, { size: 18, ancho: ANCHO - 72 - 28, interlineado: 2 }));
      const alto = Math.max(36, t.height);
      t.setY(y + (alto - t.height) / 2);
      objs.push(t, fijo(K.icono(s, X0 + 44, y + alto / 2, f.icono, { escala: f.escala ?? 2, respaldo: f.respaldo ?? '•', color: '#ffd166', size: 20 })));
      y += alto + 8;
    }
    if (pista) {
      const t = fijo(K.txt(s, 480, y + 2, pista, { size: 14, color: K.P.sec, origen: [0.5, 0] }));
      objs.push(t);
      y = t.y + t.height;
    }
    const fondo = fijo(K.panel(s, X0, y0, ANCHO, y - y0 + 18, { alfa: 0.94 }), prof);
    this.panel = [fondo, ...objs];
    s.time.delayedCall(6000, () => this.ocultarInstrucciones());
  }

  ocultarInstrucciones() {
    if (!this.panel) return;
    const panel = this.panel;
    this.panel = null;
    this.scene.tweens.add({ targets: panel, alpha: 0, duration: 250, onComplete: () => panel.forEach((o) => o.destroy()) });
  }
}
