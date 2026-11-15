// Recreación visual: sin cuerpos Matter, colisiones, daño, sonido ni eventos de telemetría.
export function tipoAmbiente(mundo, sitio) {
  if (mundo === 'marte') return 'polvo';
  if (mundo === 'luna') return 'roca_espacial';
  if (mundo === 'tierra' && ['samalayuca', 'pinacate'].includes(sitio)) return 'aves';
  return null;
}

export class Ambiente {
  constructor(scene, { mundo, sitioId, movimientoReducido = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false }) {
    this.tipo = tipoAmbiente(mundo, sitioId);
    this.t = 0;
    this.reducido = movimientoReducido;
    // Delante de los fondos de arte, detrás del terreno y del HUD. Coordenadas de pantalla.
    this.g = scene.add.graphics().setDepth(-5).setScrollFactor(0);
    this.actualizar(0);
  }

  actualizar(delta) {
    if (!this.g) return;
    if (!this.reducido) this.t += Math.max(0, Math.min(delta, 100)) / 1000;
    const g = this.g;
    g.clear();
    if (this.tipo === 'aves') {
      // Siluetas lejanas de aves planeadoras solo en los sitios terrestres áridos conocidos.
      g.lineStyle(2, 0x242f3a, 0.65);
      for (let i = 0; i < 3; i++) {
        const x = ((this.t * 13 + i * 81 + 250) % 1100) - 70;
        const y = 144 + i * 17 + Math.sin(this.t * 0.6 + i) * 7;
        const ala = 3 + Math.sin(this.t * 1.5 + i) * 2;
        g.beginPath();
        g.moveTo(x - 11, y - ala); g.lineTo(x - 5, y - 3); g.lineTo(x, y);
        g.lineTo(x + 5, y - 3); g.lineTo(x + 11, y - ala); g.strokePath();
      }
    } else if (this.tipo === 'polvo') {
      // Polvo distante marciano: no es clima medido ni altera el agarre.
      g.lineStyle(2, 0xe7bf99, 0.25);
      for (let i = 0; i < 4; i++) {
        const x = ((this.t * 9 + i * 250) % 1160) - 120;
        const y = 242 + i * 9;
        g.lineBetween(x, y, x + 85, y - 3);
        g.lineBetween(x + 20, y + 5, x + 58, y + 3);
      }
    } else if (this.tipo === 'roca_espacial') {
      // Roca distante, SIN cola de fuego atmosférica en la Luna. Aparición breve cada 24 s.
      const fase = (this.t + 3) % 24;
      if (fase < 6) {
        const x = 100 + fase * 130;
        const y = 132 + fase * 7;
        g.fillStyle(0x969797, 0.6);
        g.fillPoints([{ x: x - 3, y }, { x, y: y - 3 }, { x: x + 4, y }, { x: x + 1, y: y + 3 }], true);
      }
    }
  }

  destruir() {
    this.g?.destroy();
    this.g = null;
  }
}
