// HUD provisional de la prueba y la misión (se reemplaza con la UI de arte). Fijo a la cámara.
const ESTILO = { fontFamily: 'monospace', fontSize: '13px', color: '#cfd6ff' };

export class Hud {
  constructor(scene, { titulo, subtitulo, aviso }) {
    this.scene = scene;
    const fijo = (o) => o.setScrollFactor(0).setDepth(90);
    fijo(scene.add.rectangle(0, 0, 960, 88, 0x0b0d17, 0.78).setOrigin(0));
    fijo(scene.add.text(16, 10, titulo, { ...ESTILO, fontSize: '18px', color: '#ffffff' }));
    fijo(scene.add.text(16, 34, subtitulo, ESTILO));
    // La nota de datos puede ser larga (fuente, tramo real, recreaciones): se ajusta a la columna izquierda.
    if (aviso) fijo(scene.add.text(16, 54, aviso, { ...ESTILO, fontSize: '10px', color: '#ffd166', wordWrap: { width: 530 }, maxLines: 3 }));

    this.barras = {};
    [['energia', 'Energía', 0x4cc38a], ['integridad', 'Carga', 0xffd166], ['chasis', 'Chasis', 0x9aa4c7]].forEach(([clave, etiqueta, color], i) => {
      const x = 560;
      const y = 12 + i * 18;
      fijo(scene.add.text(x, y - 1, etiqueta, ESTILO));
      fijo(scene.add.rectangle(x + 70, y + 7, 160, 10, 0x2b2d3a).setOrigin(0, 0.5));
      this.barras[clave] = fijo(scene.add.rectangle(x + 70, y + 7, 160, 10, color).setOrigin(0, 0.5));
    });
    this.lectura = fijo(scene.add.text(944, 12, '', { ...ESTILO, align: 'right' }).setOrigin(1, 0));
    this.mensaje = fijo(scene.add.text(480, 200, '', { ...ESTILO, fontSize: '26px', color: '#ffffff', align: 'center' }).setOrigin(0.5));
  }

  actualizar(estado, { distancia_m, meta_m }) {
    for (const [clave, barra] of Object.entries(this.barras)) barra.width = 160 * Math.max(0, Math.min(1, estado[clave]));
    this.lectura.setText(
      `${estado.velocidadMs.toFixed(1)} m/s · ${Math.floor(distancia_m)}/${Math.floor(meta_m)} m\n${estado.superficie ?? ''}${estado.patina ? ' · PATINA' : ''}`,
    );
  }

  mostrar(texto) {
    this.mensaje.setText(texto);
  }
}
