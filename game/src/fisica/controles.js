// Controles: acelerar / frenar con teclado (→ ←, D A) y con dos botones táctiles. Ver ESPECIFICACION.md §4.
import Phaser from 'phaser';

export class Controles {
  constructor(scene) {
    this.scene = scene;
    this.forzado = null; // para pruebas automáticas: -1, 0 o 1
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.teclas = scene.input.keyboard.addKeys({ der: K.RIGHT, izq: K.LEFT, d: K.D, a: K.A });
    this.tactil = { izq: false, der: false };
    scene.input.addPointer(2); // dos dedos a la vez

    const boton = (x, lado, etiqueta) => {
      // Zona táctil grande (120 × 90) aunque el dibujo sea más chico.
      const zona = scene.add.rectangle(x, 470, 120, 90, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.25)
        .setScrollFactor(0).setDepth(100).setInteractive();
      const arte = `ui/ui_boton_${lado}`;
      let img = null;
      if (scene.textures.exists(arte)) {
        zona.setFillStyle(0xffffff, 0).setStrokeStyle(0);
        img = scene.add.image(x, 470, arte).setScale(3).setAlpha(0.85).setScrollFactor(0).setDepth(101);
      } else {
        scene.add.text(x, 470, etiqueta, { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff' })
          .setOrigin(0.5).setAlpha(0.6).setScrollFactor(0).setDepth(101);
      }
      const presionado = scene.textures.exists(`${arte}_presionado`) ? `${arte}_presionado` : arte;
      const soltar = () => { this.tactil[lado] = false; if (img) img.setTexture(arte); else zona.setFillStyle(0xffffff, 0.08); };
      zona.on('pointerdown', () => { this.tactil[lado] = true; if (img) img.setTexture(presionado); else zona.setFillStyle(0xffffff, 0.22); });
      zona.on('pointerup', soltar);
      zona.on('pointerout', soltar);
    };
    boton(80, 'izq', '◀');
    boton(880, 'der', '▶');
  }

  /** -1 frenar o reversa · 0 nada · 1 acelerar */
  acelerador() {
    if (this.forzado !== null) return this.forzado;
    const der = this.teclas.der.isDown || this.teclas.d.isDown || this.tactil.der;
    const izq = this.teclas.izq.isDown || this.teclas.a.isDown || this.tactil.izq;
    return (der ? 1 : 0) - (izq ? 1 : 0);
  }
}
