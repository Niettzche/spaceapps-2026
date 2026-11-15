import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { PRESUPUESTO_INICIAL, TICKETS_POR_PARTIDA, GRAVEDAD } from '../config/world.js';
import { COLOR, texto, boton, panel, Teclado, limpiar, ayudaFija, conFondo, cajaArte, tituloPlaca } from './expediente/interfaz.js';
import { DESTINO_POR_DEFECTO, ORDEN_DESTINOS } from './expediente/config.js';
import { guardadoDisponible, restaurar, nuevaPartida, guardar, partidaActiva } from './expediente/guardado.js';
import { sitiosParaDestino } from './expediente/logica.js';
import { MUNDOS } from './expediente/textos.js';
import { vistaNumeros } from './expediente/numeros.js';
import { prepararIngles } from './expediente/datos_en.js';
import { tr, trDato, idioma, alternarIdioma } from '../i18n.js';
import { debeMostrarComoJugar } from './expediente/como_jugar.js';
import { vistaComoJugar, reiniciarPaginaComoJugar } from './expediente/como_jugar_vista.js';
import { estrellas, planetaGirando } from './expediente/efectos.js';
import { FondoMenu } from './expediente/fondo_menu.js';

// A dónde ir al terminar o saltar "Cómo jugar" (se conserva si el Menú se reinicia al cambiar de idioma).
let trasComoJugar = 'principal';

// Dueño: frente expediente. Menú: nueva partida (con elección de destino), continuar, explorador,
// "¿De dónde salen los números?". Es una sola escena con varias vistas (no requiere registrar escenas en main.js).
export default class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(datos) { this.vistaInicial = datos?.vista || 'principal'; }

  create() {
    prepararIngles();
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

  mostrar(vista) {
    limpiar(this);
    // Fondo de arte (sin texto) oscurecido para que se lean los botones. «Nueva partida» usa el de Mauricio (#77) con la
    // Tierra, la Luna y Marte (centro libre); el resto, el de título, donde el fondo vivo pasa planetas detrás de Marte.
    const fondo = vista === 'destino' && this.textures.exists('pantallas/menu_fondo') ? 'pantallas/menu_fondo' : 'titulo/titulo_fondo';
    if (this.textures.exists(fondo)) {
      this.add.image(480, 270, fondo).setScale(3).setDepth(-10);
      this.add.rectangle(480, 270, 960, 540, 0x0b0d17, 0.6).setDepth(-9);
    }
    this.eligiendo = false;
    const idiomaTecla = () => this.cambiarIdioma(vista);
    this.teclado.extra = { l: idiomaTecla, L: idiomaTecla };
    this.teclado.alEscape = vista === 'principal' ? null : () => this.mostrar('principal');
    if (vista === 'destino') this.vistaDestino();
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
    else this.vistaPrincipal();
    estrellas(this); // titilan detrás de todo y lejos del texto (quietas con prefers-reduced-motion)
    // Fondo vivo de Leo (#76): asteroides, cometa, planetas detrás de Marte, galaxia, destellos y agujero negro al volver.
    // En «Nueva partida» con el fondo de Mauricio no va: su máscara supone el Marte del fondo de título al centro.
    this.fondoMenu?.destruir();
    this.fondoMenu = fondo === 'titulo/titulo_fondo' ? new FondoMenu(this, { resultados: partida.resultados?.length ?? 0 }) : null;
  }

  vistaPrincipal() {
    texto(this, 480, 66, 'MARSCEPTION', { size: 40, origen: [0.5, 0.5] });
    conFondo(this, texto(this, 480, 108, tr('Entrena en la Tierra. Aterriza en la Luna o Marte.', 'Train on Earth. Land on the Moon or Mars.'),
      { size: 16, color: COLOR.tenue, origen: [0.5, 0.5] }));

    // Ayuda de 1 línea en un lugar fijo: aparece al enfocar o pasar el ratón por un botón (antes, una frase bajo cada uno).
    const ayuda = ayudaFija(this, 480, 452);
    const g = guardadoDisponible(DESTINOS);
    const opciones = [
      [tr('Nueva partida', 'New game'), () => this.alNuevaPartida(), tr('Elige destino: la Luna o Marte', 'Choose a destination: the Moon or Mars')],
      [tr('Continuar', 'Continue'), () => this.continuar(),
        g ? this.resumenGuardado(g) : tr('No hay partida guardada en este navegador', 'No saved game in this browser'), !!g],
      [tr('Explorador libre', 'Free explorer'), () => irA(this, 'Explorador'), tr('Consulta cualquier coordenada de la Tierra', 'Check any coordinate on Earth')],
      [tr('¿De dónde salen los números?', 'Where do the numbers come from?'), () => this.mostrar('numeros'),
        tr('Datos NASA · modelo · validación', 'NASA data · model · validation')],
      [tr('Cómo jugar', 'How to play'), () => this.verComoJugar('principal'), tr('4 pasos, menos de 1 minuto', '4 steps, under a minute')],
    ];
    const botones = opciones.map(([etiqueta, accion, pista, habilitado = true], i) => {
      const b = boton(this, 480, 164 + i * 54, etiqueta, accion, {
        size: 18, anchoCaja: 420, habilitado, alEnfocar: (v) => ayuda.mostrar(v ? pista : '', b),
      });
      // Deshabilitado no recibe foco: su razón («No hay partida guardada») se ve al pasar el ratón.
      if (!habilitado) b.obj.on('pointerover', () => ayuda.mostrar(pista, b)).on('pointerout', () => ayuda.mostrar('', b));
      return b;
    });
    const [nueva, continuar] = botones;
    const idiomaBoton = this.botonIdioma('principal');

    conFondo(this, texto(this, 480, 512, tr('↑↓ Tab: mover · 1–5 / Enter: elegir · L: idioma', '↑↓ Tab: move · 1–5 / Enter: choose · L: language'),
      { size: 14, color: COLOR.muyTenue, origen: [0.5, 0.5] }));
    // Atajos 1–5 y opción sugerida (⏎), igual que Resultados.js. "Cómo jugar" va al final para no mover los atajos 1–4.
    this.teclado.numerar(botones);
    (g ? continuar : nueva).setSugerido(true);
    this.teclado.poner([...botones, idiomaBoton], g ? continuar : nueva);
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
    irA(this, partida.sitio ? 'Taller' : 'Expediente');
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
