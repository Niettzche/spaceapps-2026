// HUD de la prueba y la misión, fijo a la cámara. Usa la UI de arte (assets/ui) si existe; si no, figuras.
import { tr } from '../i18n.js';
import { nombreSuperficie } from './suelos.js';
import { REGLAS } from './ambiente.js';

const ESTILO = { fontFamily: 'monospace', fontSize: '14px', color: '#cfd6ff' };
const ANCHO_IZQ = 530;

/** Reduce el tamaño de letra hasta que el texto quepa en `ancho` (sin bajar de `min` px). */
function encoger(t, ancho, min) {
  let px = parseInt(t.style.fontSize, 10);
  while (t.width > ancho && px > min) t.setFontSize(`${--px}px`);
  return t;
}

export class Hud {
  constructor(scene, { titulo, subtitulo, aviso }) {
    this.scene = scene;
    const fijo = (o) => o.setScrollFactor(0).setDepth(90);
    fijo(scene.add.rectangle(0, 0, 960, 88, 0x0b0d17, 0.78).setOrigin(0));
    // Columna izquierda hasta x = 545: las barras empiezan en x = 560 (nombres de destino largos las tapaban).
    fijo(encoger(scene.add.text(16, 10, titulo, { ...ESTILO, fontSize: '18px', color: '#ffffff' }), ANCHO_IZQ, 13));
    fijo(encoger(scene.add.text(16, 34, subtitulo, ESTILO), ANCHO_IZQ, 10));
    // La nota de datos puede ser larga (fuente, tramo real, recreaciones): se ajusta a la columna izquierda.
    // maxLines corta en silencio a media frase: si no cabe, la tercera línea termina en "…" para que se note el recorte.
    // Nota de datos: en el HUD solo una línea (para no distraer al manejar); el texto completo se abre con la tecla I.
    if (aviso) {
      const t = fijo(scene.add.text(16, 56, '', { ...ESTILO, fontSize: '11px', color: '#ffd166' }));
      const pie = tr(' · [I] datos', ' · [I] data');
      let corto = aviso;
      t.setText(corto + pie);
      while (t.width > ANCHO_IZQ && corto.length > 10) { corto = corto.slice(0, -2); t.setText(`${corto.trimEnd()}…${pie}`); }
      this._panelDatos(aviso);
      scene.input.keyboard.on('keydown-I', () => this.alternarDatos());
      t.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.alternarDatos());
    }

    this.barras = {};
    const hay = (k) => scene.textures.exists(k);
    [['energia', tr('Energía', 'Energy'), 0x4cc38a, 'ui/ui_icono_energia'], ['integridad', tr('Carga', 'Payload'), 0xffd166, 'ui/ui_icono_carga'],
      ['chasis', tr('Chasis', 'Chassis'), 0x9aa4c7, 'ui/ui_icono_chasis']].forEach(([clave, etiqueta, color, icono], i) => {
      const x = 560;
      const y = 12 + i * 18;
      // Ícono de arte (8 × 8 × 2) si existe; si no, el nombre.
      if (hay(icono)) fijo(scene.add.image(x + 8, y + 7, icono).setScale(2));
      fijo(scene.add.text(x + (hay(icono) ? 22 : 0), y - 1, etiqueta, ESTILO));
      if (hay('ui/ui_marco_barra')) fijo(scene.add.nineslice(x + 82, y + 7, 'ui/ui_marco_barra', undefined, 76, 7, 2, 2, 2, 2).setOrigin(0, 0.5).setScale(2));
      else fijo(scene.add.rectangle(x + 70, y + 7, 160, 10, 0x2b2d3a).setOrigin(0, 0.5));
      this.barras[clave] = fijo(scene.add.rectangle(x + 86, y + 7, 144, 8, color).setOrigin(0, 0.5));
    });

    // Temperatura del motor (ambiente.js, regla b): barra fina bajo las otras; se pone roja cerca del límite.
    const iconoT = hay('ui/ui_icono_temperatura'); // arte 8 × 8 (mismo estilo que los otros íconos); si no, solo texto
    if (iconoT) fijo(scene.add.image(560 + 8, 70, 'ui/ui_icono_temperatura').setScale(2));
    fijo(scene.add.text(560 + (iconoT ? 22 : 0), 64, tr('Motor', 'Motor'), { ...ESTILO, fontSize: '11px' }));
    fijo(scene.add.rectangle(560 + 70, 70, 160, 5, 0x2b2d3a).setOrigin(0, 0.5));
    this.barraMotor = fijo(scene.add.rectangle(560 + 72, 70, 0, 3, 0x6fb3ff).setOrigin(0, 0.5));
    this.textoMotor = fijo(scene.add.text(560 + 236, 64, '', { ...ESTILO, fontSize: '11px' }));

    // Progreso hacia la meta o la zona de entrega (franja bajo el encabezado).
    fijo(scene.add.rectangle(16, 92, 928, 4, 0x2b2d3a).setOrigin(0, 0.5));
    this.progreso = fijo(scene.add.rectangle(16, 92, 0, 4, 0x4cc38a).setOrigin(0, 0.5));
    fijo(scene.add.text(944, 98, '⚑', { ...ESTILO, fontSize: '12px', color: '#ffffff' }).setOrigin(1, 0));
    this.lectura = fijo(scene.add.text(944, 12, '', { ...ESTILO, align: 'right' }).setOrigin(1, 0));
    // Mensaje final grande y con contorno para que se lea sobre cualquier fondo (retro: textos más grandes).
    this.mensaje = fijo(scene.add.text(480, 200, '', { ...ESTILO, fontSize: '44px', fontStyle: 'bold', color: '#ffffff', align: 'center', stroke: '#0b0d17', strokeThickness: 8 }).setOrigin(0.5));
  }

  actualizar(estado, { distancia_m, meta_m }) {
    for (const [clave, barra] of Object.entries(this.barras)) barra.width = 144 * Math.max(0, Math.min(1, estado[clave]));
    this.progreso.width = 928 * Math.max(0, Math.min(1, distancia_m / Math.max(1, meta_m)));
    if (estado.tMotor != null) {
      const lim = REGLAS.motor.limite_C;
      const f = Math.max(0, Math.min(1, (estado.tMotor + 60) / (lim + 60))); // escala visual de −60 °C al límite
      this.barraMotor.width = 156 * f;
      this.barraMotor.fillColor = estado.sobrecalentado ? 0xff6b6b : estado.tMotor >= lim - REGLAS.motor.aviso_C ? 0xffb347 : 0x6fb3ff;
      this.textoMotor.setText(`${Math.round(estado.tMotor)} °C${estado.sobrecalentado ? tr(' · CALIENTE', ' · HOT') : ''}`)
        .setColor(estado.sobrecalentado ? '#ff9b9b' : '#cfd6ff');
    }
    this.lectura.setText(
      `${estado.velocidadMs.toFixed(1)} m/s · ${Math.floor(distancia_m)}/${Math.floor(meta_m)} m\n${nombreSuperficie(estado.superficie) ?? ''}${estado.patina ? tr(' · PATINA', ' · SLIPPING') : ''}`,
    );
  }

  /** Panel con la nota de datos completa (fuentes, tramo real, recreaciones). Se abre y cierra con I o tocando la nota. */
  _panelDatos(aviso) {
    const s = this.scene;
    const fijo = (o) => o.setScrollFactor(0).setDepth(98).setVisible(false);
    const t = fijo(s.add.text(480, 270, tr(`Datos de este nivel\n\n${aviso}\n\n[I] cerrar`, `Data for this level\n\n${aviso}\n\n[I] close`), {
      ...ESTILO, fontSize: '13px', color: '#ffffff', align: 'left', wordWrap: { width: 760 }, lineSpacing: 4,
    }).setOrigin(0.5));
    const fondo = fijo(s.add.rectangle(480, 270, 800, t.height + 32, 0x0b0d17, 0.92).setStrokeStyle(2, 0xffd166, 0.7));
    t.setDepth(99);
    this.datos = [fondo, t];
  }

  alternarDatos() {
    if (!this.datos) return;
    const ver = !this.datos[0].visible;
    this.datos.forEach((o) => o.setVisible(ver));
  }

  /** Overlay de pausa. Devuelve los objetos para destruirlos al reanudar. */
  pausa(alContinuar, alAbandonar) {
    const s = this.scene;
    const fijo = (o) => o.setScrollFactor(0).setDepth(110);
    const fondo = fijo(s.add.rectangle(480, 270, 960, 540, 0x0b0d17, 0.7));
    const titulo = fijo(s.add.text(480, 210, tr('Pausa', 'Paused'), { ...ESTILO, fontSize: '30px', color: '#ffffff' }).setOrigin(0.5));
    const boton = (y, texto, color, fn) => fijo(s.add.text(480, y, texto, { ...ESTILO, fontSize: '18px', color })
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', fn));
    const seguir = boton(275, tr('[ Continuar · Esc / Enter ]', '[ Resume · Esc / Enter ]'), '#4cc38a', alContinuar);
    const salir = boton(320, tr('[ Abandonar · X ]', '[ Quit · X ]'), '#ff9b9b', alAbandonar);
    return [fondo, titulo, seguir, salir];
  }

  mostrar(texto) {
    this.mensaje.setText(texto);
  }

  /** Panel de instrucciones al empezar (objetivo y controles). Se quita con ocultarInstrucciones() o solo a los 6 s. */
  instrucciones(titulo, lineas) {
    const s = this.scene;
    const fijo = (o) => o.setScrollFactor(0).setDepth(96);
    const texto = fijo(s.add.text(480, 175, [titulo, '', ...lineas].join('\n'), {
      fontFamily: 'monospace', fontSize: '17px', color: '#ffffff', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5));
    const fondo = fijo(s.add.rectangle(480, 175, texto.width + 48, texto.height + 32, 0x0b0d17, 0.85).setStrokeStyle(2, 0xffd166, 0.8));
    texto.setDepth(97);
    this.panel = [fondo, texto];
    s.time.delayedCall(6000, () => this.ocultarInstrucciones());
  }

  ocultarInstrucciones() {
    if (!this.panel) return;
    const panel = this.panel;
    this.panel = null;
    this.scene.tweens.add({ targets: panel, alpha: 0, duration: 250, onComplete: () => panel.forEach((o) => o.destroy()) });
  }
}
