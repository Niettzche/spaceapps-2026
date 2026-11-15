import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { listaDeAssets, listaDePesados } from './expediente/assets.js';
import { COLOR, texto } from './expediente/interfaz.js';
import { LIMITE_PRECARGA_BYTES, EXTENSIONES_SIN_PRECARGA } from './expediente/config.js';
import { planDePrecarga, bytesDeDataUri, formatoBytes } from './expediente/precarga.js';
import { prepararIngles } from './expediente/datos_en.js';
import { tr } from '../i18n.js';
import { cargarFuentes } from './comun/fuente.js';

// Dueño: frente expediente. Pantalla de carga con progreso REAL:
// la barra sigue los eventos del cargador de Phaser para el arte de /assets (ver expediente/assets.js).
// Los JSON de data/ ya vienen empaquetados por Vite (data.js); aquí solo se cuentan y se reportan.
// Protección: no se precargan GIF/MP4/WebM ni archivos mayores a LIMITE_PRECARGA_BYTES (config.js); lo que se salta
// se registra en la consola y se muestra en el resumen con su tamaño (regla en expediente/precarga.js).
const ESPERA_MEDICION_MS = 5000;

// Tamaño de un archivo sin descargarlo (HEAD → Content-Length); null si no se puede saber.
async function medirBytes(url) {
  if (!url) return null;
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), ESPERA_MEDICION_MS);
  try {
    const r = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    const n = Number(r.headers.get('content-length'));
    return r.ok && Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  } finally {
    clearTimeout(reloj);
  }
}

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  // La fuente pixel (2 PNG + 2 XML, pocos KB) se carga antes de dibujar nada: así la pantalla de carga ya la usa.
  // Si falla, texto() sigue con monospace (comun/fuente.js).
  preload() {
    const aviso = (f) => console.warn(`[Boot] fuente no cargada: ${f.key}; se usa monospace`);
    this.load.on('loaderror', aviso);
    this.load.once('complete', () => this.load.off('loaderror', aviso));
    cargarFuentes(this);
  }

  create() {
    prepararIngles(); // agrega <campo>_en a los datos de data/ para trDato() en todas las escenas
    this.errores = [];
    this.saltados = [];
    this.cargados = [];
    texto(this, 480, 200, 'MARSCEPTION', { size: 28, origen: [0.5, 0.5] });
    this.add.rectangle(180, 270, 600, 16).setOrigin(0, 0.5).setStrokeStyle(1, COLOR.borde);
    const barra = this.add.rectangle(180, 270, 0, 16, 0xffd166).setOrigin(0, 0.5);
    const pct = texto(this, 480, 240, tr('Cargando 0 %', 'Loading 0 %'), { size: 16, origen: [0.5, 0.5] });
    this.detalle = texto(this, 480, 300, tr('Revisando el arte…', 'Checking the art…'), { size: 14, color: COLOR.tenue, origen: [0.5, 0.5] });
    this.pintar = (p) => { barra.width = 600 * p; pct.setText(tr(`Cargando ${Math.round(p * 100)} %`, `Loading ${Math.round(p * 100)} %`)); };
    this.cargarArte();
  }

  // 1) mide lo que no viene incrustado en el JS, 2) decide qué se salta, 3) carga el resto con la barra real.
  async cargarArte() {
    const lista = listaDeAssets().filter((a) => a.url).map((a) => ({ ...a, bytes: bytesDeDataUri(a.url) }));
    const pesados = listaDePesados();
    await Promise.all([
      ...lista.filter((a) => a.bytes === null).map(async (a) => { a.bytes = await medirBytes(a.url); }),
      ...pesados.map(async (a) => { a.url = await a.cargarUrl().catch(() => null); a.bytes = await medirBytes(a.url); }),
    ]);
    if (!this.sys.isActive()) return;

    const { cargar, saltar } = planDePrecarga([...lista, ...pesados],
      { limiteBytes: LIMITE_PRECARGA_BYTES, extensionesExcluidas: EXTENSIONES_SIN_PRECARGA });
    this.saltados = saltar;
    for (const a of saltar) {
      console.warn(`[Boot] no se precarga ${a.archivo} (${formatoBytes(a.bytes)}): ${a.motivo === 'formato' ? 'formato pesado' : `mayor que ${formatoBytes(LIMITE_PRECARGA_BYTES)}`}`);
    }

    this.cargados = cargar.filter((a) => !this.textures.exists(a.clave));
    if (!this.cargados.length) { this.pintar(1); this.terminar(); return; } // nada que cargar: el progreso real es 100 %

    this.load.on('progress', this.pintar);
    this.load.on('fileprogress', (f) => this.detalle.setText(`${tr('Arte', 'Art')}: ${f.key}`));
    this.load.on('loaderror', (f) => this.errores.push(f.key));
    this.load.once('complete', () => { this.pintar(1); this.terminar(); });
    for (const a of this.cargados) {
      if (a.tipo === 'spritesheet') this.load.spritesheet(a.clave, a.url, { frameWidth: a.ancho, frameHeight: a.alto });
      else this.load.image(a.clave, a.url);
    }
    this.load.start();
  }

  terminar() {
    const destinos = Object.keys(DESTINOS).length;
    const conTamano = this.cargados.filter((a) => typeof a.bytes === 'number');
    const peso = conTamano.reduce((s, a) => s + a.bytes, 0);
    const desconocidos = this.cargados.length - conTamano.length;
    this.detalle.setText(tr(`Datos: ${SITIOS.length} sitios · ${destinos} destinos · ${this.cargados.length} archivos de arte`,
      `Data: ${SITIOS.length} sites · ${destinos} destinations · ${this.cargados.length} art files`)
      + ` (${formatoBytes(peso)}${desconocidos ? ` + ${desconocidos} ${tr('sin tamaño', 'unsized')}` : ''})`);
    if (this.saltados.length) {
      const lista = this.saltados.slice(0, 3).map((a) => `${a.archivo} (${formatoBytes(a.bytes)})`).join(' · ');
      texto(this, 480, 330, `${tr('No se precargó', 'Not preloaded')}: ${lista}${this.saltados.length > 3 ? ` ${tr('y', 'and')} ${this.saltados.length - 3} ${tr('más', 'more')}` : ''}`,
        { size: 14, color: COLOR.acento, origen: [0.5, 0.5], ancho: 860, alinear: 'center' });
    }
    if (this.errores.length) {
      texto(this, 480, 370, `${tr('No se pudo cargar', 'Could not load')}: ${this.errores.slice(0, 4).join(', ')}${this.errores.length > 4 ? '…' : ''}`,
        { size: 14, color: COLOR.alerta, origen: [0.5, 0.5], ancho: 860, alinear: 'center' });
    }
    if (!SITIOS.length || !destinos) {
      texto(this, 480, 390, tr('Faltan datos en data/sites o data/targets: el Expediente mostrará "sin dato".', 'Missing data in data/sites or data/targets: the Site File will show "no data".'),
        { size: 14, color: COLOR.alerta, origen: [0.5, 0.5] });
    }
    // Si hubo algo que avisar (saltados o errores), el resumen queda visible un momento antes de la pantalla de inicio.
    const pausa = this.errores.length || this.saltados.length ? 1800 : 0;
    this.time.delayedCall(pausa, () => this.portada());
  }

  // La portada ya no vive aquí: el Boot entra directo a la pantalla de inicio del Menú (Marte grande que gira, logo con
  // brillo y «Presiona Enter», vista 'inicio'), que reemplaza a la imagen fija assets/titulo/titulo.png.
  portada() {
    if (this.saliendo) return;
    this.saliendo = true;
    irA(this, 'Menu', { vista: 'inicio' });
  }
}
