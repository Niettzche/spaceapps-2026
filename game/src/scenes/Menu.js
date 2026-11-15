import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { PRESUPUESTO_INICIAL, TICKETS_POR_PARTIDA, GRAVEDAD } from '../config/world.js';
import { COLOR, texto, boton, panel, Teclado, limpiar } from './expediente/interfaz.js';
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
    const b = boton(this, 945, 26, 'Español / English', () => this.cambiarIdioma(vista), { size: 14, origen: [1, 0.5], crecer: false });
    const t = b.obj;
    const ancho = t.width / t.text.length; // fuente monoespaciada
    const finDesdeDerecha = idioma() === 'en' ? 2 : 12; // "English ]" o "Español / English ]"
    const x = t.x - (finDesdeDerecha + 7) * ancho;
    this.add.rectangle(x - 2, t.y, 7 * ancho + 4, t.height + 2, 0xffd166, 0.22).setOrigin(0, 0.5).setDepth(-1);
    this.add.rectangle(x, t.y + t.height / 2, 7 * ancho, 2, 0xffd166).setOrigin(0, 0.5).setDepth(-1);
    texto(this, 945, 46, tr('L: idioma / language', 'L: language / idioma'), { size: 10, color: COLOR.muyTenue, origen: [1, 0] });
    return b;
  }

  mostrar(vista) {
    limpiar(this);
    // Fondo de arte (assets/titulo/titulo_fondo.png, sin texto) oscurecido para que se lean los botones.
    if (this.textures.exists('titulo/titulo_fondo')) {
      this.add.image(480, 270, 'titulo/titulo_fondo').setScale(3).setDepth(-10);
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
  }

  vistaPrincipal() {
    texto(this, 480, 70, 'MARSCEPTION', { size: 36, origen: [0.5, 0.5] });
    texto(this, 480, 112, tr('Prueba tu robot en un análogo de la Tierra antes de mandarlo a la Luna o a Marte',
      'Test your robot at an Earth analog before sending it to the Moon or Mars'),
      { size: 14, color: COLOR.tenue, origen: [0.5, 0.5] });

    const g = guardadoDisponible(DESTINOS);
    const nueva = boton(this, 480, 200, tr('Nueva partida', 'New game'), () => this.alNuevaPartida());
    const continuar = boton(this, 480, 250, tr('Continuar', 'Continue'), () => this.continuar(), { habilitado: !!g });
    const resumen = g ? this.resumenGuardado(g) : tr('No hay partida guardada en este navegador', 'No saved game in this browser');
    texto(this, 480, 274, resumen, { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    const explorador = boton(this, 480, 315, tr('Explorador libre', 'Free explorer'), () => irA(this, 'Explorador'));
    texto(this, 480, 339, tr('Consulta cualquier coordenada de la Tierra y propón un sitio', 'Check any coordinate on Earth and propose a site'),
      { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    const numeros = boton(this, 480, 380, tr('¿De dónde salen los números?', 'Where do the numbers come from?'), () => this.mostrar('numeros'));
    const comoJugar = boton(this, 480, 428, tr('Cómo jugar', 'How to play'), () => this.verComoJugar('principal'));
    const idiomaBoton = this.botonIdioma('principal');

    texto(this, 480, 470, tr(`Datos cargados: ${SITIOS.length} sitios terrestres · ${Object.keys(DESTINOS).length} destinos`,
      `Data loaded: ${SITIOS.length} Earth sites · ${Object.keys(DESTINOS).length} destinations`),
      { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    texto(this, 480, 500, tr('Flechas o Tab para moverte · 1–5 o Enter para elegir · Esc para volver · También con toque',
      'Arrows or Tab to move · 1–5 or Enter to choose · Esc to go back · Touch works too'),
      { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    // Atajos 1–5 y opción sugerida (⏎), igual que Resultados.js. "Cómo jugar" va al final para no mover los atajos 1–4.
    this.teclado.numerar([nueva, continuar, explorador, numeros, comoJugar]);
    (g ? continuar : nueva).setSugerido(true);
    this.teclado.poner([nueva, continuar, explorador, numeros, comoJugar, idiomaBoton], g ? continuar : nueva);
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
    texto(this, 480, 48, tr('¿A dónde va tu robot?', 'Where is your robot going?'), { size: 28, origen: [0.5, 0.5] });
    texto(this, 480, 82, tr('Misma mecánica en los dos destinos: cambian la gravedad, el perfil del destino y los sitios análogos',
      'Same mechanics at both destinations: gravity, destination profile and analog sites change'),
      { size: 12, color: COLOR.tenue, origen: [0.5, 0.5] });

    const ids = [...ORDEN_DESTINOS.filter((id) => DESTINOS[id]), ...Object.keys(DESTINOS).filter((id) => !ORDEN_DESTINOS.includes(id))];
    const ancho = 380;
    const x0 = 480 - (ids.length * ancho + (ids.length - 1) * 30) / 2;
    this.planetas = {};
    const botones = ids.map((id, i) => {
      const d = DESTINOS[id];
      const x = x0 + i * (ancho + 30);
      const cx = x + ancho / 2;
      panel(this, x, 106, ancho, 348);
      const n = sitiosParaDestino(SITIOS, id).length;
      const g = typeof d.gravedad_ms2 === 'number' ? d.gravedad_ms2 : GRAVEDAD[d.mundo];
      texto(this, cx, 130, (MUNDOS[d.mundo] || d.mundo).toUpperCase(), { size: 24, origen: [0.5, 0.5] });
      // Planeta girando (spritesheet del frente arte o generado en código); clic o toque en él = "Elegir".
      const planeta = this.planetas[id] = planetaGirando(this, cx, 226, d.mundo === 'luna' ? 'luna' : 'marte', { inicio: i * 0.37 });
      texto(this, cx, 314, trDato(d, 'nombre'), { size: 13, color: COLOR.tenue, origen: [0.5, 0.5], ancho: ancho - 30, alinear: 'center' });
      texto(this, x + 20, 332, tr(`Gravedad: ${g} m/s² (Tierra: ${GRAVEDAD.tierra})`, `Gravity: ${g} m/s² (Earth: ${GRAVEDAD.tierra})`), { size: 13 });
      texto(this, x + 20, 354, n ? tr(`Sitios análogos sugeridos: ${n}`, `Suggested analog sites: ${n}`)
        : tr('Sitios análogos sugeridos: sin dato aún', 'Suggested analog sites: no data yet'),
        { size: 13, color: n ? COLOR.texto : COLOR.alerta });
      texto(this, x + 20, 376, tr('La gravedad del destino solo se usa en la misión,\nnunca en la prueba terrestre.',
        'Destination gravity is used only in the mission,\nnever in the Earth test.'), { size: 11, color: COLOR.muyTenue });
      const b = boton(this, cx, 428, `${tr('Elegir', 'Choose')} ${MUNDOS[d.mundo] || trDato(d, 'nombre')}`, () => this.elegirDestino(id),
        { alSobre: (v) => planeta.rapido(v) });
      const s = planeta.sprite;
      s.setInteractive({ useHandCursor: true, pixelPerfect: false });
      s.on('pointerover', () => b.obj.emit('pointerover'));
      s.on('pointerout', () => b.obj.emit('pointerout'));
      s.on('pointerdown', () => b.activar());
      return b;
    });

    texto(this, 480, 474, tr(`Empiezas con ${TICKETS_POR_PARTIDA} tickets de prueba y ${PRESUPUESTO_INICIAL} créditos (valores de juego).`,
      `You start with ${TICKETS_POR_PARTIDA} test tickets and ${PRESUPUESTO_INICIAL} credits (game values).`),
      { size: 12, color: COLOR.tenue, origen: [0.5, 0.5] });
    const volver = boton(this, 480, 510, tr('Volver', 'Back'), () => this.mostrar('principal'));
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
