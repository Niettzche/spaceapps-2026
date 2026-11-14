import Phaser from 'phaser';
import { SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { COLOR, texto, boton, panel, Teclado } from './expediente/interfaz.js';
import { GRAVEDAD, TICKETS_POR_PARTIDA } from '../config/world.js';
import { elegirSitio, sitioPagado } from './expediente/guardado.js';
import { DESTINO_POR_DEFECTO, urlFicha } from './expediente/config.js';
import {
  sitiosParaDestino, filasComparacion, limitesDe, formatoValor, formatoPorcentaje, esDemostracion, recortar, SIN_DATO,
} from './expediente/logica.js';
import { ESTADOS, MUNDOS, PRUEBAS } from './expediente/textos.js';

// Dueño: frente expediente. Comparación 1 a 1: sitio terrestre (izq.) vs destino (der.), misma variable y unidad,
// con fuente y fecha de cada lado. Lista de sitios a la izquierda (sugeridos por el modelo para el destino elegido).
const POR_PAGINA = 8;
const X0 = 300; // inicio del panel de detalle
const X1 = 945; // fin del panel de detalle
const XM = (X0 + X1) / 2;

export default class Expediente extends Phaser.Scene {
  constructor() { super('Expediente'); }

  create() {
    // La instancia de la escena se reutiliza entre visitas: reinicia el estado propio.
    this.botonesDetalle = null; this.botonesLista = []; this.foco = null; this.filaActual = null; this.filas = null;
    if (!DESTINOS[partida.destino]) partida.destino = DESTINOS[DESTINO_POR_DEFECTO] ? DESTINO_POR_DEFECTO : Object.keys(DESTINOS)[0];
    this.destino = DESTINOS[partida.destino] || null;
    this.sitios = sitiosParaDestino(SITIOS, partida.destino);
    const i = Math.max(0, this.sitios.findIndex((s) => s.id === partida.sitio?.id));
    this.seleccion = this.sitios[i] || null;
    this.pagina = Math.floor(i / POR_PAGINA);
    this.teclado = new Teclado(this, { alEscape: () => this.scene.start('Menu') });
    this.dibujarFijo(); // primero: el panel de fondo queda debajo de la lista
    this.capaLista = this.add.container(0, 0);
    this.capaDetalle = this.add.container(0, 0);
    this.dibujarLista();
    this.dibujarDetalle();
  }

  // ---------- Encabezado y lista ----------

  dibujarFijo() {
    const d = this.destino;
    const mundo = d ? MUNDOS[d.mundo] || d.mundo : SIN_DATO;
    texto(this, 15, 12, 'EXPEDIENTE', { size: 20 });
    texto(this, 15, 38, `Destino: ${mundo} · ${d ? d.nombre : SIN_DATO}`, { size: 12, color: COLOR.tenue, ancho: 270 });
    panel(this, 10, 80, 280, 400);
  }

  dibujarLista() {
    this.capaLista.removeAll(true);
    const add = (o) => { this.capaLista.add(o.obj || o); return o; };
    add(texto(this, 20, 88, `Sitios sugeridos (${this.sitios.length})`, { size: 12, color: COLOR.tenue }));
    this.botonesLista = [];
    if (!this.sitios.length) {
      add(texto(this, 20, 120, 'El modelo aún no tiene sitios para este destino. Elige otro destino desde el menú.',
        { size: 12, color: COLOR.alerta, ancho: 260 }));
    }
    const desde = this.pagina * POR_PAGINA;
    this.sitios.slice(desde, desde + POR_PAGINA).forEach((s, k) => {
      const y = 112 + k * 42;
      const marca = s.id === this.seleccion?.id ? '● ' : '';
      const b = add(boton(this, 20, y, `${marca}${recortar(s.nombre, 30)}`, () => this.seleccionar(s),
        { size: 13, origen: [0, 0], marco: false, color: s.id === this.seleccion?.id ? COLOR.texto : COLOR.acento }));
      const est = ESTADOS[s.estado] || { texto: s.estado, color: COLOR.tenue };
      const total = typeof s.similitud?.total === 'number' ? formatoPorcentaje(s.similitud.total) : null;
      const sub = [est.texto, s.prueba_util ? `prueba: ${PRUEBAS[s.prueba_util] || s.prueba_util}` : null, total].filter(Boolean).join(' · ');
      add(texto(this, 34, y + 17, recortar(sub, 38), { size: 10, color: esDemostracion(s) ? COLOR.alerta : COLOR.muyTenue }));
      b.sitioId = s.id;
      this.botonesLista.push(b);
    });
    const paginas = Math.max(1, Math.ceil(this.sitios.length / POR_PAGINA));
    this.botonAnterior = add(boton(this, 60, 455, '◀', () => this.cambiarPagina(-1, 'anterior'), { size: 14, habilitado: this.pagina > 0 }));
    add(texto(this, 150, 455, `pág. ${this.pagina + 1}/${paginas}`, { size: 12, color: COLOR.tenue, origen: [0.5, 0.5] }));
    this.botonSiguiente = add(boton(this, 240, 455, '▶', () => this.cambiarPagina(1, 'siguiente'), { size: 14, habilitado: this.pagina < paginas - 1 }));
    this.registrarTeclado();
  }

  cambiarPagina(paso, foco) {
    const paginas = Math.ceil(this.sitios.length / POR_PAGINA);
    this.pagina = Phaser.Math.Clamp(this.pagina + paso, 0, Math.max(0, paginas - 1));
    this.foco = foco || 'lista';
    this.dibujarLista();
  }

  seleccionar(s) {
    this.seleccion = s;
    this.foco = 'seleccion';
    this.filaActual = null;
    this.dibujarLista();
    this.dibujarDetalle();
  }

  // ---------- Detalle: comparación 1 a 1 ----------

  dibujarDetalle() {
    this.capaDetalle.removeAll(true);
    const add = (o) => { this.capaDetalle.add(o.obj || o); return o; };
    this.botonesDetalle = [];
    const s = this.seleccion;
    const d = this.destino;
    if (!s || !d) {
      add(texto(this, XM, 250, !d ? 'Sin destino cargado (data/targets).' : 'Elige un sitio de la lista.', { size: 14, color: COLOR.tenue, origen: [0.5, 0.5] }));
      this.dibujarAcciones(add);
      return;
    }

    // Encabezado del sitio
    const est = ESTADOS[s.estado] || { texto: s.estado, color: COLOR.tenue };
    add(texto(this, X0, 12, recortar(s.nombre, 42), { size: 18 }));
    const coord = typeof s.lat === 'number' && typeof s.lon === 'number' ? `${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}` : 'coordenadas: sin dato';
    add(texto(this, X0, 36, `${est.texto} · ${s.pais || 'país: sin dato'} · ${coord}${s.novedoso === true ? ' · NOVEDOSO' : ''}`,
      { size: 11, color: est.color }));
    add(texto(this, X1, 12, `Similitud total ${formatoPorcentaje(s.similitud?.total)}`, { size: 14, color: COLOR.acento, origen: [1, 0] }));
    add(texto(this, X1, 32, `confianza ${formatoPorcentaje(s.similitud?.confianza)}`, { size: 11, color: COLOR.tenue, origen: [1, 0] }));
    add(texto(this, X0, 52, recortar(`Proceso: ${s.proceso || SIN_DATO}`, 92), { size: 11, color: COLOR.tenue }));
    add(texto(this, X0, 66, recortar(`Uso para la exploración: ${s.uso_exploracion || SIN_DATO}`, 92), { size: 11, color: COLOR.tenue }));

    let y = 84;
    if (esDemostracion(s)) {
      add(this.add.rectangle(X0, y, X1 - X0, 18, 0x4a1020).setOrigin(0, 0));
      add(texto(this, XM, y + 9, 'ILUSTRATIVO · datos de demostración: no son mediciones del sitio', { size: 11, color: '#ffb3c1', origen: [0.5, 0.5] }));
      y += 22;
    }

    // Cabecera de columnas: Tierra a la izquierda, destino a la derecha.
    add(texto(this, X0, y, `TIERRA · ${recortar(s.nombre, 26)}`, { size: 11, color: COLOR.foco }));
    add(texto(this, XM, y, 'variable', { size: 11, color: COLOR.muyTenue, origen: [0.5, 0] }));
    add(texto(this, X1, y, `${(MUNDOS[d.mundo] || d.mundo).toUpperCase()} · ${recortar(d.nombre, 24)}`, { size: 11, color: COLOR.foco, origen: [1, 0] }));
    y += 16;

    const { filas, soloTierra } = filasComparacion(s, d);
    this.filas = filas;
    const alto = 36;
    filas.forEach((f) => {
      const fondo = add(this.add.rectangle(X0 - 4, y - 2, X1 - X0 + 8, alto - 2, COLOR.resalte, 0.55).setOrigin(0, 0));
      fondo.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.mostrarFuentes(f));
      const vt = formatoValor(f.tierra);
      const vd = f.destino?.texto && f.destino.valor == null ? f.destino.texto : formatoValor(f.destino);
      add(texto(this, X0, y, recortar(vt, 24), { size: 14, color: vt === SIN_DATO ? COLOR.muyTenue : COLOR.texto }));
      add(texto(this, XM, y, f.etiqueta, { size: 12, color: COLOR.acento, origen: [0.5, 0] }));
      add(texto(this, X1, y, recortar(vd, 24), { size: 14, color: vd === SIN_DATO ? COLOR.muyTenue : COLOR.texto, origen: [1, 0] }));
      const simil = f.mismaUnidad ? `similitud ${formatoPorcentaje(f.similitud)}` : '⚠ unidades distintas';
      add(texto(this, XM, y + 16, simil, { size: 10, color: f.mismaUnidad ? COLOR.tenue : COLOR.alerta, origen: [0.5, 0] }));
      add(texto(this, X0, y + 17, recortar(fuenteCorta(f.tierra), 34), { size: 10, color: COLOR.muyTenue }));
      add(texto(this, X1, y + 17, recortar(fuenteCorta(f.destino), 34), { size: 10, color: COLOR.muyTenue, origen: [1, 0] }));
      y += alto;
    });
    if (!filas.length) {
      add(texto(this, XM, y + 10, 'Sin variables comparables entre el sitio y el destino.', { size: 12, color: COLOR.muyTenue, origen: [0.5, 0] }));
      y += 30;
    }
    if (soloTierra.length) {
      const lista = soloTierra.map((x) => `${x.etiqueta} ${formatoValor(x.variable)}`).join(' · ');
      add(texto(this, X0, y + 2, `Solo medido en la Tierra: ${lista}`, { size: 10, color: COLOR.tenue, ancho: X1 - X0 }));
      y += 28;
    }
    y = this.dibujarLimites(add, s, d, Math.max(y + 2, 300));
    this.yInfo = y + 6;
    this.capaInfo = this.add.container(0, 0);
    add(this.capaInfo);
    this.mostrarInfoInicial();
    this.dibujarAcciones(add);
  }

  // Lo que la Tierra no puede probar (AGENTS.md §5 y §6.3): siempre visible, nunca se atribuye al análogo.
  dibujarLimites(add, s, d, y) {
    const { noReproducible } = limitesDe(s, d);
    const mundo = MUNDOS[d.mundo] || d.mundo;
    const alto = 52;
    add(this.add.rectangle(X0 - 4, y, X1 - X0 + 8, alto, 0x2a1a10).setOrigin(0, 0).setStrokeStyle(1, 0x6b4a2a));
    add(texto(this, X0, y + 4, 'LO QUE LA TIERRA NO PUEDE PROBAR', { size: 11, color: COLOR.acento }));
    const partes = noReproducible.map((l) => (l.clave === 'gravedad' && typeof d.gravedad_ms2 === 'number'
      ? `Gravedad (${mundo} ${d.gravedad_ms2} vs Tierra ${GRAVEDAD.tierra} m/s²; solo en la misión)`
      : l.etiqueta));
    const linea = partes.length ? partes.join(' · ') : 'sin dato (el destino no declara límites)';
    add(texto(this, X0, y + 20, recortar(linea, 200), { size: 11, color: COLOR.texto, ancho: X1 - X0 }));
    return y + alto;
  }

  // Caja inferior: por defecto proceso, uso y notas del cálculo; al tocar una fila, fuente, fecha y nota de ambos lados.
  mostrarInfoInicial() {
    this.capaInfo.removeAll(true);
    const s = this.seleccion;
    const { notas } = limitesDe(s, this.destino);
    const lineas = [
      `Proceso: ${s.proceso || SIN_DATO}`,
      `Uso para la exploración: ${s.uso_exploracion || SIN_DATO}`,
      ...notas.map((n) => `Límite del cálculo: ${n}`),
      'Toca una fila (o pulsa F) para ver fuente, fecha y nota completas de cada lado.',
    ];
    this.capaInfo.add(texto(this, X0, this.yInfo, recortar(lineas.join('\n'), 640), { size: 10, color: COLOR.muyTenue, ancho: X1 - X0 }));
  }

  mostrarFuentes(f) {
    this.capaInfo.removeAll(true);
    const lado = (v) => (v ? `${v.fuente || 'fuente: sin dato'} · fecha: ${v.fecha || SIN_DATO}${v.nota ? `\n  nota: ${v.nota}` : ''}` : SIN_DATO);
    let t = `${f.etiqueta}\nTierra: ${lado(f.tierra)}\nDestino: ${lado(f.destino)}`;
    if (f.detalleForma) t += `\nPuntaje de forma: ${formatoValor(f.detalleForma)} · ${f.detalleForma.nota || ''}`;
    this.capaInfo.add(texto(this, X0, this.yInfo, recortar(t, 620), { size: 10, color: COLOR.tenue, ancho: X1 - X0 }));
  }

  dibujarAcciones(add) {
    const volver = add(boton(this, 60, 515, 'Menú', () => this.scene.start('Menu'), { size: 14 }));
    // Tickets (AGENTS.md §4): 3 por partida, sin reposición; volver a probar un sitio ya pagado no cuesta.
    const n = Math.max(0, partida.tickets | 0);
    const total = Math.max(TICKETS_POR_PARTIDA, n);
    const fichas = '●'.repeat(n) + '○'.repeat(total - n);
    add(texto(this, 150, 506, `Tickets de prueba ${fichas} ${n}/${total}`, { size: 13, color: n ? COLOR.acento : COLOR.alerta }));
    const s = this.seleccion;
    const pagado = s && sitioPagado(s.id);
    let etiqueta = 'Gastar 1 ticket y probar';
    let ayuda = 'Al probar, este sitio queda pagado: puedes volver a probarlo sin gastar otro ticket.';
    if (pagado) { etiqueta = 'Probar de nuevo'; ayuda = 'Ya pagaste este sitio: no gasta ticket.'; }
    else if (!n) { etiqueta = 'Sin tickets'; ayuda = 'Sin tickets: elige un sitio ya pagado o empieza una Nueva partida desde el menú.'; }
    const probar = add(boton(this, 800, 506, etiqueta, () => this.probar(), { size: 16, habilitado: !!s && (pagado || n > 0) }));
    add(texto(this, 150, 526, ayuda, { size: 10, color: COLOR.muyTenue }));
    const url = urlFicha(s);
    const ficha = add(boton(this, 560, 506, url ? 'Ficha completa ↗' : 'Ficha web: sin enlace', () => this.abrirFicha(url),
      { size: 13, habilitado: !!url }));
    this.botonesDetalle = [probar, ficha];
    this.botonVolver = volver;
    this.registrarTeclado();
  }

  // La ficha completa (mapa, gemelo lunar o marciano, método) vive en web/ y no se duplica en el juego (AGENTS.md §8.1).
  abrirFicha(url) {
    if (url) window.open(url, '_blank', 'noopener');
  }

  probar() {
    if (!this.seleccion) return;
    const r = elegirSitio(partida, this.seleccion);
    if (!r.ok) { this.dibujarDetalle(); return; }
    this.scene.start('Taller');
  }

  registrarTeclado() {
    if (!this.botonesDetalle) return;
    this.teclado.extra = {
      f: () => this.ciclarFila(), F: () => this.ciclarFila(),
      PageDown: () => this.cambiarPagina(1), PageUp: () => this.cambiarPagina(-1),
    };
    const preferido = {
      seleccion: this.botonesLista.find((b) => b.sitioId === this.seleccion?.id),
      anterior: this.botonAnterior.habilitado ? this.botonAnterior : this.botonSiguiente,
      siguiente: this.botonSiguiente.habilitado ? this.botonSiguiente : this.botonAnterior,
      lista: this.botonesLista[0],
    }[this.foco] || this.botonesLista.find((b) => b.sitioId === this.seleccion?.id);
    this.teclado.poner([...this.botonesLista, this.botonAnterior, this.botonSiguiente, ...this.botonesDetalle, this.botonVolver], preferido);
  }

  ciclarFila() {
    if (!this.filas?.length) return;
    this.filaActual = ((this.filaActual ?? -1) + 1) % this.filas.length;
    this.mostrarFuentes(this.filas[this.filaActual]);
  }
}

function fuenteCorta(v) {
  if (!v) return 'fuente: sin dato';
  return `${v.fuente || 'fuente: sin dato'}${v.fecha ? ` · ${v.fecha}` : ''}`;
}
