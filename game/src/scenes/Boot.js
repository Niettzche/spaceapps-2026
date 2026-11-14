import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { listaDeAssets } from './expediente/assets.js';
import { COLOR, texto } from './expediente/interfaz.js';

// Dueño: frente expediente. Pantalla de carga con progreso REAL:
// la barra sigue los eventos del cargador de Phaser para el arte de /assets (ver expediente/assets.js).
// Los JSON de data/ ya vienen empaquetados por Vite (data.js); aquí solo se cuentan y se reportan.
export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.errores = [];
    this.assets = listaDeAssets().filter((a) => a.url);
    texto(this, 480, 200, 'MARSCEPTION', { size: 28, origen: [0.5, 0.5] });
    this.add.rectangle(180, 270, 600, 16).setOrigin(0, 0.5).setStrokeStyle(1, COLOR.borde);
    const barra = this.add.rectangle(180, 270, 0, 16, 0xffd166).setOrigin(0, 0.5);
    const pct = texto(this, 480, 240, 'Cargando 0 %', { size: 16, origen: [0.5, 0.5] });
    this.detalle = texto(this, 480, 300, '', { size: 12, color: COLOR.tenue, origen: [0.5, 0.5] });

    const pintar = (p) => { barra.width = 600 * p; pct.setText(`Cargando ${Math.round(p * 100)} %`); };
    this.load.on('progress', pintar);
    this.load.on('fileprogress', (f) => this.detalle.setText(`Arte: ${f.key}`));
    this.load.on('loaderror', (f) => this.errores.push(f.key));
    this.load.on('complete', () => pintar(1));

    for (const a of this.assets) {
      if (this.textures.exists(a.clave)) continue;
      if (a.tipo === 'spritesheet') this.load.spritesheet(a.clave, a.url, { frameWidth: a.ancho, frameHeight: a.alto });
      else this.load.image(a.clave, a.url);
    }
    if (!this.assets.length) pintar(1); // sin arte que cargar: el progreso real es 100 %
  }

  create() {
    const destinos = Object.keys(DESTINOS).length;
    this.detalle.setText(`Datos: ${SITIOS.length} sitios · ${destinos} destinos · ${this.assets.length} archivos de arte`);
    if (this.errores.length) {
      texto(this, 480, 330, `No se pudo cargar: ${this.errores.slice(0, 4).join(', ')}${this.errores.length > 4 ? '…' : ''}`,
        { size: 12, color: COLOR.alerta, origen: [0.5, 0.5], ancho: 860, alinear: 'center' });
    }
    if (!SITIOS.length || !destinos) {
      texto(this, 480, 350, 'Faltan datos en data/sites o data/targets: el Expediente mostrará "sin dato".',
        { size: 12, color: COLOR.alerta, origen: [0.5, 0.5] });
    }
    this.time.delayedCall(this.errores.length ? 1800 : 450, () => irA(this, 'Menu'));
  }
}
