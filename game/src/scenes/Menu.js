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
import { debeMostrarComoJugar } from './expediente/como_jugar.js';
import { vistaComoJugar, reiniciarPaginaComoJugar } from './expediente/como_jugar_vista.js';
import { estrellas, planetaGirando, movimientoReducido } from './expediente/efectos.js';
import { sonarBoton } from '../fisica/sonido.js';
import { tocarMusica, cambiarVolumenMusica, alternarMusica, alCambiarMusica, estado as estadoMusica } from '../audio/musica.js';
import { FondoMenu } from './expediente/fondo_menu.js';
import { marteGrande, logoBrillo, lineaPixel, restaurarCamara, precargarInicio, videoInicio, warp, textoPx } from './expediente/inicio.js';
import { escenarioNave, consolaMenu, flechasRejilla, entradaInterfaz, zoomEscotilla, detenerZoom, botonPx } from './expediente/menu_nave.js';
import { abrirTutora } from '../tutor/panel.js';

// Botón de ANA en el menú de opciones: arriba a la izquierda (la consola ya tiene 3 filas llenas y arriba a la derecha
// está Marte). Las estrellas no titilan debajo.
const TUTORA = { x: 18, y: 10, w: 214, h: 44 };
const ZONA_TUTORA = { x: TUTORA.x - 8, y: 0, right: TUTORA.x + TUTORA.w + 8, bottom: TUTORA.y + TUTORA.h + 8 };

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
    this.tutora = null;
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
    this.vista = vista;
    this.dejarMusica?.();
    this.dejarMusica = null;
    // Música del menú (audio/musica.js): no suena en la pantalla de inicio; en las opciones empieza al terminar la
    // llegada de la estación (listoPrincipal), es decir, cuando acaba la animación de inicio.
    if (vista !== 'inicio' && vista !== 'principal') tocarMusica('menu');
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
    else if (vista === 'musica') this.vistaMusica();
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
      estrellas(this, nave ? { planeta: { ...nave.marte, r: nave.marte.r + 14 }, zonas: [...nave.zonas, { x: 230, y: 20, right: 730, bottom: 112 }, ZONA_TUTORA] } : {});
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
      ayudaPorDefecto: tr('↑↓←→ mover · 1–5 / Enter elegir · Esc inicio · L idioma · A tutora', '↑↓←→ move · 1–5 / Enter choose · Esc title · L language · A tutor'),
    });
    const botones = consola.botones;
    const [nueva, continuar] = botones;
    // Apartado propio de la música (docs/juego/MUSICA.md): arriba a la derecha, fuera de la consola (que ya está llena).
    const musica = boton(this, 945, 28, tr('Música', 'Music'), () => this.fundido(() => this.mostrar('musica')),
      { size: 14, origen: [1, 0.5], crecer: false });
    // ANA, la tutora de análogos (tecla A; src/tutor/, frente modelo). Abre su panel encima del menú, sin zoom a la nave.
    const tutora = botonPx(this, TUTORA.x, TUTORA.y, TUTORA.w, TUTORA.h, tr('Tutora ANA', 'ANA, tutor'), () => this.abrirTutora(), {
      tecla: 'A',
      alEnfocar: (v) => consola.ayuda(v ? tr('Pregúntale qué es un análogo y de dónde salen los datos', 'Ask her what an analog is and where the data comes from') : '', tutora),
    });
    if (llegada) {
      entradaInterfaz(this, { consola: consola.objs, logo, retraso: 450 });
      if (!movimientoReducido()) {
        tutora.objs.forEach((o) => o.setAlpha(0));
        this.tweens.add({ targets: tutora.objs, alpha: 1, delay: 700, duration: 320, ease: 'Quad.easeOut' });
      }
    }
    // Teclado y ratón se habilitan cuando la estación terminó de llegar (escenarioNave llama a listoPrincipal; sin
    // llegada, en el instante siguiente).
    this.listoPrincipal = () => {
      this.listoPrincipal = null;
      if (!this.sys.isActive() || this.vista !== 'principal') return;
      tocarMusica('menu');
      this.zoomando = false;
      this.input.enabled = true;
      this.teclado.numerar(botones.slice(0, 5));
      (g ? continuar : nueva).setSugerido(true);
      // Música y ANA entran al recorrido de Tab y ←→ (después de «Idioma»), pero no a la rejilla de ↑↓ de la consola.
      this.teclado.poner([...botones, musica, tutora], g ? continuar : nueva);
      const rejilla = flechasRejilla(this, 2);
      const enRejilla = (tecla, paso) => (ev) => {
        const tk = this.teclado;
        if (this.modoTeclado && tk.actual && !botones.includes(tk.actual)) { tk.mover(paso); return; }
        const todos = tk.items;
        tk.items = botones;
        try { rejilla[tecla](ev); } finally { tk.items = todos; }
      };
      const tutoraTecla = () => this.abrirTutora();
      this.teclado.extra = { ...this.teclado.extra, ArrowUp: enRejilla('ArrowUp', -1), ArrowDown: enRejilla('ArrowDown', 1),
        a: tutoraTecla, A: tutoraTecla };
      this.teclado.alEscape = () => this.fundido(() => this.mostrar('inicio'));
    };
  }

  /**
   * Apartado «Música»: volumen propio de 0 a 100 % en pasos de 10 (se guarda en este navegador) y quitar o poner la
   * música. Mientras se ajusta suena la del menú. Teclas: - y + bajan y suben; Esc vuelve.
   */
  vistaMusica() {
    tituloPlaca(this, 480, 40, tr('Música', 'Music'), { size: 30 });
    cajaArte(this, 'ui/ui_tarjeta', 230, 96, 500, 330, { alfa: 0.94 });
    const valor = texto(this, 480, 146, '', { size: 28, color: COLOR.acento, origen: [0.5, 0.5] });
    const segmentos = Array.from({ length: 10 }, (_, i) => this.add.rectangle(310 + i * 34, 196, 28, 24, 0x06d6a0).setOrigin(0, 0.5).setDepth(2));
    texto(this, 480, 244, tr('La música suena debajo de los efectos. La M de las pruebas también la calla.',
      'Music plays under the sound effects. M during the tests mutes it too.'),
      { size: 14, color: COLOR.tenue, origen: [0.5, 0.5], ancho: 460, alinear: 'center' });
    const menos = boton(this, 380, 304, tr('- Bajar', '- Lower'), () => cambiarVolumenMusica(-10), { size: 18, anchoCaja: 170 });
    const mas = boton(this, 580, 304, tr('+ Subir', '+ Raise'), () => cambiarVolumenMusica(10), { size: 18, anchoCaja: 170 });
    const quitar = boton(this, 480, 372, '', () => alternarMusica(), { size: 18, anchoCaja: 300 });
    const volver = boton(this, 480, 512, tr('Volver', 'Back'), () => this.mostrar('principal'), { size: 16 });
    const pintar = (e) => {
      if (!valor.active) return;
      valor.setText(e.quitada ? tr('Música quitada', 'Music off') : `${e.volumen} %`);
      segmentos.forEach((r, i) => r.setFillStyle(i < e.volumen / 10 && !e.quitada ? 0x06d6a0 : 0x2a3160));
      quitar.setEtiqueta(e.quitada ? tr('Poner la música', 'Turn music on') : tr('Quitar la música', 'Turn music off'));
      menos.setHabilitado(e.volumen > 0);
      mas.setHabilitado(e.volumen < 100);
    };
    pintar(estadoMusica());
    this.dejarMusica = alCambiarMusica(pintar);
    this.events.once('shutdown', () => { this.dejarMusica?.(); this.dejarMusica = null; });
    const bajar = () => { sonarBoton(); cambiarVolumenMusica(-10); };
    const subir = () => { sonarBoton(); cambiarVolumenMusica(10); };
    this.teclado.extra = { ...this.teclado.extra, '-': bajar, '_': bajar, '+': subir, '=': subir };
    this.teclado.numerar([menos, mas, quitar, volver]);
    this.teclado.poner([menos, mas, quitar, volver, this.botonIdioma('musica')], mas);
  }

  /** ANA sobre el menú de opciones. Sin sitio ni destino: responde sobre el método, la validación y el catálogo. */
  abrirTutora() {
    if (this.tutora || this.zoomando || this.vista !== 'principal') return;
    this.tutora = abrirTutora(this, { pantalla: 'menu', alCerrar: () => { this.tutora = null; } });
  }

  /** "Nueva partida": la primera vez en este navegador muestra "Cómo jugar" antes de elegir destino. */
  alNuevaPartida() {
    if (debeMostrarComoJugar()) this.verComoJugar('destino');
    else this.mostrar('destino');
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
      porDefecto: tr(`${TICKETS_POR_PARTIDA} tickets · ${formato(PRESUPUESTO_INICIAL, 0)} créditos`,
        `${TICKETS_POR_PARTIDA} tickets · ${formato(PRESUPUESTO_INICIAL, 0)} credits`),
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
  }

  /** Giro rápido del planeta elegido y luego empieza la partida (una sola vez aunque se pulse varias veces). */
  elegirDestino(id) {
    if (this.eligiendo) return;
    this.eligiendo = true;
    const p = this.planetas?.[id];
    if (p) p.elegir(() => this.empezar(id));
    else this.empezar(id);
  }

  empezar(destinoId) {
    nuevaPartida(partida, destinoId, { presupuesto: PRESUPUESTO_INICIAL, tickets: TICKETS_POR_PARTIDA });
    irA(this, 'Expediente');
  }
}
