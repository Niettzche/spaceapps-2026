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
import { ambienteDeSitio, ambienteDeDestino } from '../fisica/ambiente.js';
import { ESTADOS, MUNDOS, PRUEBAS } from './expediente/textos.js';
import { prepararIngles, enIdioma } from './expediente/datos_en.js';
import { columnasCondiciones } from './expediente/condiciones.js';
import { palabrasClave, chipsLimites, resumenRecorrido, chipsAmbiente } from './expediente/resumen.js';
import { P, num, txt, filaChips, barra, colorSimilitud, iconosTickets } from './expediente/componentes.js';
import { tr, trDato } from '../i18n.js';

// Dueño: frente expediente. Comparación 1 a 1: sitio terrestre vs destino, misma variable y unidad.
// Diseño (docs/juego/DISENO.md §2–§3): se entiende en 3 segundos. Arriba el sitio y su similitud total (barra + %);
// una línea de keywords; la tabla Variable | Tierra | Destino con una barra de similitud por fila; lo que la Tierra no puede
// probar como chips; el recorrido como íconos con número. Nada por debajo de 14 px. Las frases completas, las fuentes
// (con unidad y fecha) y las notas del cálculo NO se borran: están en el panel de detalle (tecla I, botón «Datos» o clic
// en una fila); el ambiente completo, en la vista «Condiciones» (tecla C).
const POR_PAGINA = 5;
const X0 = 300; // inicio de la columna derecha
const X1 = 945; // fin de la columna derecha
const XM = (X0 + X1) / 2;
const XT = 548; // columna de la Tierra en la tabla (variable · Tierra · destino)
const XD = X1 - 18; // borde derecho de la columna del destino (a la derecha queda «›»: la fila se puede tocar)
const ALTO_FILA = 42;
const LISTA = { y0: 116, paso: 54, panelAlto: 352, yPag: 410 };
// Panel de detalle (encima de la tabla y lo de abajo). Líneas de 14 px; se pagina solo si no cabe.
const DET = { x0: 294, y0: 98, x1: 951, y1: 480, letra: 14, lineas: 15 };
// Vista "Condiciones" (aire, luz y qué hacen en el juego): panel a todo lo ancho, dos columnas a 16 px.
const COND = { x0: 10, x1: 950, y0: 76, y1: 492, col: 445, letra: 16 };

export default class Expediente extends Phaser.Scene {
  constructor() { super('Expediente'); }

  create() {
    prepararIngles();
    // La instancia de la escena se reutiliza entre visitas: reinicia el estado propio.
    this.botonesDetalle = null; this.botonesLista = []; this.foco = null; this.filaActual = null; this.filas = null;
    this.capaCondiciones = null; this.detalle = null;
    if (!DESTINOS[partida.destino]) partida.destino = DESTINOS[DESTINO_POR_DEFECTO] ? DESTINO_POR_DEFECTO : Object.keys(DESTINOS)[0];
    this.destino = DESTINOS[partida.destino] || null;
    this.sitios = sitiosParaDestino(SITIOS, partida.destino);
    // Si viene del Explorador ("Abrir su Expediente"), se selecciona ese sitio; si no, el que está en juego.
    const pedido = tomarSitioPedido();
    const i = Math.max(0, this.sitios.findIndex((s) => s.id === (pedido ?? partida.sitio?.id)));
    this.seleccion = this.sitios[i] || null;
    this.pagina = Math.floor(i / POR_PAGINA);
    this.teclado = new Teclado(this, { alEscape: () => this.regresar() });
    this.dibujarFijo(); // primero: el panel de fondo queda debajo de la lista
    this.capaLista = this.add.container(0, 0);
    this.capaDetalle = this.add.container(0, 0);
    this.capaInfo = this.add.container(0, 0).setDepth(5); // panel de detalle (tecla I), encima de todo lo demás
    this.dibujarLista();
    this.dibujarDetalle();
  }

  // ---------- Encabezado y lista ----------

  dibujarFijo() {
    const d = this.destino;
    const mundo = d ? MUNDOS[d.mundo] || d.mundo : sinDato();
    texto(this, 15, 10, tr('EXPEDIENTE', 'SITE FILE'), { size: 22 });
    txt(this, 15, 40, `${mundo} · ${d ? trDato(d, 'nombre') : sinDato()}`, { size: 14, color: P.sec, ancho: 270 });
    panel(this, 10, 80, 280, LISTA.panelAlto);
  }

  dibujarLista() {
    this.capaLista.removeAll(true);
    const add = (o) => { this.capaLista.add(o.obj || o); return o; };
    const enPagina = Math.min(POR_PAGINA, this.sitios.length - this.pagina * POR_PAGINA);
    const atajo = enPagina > 0 ? tr(` · teclas 1–${enPagina}`, ` · keys 1–${enPagina}`) : '';
    add(txt(this, 20, 88, `${tr('Sugeridos', 'Suggested')} (${this.sitios.length})${atajo}`, { size: 14, color: P.sec }));
    this.botonesLista = [];
    if (!this.sitios.length) {
      add(txt(this, 20, 120, tr('El modelo aún no tiene sitios para este destino. Elige otro destino desde el menú.',
        'The model has no sites for this destination yet. Pick another destination from the menu.'),
      { size: 14, color: P.riesgo, ancho: 260 }));
    }
    const desde = this.pagina * POR_PAGINA;
    this.sitios.slice(desde, desde + POR_PAGINA).forEach((s, k) => {
      const y = LISTA.y0 + k * LISTA.paso;
      const elegido = s.id === this.seleccion?.id;
      // Sitio elegido: fondo y barra lateral (además del color), no solo un color.
      if (elegido) {
        add(this.add.rectangle(14, y - 6, 272, 48, P.filaSel).setOrigin(0, 0));
        add(this.add.rectangle(14, y - 6, 4, 48, num(P.accion)).setOrigin(0, 0));
      }
      // 21 caracteres: el nombre completo de «Médanos de Samalayuca» (lo busca la e2e) y el ▶ del foco caben en el panel.
      const b = add(boton(this, 24, y, recortar(trDato(s, 'nombre'), 21), () => this.seleccionar(s),
        // Zona táctil: toda la fila (nombre y subtítulo), sin encimarse con la siguiente.
        { size: 16, origen: [0, 0], marco: false, color: elegido ? COLOR.texto : COLOR.acento, anchoMin: 262, altoMin: 46 }));
      const est = estadoDe(s);
      const demo = esDemostracion(s);
      const sub = `${demo && s.estado !== 'ilustrativo' ? 'DEMO · ' : ''}${est.texto}`;
      add(txt(this, 24, y + 22, recortar(sub, 25), { size: 14, color: demo ? P.riesgo : est.color }));
      if (typeof s.similitud?.total === 'number') {
        add(txt(this, 282, y + 22, formatoPorcentaje(s.similitud.total), { size: 14, color: P.texto, origen: [1, 0] }));
      }
      b.sitioId = s.id;
      this.botonesLista.push(b);
    });
    const paginas = Math.max(1, Math.ceil(this.sitios.length / POR_PAGINA));
    this.botonAnterior = add(boton(this, 60, LISTA.yPag, '◀', () => this.cambiarPagina(-1, 'anterior'), { size: 16, habilitado: this.pagina > 0 }));
    add(txt(this, 150, LISTA.yPag, `${this.pagina + 1}/${paginas}`, { size: 14, color: P.sec, origen: [0.5, 0.5] }));
    this.botonSiguiente = add(boton(this, 240, LISTA.yPag, '▶', () => this.cambiarPagina(1, 'siguiente'), { size: 16, habilitado: this.pagina < paginas - 1 }));
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

  // ---------- Vista principal: comparación 1 a 1 ----------

  dibujarDetalle() {
    this.cerrarDetalle(false);
    this.capaDetalle.removeAll(true);
    const add = (o) => { this.capaDetalle.add(o.obj || o); return o; };
    const addTodos = (lista) => lista.forEach((o) => this.capaDetalle.add(o));
    this.botonesDetalle = [];
    this.botonCondiciones = null;
    const s = this.seleccion;
    const d = this.destino;
    if (!s || !d) {
      add(txt(this, XM, 250, !d ? tr('Sin destino cargado (data/targets).', 'No destination loaded (data/targets).') : tr('Elige un sitio de la lista.', 'Pick a site from the list.'), { size: 16, color: P.sec, origen: [0.5, 0.5] }));
      this.dibujarAcciones(add);
      return;
    }
    const mundo = MUNDOS[d.mundo] || d.mundo;

    // Cabecera: nombre grande + medidor de similitud total (barra + % grande) + chips.
    const nombre = trDato(s, 'nombre');
    const tNombre = add(txt(this, X0, 6, nombre, { size: 24 }));
    for (const size of [22, 20]) if (tNombre.width > 405) tNombre.setFontSize(size);
    if (tNombre.width > 405) tNombre.setText(recortar(nombre, Math.floor(405 / 12)));

    const total = s.similitud?.total;
    const hayTotal = typeof total === 'number';
    add(txt(this, 715, 14, tr('SIMILITUD TOTAL', 'TOTAL SIMILARITY'), { size: 14, color: P.sec }));
    add(txt(this, X1, hayTotal ? 2 : 14, formatoPorcentaje(total), { size: hayTotal ? 32 : 16, color: hayTotal ? colorSimilitud(total) : P.sec, origen: [1, 0], estilo: 'bold' }));
    addTodos(barra(this, 715, 44, X1 - 715, 10, hayTotal ? total : null, colorSimilitud(total)));
    add(txt(this, X1, 58, `${tr('confianza', 'confidence')} ${formatoPorcentaje(s.similitud?.confianza)}`, { size: 14, color: P.sec, origen: [1, 0] }));

    const est = estadoDe(s);
    const chips = [];
    if (esDemostracion(s)) chips.push({ texto: tr('ILUSTRATIVO · DEMO', 'ILLUSTRATIVE · DEMO'), color: P.riesgo, relleno: 0x4a1020 });
    if (!(esDemostracion(s) && s.estado === 'ilustrativo')) chips.push({ texto: est.texto, color: est.color });
    chips.push({ texto: `${tr('Gemelo', 'Twin')}: ${mundo}`, color: P.dato });
    if (s.novedoso === true) chips.push({ texto: tr('NOVEDOSO', 'NOVEL'), color: P.bien });
    if (s.prueba_util) chips.push({ texto: `${tr('Prueba', 'Test')}: ${PRUEBAS[s.prueba_util] || s.prueba_util}`, color: P.sec });
    addTodos(filaChips(this, X0, 40, chips, 705).objs);

    const clave = palabrasClave(s);
    add(txt(this, X0, 76, clave ?? `${tr('Proceso', 'Process')}: ${sinDato()}`, { size: 16, color: clave ? P.texto : P.sec }));

    // Tabla: variable · Tierra · destino (pedido del equipo: primero qué se compara, luego los dos lados).
    let y = 102;
    add(txt(this, X0, y, 'VARIABLE', { size: 14, color: P.sec }));
    add(txt(this, XT, y, tr('TIERRA', 'EARTH'), { size: 14, color: P.dato }));
    add(txt(this, XD, y, String(mundo).toUpperCase(), { size: 14, color: P.dato, origen: [1, 0] }));
    y += 22;

    const { filas } = filasComparacion(s, d);
    this.filas = filas;
    filas.forEach((f, k) => {
      const fondo = add(this.add.rectangle(X0 - 4, y - 3, X1 - X0 + 8, ALTO_FILA - 3, P.fila, 0.6).setOrigin(0, 0));
      fondo.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.abrirDetalle(this.seccionDeFila(k)))
        .on('pointerover', () => fondo.setFillStyle(P.filaSel, 1))
        .on('pointerout', () => fondo.setFillStyle(P.fila, 0.6));
      const vt = formatoValor(f.tierra);
      const textoDestino = f.destino?.texto && f.destino.valor == null;
      const vd = textoDestino ? f.destino.texto : formatoValor(f.destino);
      add(txt(this, X0, y, recortar(f.etiqueta, 25), { size: 16 }));
      add(txt(this, XT, y - 1, recortar(vt, 14), { size: 18, color: vt === sinDato() ? P.sec : P.dato }));
      add(txt(this, XD, textoDestino ? y : y - 1, recortar(vd, 23),
        { size: textoDestino ? 16 : 18, color: vd === sinDato() ? P.sec : textoDestino ? P.texto : P.dato, origen: [1, 0] }));
      add(txt(this, X1, y, '›', { size: 18, color: P.sec, origen: [1, 0] }));
      if (!f.mismaUnidad) {
        add(txt(this, X0, y + 20, tr('⚠ unidades distintas', '⚠ different units'), { size: 14, color: P.riesgo }));
      } else {
        addTodos(barra(this, X0, y + 25, 120, 8, f.similitud, colorSimilitud(f.similitud)));
        add(txt(this, X0 + 128, y + 20, typeof f.similitud === 'number' ? formatoPorcentaje(f.similitud) : sinDato(),
          { size: 14, color: typeof f.similitud === 'number' ? P.texto : P.sec }));
      }
      y += ALTO_FILA;
    });
    if (!filas.length) {
      add(txt(this, XM, y + 10, tr('Sin variables comparables.', 'No comparable variables.'), { size: 16, color: P.sec, origen: [0.5, 0] }));
      y += 36;
    }
    y = this.dibujarLimites(addTodos, add, s, d, Math.max(y + 4, 332));
    this.dibujarRecorrido(add, s, d, y + 6);
    this.dibujarAcciones(add);
  }

  // Lo que la Tierra no puede probar (AGENTS.md §5 y §6.3): siempre visible como chips; la frase larga, en el detalle.
  dibujarLimites(addTodos, add, s, d, y) {
    const { noReproducible } = limitesDe(s, d);
    add(txt(this, X0, y, tr('LA TIERRA NO PUEDE PROBAR', 'EARTH CANNOT TEST'), { size: 14, color: P.riesgo }));
    const chips = chipsLimites(noReproducible, d.gravedad_ms2, GRAVEDAD.tierra)
      .map((c) => ({ texto: `✕ ${c.texto}`, color: P.riesgo }));
    if (!chips.length) chips.push({ texto: tr('sin dato', 'no data'), color: P.sec });
    const fila = filaChips(this, X0, y + 19, chips, X1, { gap: 8 });
    addTodos(fila.objs);
    if (fila.omitidos.length) add(txt(this, X1, y, `+${fila.omitidos.length} · I`, { size: 14, color: P.sec, origen: [1, 0] }));
    return y + 19 + fila.alto;
  }

  // Lo que va a enfrentar el robot: el MISMO tramo que arma la escena (fisica/perfil.js). Prueba en la Tierra (izq.) y
  // misión en el destino (der.), cada una con ↗ subida · ∠ pendiente máx. · suelo · ⚠ crítico y 3 condiciones del lugar.
  dibujarRecorrido(add, s, d, y) {
    const alto = 92;
    const mitad = (X1 - X0) / 2;
    add(this.add.rectangle(X0 - 4, y, X1 - X0 + 8, alto, 0x10202a).setOrigin(0, 0).setStrokeStyle(1, 0x2a5a6b));
    add(this.add.rectangle(X0 + mitad, y + 6, 1, alto - 12, 0x2a5a6b).setOrigin(0, 0));
    const mundo = String(MUNDOS[d.mundo] || d.mundo).toUpperCase();
    const columna = (x, titulo, perfil, amb) => {
      let r = null;
      try { r = resumenRecorrido(perfil()); } catch { r = null; }
      const extra = r?.ilustrativo ? tr(' · ilustrativo', ' · illustrative') : '';
      add(txt(this, x, y + 4, `${titulo}${extra}`, { size: 14, color: r?.ilustrativo ? P.riesgo : P.sec }));
      if (!r) {
        add(txt(this, x, y + 24, sinDato(), { size: 16, color: P.sec }));
      } else {
        add(txt(this, x, y + 23, `↗ ${r.subida}`, { size: 16 }));
        add(txt(this, x + 92, y + 23, `∠ ${r.pendiente} ${tr('máx', 'max')}`, { size: 16 }));
        add(txt(this, x + 200, y + 23, recortar(r.suelo ?? sinDato(), 11), { size: 16, color: P.dato }));
        add(txt(this, x, y + 46, recortar(`⚠ ${r.critico}`, 31), { size: 16, color: P.riesgo }));
      }
      let cond = [];
      try { cond = amb(); } catch { cond = []; }
      add(txt(this, x, y + 70, recortar(cond.length ? cond.join(' · ') : tr('clima: sin dato', 'climate: no data'), 36), { size: 14, color: cond.length ? P.dato : P.sec }));
    };
    const ambSitio = () => {
      const a = ambienteDeSitio(s.id);
      // Sin clima del sitio no se muestran los de la referencia de la Tierra como si fueran del sitio.
      return a?.referencia ? [] : chipsAmbiente(a);
    };
    columna(X0, tr('PRUEBA · TIERRA', 'TEST · EARTH'), () => perfilDeSitio(s), ambSitio);
    columna(X0 + mitad + 10, `${tr('MISIÓN', 'MISSION')} · ${mundo}`, () => perfilDeDestino(d), () => chipsAmbiente(ambienteDeDestino(d.id, d.mundo)));
    return y + alto;
  }

  // ---------- Pie: regresar, tickets, botones secundarios y UN botón principal ----------

  dibujarAcciones(add) {
    // Regresar = paso anterior (elegir destino); Menú = menú principal.
    const regresar = add(boton(this, 20, 496, tr('← Regresar', '← Back'), () => this.regresar(), { size: 16, origen: [0, 0.5] }));
    const volver = add(boton(this, 20, 526, tr('Menú', 'Menu'), () => irA(this, 'Menu'), { size: 14, origen: [0, 0.5] }));
    // Tickets (AGENTS.md §4): 3 por partida, sin reposición; volver a probar un sitio ya pagado no cuesta.
    const n = Math.max(0, partida.tickets | 0);
    const totalT = Math.max(TICKETS_POR_PARTIDA, n);
    const yT = 80 + LISTA.panelAlto + 12;
    add(txt(this, 20, yT + 8, 'TICKETS', { size: 14, color: P.sec }));
    const ic = iconosTickets(this, 98, yT + 17, n, totalT, { color: n ? P.accion : P.riesgo });
    ic.objs.forEach((o) => add(o));
    add(txt(this, 98 + ic.ancho + 10, yT + 6, `${n}/${totalT}`, { size: 18, color: n ? P.accion : P.riesgo, estilo: 'bold' }));

    const s = this.seleccion;
    const pagado = s && sitioPagado(partida, s.id);
    let etiqueta = tr('Gastar 1 ticket y probar', 'Spend 1 ticket and test');
    if (pagado) etiqueta = tr('Probar de nuevo (gratis)', 'Test again (free)');
    else if (!n) etiqueta = tr('Sin tickets', 'No tickets');
    const puede = !!s && (pagado || n > 0);
    // Botón principal con caja (no solo texto). Opción sugerida (⏎): confirma el paso del camino dorado.
    const caja = add(this.add.rectangle(775, 510, 330, 46, puede ? 0x2a2410 : P.panel).setStrokeStyle(2, num(puede ? P.accion : P.sec)));
    const probar = add(boton(this, 775, 510, etiqueta, () => this.probar(),
      { size: 18, marco: false, habilitado: puede, sugerido: puede, anchoMin: 330, altoMin: 46 }));
    probar.caja = caja;
    const url = urlFicha(s);
    const ficha = add(boton(this, 190, 496, url ? tr('Ficha completa ↗', 'Full fact sheet ↗') : tr('Ficha web: sin enlace', 'Web fact sheet: no link'), () => this.abrirFicha(url),
      { size: 14, origen: [0, 0.5], habilitado: !!url }));
    const datos = add(boton(this, 190, 526, tr('I · Datos', 'I · Data'), () => this.alternarDetalle(), { size: 14, origen: [0, 0.5], habilitado: !!s && !!this.destino }));
    this.botonCondiciones = add(boton(this, 345, 526, tr('C · Condiciones', 'C · Conditions'), () => this.abrirCondiciones(),
      { size: 14, origen: [0, 0.5], habilitado: !!s }));
    this.botonesDetalle = [probar, ficha, datos, this.botonCondiciones];
    this.botonVolver = volver;
    this.botonRegresar = regresar;
    this.registrarTeclado();
  }

  regresar() { irA(this, 'Menu', { vista: 'destino' }); }

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
    if (this.capaCondiciones) return; // la vista "Condiciones" maneja su propio teclado
    if (this.detalle) return; // el panel de detalle también
    this.teclado.alEscape = () => this.regresar(); // Esc = «← Regresar» (elegir destino), como en create()
    this.teclado.extra = {
      f: () => this.ciclarFila(), F: () => this.ciclarFila(),
      i: () => this.alternarDetalle(), I: () => this.alternarDetalle(),
      c: () => this.abrirCondiciones(), C: () => this.abrirCondiciones(),
      PageDown: () => this.cambiarPagina(1), PageUp: () => this.cambiarPagina(-1),
    };
    const preferido = {
      seleccion: this.botonesLista.find((b) => b.sitioId === this.seleccion?.id),
      probar: this.botonesDetalle?.[0]?.habilitado ? this.botonesDetalle[0] : this.botonesLista.find((b) => b.sitioId === this.seleccion?.id),
      anterior: this.botonAnterior.habilitado ? this.botonAnterior : this.botonSiguiente,
      siguiente: this.botonSiguiente.habilitado ? this.botonSiguiente : this.botonAnterior,
      lista: this.botonesLista[0],
      datos: this.botonesDetalle[2],
    }[this.foco] || this.botonesLista.find((b) => b.sitioId === this.seleccion?.id);
    // Atajos 1–5: eligen el sitio de esa posición en la página (igual que los números de Resultados.js).
    this.teclado.numerar(this.botonesLista);
    this.teclado.poner([...this.botonesLista, this.botonAnterior, this.botonSiguiente, ...this.botonesDetalle, this.botonRegresar, this.botonVolver], preferido);
  }

  // ---------- Panel de detalle (tecla I, botón «Datos» o clic en una fila) ----------
  // Todo lo que salió de la vista principal: frases completas de proceso y uso, coordenadas, notas del cálculo, variables
  // medidas solo en la Tierra, límites con su explicación, el recorrido completo y, por fila, fuente, unidad, fecha y nota.

  /** Secciones del detalle: [{ titulo, parrafos }]. Las filas de la tabla van al final, una sección por fila. */
  seccionesDetalle() {
    const s = this.seleccion;
    const d = this.destino;
    const mundo = MUNDOS[d.mundo] || d.mundo;
    const est = estadoDe(s);
    const { noReproducible, notas } = limitesDe(s, d);
    const { soloTierra } = filasComparacion(s, d);
    const coord = typeof s.lat === 'number' && typeof s.lon === 'number' ? `${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}` : tr('coordenadas: sin dato', 'coordinates: no data');
    const n = Math.max(0, partida.tickets | 0);
    const pagado = sitioPagado(partida, s.id);
    const ayuda = pagado ? tr('Tickets: ya pagaste este sitio; probarlo de nuevo no gasta ticket. Enter confirma.', 'Tickets: you already paid for this site; testing it again spends no ticket. Enter confirms.')
      : n ? tr('Tickets: al probar, el sitio queda pagado y puedes volver a probarlo sin gastar otro ticket. Enter confirma.',
        'Tickets: once tested, the site is paid for and you can test it again without spending another ticket. Enter confirms.')
        : tr('Sin tickets: elige un sitio ya pagado o empieza una Nueva partida desde el menú.', 'No tickets: pick a site you already paid for or start a New game from the menu.');
    const sitio = [
      `${est.texto} · ${s.pais || tr('país: sin dato', 'country: no data')} · ${coord}${s.novedoso === true ? tr(' · NOVEDOSO', ' · NOVEL') : ''}`,
      `${tr('Similitud total', 'Total similarity')} ${formatoPorcentaje(s.similitud?.total)} · ${tr('confianza', 'confidence')} ${formatoPorcentaje(s.similitud?.confianza)}`
        + (s.prueba_util ? ` · ${tr('prueba', 'test')}: ${PRUEBAS[s.prueba_util] || s.prueba_util}` : ''),
      `${tr('Proceso', 'Process')}: ${trDato(s, 'proceso') || sinDato()}`,
      `${tr('Uso para la exploración', 'Use for exploration')}: ${trDato(s, 'uso_exploracion') || sinDato()}`,
      ...notas.map((x) => `${tr('Límite del cálculo', 'Calculation limit')}: ${enIdioma(x)}`),
    ];
    if (esDemostracion(s)) sitio.unshift(tr('ILUSTRATIVO · datos de demostración: no son mediciones del sitio.', 'ILLUSTRATIVE · demo data: not measurements of the site.'));
    if (soloTierra.length) sitio.push(`${tr('Solo medido en la Tierra', 'Measured only on Earth')}: ${soloTierra.map((x) => `${x.etiqueta} ${formatoValor(x.variable)}`).join(' · ')}`);
    sitio.push(ayuda);

    const limites = noReproducible.map((l) => (l.clave === 'gravedad' && typeof d.gravedad_ms2 === 'number'
      ? tr(`Gravedad (${mundo} ${d.gravedad_ms2} vs Tierra ${GRAVEDAD.tierra} m/s²; solo en la misión)`,
        `Gravity (${mundo} ${d.gravedad_ms2} vs Earth ${GRAVEDAD.tierra} m/s²; mission only)`)
      : l.etiqueta));
    let tierra; let destino;
    try { tierra = lineasRecorrido(perfilDeSitio(s), 'tierra'); } catch { tierra = [sinDato()]; }
    try { destino = lineasRecorrido(perfilDeDestino(d), d.mundo); } catch { destino = [sinDato()]; }
    const recorrido = [
      `${tr('La Tierra no puede probar', 'Earth cannot test')}: ${limites.length ? limites.join(' · ') : tr('sin dato (el destino no declara límites)', 'no data (the destination declares no limits)')}`,
      `${tr('Recorrido de la prueba (Tierra)', 'Test route (Earth)')}:\n– ${tierra.join('\n– ')}`,
      `${tr(`Recorrido de la misión (${mundo})`, `Mission route (${mundo})`)}:\n– ${destino.join('\n– ')}`,
      tr('Condiciones completas (temperatura, aire, luz y su efecto en el juego): tecla C.', 'Full conditions (temperature, air, light and their effect in the game): key C.'),
    ];

    const lado = (v) => {
      if (!v) return [`– ${sinDato()}`];
      const nota = trDato(v, 'nota');
      return [
        `– ${tr('fuente', 'source')}: ${trDato(v, 'fuente') || sinDato()}`,
        `– ${tr('fecha', 'date')}: ${trDato(v, 'fecha') || sinDato()}`,
        ...(nota ? [`– ${tr('nota', 'note')}: ${nota}`] : []),
      ];
    };
    const filas = (this.filas || []).map((f) => {
      const vd = f.destino?.texto && f.destino.valor == null ? f.destino.texto : formatoValor(f.destino);
      const p = [
        f.mismaUnidad ? `${tr('Similitud', 'Similarity')}: ${formatoPorcentaje(f.similitud)}` : tr('⚠ unidades distintas: no se comparan', '⚠ different units: not compared'),
        `${tr('Tierra', 'Earth')}: ${formatoValor(f.tierra)}\n${lado(f.tierra).join('\n')}`,
        `${mundo}: ${vd}\n${lado(f.destino).join('\n')}`,
      ];
      if (f.detalleForma) p.push(`${tr('Puntaje de forma', 'Shape score')}: ${formatoValor(f.detalleForma)}${trDato(f.detalleForma, 'nota') ? ` · ${trDato(f.detalleForma, 'nota')}` : ''}`);
      return { titulo: `${f.etiqueta} · ${tr('fuentes', 'sources')}`, parrafos: p, fila: true };
    });
    return [
      { titulo: trDato(s, 'nombre'), parrafos: sitio },
      { titulo: tr('Límites y recorrido', 'Limits and route'), parrafos: recorrido },
      ...filas,
    ];
  }

  /** Corta las secciones en páginas de DET.lineas renglones (medidos con el ajuste de línea real). */
  paginarDetalle() {
    const medidor = txt(this, 0, 0, '', { size: DET.letra, ancho: DET.x1 - DET.x0 - 28 }).setVisible(false);
    const paginas = [];
    const inicio = [];
    this.seccionesDetalle().forEach((sec) => {
      inicio.push(paginas.length);
      const renglones = [];
      // Un párrafo = una viñeta «•» (sin renglones en blanco: caben más datos por página).
      sec.parrafos.forEach((p) => {
        String(p).split('\n').forEach((l, k) => renglones.push(...medidor.getWrappedText(k ? l : `• ${l}`)));
      });
      for (let i = 0; i < renglones.length; i += DET.lineas) {
        const trozo = renglones.slice(i, i + DET.lineas);
        paginas.push({ titulo: sec.titulo, texto: trozo.join('\n'), fila: !!sec.fila });
      }
    });
    medidor.destroy();
    return { paginas, inicio };
  }

  seccionDeFila(k) { return 2 + k; }

  alternarDetalle() {
    if (!this.detalle) { this.abrirDetalle(0); return; }
    // I con el panel abierto: página siguiente; después de la última, cierra.
    if (this.detalle.i >= this.detalle.paginas.length - 1) this.cerrarDetalle();
    else this.irPaginaDetalle(1);
  }

  abrirDetalle(seccion = 0) {
    if (!this.seleccion || !this.destino || this.capaCondiciones) return;
    const { paginas, inicio } = this.paginarDetalle();
    this.detalle = { paginas, inicio, i: inicio[Math.min(seccion, inicio.length - 1)] ?? 0 };
    this.dibujarPanelDetalle();
  }

  irPaginaDetalle(paso) {
    if (!this.detalle) return;
    const n = this.detalle.paginas.length;
    this.detalle.i = (this.detalle.i + paso + n) % n;
    this.dibujarPanelDetalle();
  }

  dibujarPanelDetalle() {
    const det = this.detalle;
    this.capaInfo.removeAll(true);
    const add = (o) => { this.capaInfo.add(o.obj || o); return o; };
    const pag = det.paginas[det.i];
    // Fondo opaco e interactivo: tapa la tabla y no deja pasar los toques a las filas de abajo.
    add(this.add.rectangle(DET.x0, DET.y0, DET.x1 - DET.x0, DET.y1 - DET.y0, P.panel).setOrigin(0, 0)
      .setStrokeStyle(2, num(P.dato)).setInteractive());
    add(txt(this, DET.x0 + 14, DET.y0 + 10, recortar(pag.titulo, 44), { size: 18, color: P.dato }));
    add(txt(this, DET.x1 - 14, DET.y0 + 12, tr('I siguiente · Esc cierra', 'I next · Esc closes'), { size: 14, color: P.sec, origen: [1, 0] }));
    add(txt(this, DET.x0 + 14, DET.y0 + 40, pag.texto, { size: DET.letra, color: P.texto, interlineado: 3 }));
    const yb = DET.y1 - 22;
    const ant = add(boton(this, DET.x0 + 40, yb, '◀', () => this.irPaginaDetalle(-1), { size: 18, marco: false, habilitado: det.paginas.length > 1 }));
    add(txt(this, DET.x0 + 110, yb, `${det.i + 1}/${det.paginas.length}`, { size: 14, color: P.sec, origen: [0.5, 0.5] }));
    const sig = add(boton(this, DET.x0 + 180, yb, '▶', () => this.irPaginaDetalle(1), { size: 18, marco: false, habilitado: det.paginas.length > 1 }));
    const cerrar = add(boton(this, DET.x1 - 14, yb, tr('Cerrar', 'Close'), () => this.cerrarDetalle(), { size: 16, origen: [1, 0.5], sugerido: true }));
    this.teclado.alEscape = () => this.cerrarDetalle();
    this.teclado.extra = {
      i: () => this.alternarDetalle(), I: () => this.alternarDetalle(),
      f: () => this.ciclarFila(), F: () => this.ciclarFila(),
      PageDown: () => this.irPaginaDetalle(1), PageUp: () => this.irPaginaDetalle(-1),
    };
    this.teclado.numerar([]);
    this.teclado.items.filter((b) => b.obj.active).forEach((b) => b.enfocar(false)); // el foco de abajo no queda marcado bajo el panel
    this.teclado.poner([ant, sig, cerrar], det.paginas.length > 1 ? sig : cerrar);
  }

  /** Cierra el panel de detalle. `reenfocar` = devolver el foco a «Datos» (false al redibujar la vista). */
  cerrarDetalle(reenfocar = true) {
    if (!this.detalle) return;
    this.detalle = null;
    this.capaInfo.removeAll(true);
    if (!reenfocar) return;
    this.foco = 'datos';
    this.registrarTeclado();
  }

  // ---------- Vista "Condiciones": aire, luz y qué hacen en el juego (fisica/ambiente.js) ----------
  // Panel a todo lo ancho encima de la lista y el detalle: Tierra a la izquierda y destino a la derecha, a 16 px.
  // Se abre con el botón o la tecla C y se cierra con C, Esc o "Volver". Mientras está abierta, lo de abajo no responde.
  abrirCondiciones() {
    if (this.capaCondiciones || !this.seleccion) return;
    this.cerrarDetalle(false);
    const capa = this.add.container(0, 0).setDepth(10);
    this.capaCondiciones = capa;
    const add = (o) => { capa.add(o.obj || o); return o; };
    // Fondo opaco e interactivo: tapa la lista y el detalle y no deja pasar los toques.
    add(this.add.rectangle(COND.x0, COND.y0, COND.x1 - COND.x0, COND.y1 - COND.y0, COLOR.panel).setOrigin(0, 0)
      .setStrokeStyle(1, COLOR.borde).setInteractive());
    add(texto(this, COND.x0 + 15, COND.y0 + 8, tr('CONDICIONES: aire, luz y qué hacen en el juego', 'CONDITIONS: air, light and what they do in the game'),
      { size: 18, color: COLOR.texto }));
    const cerrar = add(boton(this, COND.x1 - 12, COND.y0 + 18, tr('Volver (C)', 'Back (C)'), () => this.cerrarCondiciones(),
      { size: 16, origen: [1, 0.5], sugerido: true }));
    const { tierra, destino } = columnasCondiciones(this.seleccion, this.destino);
    const columna = (x, col) => {
      // El título puede ocupar 2 renglones con nombres largos (p. ej. "Maar Al Wahbah (Harrat Kishb)"): las líneas van debajo.
      const titulo = add(texto(this, x, COND.y0 + 44, col.titulo, { size: COND.letra, color: COLOR.foco, ancho: COND.col }));
      const lineas = col.lineas.length ? col.lineas : [tr('Sin datos de ambiente para este lugar.', 'No environment data for this place.')];
      const t = add(texto(this, x, titulo.y + titulo.height + 8, lineas.join('\n'), {
        size: COND.letra, color: col.lineas.length ? COLOR.texto : P.sec, ancho: COND.col,
      }));
      t.setLineSpacing(2);
      return t;
    };
    this.textosCondiciones = [columna(COND.x0 + 15, tierra), columna(COND.x0 + 15 + COND.col + 20, destino)];
    this.teclado.alEscape = () => this.cerrarCondiciones();
    this.teclado.extra = { c: () => this.cerrarCondiciones(), C: () => this.cerrarCondiciones() };
    this.teclado.numerar([]);
    this.teclado.items.filter((b) => b.obj.active).forEach((b) => b.enfocar(false));
    this.teclado.poner([cerrar], cerrar);
  }

  cerrarCondiciones() {
    if (!this.capaCondiciones) return;
    this.capaCondiciones.destroy(true);
    this.capaCondiciones = null;
    this.textosCondiciones = null;
    this.foco = 'condiciones';
    this.registrarTeclado();
    if (this.botonCondiciones) this.teclado.enfocar(this.botonCondiciones);
  }

  // F: abre (o avanza) el detalle en las fuentes de la fila siguiente de la tabla.
  ciclarFila() {
    if (!this.filas?.length) return;
    this.filaActual = ((this.filaActual ?? -1) + 1) % this.filas.length;
    this.abrirDetalle(this.seccionDeFila(this.filaActual));
  }
}

/** Estado del sitio (texto y color). Tajo minero en lugar del estado; colores de la paleta de DISENO.md §2.5. */
function estadoDe(s) {
  const est = (esMina(s) && ESTADOS.mina) || ESTADOS[s.estado] || { texto: s.estado, color: P.sec };
  const color = { '#ef476f': P.riesgo, '#9aa4c7': P.sec }[est.color] ?? est.color;
  return { texto: est.texto, color };
}
