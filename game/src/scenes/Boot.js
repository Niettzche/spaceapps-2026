import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, TODOS_LOS_SITIOS, DESTINOS } from '../data.js';
import { listaDeAssets, listaDePesados } from './expediente/assets.js';
import { texto } from './expediente/interfaz.js';
import { PALETA } from './expediente/paleta.js';
import { LIMITE_PRECARGA_BYTES, EXTENSIONES_SIN_PRECARGA, DETECTOR_VALIDACION } from './expediente/config.js';
import { planDePrecarga, bytesDeDataUri, formatoBytes, medirConLimite } from './expediente/precarga.js';
import { datosCuriosos, datoEnTurno } from './expediente/datos_curiosos.js';
import { prepararIngles } from './expediente/datos_en.js';
import { cargarArte as cargarArteDelJuego } from '../fisica/aspecto.js';
import { GRAVEDAD } from '../config/world.js';
import { ambienteDeDestino } from '../fisica/ambiente.js';
import { tr } from '../i18n.js';

// Dueño: frente expediente. Pantalla de carga con progreso REAL (docs/juego/DISENO.md: logo, barra grande, una línea de dato).
// - La portada (assets/titulo/titulo.png) se carga primero (preload) y queda de fondo; sin ella, el nombre en texto.
// - La barra sigue los eventos del cargador de Phaser para TODO el arte antes del Menú: el de /assets con su clave de ruta
//   (íconos del HUD, Taller, fondos del menú…) y el de Prueba/Misión con prefijo 'arte:' (fisica/aspecto.js).
// - Protección: no se precargan GIF/MP4/WebM ni archivos mayores a LIMITE_PRECARGA_BYTES (regla en expediente/precarga.js).
//   Medir tamaños está acotado (6 a la vez, 2.5 s en total): lo que no se alcanza a medir se carga.
// - Lo que falla se reintenta una vez; si sigue fallando, se avisa en el resumen.
const LOGO = 'titulo/titulo';
const PERIODO_DATO_MS = 4000;
const hex = (c) => Number.parseInt(c.slice(1), 16);

// Tamaño de un archivo sin descargarlo (HEAD → Content-Length); null si no se puede saber.
async function medirBytes(url, esperaMs) {
  if (!url) return null;
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), esperaMs);
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

  preload() {
    // Solo la portada (≈ 12 KB): así la pantalla de carga ya tiene logo desde el primer cuadro.
    const logo = listaDeAssets().find((a) => a.clave === LOGO);
    if (logo?.url && !this.textures.exists(LOGO)) this.load.image(LOGO, logo.url);
  }

  create() {
    prepararIngles(); // agrega <campo>_en a los datos de data/ para trDato() en todas las escenas
    this.errores = [];
    this.saltados = [];
    this.cargados = [];
    this.reintentado = false;

    if (this.textures.exists(LOGO)) {
      this.add.image(480, 270, LOGO).setScale(3);
    } else {
      texto(this, 480, 170, 'MARSCEPTION', { size: 40, origen: [0.5, 0.5], estilo: 'bold' });
    }
    // Franja oscura abajo: porcentaje, barra grande y una línea de dato curioso.
    this.franja = this.add.rectangle(0, 410, 960, 130, hex(PALETA.fondo), 0.86).setOrigin(0, 0);
    const pct = texto(this, 480, 428, tr('Cargando 0 %', 'Loading 0 %'), { size: 20, origen: [0.5, 0.5], estilo: 'bold' });
    const pista = this.add.rectangle(120, 457, 720, 22, hex(PALETA.borde)).setOrigin(0, 0.5);
    const barra = this.add.rectangle(120, 457, 0, 22, hex(PALETA.accion)).setOrigin(0, 0.5);
    this.dato = texto(this, 480, 492, '', { size: 16, color: PALETA.dato, origen: [0.5, 0.5], ancho: 880, alinear: 'center' });
    this.detalle = texto(this, 480, 524, tr('Revisando el arte…', 'Checking the art…'), { size: 14, color: PALETA.secundario, origen: [0.5, 0.5] });
    this.carga = [pct, pista, barra];
    this.pintar = (p) => { barra.width = 720 * p; pct.setText(tr(`Cargando ${Math.round(p * 100)} %`, `Loading ${Math.round(p * 100)} %`)); };

    this.datos = datosCuriosos({
      gravedad: GRAVEDAD,
      presionJezeroKPa: ambienteDeDestino('jezero', 'marte')?.presion_kPa,
      sombraLunaC: ambienteDeDestino('polo_sur_lunar', 'luna')?.temperatura_sombra_C,
      detector: DETECTOR_VALIDACION,
      sitios: TODOS_LOS_SITIOS.length,
    });
    const mostrarDato = () => {
      const i = datoEnTurno(this.datos, this.time.now, PERIODO_DATO_MS);
      if (i >= 0) this.dato.setText(tr(this.datos[i].es, this.datos[i].en));
    };
    mostrarDato();
    this.time.addEvent({ delay: PERIODO_DATO_MS, loop: true, callback: mostrarDato });
    this.cargarArte();
  }

  // 1) mide lo que no viene incrustado en el JS (acotado), 2) decide qué se salta, 3) carga el resto con la barra real.
  async cargarArte() {
    const lista = listaDeAssets().filter((a) => a.url).map((a) => ({ ...a, bytes: bytesDeDataUri(a.url) }));
    const pesados = listaDePesados();
    await Promise.all(pesados.map(async (a) => { a.url = await a.cargarUrl().catch(() => null); }));
    await medirConLimite([...lista.filter((a) => a.bytes === null), ...pesados.filter((a) => a.url)],
      (a, espera) => medirBytes(a.url, espera));
    if (!this.sys.isActive()) return;

    const { cargar, saltar } = planDePrecarga([...lista, ...pesados],
      { limiteBytes: LIMITE_PRECARGA_BYTES, extensionesExcluidas: EXTENSIONES_SIN_PRECARGA });
    this.saltados = saltar;
    for (const a of saltar) {
      console.warn(`[Boot] no se precarga ${a.archivo} (${formatoBytes(a.bytes)}): ${a.motivo === 'formato' ? 'formato pesado' : `mayor que ${formatoBytes(LIMITE_PRECARGA_BYTES)}`}`);
    }
    this.cargados = cargar;

    this.load.on('progress', this.pintar);
    this.load.on('fileprogress', (f) => this.detalle.setText(`${tr('Arte', 'Art')}: ${f.key}`));
    this.load.on('loaderror', (f) => this.errores.push(f.key));
    this.load.on('complete', () => this.alCompletar());
    if (!this.encolar()) { this.pintar(1); this.terminar(); return; } // nada que cargar: el progreso real es 100 %
    this.load.start();
  }

  // Encola lo que aún no está en memoria (las dos listas se saltan lo ya cargado). Devuelve cuántos archivos quedaron.
  encolar() {
    for (const a of this.cargados) {
      if (this.textures.exists(a.clave)) continue;
      if (a.tipo === 'spritesheet') this.load.spritesheet(a.clave, a.url, { frameWidth: a.ancho, frameHeight: a.alto });
      else this.load.image(a.clave, a.url);
    }
    cargarArteDelJuego(this); // sprites, terreno, fondos y obstáculos de Prueba/Misión ('arte:…')
    return this.load.list.size;
  }

  alCompletar() {
    if (this.errores.length && !this.reintentado) {
      // Un reintento de lo que falló (p. ej. un tropiezo de red); lo ya cargado no se vuelve a pedir.
      this.reintentado = true;
      console.warn(`[Boot] reintentando: ${this.errores.join(', ')}`);
      this.errores = [];
      if (this.encolar()) { this.load.start(); return; }
    }
    this.pintar(1);
    this.terminar();
  }

  terminar() {
    const destinos = Object.keys(DESTINOS).length;
    const conTamano = this.cargados.filter((a) => typeof a.bytes === 'number');
    const peso = conTamano.reduce((s, a) => s + a.bytes, 0);
    const desconocidos = this.cargados.length - conTamano.length;
    this.detalle.setText(tr(`Datos: ${SITIOS.length} sitios · ${destinos} destinos · ${this.cargados.length} archivos de arte`,
      `Data: ${SITIOS.length} sites · ${destinos} destinations · ${this.cargados.length} art files`)
      + ` (${formatoBytes(peso)}${desconocidos ? ` + ${desconocidos} ${tr('sin tamaño', 'unsized')}` : ''})`);
    const avisos = [];
    if (this.saltados.length) {
      const lista = this.saltados.slice(0, 3).map((a) => `${a.archivo} (${formatoBytes(a.bytes)})`).join(' · ');
      avisos.push([`${tr('No se precargó', 'Not preloaded')}: ${lista}${this.saltados.length > 3 ? ` ${tr('y', 'and')} ${this.saltados.length - 3} ${tr('más', 'more')}` : ''}`, PALETA.accion]);
    }
    if (this.errores.length) {
      avisos.push([`${tr('No se pudo cargar', 'Could not load')}: ${this.errores.slice(0, 4).join(', ')}${this.errores.length > 4 ? '…' : ''}`, PALETA.riesgo]);
    }
    if (!SITIOS.length || !destinos) {
      avisos.push([tr('Faltan datos en data/sites o data/targets: el Expediente mostrará "sin dato".', 'Missing data in data/sites or data/targets: the Site File will show "no data".'), PALETA.riesgo]);
    }
    if (avisos.length) {
      // Los avisos van en un panel arriba de la franja, para no tapar la barra ni el dato.
      const alto = 16 + avisos.length * 40;
      this.add.rectangle(40, 402 - alto, 880, alto, hex(PALETA.panel), 0.95).setOrigin(0, 0).setStrokeStyle(1, hex(PALETA.borde));
      avisos.forEach(([t, color], i) => texto(this, 480, 402 - alto + 28 + i * 40, t, { size: 14, color, origen: [0.5, 0.5], ancho: 860, alinear: 'center' }));
    }
    // Si hubo algo que avisar, el resumen queda visible un momento antes de la portada o el Menú.
    const pausa = avisos.length ? 1800 : 0;
    this.time.delayedCall(pausa, () => this.portada());
  }

  portada() {
    const ir = () => { if (this.saliendo) return; this.saliendo = true; irA(this, 'Menu'); };
    // Portada de arte: la barra deja su lugar al aviso; 3.5 s o hasta que el jugador toque o presione una tecla.
    if (this.textures.exists(LOGO) && !this.errores.length) {
      this.carga.forEach((o) => o.destroy());
      const aviso = texto(this, 480, 448, tr('Presiona una tecla o toca para empezar', 'Press any key or tap to start'),
        { size: 20, color: PALETA.accion, origen: [0.5, 0.5], estilo: 'bold' });
      this.tweens.add({ targets: aviso, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
      this.input.keyboard.once('keydown', ir);
      this.input.once('pointerdown', ir);
      this.time.delayedCall(3500, ir);
    } else {
      this.time.delayedCall(this.errores.length ? 0 : 450, ir);
    }
  }
}
