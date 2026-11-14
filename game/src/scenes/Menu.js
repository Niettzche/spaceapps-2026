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

// Dueño: frente expediente. Menú: nueva partida (con elección de destino), continuar, explorador,
// "¿De dónde salen los números?". Es una sola escena con varias vistas (no requiere registrar escenas en main.js).
export default class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(datos) { this.vistaInicial = datos?.vista || 'principal'; }

  create() {
    this.teclado = new Teclado(this);
    this.mostrar(this.vistaInicial);
  }

  mostrar(vista) {
    limpiar(this);
    this.teclado.extra = {};
    this.teclado.alEscape = vista === 'principal' ? null : () => this.mostrar('principal');
    if (vista === 'destino') this.vistaDestino();
    else if (vista === 'numeros') vistaNumeros(this, () => this.mostrar('principal'));
    else this.vistaPrincipal();
  }

  vistaPrincipal() {
    texto(this, 480, 70, 'MISIÓN CERO', { size: 36, origen: [0.5, 0.5] });
    texto(this, 480, 112, 'Prueba tu robot en un análogo de la Tierra antes de mandarlo a la Luna o a Marte',
      { size: 14, color: COLOR.tenue, origen: [0.5, 0.5] });

    const g = guardadoDisponible(DESTINOS);
    const nueva = boton(this, 480, 210, 'Nueva partida', () => this.mostrar('destino'));
    const continuar = boton(this, 480, 260, 'Continuar', () => this.continuar(), { habilitado: !!g });
    const resumen = g ? this.resumenGuardado(g) : 'No hay partida guardada en este navegador';
    texto(this, 480, 284, resumen, { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    const explorador = boton(this, 480, 330, 'Explorador libre', () => irA(this, 'Explorador'));
    texto(this, 480, 354, 'Consulta cualquier coordenada de la Tierra y propón un sitio', { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    const numeros = boton(this, 480, 400, '¿De dónde salen los números?', () => this.mostrar('numeros'));

    texto(this, 480, 470, `Datos cargados: ${SITIOS.length} sitios terrestres · ${Object.keys(DESTINOS).length} destinos`,
      { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    texto(this, 480, 500, 'Flechas o Tab para moverte · Enter para elegir · Esc para volver · También funciona con toque',
      { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    this.teclado.poner([nueva, continuar, explorador, numeros], g ? continuar : nueva);
  }

  resumenGuardado(g) {
    const d = DESTINOS[g.destino];
    const s = g.sitio ? SITIOS.find((x) => x.id === g.sitio) : null;
    const partes = [d ? MUNDOS[d.mundo] || d.nombre : g.destino, s ? s.nombre : 'sin sitio elegido', `${g.tickets} ticket(s)`];
    return `Guardada: ${partes.join(' · ')}`;
  }

  continuar() {
    if (!restaurar(partida, SITIOS, DESTINOS)) { this.mostrar('principal'); return; }
    irA(this, partida.sitio ? 'Taller' : 'Expediente');
  }

  vistaDestino() {
    texto(this, 480, 60, '¿A dónde va tu robot?', { size: 28, origen: [0.5, 0.5] });
    texto(this, 480, 96, 'Misma mecánica en los dos destinos: cambian la gravedad, el perfil del destino y los sitios análogos',
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
      texto(this, x + ancho / 2, 200, d.nombre, { size: 13, color: COLOR.tenue, origen: [0.5, 0.5], ancho: ancho - 30, alinear: 'center' });
      texto(this, x + 20, 245, `Gravedad: ${g} m/s² (Tierra: ${GRAVEDAD.tierra})`, { size: 13 });
      texto(this, x + 20, 270, n ? `Sitios análogos sugeridos: ${n}` : 'Sitios análogos sugeridos: sin dato aún',
        { size: 13, color: n ? COLOR.texto : COLOR.alerta });
      texto(this, x + 20, 295, 'La gravedad del destino solo se usa en la misión,\nnunca en la prueba terrestre.', { size: 11, color: COLOR.muyTenue });
      return boton(this, x + ancho / 2, 350, `Elegir ${MUNDOS[d.mundo] || d.nombre}`, () => this.empezar(id));
    });

    const hayGuardado = !!guardadoDisponible(DESTINOS);
    texto(this, 480, 410, `Empiezas con ${TICKETS_POR_PARTIDA} tickets de prueba y ${PRESUPUESTO_INICIAL} créditos (valores de juego).`,
      { size: 12, color: COLOR.tenue, origen: [0.5, 0.5] });
    if (hayGuardado) texto(this, 480, 432, 'Ojo: una partida nueva reemplaza la partida guardada.', { size: 12, color: COLOR.alerta, origen: [0.5, 0.5] });
    const volver = boton(this, 480, 480, 'Volver', () => this.mostrar('principal'));
    const preferido = botones[ids.indexOf(partida.destino)] || botones[ids.indexOf(DESTINO_POR_DEFECTO)] || botones[0];
    this.teclado.poner([...botones, volver], preferido);
  }

  empezar(destinoId) {
    nuevaPartida(partida, destinoId, { presupuesto: PRESUPUESTO_INICIAL, tickets: TICKETS_POR_PARTIDA });
    irA(this, 'Expediente');
  }
}
