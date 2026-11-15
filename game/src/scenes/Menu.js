import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { PRESUPUESTO_INICIAL, TICKETS_POR_PARTIDA, GRAVEDAD } from '../config/world.js';
import { COLOR, texto, boton, panel, Teclado, limpiar, ayudaFija, cajaArte, tituloPlaca } from './expediente/interfaz.js';
import { DESTINO_POR_DEFECTO, ORDEN_DESTINOS } from './expediente/config.js';
import { guardadoDisponible, restaurar, nuevaPartida, guardar, partidaActiva } from './expediente/guardado.js';
import { sitiosParaDestino } from './expediente/logica.js';
import { MUNDOS } from './expediente/textos.js';
import { vistaNumeros } from './expediente/numeros.js';
import { prepararIngles } from './expediente/datos_en.js';
import { tr, trDato, idioma, alternarIdioma } from '../i18n.js';
import { CLAVES_TUTORIAL, marcaTutorial, pasosResumen } from './comun/tutorial.js';
import { abrirResumen } from './comun/tutorial_vista.js';
import { vistaComoJugar, reiniciarPaginaComoJugar } from './expediente/como_jugar_vista.js';
import { estrellas, planetaGirando, movimientoReducido } from './expediente/efectos.js';
import { sonarBoton } from '../fisica/sonido.js';
import { FondoMenu } from './expediente/fondo_menu.js';
import { marteGrande, logoBrillo, lineaPixel, restaurarCamara, precargarInicio, videoInicio, warp, textoPx } from './expediente/inicio.js';
import { vozTitulo } from './expediente/voz_titulo.js';
import { escenarioNave, consolaMenu, flechasRejilla, entradaInterfaz, zoomEscotilla, detenerZoom } from './expediente/menu_nave.js';

// A dónde ir al terminar o saltar "Cómo jugar" (se conserva si el Menú se reinicia al cambiar de idioma).
let trasComoJugar = 'principal';

// Dueño: frente expediente. Menú: pantalla de inicio (el GIF de título de Mauricio como video; la abre el Boot), salto
// (warp) hasta la estación, menú de opciones en una consola bajo la estación (al elegir, la cámara entra por su escotilla),
// nueva partida (con elección de destino), continuar, explorador, "¿De dónde salen los números?". Es una sola escena con
// varias vistas (no requiere registrar escenas en main.js).
// Al volver de otra escena sin vista pedida se abre el menú de opciones ('principal'), no la pantalla de inicio.
export default class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(datos) {
    this.vistaInicial = datos?.vista || 'principal';
    // Phaser conserva los datos del último start si el siguiente no trae: sin esto, volver al Menú desde otra escena
    // abriría otra vez la pantalla de inicio que pidió el Boot.
    this.sys.settings.data = {};
  }

  preload() {
    precargarInicio(this); // cuadro fijo del video de inicio (si falla, la vista usa su respaldo)
  }

  create() {
    prepararIngles();
    detenerZoom();
    restaurarCamara(this); // por si la escena se reinicia a media animación (cambio de idioma)
    this.oscuro = false;
    this.zoomando = false;
    // Al volver de una partida en curso, el guardado se pone al día (diseño, resultados, tickets) antes de leerlo:
    // así "Continuar" y su resumen muestran lo mismo que había en memoria, no lo último escrito al gastar un ticket.
    if (partidaActiva()) guardar(partida);
    this.teclado = new Teclado(this);
    this.mostrar(this.vistaInicial);
  }

  /** Cambia español ↔ inglés y vuelve a crear el Menú en la misma vista (los textos se arman al crear). */
  cambiarIdioma(vista = 'principal') {
    alternarIdioma();
    this.scene.restart({ vista });
  }

  /**
   * Botón "Español / English" arriba a la derecha, con el idioma actual resaltado. Se ancla por la derecha para que
   * el "▶ " del foco no mueva las palabras y el resaltado quede siempre bajo la palabra correcta.
   */
  botonIdioma(vista) {
    // Sin crecer al pasar el ratón: el subrayado del idioma actual se dibuja aparte y quedaría desfasado.
    // La tecla L va en la propia etiqueta (antes era una nota de 10 px debajo).
    const b = boton(this, 945, 28, 'Español / English (L)', () => this.cambiarIdioma(vista), { size: 14, origen: [1, 0.5], crecer: false });
    const t = b.obj;
    const palabra = idioma() === 'en' ? 'English' : 'Español';
    let x, w;
    const chars = t.esPixel ? t.getTextBounds().characters : null;
    const i = t.text.lastIndexOf(palabra);
    if (chars?.length && i >= 0) {
      // Fuente pixel (ancho variable): posición real de los glifos de la palabra.
      const a = chars.find((c) => c.idx === i), z = chars.find((c) => c.idx === i + palabra.length - 1);
      const izq = t.x - t.originX * t.width;
      x = izq + a.x; w = z.x + z.w - a.x;
    } else {
      const ancho = (t.width - (t.padding?.left ?? 0) - (t.padding?.right ?? 0)) / t.text.length; // fuente monoespaciada
      const finDesdeDerecha = idioma() === 'en' ? 4 : 14; // "English (L)" o "Español / English (L)"
      x = t.x - (t.padding?.right ?? 0) - (finDesdeDerecha + 7) * ancho; w = 7 * ancho;
    }
    // Subrayado del idioma actual (encima de la caja del botón; no solo color: es una línea).
    this.add.rectangle(x, t.y + t.height / 2 + 2, w, 2, 0xffd166).setOrigin(0, 0.5).setDepth(1);
    return b;
  }

  mostrar(vista, { llegada = false } = {}) {
    limpiar(this);
    this.resumen = null; // limpiar() ya destruyó su capa
    this.vista = vista;
    if (this.alTocarInicio) { this.input.off('pointerdown', this.alTocarInicio); this.alTocarInicio = null; }
    // Después del zoom a la nave (o de un fundido) la pantalla quedó en negro: se aclara con la vista nueva.
    if (this.oscuro) { this.oscuro = false; restaurarCamara(this, { aclarar: true }); }
    this.input.enabled = true;
    this.zoomando = false;
    // Fondo de arte (sin texto) oscurecido para que se lean los botones. «Nueva partida» usa el de Mauricio (#77) con la
    // Tierra, la Luna y Marte (centro libre); el menú de opciones, la nave; el resto (inicio, números, cómo jugar), el de
    // título, donde el fondo vivo pasa planetas detrás de Marte.
    let nave = null;
    if (vista === 'principal') {
      // La estación de Mauricio (llega desde lejos después del salto); la vista se habilita al terminar la llegada.
      this.zoomando = true;
      this.input.enabled = false;
      nave = this.nave = escenarioNave(this, { llegada, alLlegar: () => this.listoPrincipal?.() });
    } else if (vista !== 'inicio') {
      const fondo = vista === 'destino' && this.textures.exists('pantallas/menu_fondo') ? 'pantallas/menu_fondo' : 'titulo/titulo_fondo';
      if (this.textures.exists(fondo)) {
        this.add.image(480, 270, fondo).setScale(3).setDepth(-10);
        this.add.rectangle(480, 270, 960, 540, 0x0b0d17, 0.6).setDepth(-9);
      }
    }
    this.eligiendo = false;
    const idiomaTecla = () => this.cambiarIdioma(vista);
    this.teclado.extra = { l: idiomaTecla, L: idiomaTecla };
    // Esc: de las opciones a la pantalla de inicio; de las demás vistas, a las opciones.
    // (en las opciones, Esc → inicio se activa al terminar la llegada: listoPrincipal)
    this.teclado.alEscape = vista === 'inicio' || vista === 'principal' ? null : () => this.mostrar('principal');
    if (vista === 'inicio') this.vistaInicio();
    else if (vista === 'destino') this.vistaDestino();
    else if (vista === 'como_jugar') {
      vistaComoJugar(this, {
        presupuesto: PRESUPUESTO_INICIAL,
        alTerminar: () => this.mostrar(trasComoJugar),
        redibujar: () => this.mostrar('como_jugar'),
        botonIdioma: () => this.botonIdioma('como_jugar'),
      });
    } else if (vista === 'numeros') {
      vistaNumeros(this, {
        volver: () => this.mostrar('principal'),
        redibujar: () => this.mostrar('numeros'),
        botonIdioma: () => this.botonIdioma('numeros'),
      });
    }
    else this.vistaPrincipal(llegada);
    // Estrellas que titilan detrás de todo y lejos del texto (quietas con prefers-reduced-motion); en las opciones, lejos
    // también de la estación, de la Tierra, del logo y de Marte. La pantalla de inicio no lleva: el video trae su cielo.
    if (vista !== 'inicio') {
      estrellas(this, nave ? { planeta: { ...nave.marte, r: nave.marte.r + 14 }, zonas: [...nave.zonas, { x: 230, y: 20, right: 730, bottom: 112 }] } : {});
    }
    // Fondo vivo de Leo (#76): asteroides, cometa, planetas detrás de Marte, galaxia, destellos y agujero negro al volver.
    // En «Nueva partida» con el fondo de Mauricio no va (no tiene un Marte al centro para su máscara), ni en el video.
    this.fondoMenu?.destruir();
    this.fondoMenu = vista === 'destino' || vista === 'inicio' ? null
      : new FondoMenu(this, { resultados: partida.resultados?.length ?? 0, ...(nave ? { marte: nave.marte } : {}) });
  }

  /** Fundido corto a negro y `luego` (la vista siguiente se aclara sola en mostrar()). */
  fundido(luego) {
    if (this.zoomando) return;
    this.zoomando = true;
    this.input.enabled = false;
    const cam = this.cameras.main;
    cam.once('camerafadeoutcomplete', () => { this.oscuro = true; luego(); });
    cam.fadeOut(200, 0, 0, 0);
  }

  /**
   * Opción elegida en el menú de opciones: la cámara hace zoom a la escotilla de la nave y entonces se ejecuta la acción
   * (otra vista del Menú o salir a otra escena). Con prefers-reduced-motion, solo fundido. Una sola vez aunque se pulse más.
   */
  alNave(accion) {
    if (this.zoomando) return;
    this.zoomando = true;
    this.input.enabled = false;
    this.teclado.items = []; this.teclado.atajos = []; this.teclado.extra = {}; this.teclado.alEscape = null;
    zoomEscotilla(this, this.nave, () => { this.oscuro = true; accion(); });
  }

  /** Ir a otra escena: si la pantalla ya está en negro (tras el zoom) se entra directo; si no, con el fundido de irA. */
  salirA(escena) {
    if (this.oscuro) this.scene.start(escena);
    else irA(this, escena);
  }

  /**
   * Pantalla de inicio = el GIF de título de Mauricio (video en bucle sobre su cuadro fijo; solo el cuadro con
   * prefers-reduced-motion o si el video no carga). El video ya trae logo, lema y «CLICK ANYWHERE TO PLAY»; en español se
   * agrega una franja discreta abajo. Enter, Espacio, clic o toque → salto a la estación. L cambia el idioma.
   */
  vistaInicio() {
    const v = videoInicio(this);
    vozTitulo(); // «MARSCEPTION» con la voz de Mauricio, una vez por visita
    if (!v) this.inicioRespaldo();
    const quieto = movimientoReducido();
    if (idioma() !== 'en') {
      const aviso = textoPx(this, 480, 519, 'PRESIONA ENTER O TOCA PARA JUGAR', { origen: [0.5, 0.5] });
      this.add.rectangle(480, 519, aviso.displayWidth + 36, 32, 0x0d0a24, 0.78).setStrokeStyle(2, 0x7a4cff, 0.8).setDepth(1);
      if (!quieto) this.tweens.add({ targets: aviso, alpha: 0.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.idiomaInicio();

    const entrar = () => {
      if (this.zoomando) return;
      if (quieto || !v) { this.fundido(() => this.mostrar('principal')); return; }
      this.zoomando = true;
      this.input.enabled = false;
      sonarBoton();
      warp(this, v.objetos.filter((o) => o.active), () => this.mostrar('principal', { llegada: true }));
    };
    this.teclado.extra = { ...this.teclado.extra, Enter: entrar, ' ': entrar };
    // Clic o toque en cualquier lugar que no sea un botón (el de idioma tiene su propia acción).
    this.alTocarInicio = (_p, sobre) => { if (!sobre?.length) entrar(); };
    this.input.on('pointerdown', this.alTocarInicio);
  }

  /** Idioma en la pantalla de inicio: «ES · EN  L» abajo a la derecha (el actual en amarillo y subrayado); clic o L. */
  idiomaInicio() {
    const en = idioma() === 'en';
    const y = 519;
    const tecla = textoPx(this, 938, y, 'L', { origen: [1, 0.5], color: '#c9a7ff' });
    const enT = textoPx(this, tecla.x - tecla.displayWidth - 14, y, 'EN', { origen: [1, 0.5], color: en ? '#ffd166' : '#c9a7ff' });
    const sep = textoPx(this, enT.x - enT.displayWidth - 6, y, '·', { origen: [1, 0.5], color: '#c9a7ff' });
    const esT = textoPx(this, sep.x - sep.displayWidth - 6, y, 'ES', { origen: [1, 0.5], color: en ? '#c9a7ff' : '#ffd166' });
    const x0 = esT.x - esT.displayWidth - 12;
    const caja = this.add.rectangle(x0, y, 950 - x0, 32, 0x0d0a24, 0.78).setOrigin(0, 0.5).setStrokeStyle(2, 0x7a4cff, 0.8).setDepth(1);
    const actual = en ? enT : esT;
    this.add.rectangle(actual.x - actual.displayWidth, y + 11, actual.displayWidth, 2, 0xffd166).setOrigin(0, 0.5).setDepth(2);
    caja.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.cambiarIdioma('inicio'));
  }

  /** Respaldo de la pantalla de inicio sin el cuadro del video: Marte que gira, logo con brillo y lema en la fuente pixel. */
  inicioRespaldo() {
    if (this.textures.exists('titulo/titulo_fondo')) this.add.image(480, 270, 'titulo/titulo_fondo').setScale(3).setDepth(-10);
    marteGrande(this);
    logoBrillo(this, 480, 172, 9);
    const T = '#ffffff', TIERRA = '#80e0dc', LUNA = '#c8c8d4', MARTE = '#ff8a7a', LEJOS = '#c9a7ff';
    const lineas = idioma() === 'en'
      ? [[['TRAIN ON ', T], ['EARTH', TIERRA], ['.', T]], [['LAND ON THE ', T], ['MOON', LUNA], [' / ', T], ['MARS', MARTE], ['.', T]],
        [['RUN IT ', T], ['ANYWHERE', LEJOS], ['.', T]]]
      : [[['ENTRENA EN LA ', T], ['TIERRA', TIERRA], ['.', T]], [['ATERRIZA EN LA ', T], ['LUNA', LUNA], [' / ', T], ['MARTE', MARTE], ['.', T]],
        [['JUEGA ', T], ['DONDE SEA', LEJOS], ['.', T]]];
    const hechas = lineas.map((l, i) => lineaPixel(this, 480, 330 + i * 36, l, { escala: 3 }));
    const ancho = Math.max(...hechas.map((h) => h.ancho)) + 48;
    this.add.rectangle(480, 366, ancho, 3 * 36 + 18, 0x0d0a24, 0.82).setStrokeStyle(3, 0x7a4cff, 0.9).setDepth(1);
    if (idioma() === 'en') {
      const aviso = textoPx(this, 480, 34, 'PRESS ENTER · TAP TO PLAY', { origen: [0.5, 0.5] });
      this.add.rectangle(480, 34, aviso.displayWidth + 32, 32, 0x0d0a24, 0.82).setDepth(1);
    }
  }

  /**
   * Menú de opciones: la estación de Mauricio al centro (con luces), el logo arriba y una consola de arte abajo con 2
   * columnas de botones (fuente pixel) y una línea de ayuda. Al elegir, la cámara entra por la escotilla (alNave).
   * Con `llegada` (después del salto) la estación llega desde lejos y la consola sube; la vista se habilita al terminar.
   */
  vistaPrincipal(llegada = false) {
    const logo = logoBrillo(this, 480, 66, 7);
    const g = guardadoDisponible(DESTINOS);
    const en = idioma() === 'en';
    const opciones = [
      { etiqueta: tr('Nueva partida', 'New game'), accion: () => this.alNave(() => this.alNuevaPartida()),
        pista: tr('Elige destino: la Luna o Marte', 'Choose a destination: the Moon or Mars') },
      { etiqueta: tr('Continuar', 'Continue'), accion: () => this.alNave(() => this.continuar()), habilitado: !!g,
        pista: g ? this.resumenGuardado(g) : tr('No hay partida guardada en este navegador', 'No saved game in this browser') },
      { etiqueta: tr('Explorador libre', 'Free explorer'), accion: () => this.alNave(() => this.salirA('Explorador')),
        pista: tr('Consulta cualquier coordenada de la Tierra', 'Check any coordinate on Earth') },
      { etiqueta: tr('¿De dónde salen los números?', 'Where do the numbers come from?'), accion: () => this.alNave(() => this.mostrar('numeros')),
        pista: tr('Datos NASA · modelo · validación', 'NASA data · model · validation') },
      { etiqueta: tr('Cómo jugar', 'How to play'), accion: () => this.alNave(() => this.verComoJugar('principal')),
        pista: tr('4 pasos, menos de 1 minuto', '4 steps, under a minute') },
      { etiqueta: en ? 'Language: English' : 'Idioma: Español', accion: () => this.cambiarIdioma('principal'), tecla: 'L',
        pista: en ? 'Cambiar a español' : 'Switch to English' },
    ];
    const consola = consolaMenu(this, opciones, {
      ayudaPorDefecto: tr('↑↓←→ mover · 1–5 / Enter elegir · Esc inicio · L idioma', '↑↓←→ move · 1–5 / Enter choose · Esc title · L language'),
    });
    const botones = consola.botones;
    const [nueva, continuar] = botones;
    if (llegada) entradaInterfaz(this, { consola: consola.objs, logo, retraso: 450 });
    // Teclado y ratón se habilitan cuando la estación terminó de llegar (escenarioNave llama a listoPrincipal; sin
    // llegada, en el instante siguiente).
    this.listoPrincipal = () => {
      this.listoPrincipal = null;
      if (!this.sys.isActive() || this.vista !== 'principal') return;
      this.zoomando = false;
      this.input.enabled = true;
      this.teclado.numerar(botones.slice(0, 5));
      (g ? continuar : nueva).setSugerido(true);
      this.teclado.poner(botones, g ? continuar : nueva);
      this.teclado.extra = { ...this.teclado.extra, ...flechasRejilla(this, 2) };
      this.teclado.alEscape = () => this.fundido(() => this.mostrar('inicio'));
    };
  }

  /**
   * "Nueva partida" → elegir destino. La primera vez, al elegir Luna o Marte sale el resumen de 4 viñetas (tutorial
   * guiado, comun/tutorial.js); por eso «Cómo jugar» ya no se abre solo antes (eran las mismas 4 viñetas dos veces).
   * «Cómo jugar» sigue en el menú (versión larga) y la tecla ? repite el resumen en la elección de destino.
   */
  alNuevaPartida() {
    this.mostrar('destino');
  }

  verComoJugar(despues) {
    trasComoJugar = despues;
    reiniciarPaginaComoJugar();
    this.mostrar('como_jugar');
  }

  resumenGuardado(g) {
    const d = DESTINOS[g.destino];
    const s = g.sitio ? SITIOS.find((x) => x.id === g.sitio) : null;
    const partes = [d ? MUNDOS[d.mundo] || trDato(d, 'nombre') : g.destino, s ? trDato(s, 'nombre') : tr('sin sitio elegido', 'no site chosen'),
      `${g.tickets} ticket(s)`];
    return `${tr('Guardada', 'Saved')}: ${partes.join(' · ')}`;
  }

  continuar() {
    if (!restaurar(partida, SITIOS, DESTINOS)) { this.mostrar('principal'); return; }
    this.salirA(partida.sitio ? 'Taller' : 'Expediente');
  }

  vistaDestino() {
    tituloPlaca(this, 480, 40, tr('¿A dónde va tu robot?', 'Where is your robot going?'), { size: 30 });

    const ids = [...ORDEN_DESTINOS.filter((id) => DESTINOS[id]), ...Object.keys(DESTINOS).filter((id) => !ORDEN_DESTINOS.includes(id))];
    const ancho = 360;
    const sep = 60;
    const formato = (v, d = 2) => new Intl.NumberFormat(idioma() === 'en' ? 'en-US' : 'es-MX', { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
    const x0 = 480 - (ids.length * ancho + (ids.length - 1) * sep) / 2;
    // Ayuda fija: sin nada resaltado muestra los recursos de inicio (valores de juego); al enfocar un destino, su nota de gravedad.
    const ayuda = ayudaFija(this, 480, 466, {
      ancho: 860,
      porDefecto: tr(`${TICKETS_POR_PARTIDA} tickets · ${formato(PRESUPUESTO_INICIAL, 0)} créditos · ? cómo jugar`,
        `${TICKETS_POR_PARTIDA} tickets · ${formato(PRESUPUESTO_INICIAL, 0)} credits · ? how to play`),
    });
    this.planetas = {};
    const botones = ids.map((id, i) => {
      const d = DESTINOS[id];
      const x = x0 + i * (ancho + sep);
      const cx = x + ancho / 2;
      cajaArte(this, 'ui/ui_tarjeta', x, 76, ancho, 366, { alfa: 0.94 });
      const n = sitiosParaDestino(SITIOS, id).length;
      const g = typeof d.gravedad_ms2 === 'number' ? d.gravedad_ms2 : GRAVEDAD[d.mundo];
      const mundo = MUNDOS[d.mundo] || trDato(d, 'nombre');
      texto(this, cx, 104, mundo.toUpperCase(), { size: 28, origen: [0.5, 0.5] });
      // Planeta girando (spritesheet del frente arte o generado en código); clic o toque en él = "Elegir".
      const planeta = this.planetas[id] = planetaGirando(this, cx, 196, d.mundo === 'luna' ? 'luna' : 'marte', { lado: 128, inicio: i * 0.37 });
      texto(this, cx, 274, trDato(d, 'nombre'), { size: 16, color: COLOR.tenue, origen: [0.5, 0.5], ancho: ancho - 30, alinear: 'center' });
      // 2 datos grandes: gravedad en «g» (con m/s² debajo) y cuántos sitios análogos tiene.
      const izq = x + ancho * 0.27, der = x + ancho * 0.73;
      texto(this, izq, 322, typeof g === 'number' ? `${formato(g / GRAVEDAD.tierra)} g` : '—', { size: 28, color: COLOR.acento, origen: [0.5, 0.5] });
      texto(this, izq, 344, typeof g === 'number' ? `${tr('gravedad', 'gravity')}\n${formato(g)} m/s²` : tr('gravedad: sin dato', 'gravity: no data'),
        { size: 14, color: COLOR.muyTenue, origen: [0.5, 0], alinear: 'center', ancho: ancho / 2 - 16 });
      texto(this, der, 322, n ? String(n) : '0', { size: 28, color: n ? COLOR.acento : COLOR.alerta, origen: [0.5, 0.5] });
      texto(this, der, 344, n === 1 ? tr('sitio\nanálogo', 'analog\nsite') : tr('sitios\nanálogos', 'analog\nsites'),
        { size: 14, color: n ? COLOR.muyTenue : COLOR.alerta, origen: [0.5, 0], alinear: 'center', ancho: ancho / 2 - 16 });
      const pista = tr(`${mundo}: ${formato(g)} m/s² solo en la misión, nunca en la prueba terrestre (Tierra ${formato(GRAVEDAD.tierra)})`,
        `${mundo}: ${formato(g)} m/s² only in the mission, never in the Earth test (Earth ${formato(GRAVEDAD.tierra)})`);
      const b = boton(this, cx, 416, `${tr('Elegir', 'Choose')} ${mundo}`, () => this.elegirDestino(id),
        { size: 18, anchoCaja: 240, alSobre: (v) => planeta.rapido(v), alEnfocar: (v) => ayuda.mostrar(v ? pista : '', b) });
      const s = planeta.sprite;
      s.setInteractive({ useHandCursor: true, pixelPerfect: false });
      s.on('pointerover', () => b.obj.emit('pointerover'));
      s.on('pointerout', () => b.obj.emit('pointerout'));
      s.on('pointerdown', () => b.activar());
      return b;
    });

    const volver = boton(this, 480, 512, tr('Volver', 'Back'), () => this.mostrar('principal'), { size: 16 });
    const preferido = botones[ids.indexOf(partida.destino)] || botones[ids.indexOf(DESTINO_POR_DEFECTO)] || botones[0];
    // Atajos: 1 = Marte, 2 = Luna (orden de ORDEN_DESTINOS); el último número vuelve al menú.
    this.teclado.numerar([...botones, volver]);
    preferido?.setSugerido(true);
    this.teclado.poner([...botones, volver, this.botonIdioma('destino')], preferido);
    // ?: repite el resumen de 4 viñetas sin empezar (vuelve a esta vista).
    this.teclado.extra = { ...this.teclado.extra, '?': () => this.verResumen(null, () => this.mostrar('destino')) };
  }

  /** Resumen de 4 viñetas (tutorial guiado): `destinoId` personaliza las frases; `luego` al terminar o saltar. */
  verResumen(destinoId, luego) {
    if (this.resumen?.abierto()) return;
    const mundo = DESTINOS[destinoId]?.mundo ?? null;
    const titulo = mundo === 'luna' ? tr('Rumbo a la Luna', 'Heading to the Moon')
      : mundo === 'marte' ? tr('Rumbo a Marte', 'Heading to Mars') : tr('Tu misión', 'Your mission');
    this.resumen = abrirResumen(this, {
      vinetas: pasosResumen(mundo), titulo, marca: marcaTutorial(CLAVES_TUTORIAL.resumen),
      alCerrar: () => { this.resumen = null; luego(); },
    });
  }

  /** Giro rápido del planeta elegido y luego empieza la partida (una sola vez aunque se pulse varias veces). */
  elegirDestino(id) {
    if (this.eligiendo) return;
    this.eligiendo = true;
    const p = this.planetas?.[id];
    if (p) p.elegir(() => this.empezar(id));
    else this.empezar(id);
  }

  /** La primera vez en este navegador, antes de empezar, el resumen de 4 viñetas (saltable, se recuerda). */
  empezar(destinoId) {
    if (marcaTutorial(CLAVES_TUTORIAL.resumen).debeMostrar()) this.verResumen(destinoId, () => this.arrancar(destinoId));
    else this.arrancar(destinoId);
  }

  arrancar(destinoId) {
    nuevaPartida(partida, destinoId, { presupuesto: PRESUPUESTO_INICIAL, tickets: TICKETS_POR_PARTIDA });
    irA(this, 'Expediente');
  }
}
