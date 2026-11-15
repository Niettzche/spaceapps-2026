import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { COLOR, texto, boton, panel, Teclado } from './expediente/interfaz.js';
import { GRAVEDAD, TICKETS_POR_PARTIDA } from '../config/world.js';
import { elegirSitio, sitioPagado, tomarSitioPedido } from './expediente/guardado.js';
import { DESTINO_POR_DEFECTO, urlFicha } from './expediente/config.js';
import {
  sitiosParaDestino, filasComparacion, limitesDe, formatoValor, formatoPorcentaje, esDemostracion, recortar, sinDato, esMina } from './expediente/logica.js';
import { perfilDeSitio, perfilDeDestino } from '../fisica/perfil.js';
import { lineasRecorrido } from '../fisica/estadisticas.js';
import { ESTADOS, MUNDOS, PRUEBAS } from './expediente/textos.js';
import { prepararIngles, enIdioma } from './expediente/datos_en.js';
import { tr, trDato } from '../i18n.js';

// Dueño: frente expediente. Comparación 1 a 1: sitio terrestre (izq.) vs destino (der.), misma variable y unidad,
// con fuente y fecha de cada lado. Lista de sitios a la izquierda (sugeridos por el modelo para el destino elegido).
const POR_PAGINA = 8;
const X0 = 300; // inicio del panel de detalle
const X1 = 945; // fin del panel de detalle
const XM = (X0 + X1) / 2;

export default class Expediente extends Phaser.Scene {
  constructor() { super('Expediente'); }

  create() {
    prepararIngles();
    // La instancia de la escena se reutiliza entre visitas: reinicia el estado propio.
    this.botonesDetalle = null; this.botonesLista = []; this.foco = null; this.filaActual = null; this.filas = null;
    if (!DESTINOS[partida.destino]) partida.destino = DESTINOS[DESTINO_POR_DEFECTO] ? DESTINO_POR_DEFECTO : Object.keys(DESTINOS)[0];
    this.destino = DESTINOS[partida.destino] || null;
    this.sitios = sitiosParaDestino(SITIOS, partida.destino);
    // Si viene del Explorador ("Abrir su Expediente"), se selecciona ese sitio; si no, el que está en juego.
    const pedido = tomarSitioPedido();
    const i = Math.max(0, this.sitios.findIndex((s) => s.id === (pedido ?? partida.sitio?.id)));
    this.seleccion = this.sitios[i] || null;
    this.pagina = Math.floor(i / POR_PAGINA);
    this.teclado = new Teclado(this, { alEscape: () => irA(this, 'Menu') });
    this.dibujarFijo(); // primero: el panel de fondo queda debajo de la lista
    this.capaLista = this.add.container(0, 0);
    this.capaDetalle = this.add.container(0, 0);
    this.dibujarLista();
    this.dibujarDetalle();
  }

  // ---------- Encabezado y lista ----------

  dibujarFijo() {
    const d = this.destino;
    const mundo = d ? MUNDOS[d.mundo] || d.mundo : sinDato();
    texto(this, 15, 12, tr('EXPEDIENTE', 'SITE FILE'), { size: 20 });
    texto(this, 15, 38, `${tr('Destino', 'Destination')}: ${mundo} · ${d ? trDato(d, 'nombre') : sinDato()}`, { size: 12, color: COLOR.tenue, ancho: 270 });
    panel(this, 10, 80, 280, 400);
  }

  dibujarLista() {
    this.capaLista.removeAll(true);
    const add = (o) => { this.capaLista.add(o.obj || o); return o; };
    const enPagina = Math.min(POR_PAGINA, this.sitios.length - this.pagina * POR_PAGINA);
    const atajo = enPagina > 0 ? tr(` · teclas 1–${enPagina}`, ` · keys 1–${enPagina}`) : '';
    add(texto(this, 20, 88, `${tr('Sitios sugeridos', 'Suggested sites')} (${this.sitios.length})${atajo}`, { size: 12, color: COLOR.tenue }));
    this.botonesLista = [];
    if (!this.sitios.length) {
      add(texto(this, 20, 120, tr('El modelo aún no tiene sitios para este destino. Elige otro destino desde el menú.',
        'The model has no sites for this destination yet. Pick another destination from the menu.'),
        { size: 12, color: COLOR.alerta, ancho: 260 }));
    }
    const desde = this.pagina * POR_PAGINA;
    this.sitios.slice(desde, desde + POR_PAGINA).forEach((s, k) => {
      const y = 112 + k * 42;
      const marca = s.id === this.seleccion?.id ? '● ' : '';
      const b = add(boton(this, 20, y, `${marca}${recortar(trDato(s, 'nombre'), 25)}`, () => this.seleccionar(s),
        // Zona táctil: toda la fila (nombre y subtítulo), sin encimarse con la siguiente (filas cada 42 px).
        { size: 13, origen: [0, 0], marco: false, color: s.id === this.seleccion?.id ? COLOR.texto : COLOR.acento, anchoMin: 262, altoMin: 40 }));
      const est = (esMina(s) && ESTADOS.mina) || ESTADOS[s.estado] || { texto: s.estado, color: COLOR.tenue };
      const total = typeof s.similitud?.total === 'number' ? formatoPorcentaje(s.similitud.total) : null;
      const sub = [est.texto, s.prueba_util ? `${tr('prueba', 'test')}: ${PRUEBAS[s.prueba_util] || s.prueba_util}` : null, total].filter(Boolean).join(' · ');
      add(texto(this, 34, y + 17, recortar(sub, 38), { size: 10, color: esDemostracion(s) ? COLOR.alerta : COLOR.muyTenue }));
      b.sitioId = s.id;
      this.botonesLista.push(b);
    });
    const paginas = Math.max(1, Math.ceil(this.sitios.length / POR_PAGINA));
    this.botonAnterior = add(boton(this, 60, 455, '◀', () => this.cambiarPagina(-1, 'anterior'), { size: 14, habilitado: this.pagina > 0 }));
    add(texto(this, 150, 455, `${tr('pág.', 'p.')} ${this.pagina + 1}/${paginas}`, { size: 12, color: COLOR.tenue, origen: [0.5, 0.5] }));
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
    // Elegir un sitio (número, Enter o toque) lleva el foco a "Gastar 1 ticket": el siguiente Enter confirma.
    this.foco = 'probar';
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
      add(texto(this, XM, 250, !d ? tr('Sin destino cargado (data/targets).', 'No destination loaded (data/targets).') : tr('Elige un sitio de la lista.', 'Pick a site from the list.'), { size: 14, color: COLOR.tenue, origen: [0.5, 0.5] }));
      this.dibujarAcciones(add);
      return;
    }

    // Encabezado del sitio
    const est = (esMina(s) && ESTADOS.mina) || ESTADOS[s.estado] || { texto: s.estado, color: COLOR.tenue };
    const nombre = trDato(s, 'nombre');
    const proceso = trDato(s, 'proceso') || sinDato();
    const uso = trDato(s, 'uso_exploracion') || sinDato();
    add(texto(this, X0, 12, recortar(nombre, 42), { size: 18 }));
    const coord = typeof s.lat === 'number' && typeof s.lon === 'number' ? `${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}` : tr('coordenadas: sin dato', 'coordinates: no data');
    add(texto(this, X0, 36, `${est.texto} · ${s.pais || tr('país: sin dato', 'country: no data')} · ${coord}${s.novedoso === true ? tr(' · NOVEDOSO', ' · NOVEL') : ''}`,
      { size: 11, color: est.color }));
    add(texto(this, X1, 12, `${tr('Similitud total', 'Total similarity')} ${formatoPorcentaje(s.similitud?.total)}`, { size: 14, color: COLOR.acento, origen: [1, 0] }));
    add(texto(this, X1, 32, `${tr('confianza', 'confidence')} ${formatoPorcentaje(s.similitud?.confianza)}`, { size: 11, color: COLOR.tenue, origen: [1, 0] }));
    add(texto(this, X0, 52, recortar(`${tr('Proceso', 'Process')}: ${proceso}`, 92), { size: 11, color: COLOR.tenue }));
    add(texto(this, X0, 66, recortar(`${tr('Uso para la exploración', 'Use for exploration')}: ${uso}`, 92), { size: 11, color: COLOR.tenue }));

    let y = 84;
    if (esDemostracion(s)) {
      add(this.add.rectangle(X0, y, X1 - X0, 18, 0x4a1020).setOrigin(0, 0));
      add(texto(this, XM, y + 9, tr('ILUSTRATIVO · datos de demostración: no son mediciones del sitio', 'ILLUSTRATIVE · demo data: not measurements of the site'), { size: 11, color: '#ffb3c1', origen: [0.5, 0.5] }));
      y += 22;
    }

    // Cabecera de columnas: Tierra a la izquierda, destino a la derecha.
    add(texto(this, X0, y, `${tr('TIERRA', 'EARTH')} · ${recortar(nombre, 26)}`, { size: 11, color: COLOR.foco }));
    add(texto(this, XM, y, 'variable', { size: 11, color: COLOR.muyTenue, origen: [0.5, 0] }));
    add(texto(this, X1, y, `${(MUNDOS[d.mundo] || d.mundo).toUpperCase()} · ${recortar(trDato(d, 'nombre'), 24)}`, { size: 11, color: COLOR.foco, origen: [1, 0] }));
    y += 16;

    const { filas, soloTierra } = filasComparacion(s, d);
    this.filas = filas;
    const alto = 36;
    filas.forEach((f) => {
      const fondo = add(this.add.rectangle(X0 - 4, y - 2, X1 - X0 + 8, alto - 2, COLOR.resalte, 0.55).setOrigin(0, 0));
      fondo.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.mostrarFuentes(f));
      const vt = formatoValor(f.tierra);
      const vd = f.destino?.texto && f.destino.valor == null ? f.destino.texto : formatoValor(f.destino);
      add(texto(this, X0, y, recortar(vt, 24), { size: 14, color: vt === sinDato() ? COLOR.muyTenue : COLOR.texto }));
      add(texto(this, XM, y, f.etiqueta, { size: 12, color: COLOR.acento, origen: [0.5, 0] }));
      add(texto(this, X1, y, recortar(vd, 24), { size: 14, color: vd === sinDato() ? COLOR.muyTenue : COLOR.texto, origen: [1, 0] }));
      const simil = f.mismaUnidad ? `${tr('similitud', 'similarity')} ${formatoPorcentaje(f.similitud)}` : tr('⚠ unidades distintas', '⚠ different units');
      add(texto(this, XM, y + 16, simil, { size: 10, color: f.mismaUnidad ? COLOR.tenue : COLOR.alerta, origen: [0.5, 0] }));
      add(texto(this, X0, y + 17, recortar(fuenteCorta(f.tierra), 34), { size: 10, color: COLOR.muyTenue }));
      add(texto(this, X1, y + 17, recortar(fuenteCorta(f.destino), 34), { size: 10, color: COLOR.muyTenue, origen: [1, 0] }));
      y += alto;
    });
    if (!filas.length) {
      add(texto(this, XM, y + 10, tr('Sin variables comparables entre el sitio y el destino.', 'No comparable variables between the site and the destination.'), { size: 12, color: COLOR.muyTenue, origen: [0.5, 0] }));
      y += 30;
    }
    if (soloTierra.length) {
      const lista = soloTierra.map((x) => `${x.etiqueta} ${formatoValor(x.variable)}`).join(' · ');
      add(texto(this, X0, y + 2, `${tr('Solo medido en la Tierra', 'Measured only on Earth')}: ${lista}`, { size: 10, color: COLOR.tenue, ancho: X1 - X0 }));
      y += 28;
    }
    y = this.dibujarLimites(add, s, d, Math.max(y + 2, 290));
    y = this.dibujarRecorrido(add, s, d, y + 4);
    this.yInfo = y + 4;
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
    add(texto(this, X0, y + 4, tr('LO QUE LA TIERRA NO PUEDE PROBAR', 'WHAT EARTH CANNOT TEST'), { size: 11, color: COLOR.acento }));
    const partes = noReproducible.map((l) => (l.clave === 'gravedad' && typeof d.gravedad_ms2 === 'number'
      ? tr(`Gravedad (${mundo} ${d.gravedad_ms2} vs Tierra ${GRAVEDAD.tierra} m/s²; solo en la misión)`,
        `Gravity (${mundo} ${d.gravedad_ms2} vs Earth ${GRAVEDAD.tierra} m/s²; mission only)`)
      : l.etiqueta));
    const linea = partes.length ? partes.join(' · ') : tr('sin dato (el destino no declara límites)', 'no data (the destination declares no limits)');
    add(texto(this, X0, y + 20, recortar(linea, 200), { size: 11, color: COLOR.texto, ancho: X1 - X0 }));
    return y + alto;
  }

  // Lo que va a enfrentar el robot: el MISMO tramo que arma la escena (fisica/perfil.js), con desnivel, pendientes,
  // suelos y la condición crítica (fisica/estadisticas.js). Prueba en la Tierra (izq.) y misión en el destino (der.).
  dibujarRecorrido(add, s, d, y) {
    const alto = 74;
    const mitad = (X1 - X0) / 2;
    add(this.add.rectangle(X0 - 4, y, X1 - X0 + 8, alto, 0x10202a).setOrigin(0, 0).setStrokeStyle(1, 0x2a5a6b));
    const columna = (x, titulo, lineas) => {
      add(texto(this, x, y + 4, titulo, { size: 11, color: COLOR.acento }));
      lineas.forEach((l, i) => add(texto(this, x, y + 19 + i * 13, recortar(l, 52),
        { size: 10, color: i === lineas.length - 1 ? COLOR.texto : COLOR.tenue })));
    };
    let tierra;
    let destino;
    try { tierra = lineasRecorrido(perfilDeSitio(s), 'tierra'); } catch { tierra = [sinDato()]; }
    try { destino = lineasRecorrido(perfilDeDestino(d), d.mundo); } catch { destino = [sinDato()]; }
    const mundo = MUNDOS[d.mundo] || d.mundo;
    columna(X0, tr('RECORRIDO DE LA PRUEBA (TIERRA)', 'TEST ROUTE (EARTH)'), tierra);
    columna(X0 + mitad + 6, tr(`RECORRIDO DE LA MISIÓN (${String(mundo).toUpperCase()})`, `MISSION ROUTE (${String(mundo).toUpperCase()})`), destino);
    return y + alto;
  }

  // Caja inferior: por defecto proceso, uso y notas del cálculo; al tocar una fila, fuente, fecha y nota de ambos lados.
  mostrarInfoInicial() {
    this.capaInfo.removeAll(true);
    const s = this.seleccion;
    const { notas } = limitesDe(s, this.destino);
    const lineas = [
      `${tr('Proceso', 'Process')}: ${trDato(s, 'proceso') || sinDato()}`,
      `${tr('Uso para la exploración', 'Use for exploration')}: ${trDato(s, 'uso_exploracion') || sinDato()}`,
      ...notas.map((n) => `${tr('Límite del cálculo', 'Calculation limit')}: ${enIdioma(n)}`),
      tr('Toca una fila (o pulsa F) para ver fuente, fecha y nota completas de cada lado.',
        'Tap a row (or press F) to see the full source, date and note for each side.'),
    ];
    // Máximo 4 líneas: debajo están los botones de acción (y ≈ 495).
    const t = texto(this, X0, this.yInfo, lineas.join('\n'), { size: 10, color: COLOR.muyTenue, ancho: X1 - X0 });
    const env = t.getWrappedText(t.text);
    if (env.length > 4) t.setText([...env.slice(0, 3), `${env[3].slice(0, -1)}…`]);
    this.capaInfo.add(t);
  }

  mostrarFuentes(f) {
    this.capaInfo.removeAll(true);
    const lado = (v) => {
      if (!v) return sinDato();
      const nota = trDato(v, 'nota');
      return `${trDato(v, 'fuente') || tr('fuente: sin dato', 'source: no data')} · ${tr('fecha', 'date')}: ${trDato(v, 'fecha') || sinDato()}`
        + (nota ? `\n  ${tr('nota', 'note')}: ${nota}` : '');
    };
    let t = `${f.etiqueta}\n${tr('Tierra', 'Earth')}: ${lado(f.tierra)}\n${tr('Destino', 'Destination')}: ${lado(f.destino)}`;
    if (f.detalleForma) t += `\n${tr('Puntaje de forma', 'Shape score')}: ${formatoValor(f.detalleForma)} · ${trDato(f.detalleForma, 'nota') || ''}`;
    this.capaInfo.add(texto(this, X0, this.yInfo, recortar(t, 620), { size: 10, color: COLOR.tenue, ancho: X1 - X0 }));
  }

  dibujarAcciones(add) {
    const volver = add(boton(this, 60, 515, tr('Menú', 'Menu'), () => irA(this, 'Menu'), { size: 14 }));
    // Tickets (AGENTS.md §4): 3 por partida, sin reposición; volver a probar un sitio ya pagado no cuesta.
    const n = Math.max(0, partida.tickets | 0);
    const total = Math.max(TICKETS_POR_PARTIDA, n);
    const fichas = '●'.repeat(n) + '○'.repeat(total - n);
    add(texto(this, 150, 506, `${tr('Tickets de prueba', 'Test tickets')} ${fichas} ${n}/${total}`, { size: 13, color: n ? COLOR.acento : COLOR.alerta }));
    const s = this.seleccion;
    const pagado = s && sitioPagado(partida, s.id);
    let etiqueta = tr('Gastar 1 ticket y probar', 'Spend 1 ticket and test');
    let ayuda = tr('Enter confirma. Al probar, el sitio queda pagado: puedes volver a probarlo sin gastar otro ticket.',
      'Enter confirms. Once tested, the site is paid for: you can test it again without spending another ticket.');
    if (pagado) {
      etiqueta = tr('Probar de nuevo', 'Test again');
      ayuda = tr('Enter confirma. Ya pagaste este sitio: no gasta ticket.', 'Enter confirms. You already paid for this site: no ticket spent.');
    } else if (!n) {
      etiqueta = tr('Sin tickets', 'No tickets');
      ayuda = tr('Sin tickets: elige un sitio ya pagado o empieza una Nueva partida desde el menú.',
        'No tickets: pick a site you already paid for or start a New game from the menu.');
    }
    const puede = !!s && (pagado || n > 0);
    // Opción sugerida (⏎, como en Resultados.js): es la que confirma el paso del camino dorado.
    const probar = add(boton(this, 800, 506, etiqueta, () => this.probar(), { size: 16, habilitado: puede, sugerido: puede }));
    add(texto(this, 150, 526, ayuda, { size: 10, color: COLOR.muyTenue }));
    const url = urlFicha(s);
    const ficha = add(boton(this, 535, 506, url ? tr('Ficha completa ↗', 'Full fact sheet ↗') : tr('Ficha web: sin enlace', 'Web fact sheet: no link'), () => this.abrirFicha(url),
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
    irA(this, 'Taller');
  }

  registrarTeclado() {
    if (!this.botonesDetalle) return;
    this.teclado.extra = {
      f: () => this.ciclarFila(), F: () => this.ciclarFila(),
      PageDown: () => this.cambiarPagina(1), PageUp: () => this.cambiarPagina(-1),
    };
    const preferido = {
      seleccion: this.botonesLista.find((b) => b.sitioId === this.seleccion?.id),
      probar: this.botonesDetalle?.[0]?.habilitado ? this.botonesDetalle[0] : this.botonesLista.find((b) => b.sitioId === this.seleccion?.id),
      anterior: this.botonAnterior.habilitado ? this.botonAnterior : this.botonSiguiente,
      siguiente: this.botonSiguiente.habilitado ? this.botonSiguiente : this.botonAnterior,
      lista: this.botonesLista[0],
    }[this.foco] || this.botonesLista.find((b) => b.sitioId === this.seleccion?.id);
    // Atajos 1–8: eligen el sitio de esa posición en la página (igual que los números de Resultados.js).
    this.teclado.numerar(this.botonesLista);
    this.teclado.poner([...this.botonesLista, this.botonAnterior, this.botonSiguiente, ...this.botonesDetalle, this.botonVolver], preferido);
  }

  ciclarFila() {
    if (!this.filas?.length) return;
    this.filaActual = ((this.filaActual ?? -1) + 1) % this.filas.length;
    this.mostrarFuentes(this.filas[this.filaActual]);
  }
}

function fuenteCorta(v) {
  const sinFuente = tr('fuente: sin dato', 'source: no data');
  if (!v) return sinFuente;
  const fecha = trDato(v, 'fecha');
  return `${trDato(v, 'fuente') || sinFuente}${fecha ? ` · ${fecha}` : ''}`;
}
