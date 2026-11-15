import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { listaDeAssets, listaDePesados } from './expediente/assets.js';
import { COLOR, texto } from './expediente/interfaz.js';
import { LIMITE_PRECARGA_BYTES, EXTENSIONES_SIN_PRECARGA, FONDO_CARGA } from './expediente/config.js';
import { planDePrecarga, bytesDeDataUri, formatoBytes } from './expediente/precarga.js';
import { prepararIngles } from './expediente/datos_en.js';
import { tr } from '../i18n.js';
import { cargarFuentes } from './comun/fuente.js';
import { cargarArte as cargarArteDelJuego } from '../fisica/aspecto.js';

// Dueño: frente expediente. Pantalla de carga con progreso REAL:
// la barra sigue los eventos del cargador de Phaser para el arte de /assets (ver expediente/assets.js) y el de
// Prueba/Misión con prefijo 'arte:' (fisica/aspecto.js): al pasar al Menú, todo el arte ya está en memoria.
// Los JSON de data/ ya vienen empaquetados por Vite (data.js); aquí solo se cuentan y se reportan.
// Fondo: assets/pantallas/carga_fondo.png de Mauricio (logo + marco vacío de la barra). Se carga primero, en preload(),
// como excepción explícita al límite de la precarga ligera (FONDO_CARGA en config.js). Si falta o falla: fondo liso,
// el nombre en texto y la misma barra.
// Protección: no se precargan GIF/MP4/WebM ni archivos mayores a LIMITE_PRECARGA_BYTES (config.js); lo que se salta
// se registra en la consola y se muestra en el resumen con su tamaño (regla en expediente/precarga.js).
// Lo que falla se reintenta una vez; si vuelve a fallar se avisa y el juego sigue (cada escena tiene respaldo sin arte).
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

  // Antes de dibujar nada: la fuente pixel (2 PNG + 2 XML, pocos KB) y el fondo de la pantalla de carga (11 KB).
  // Si la fuente falla, texto() sigue con monospace (comun/fuente.js); si el fondo falla, fondo liso.
  preload() {
    const aviso = (f) => console.warn(f.key === FONDO_CARGA.clave
      ? `[Boot] fondo de carga no cargado (${f.key}); se usa fondo liso`
      : `[Boot] fuente no cargada: ${f.key}; se usa monospace`);
    this.load.on('loaderror', aviso);
    this.load.once('complete', () => this.load.off('loaderror', aviso));
    cargarFuentes(this);
    const fondo = listaDeAssets().find((a) => a.clave === FONDO_CARGA.clave);
    if (fondo?.url && !this.textures.exists(fondo.clave)) this.load.image(fondo.clave, fondo.url);
  }

  create() {
    prepararIngles(); // agrega <campo>_en a los datos de data/ para trDato() en todas las escenas
    this.errores = [];
    this.saltados = [];
    this.cargados = [];
    this.reintentado = false;

    // La barra va en el hueco del marco del arte (× 3: x 192..768, y 441..453); sin arte, en el mismo lugar con un marco simple.
    const escala = 960 / FONDO_CARGA.ancho;
    const h = FONDO_CARGA.hueco;
    const hueco = { x: h.x * escala, y: h.y * escala, w: h.w * escala, h: h.h * escala };
    if (this.textures.exists(FONDO_CARGA.clave)) {
      const ancho = this.textures.get(FONDO_CARGA.clave).getSourceImage().width;
      this.add.image(480, 270, FONDO_CARGA.clave).setScale(960 / ancho);
    } else {
      texto(this, 480, 150, 'MARSCEPTION', { size: 40, origen: [0.5, 0.5] }); // el logo del arte, en texto
      this.add.rectangle(hueco.x - 3, hueco.y - 3, hueco.w + 6, hueco.h + 6).setOrigin(0, 0).setStrokeStyle(2, COLOR.decoracion);
    }
    const barra = this.add.rectangle(hueco.x, hueco.y, 0, hueco.h, 0xffd166).setOrigin(0, 0);
    // Textos sobre franjas oscuras: el planeta del fondo es claro y la letra debe leerse (DISENO.md: contraste AA).
    this.add.rectangle(480, hueco.y - 24, 360, 36, 0x0b0d17, 0.75);
    const pct = texto(this, 480, hueco.y - 24, tr('Cargando 0 %', 'Loading 0 %'), { size: 22, origen: [0.5, 0.5] });
    const yFranja = hueco.y + hueco.h + 6;
    this.add.rectangle(0, yFranja, 960, 540 - yFranja, 0x0b0d17, 0.75).setOrigin(0, 0);
    this.yAvisos = yFranja + 16;
    this.detalle = texto(this, 480, this.yAvisos, tr('Revisando el arte…', 'Checking the art…'), { size: 16, color: COLOR.tenue, origen: [0.5, 0.5] });
    this.pintar = (p) => { barra.width = hueco.w * p; pct.setText(tr(`Cargando ${Math.round(p * 100)} %`, `Loading ${Math.round(p * 100)} %`)); };
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
      { limiteBytes: LIMITE_PRECARGA_BYTES, extensionesExcluidas: EXTENSIONES_SIN_PRECARGA, siempre: [FONDO_CARGA.clave] });
    this.saltados = saltar;
    for (const a of saltar) {
      console.warn(`[Boot] no se precarga ${a.archivo} (${formatoBytes(a.bytes)}): ${a.motivo === 'formato' ? 'formato pesado' : `mayor que ${formatoBytes(LIMITE_PRECARGA_BYTES)}`}`);
    }

    this.cargados = cargar.filter((a) => !this.textures.exists(a.clave));
    this.load.on('progress', this.pintar);
    this.load.on('fileprogress', (f) => this.detalle.setText(`${tr('Arte', 'Art')}: ${f.key}`));
    this.load.on('loaderror', (f) => this.errores.push(f.key));
    this.load.on('complete', () => this.alTerminarCarga());
    this.pedir(this.cargados);
    cargarArteDelJuego(this); // sprites, suelos y fondos de Prueba/Misión ('arte:'): así no esperan al entrar
    if (!this.load.list.size) { this.pintar(1); this.terminar(); return; } // nada que cargar: el progreso real es 100 %
    this.load.start();
  }

  pedir(lista) {
    for (const a of lista) {
      if (a.tipo === 'spritesheet') this.load.spritesheet(a.clave, a.url, { frameWidth: a.ancho, frameHeight: a.alto });
      else this.load.image(a.clave, a.url);
    }
  }

  alTerminarCarga() {
    // Un reintento de lo que falló (p. ej. un tropiezo de red); lo ya cargado no se vuelve a pedir.
    if (this.errores.length && !this.reintentado) {
      this.reintentado = true;
      const fallidos = new Set(this.errores);
      console.warn(`[Boot] reintentando: ${[...fallidos].join(', ')}`);
      this.errores = [];
      this.pedir(this.cargados.filter((a) => fallidos.has(a.clave)));
      cargarArteDelJuego(this); // solo vuelve a pedir lo 'arte:' que aún no existe
      if (this.load.list.size) { this.load.start(); return; }
    }
    this.pintar(1);
    this.terminar();
  }

  terminar() {
    if (this.terminado) return;
    this.terminado = true;
    const destinos = Object.keys(DESTINOS).length;
    const conTamano = this.cargados.filter((a) => typeof a.bytes === 'number');
    const peso = conTamano.reduce((s, a) => s + a.bytes, 0);
    const desconocidos = this.cargados.length - conTamano.length;
    this.detalle.setText(tr(`Datos: ${SITIOS.length} sitios · ${destinos} destinos · ${this.cargados.length} archivos de arte`,
      `Data: ${SITIOS.length} sites · ${destinos} destinations · ${this.cargados.length} art files`)
      + ` (${formatoBytes(peso)}${desconocidos ? ` + ${desconocidos} ${tr('sin tamaño', 'unsized')}` : ''})`);
    // Avisos debajo de la barra, en la franja oscura: no tapan el logo ni la barra.
    let y = this.yAvisos + 22;
    const aviso = (t, color) => { texto(this, 480, y, t, { size: 14, color, origen: [0.5, 0.5], ancho: 900, alinear: 'center' }); y += 20; };
    if (this.saltados.length) {
      const lista = this.saltados.slice(0, 3).map((a) => `${a.archivo} (${formatoBytes(a.bytes)})`).join(' · ');
      aviso(`${tr('No se precargó', 'Not preloaded')}: ${lista}${this.saltados.length > 3 ? ` ${tr('y', 'and')} ${this.saltados.length - 3} ${tr('más', 'more')}` : ''}`, COLOR.acento);
    }
    if (this.errores.length) {
      aviso(`${tr('No se pudo cargar', 'Could not load')}: ${this.errores.slice(0, 4).join(', ')}${this.errores.length > 4 ? '…' : ''}`, COLOR.alerta);
    }
    if (!SITIOS.length || !destinos) {
      aviso(tr('Faltan datos en data/sites o data/targets: el Expediente mostrará "sin dato".', 'Missing data in data/sites or data/targets: the Site File will show "no data".'), COLOR.alerta);
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
