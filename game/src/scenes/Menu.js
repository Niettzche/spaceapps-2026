import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { PRESUPUESTO_INICIAL, TICKETS_POR_PARTIDA, GRAVEDAD } from '../config/world.js';
import { COLOR, texto, boton, panel, Teclado, limpiar } from './expediente/interfaz.js';
import { DESTINO_POR_DEFECTO, ORDEN_DESTINOS } from './expediente/config.js';
import { guardadoDisponible, restaurar, nuevaPartida } from './expediente/guardado.js';
import { sitiosParaDestino } from './expediente/logica.js';
import { MUNDOS } from './expediente/textos.js';
import { vistaNumeros } from './expediente/numeros.js';
import { prepararIngles } from './expediente/datos_en.js';
import { tr, trDato, idioma, alternarIdioma } from '../i18n.js';

// Dueño: frente expediente. Menú: nueva partida (con elección de destino), continuar, explorador,
// "¿De dónde salen los números?". Es una sola escena con varias vistas (no requiere registrar escenas en main.js).
export default class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(datos) { this.vistaInicial = datos?.vista || 'principal'; }

  create() {
    prepararIngles();
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
    const b = boton(this, 945, 26, 'Español / English', () => this.cambiarIdioma(vista), { size: 14, origen: [1, 0.5] });
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
    const idiomaTecla = () => this.cambiarIdioma(vista);
    this.teclado.extra = { l: idiomaTecla, L: idiomaTecla };
    this.teclado.alEscape = vista === 'principal' ? null : () => this.mostrar('principal');
    if (vista === 'destino') this.vistaDestino();
    else if (vista === 'numeros') vistaNumeros(this, () => this.mostrar('principal'), () => this.cambiarIdioma('numeros'));
    else this.vistaPrincipal();
  }

  vistaPrincipal() {
    texto(this, 480, 70, 'MARSCEPTION', { size: 36, origen: [0.5, 0.5] });
    texto(this, 480, 112, tr('Prueba tu robot en un análogo de la Tierra antes de mandarlo a la Luna o a Marte',
      'Test your robot at an Earth analog before sending it to the Moon or Mars'),
      { size: 14, color: COLOR.tenue, origen: [0.5, 0.5] });

    const g = guardadoDisponible(DESTINOS);
    const nueva = boton(this, 480, 210, tr('Nueva partida', 'New game'), () => this.mostrar('destino'));
    const continuar = boton(this, 480, 260, tr('Continuar', 'Continue'), () => this.continuar(), { habilitado: !!g });
    const resumen = g ? this.resumenGuardado(g) : tr('No hay partida guardada en este navegador', 'No saved game in this browser');
    texto(this, 480, 284, resumen, { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    const explorador = boton(this, 480, 330, tr('Explorador libre', 'Free explorer'), () => irA(this, 'Explorador'));
    texto(this, 480, 354, tr('Consulta cualquier coordenada de la Tierra y propón un sitio', 'Check any coordinate on Earth and propose a site'),
      { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    const numeros = boton(this, 480, 400, tr('¿De dónde salen los números?', 'Where do the numbers come from?'), () => this.mostrar('numeros'));
    const idiomaBoton = this.botonIdioma('principal');

    texto(this, 480, 470, tr(`Datos cargados: ${SITIOS.length} sitios terrestres · ${Object.keys(DESTINOS).length} destinos`,
      `Data loaded: ${SITIOS.length} Earth sites · ${Object.keys(DESTINOS).length} destinations`),
      { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    texto(this, 480, 500, tr('Flechas o Tab para moverte · 1–4 o Enter para elegir · Esc para volver · También con toque',
      'Arrows or Tab to move · 1–4 or Enter to choose · Esc to go back · Touch works too'),
      { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    // Atajos 1–4 y opción sugerida (⏎), igual que Resultados.js.
    this.teclado.numerar([nueva, continuar, explorador, numeros]);
    (g ? continuar : nueva).setSugerido(true);
    this.teclado.poner([nueva, continuar, explorador, numeros, idiomaBoton], g ? continuar : nueva);
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
    texto(this, 480, 60, tr('¿A dónde va tu robot?', 'Where is your robot going?'), { size: 28, origen: [0.5, 0.5] });
    texto(this, 480, 96, tr('Misma mecánica en los dos destinos: cambian la gravedad, el perfil del destino y los sitios análogos',
      'Same mechanics at both destinations: gravity, destination profile and analog sites change'),
      { size: 12, color: COLOR.tenue, origen: [0.5, 0.5] });

    const ids = [...ORDEN_DESTINOS.filter((id) => DESTINOS[id]), ...Object.keys(DESTINOS).filter((id) => !ORDEN_DESTINOS.includes(id))];
    const ancho = 380;
    const x0 = 480 - (ids.length * ancho + (ids.length - 1) * 30) / 2;
    const botones = ids.map((id, i) => {
      const d = DESTINOS[id];
      const x = x0 + i * (ancho + 30);
      panel(this, x, 130, ancho, 250);
      const n = sitiosParaDestino(SITIOS, id).length;
      const g = typeof d.gravedad_ms2 === 'number' ? d.gravedad_ms2 : GRAVEDAD[d.mundo];
      texto(this, x + ancho / 2, 160, (MUNDOS[d.mundo] || d.mundo).toUpperCase(), { size: 24, origen: [0.5, 0.5] });
      texto(this, x + ancho / 2, 200, trDato(d, 'nombre'), { size: 13, color: COLOR.tenue, origen: [0.5, 0.5], ancho: ancho - 30, alinear: 'center' });
      texto(this, x + 20, 245, tr(`Gravedad: ${g} m/s² (Tierra: ${GRAVEDAD.tierra})`, `Gravity: ${g} m/s² (Earth: ${GRAVEDAD.tierra})`), { size: 13 });
      texto(this, x + 20, 270, n ? tr(`Sitios análogos sugeridos: ${n}`, `Suggested analog sites: ${n}`)
        : tr('Sitios análogos sugeridos: sin dato aún', 'Suggested analog sites: no data yet'),
        { size: 13, color: n ? COLOR.texto : COLOR.alerta });
      texto(this, x + 20, 295, tr('La gravedad del destino solo se usa en la misión,\nnunca en la prueba terrestre.',
        'Destination gravity is used only in the mission,\nnever in the Earth test.'), { size: 11, color: COLOR.muyTenue });
      return boton(this, x + ancho / 2, 350, `${tr('Elegir', 'Choose')} ${MUNDOS[d.mundo] || trDato(d, 'nombre')}`, () => this.empezar(id));
    });

    const hayGuardado = !!guardadoDisponible(DESTINOS);
    texto(this, 480, 410, tr(`Empiezas con ${TICKETS_POR_PARTIDA} tickets de prueba y ${PRESUPUESTO_INICIAL} créditos (valores de juego).`,
      `You start with ${TICKETS_POR_PARTIDA} test tickets and ${PRESUPUESTO_INICIAL} credits (game values).`),
      { size: 12, color: COLOR.tenue, origen: [0.5, 0.5] });
    if (hayGuardado) {
      texto(this, 480, 432, tr('Ojo: una partida nueva reemplaza la partida guardada.', 'Heads up: a new game replaces the saved game.'),
        { size: 12, color: COLOR.alerta, origen: [0.5, 0.5] });
    }
    const volver = boton(this, 480, 480, tr('Volver', 'Back'), () => this.mostrar('principal'));
    const preferido = botones[ids.indexOf(partida.destino)] || botones[ids.indexOf(DESTINO_POR_DEFECTO)] || botones[0];
    // Atajos: 1 = Marte, 2 = Luna (orden de ORDEN_DESTINOS); el último número vuelve al menú.
    this.teclado.numerar([...botones, volver]);
    preferido?.setSugerido(true);
    this.teclado.poner([...botones, volver, this.botonIdioma('destino')], preferido);
  }

  empezar(destinoId) {
    nuevaPartida(partida, destinoId, { presupuesto: PRESUPUESTO_INICIAL, tickets: TICKETS_POR_PARTIDA });
    irA(this, 'Expediente');
  }
}
