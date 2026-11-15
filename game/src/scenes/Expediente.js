import Phaser from 'phaser';
import { irA } from './ui.js';
import { tocarMusica } from '../audio/musica.js';
import { SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { COLOR, texto, boton, panel, Teclado, cajaArte } from './expediente/interfaz.js';
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
import { ajustarAncho } from './comun/fuente.js';
import { infoVariable, tecnicoConUnidad, leyendaTabla, explicaConfianza, explicaTotal, explicaSimilitud } from './expediente/glosario.js';
import { icono, iconoVariable } from './expediente/iconos_expediente.js';
import { pasosTutorial, debeMostrarTutorial } from './expediente/tutorial_expediente.js';
import { abrirTutorial } from './expediente/tutorial_vista.js';

// Dueño: frente expediente. Comparación 1 a 1: sitio terrestre vs destino, misma variable y unidad.
// Diseño (docs/juego/DISENO.md §2–§3): se entiende en 3 segundos. Arriba el sitio y su similitud total (barra + %);
// una línea de keywords; la tabla Variable | Tierra | Destino con una barra de similitud por fila; lo que la Tierra no puede
// probar como chips; el recorrido como íconos con número. Nada por debajo de 14 px. Las frases completas, las fuentes
// (con unidad y fecha) y las notas del cálculo NO se borran: están en el panel de detalle (tecla I, botón «Datos» o clic
// en una fila); el ambiente completo, en la vista «Condiciones» (tecla C).
const POR_PAGINA = 5;
const X0 = 306; // inicio de la columna derecha
const X1 = 945; // fin de la columna derecha
const XM = (X0 + X1) / 2;
// Tabla en UNA línea por fila (fuente ×2, renglón de 24 px): variable · Tierra · destino · barra + % · «›».
const XT = 540; // columna de la Tierra
const XD = 818; // borde derecho de la columna del destino
const XB = 826; // barra de similitud de la fila (50 px) y su % a la derecha (XP)
const XP = 930;
const ALTO_FILA = 32; // ícono ×2 (32 px) a la izquierda de cada fila
const XL = X0 + 40; // nombre llano de la variable (después del ícono)
// Fuente pixel ×2 (renglón de 22 px): lista de 5 sitios de 56 px, panel de 62 a 422, tickets debajo y el pie en una fila.
const LISTA = { y0: 100, paso: 56, panelY: 62, panelAlto: 354, yPag: 392 };
const Y_PIE = 514; // fila de botones del pie (Datos · Condiciones · Ficha … Probar); Regresar · Menú van arriba, a la izquierda
const Y_NAV = 470;
// Panel de detalle (encima de la tabla y lo de abajo). Renglones de 22 px + 2; se pagina solo si no cabe.
const DET = { x0: 300, y0: 98, x1: 951, y1: 492, letra: 14, lineas: 11 };
// Vista "Condiciones" (aire, luz y qué hacen en el juego): panel a todo lo ancho, dos columnas a 16 px.
const COND = { x0: 10, x1: 950, y0: 76, y1: 492, col: 445, letra: 16 };

export default class Expediente extends Phaser.Scene {
  constructor() { super('Expediente'); }

  create() {
    tocarMusica('menu'); // música del menú hasta que empiece un nivel (audio/musica.js)
    prepararIngles();
    // La instancia de la escena se reutiliza entre visitas: reinicia el estado propio.
    this.botonesDetalle = null; this.botonesLista = []; this.foco = null; this.filaActual = null; this.filas = null;
    this.capaCondiciones = null; this.detalle = null; this.tutorial = null; this.zonas = {};
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
    // Tutorial rápido la primera vez (se repite con «?»). Sin sitio elegido no hay nada que señalar.
    if (this.seleccion && this.destino && debeMostrarTutorial()) this.abrirTutorial();
  }

  // ---------- Tutorial rápido (coach marks): tutorial_expediente.js + tutorial_vista.js ----------

  abrirTutorial() {
    if (this.tutorial || !this.seleccion || !this.destino) return;
    this.cerrarDetalle(false);
    if (this.capaCondiciones) { this.capaCondiciones.destroy(true); this.capaCondiciones = null; this.textosCondiciones = null; }
    const mundo = MUNDOS[this.destino.mundo] || this.destino.mundo;
    this.tutorial = abrirTutorial(this, {
      pasos: pasosTutorial(mundo),
      zonas: (nombre) => this.zonaTutorial(nombre),
      alCerrar: () => { this.tutorial = null; this.foco = 'probar'; this.registrarTeclado(); },
    });
  }

  /** Rectángulo de cada zona del tutorial (lo guarda dibujarDetalle; los botones se miden en vivo). */
  zonaTutorial(nombre) {
    const deBoton = (b) => {
      if (!b?.obj?.active) return null;
      const m = b.medidas();
      return { x: m.x0, y: m.y0, w: m.w, h: m.h };
    };
    if (nombre === 'datos') return deBoton(this.botonesDetalle?.[2]);
    if (nombre === 'probar') return deBoton(this.botonesDetalle?.[0]);
    return this.zonas?.[nombre] ?? null;
  }

  // ---------- Encabezado y lista ----------

  dibujarFijo() {
    const d = this.destino;
    const mundo = d ? MUNDOS[d.mundo] || d.mundo : sinDato();
    texto(this, 14, 6, tr('EXPEDIENTE', 'SITE FILE'), { size: 22, titulo: true });
    ajustarAncho(txt(this, 15, 36, `${mundo} · ${d ? trDato(d, 'nombre') : sinDato()}`, { size: 14, color: P.sec }), 274);
    cajaArte(this, 'ui/ui_panel', 10, LISTA.panelY, 282, LISTA.panelAlto);
  }

  dibujarLista() {
    this.capaLista.removeAll(true);
    const add = (o) => { this.capaLista.add(o.obj || o); return o; };
    const enPagina = Math.min(POR_PAGINA, this.sitios.length - this.pagina * POR_PAGINA);
    const atajo = enPagina > 0 ? ` · 1–${enPagina}` : '';
    add(txt(this, 22, LISTA.panelY + 10, `${tr('Sugeridos', 'Suggested')} (${this.sitios.length})${atajo}`, { size: 14, color: P.sec }));
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
        add(this.add.rectangle(16, y - 5, 270, 52, P.filaSel).setOrigin(0, 0));
        add(this.add.rectangle(16, y - 5, 4, 52, num(P.accion)).setOrigin(0, 0));
      }
      // 21 caracteres: el nombre completo de «Médanos de Samalayuca» (lo busca la e2e) y el ▶ del foco caben en el panel.
      const b = add(boton(this, 18, y, recortar(trDato(s, 'nombre'), 21), () => this.seleccionar(s),
        // Zona táctil: toda la fila (nombre y subtítulo), sin encimarse con la siguiente.
        { size: 16, origen: [0, 0], marco: false, color: elegido ? COLOR.texto : COLOR.acento, anchoMin: 262, altoMin: 50 }));
      const est = estadoDe(s);
      const demo = esDemostracion(s);
      const sub = `${demo && s.estado !== 'ilustrativo' ? 'DEMO · ' : ''}${est.texto}`;
      add(txt(this, 22, y + 24, recortar(sub, 17), { size: 14, color: demo ? P.riesgo : est.color }));
      if (typeof s.similitud?.total === 'number') {
        add(txt(this, 282, y + 24, formatoPorcentaje(s.similitud.total), { size: 14, color: P.texto, origen: [1, 0] }));
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
    const tNombre = add(txt(this, X0, 4, nombre, { size: 28 }));
    if (tNombre.width > 405) tNombre.setTamano(16); // ×3 → ×2
    ajustarAncho(tNombre, 400);

    const total = s.similitud?.total;
    const hayTotal = typeof total === 'number';
    // Íconos de arte (ico_similitud, ico_confianza ×1) junto a sus etiquetas: qué es cada número sin leer la frase.
    add(icono(this, 748, 20, ['iconos/ico_similitud'], 'confianza'));
    add(txt(this, 760, 10, tr('SIMILITUD', 'SIMILARITY'), { size: 14, color: P.sec }));
    add(txt(this, X1, hayTotal ? 2 : 10, formatoPorcentaje(total), { size: hayTotal ? 32 : 16, color: hayTotal ? colorSimilitud(total) : P.sec, origen: [1, 0], estilo: 'bold' }));
    addTodos(barra(this, 740, 38, X1 - 740, 10, hayTotal ? total : null, colorSimilitud(total)));
    const tConf = add(txt(this, X1, 52, `${tr('confianza', 'confidence')} ${formatoPorcentaje(s.similitud?.confianza)}`, { size: 14, color: P.sec, origen: [1, 0] }));
    add(icono(this, X1 - Math.ceil(tConf.width) - 12, 62, ['iconos/ico_confianza'], 'confianza'));
    this.zonas = { similitud: { x: 732, y: 0, w: X1 - 732 + 4, h: 76 } };

    const est = estadoDe(s);
    const chips = [];
    if (esDemostracion(s)) chips.push({ texto: tr('ILUSTRATIVO · DEMO', 'ILLUSTRATIVE · DEMO'), color: P.riesgo, relleno: 0x4a1020 });
    if (!(esDemostracion(s) && s.estado === 'ilustrativo')) chips.push({ texto: est.texto, color: est.color });
    chips.push({ texto: `${tr('Gemelo', 'Twin')}: ${mundo}`, color: P.dato });
    if (s.novedoso === true) chips.push({ texto: tr('NOVEDOSO', 'NOVEL'), color: P.bien });
    if (s.prueba_util) chips.push({ texto: `${tr('Prueba', 'Test')}: ${PRUEBAS[s.prueba_util] || s.prueba_util}`, color: P.sec });
    addTodos(filaChips(this, X0, 40, chips, 732).objs);

    const clave = palabrasClave(s);
    ajustarAncho(add(txt(this, X0, 78, clave ?? `${tr('Proceso', 'Process')}: ${sinDato()}`, { size: 16, color: clave ? P.texto : P.sec })), X1 - X0);

    // Tabla: variable · Tierra · destino (pedido del equipo: primero qué se compara, luego los dos lados).
    let y = 104;
    add(txt(this, X0, y, tr('¿QUÉ SE MIDE?', 'WHAT IS MEASURED?'), { size: 14, color: P.sec }));
    add(txt(this, XT, y, tr('TIERRA', 'EARTH'), { size: 14, color: P.dato }));
    add(txt(this, XD, y, String(mundo).toUpperCase(), { size: 14, color: P.dato, origen: [1, 0] }));
    add(txt(this, X1, y, tr('PARECIDO', 'MATCH'), { size: 14, color: P.sec, origen: [1, 0] }));
    y += 28;
    const yTabla = y;

    const { filas } = filasComparacion(s, d);
    this.filas = filas;
    const mina = esMina(s);
    filas.forEach((f, k) => {
      // Para novatos: ícono + nombre llano en la fila; la pregunta y el nombre técnico con su unidad, en la franja de
      // ayuda de abajo al pasar el ratón (y completos en el detalle I).
      const info = infoVariable(f.clave, { mina });
      const fondo = add(this.add.rectangle(X0 - 4, y - 4, X1 - X0 + 8, ALTO_FILA - 2, P.fila, 0.6).setOrigin(0, 0));
      fondo.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.abrirDetalle(this.seccionDeFila(k)))
        .on('pointerover', () => { fondo.setFillStyle(P.filaSel, 1); this.ayudaFila(f, info); })
        .on('pointerout', () => { fondo.setFillStyle(P.fila, 0.6); this.ayudaFila(null); });
      add(iconoVariable(this, X0 + 16, y + 11, info, { escala: 2 }));
      const vt = formatoValor(f.tierra);
      const textoDestino = f.destino?.texto && f.destino.valor == null;
      const vd = textoDestino ? f.destino.texto : formatoValor(f.destino);
      // Nombres y valores largos se recortan con «…»: completos (con fuente, unidad y fecha) en el detalle (clic, F o I).
      ajustarAncho(add(txt(this, XL, y, info.llano, { size: 16 })), XT - XL - 10);
      const tT = ajustarAncho(add(txt(this, XT, y, vt, { size: 18, color: vt === sinDato() ? P.sec : P.dato })), 130);
      ajustarAncho(add(txt(this, XD, y, vd,
        { size: textoDestino ? 16 : 18, color: vd === sinDato() ? P.sec : textoDestino ? P.texto : P.dato, origen: [1, 0] })), XD - XT - Math.ceil(tT.width) - 12);
      add(txt(this, X1, y, '›', { size: 18, color: P.sec, origen: [1, 0] }));
      if (!f.mismaUnidad) {
        // Unidades distintas: no se comparan (la explicación, en el detalle).
        add(txt(this, XP, y, '⚠', { size: 14, color: P.riesgo, origen: [1, 0] }));
      } else {
        addTodos(barra(this, XB, y + 7, 50, 10, f.similitud, colorSimilitud(f.similitud)));
        add(txt(this, XP, y, typeof f.similitud === 'number' ? String(Math.round(f.similitud * 100)) : '—',
          { size: 14, color: typeof f.similitud === 'number' ? P.texto : P.sec, origen: [1, 0] }));
      }
      y += ALTO_FILA;
    });
    if (!filas.length) {
      add(txt(this, XM, y + 10, tr('Sin variables comparables.', 'No comparable variables.'), { size: 16, color: P.sec, origen: [0.5, 0] }));
      y += 36;
    }
    this.zonas.tabla = { x: X0 - 6, y: yTabla - 30, w: X1 - X0 + 12, h: y - yTabla + 28 };
    // Franja de ayuda: «100 % = igual a Marte · toca una fila: fuentes»; con el ratón sobre una fila, su pregunta llana y
    // su nombre técnico con unidad.
    const yAyuda = y;
    const yA = yAyuda + 1;
    this.textoAyuda = add(txt(this, X0, yA, '', { size: 14, color: P.sec }));
    this.textoAyudaTec = add(txt(this, X1, yA, '', { size: 14, color: P.sec, origen: [1, 0] }));
    this.leyenda = leyendaTabla(mundo);
    this.ayudaFila(null);
    y = this.dibujarLimites(addTodos, add, s, d, Math.max(yAyuda + 26, 300));
    this.dibujarRecorrido(add, s, d, Math.max(y + 4, 356));
    this.dibujarAcciones(add);
  }

  /** Franja de ayuda bajo la tabla: la pregunta de la fila bajo el ratón (blanco) y su nombre técnico (gris), o la leyenda. */
  ayudaFila(f, info) {
    if (!this.textoAyuda?.active) return;
    if (!f) {
      this.textoAyuda.setText(this.leyenda).setColor(P.sec);
      this.textoAyudaTec.setText('');
      return;
    }
    this.textoAyuda.setText(info.pregunta ?? info.llano).setColor(P.texto);
    this.textoAyudaTec.setText(tecnicoConUnidad(info, f.tierra?.unidad ?? f.destino?.unidad));
    ajustarAncho(this.textoAyudaTec, Math.max(40, X1 - X0 - Math.ceil(this.textoAyuda.width) - 16));
  }

  // Lo que la Tierra no puede probar (AGENTS.md §5 y §6.3): siempre visible como chips; la frase larga, en el detalle.
  dibujarLimites(addTodos, add, s, d, y) {
    const { noReproducible } = limitesDe(s, d);
    // Etiqueta en 2 renglones a la izquierda y los chips a su derecha (fuente ×2: una sola franja de 44 px).
    const etiqueta = add(txt(this, X0, y, tr('LA TIERRA NO\nPUEDE PROBAR', 'EARTH\nCANNOT TEST'), { size: 14, color: P.riesgo }));
    const xc = X0 + Math.ceil(etiqueta.width) + 12;
    const chips = chipsLimites(noReproducible, d.gravedad_ms2, GRAVEDAD.tierra)
      .map((c) => ({ texto: `✕ ${c.texto}`, color: P.riesgo }));
    if (!chips.length) chips.push({ texto: tr('sin dato', 'no data'), color: P.sec });
    const reserva = 64; // lugar para «+N · I» si no caben todos
    const fila = filaChips(this, xc, y + 6, chips, X1 - reserva, { gap: 8 });
    addTodos(fila.objs);
    if (fila.omitidos.length) add(txt(this, X1, y + 11, `+${fila.omitidos.length} · I`, { size: 14, color: P.sec, origen: [1, 0] }));
    const alto = Math.max(etiqueta.height, 6 + fila.alto);
    this.zonas.limites = { x: X0 - 4, y: y - 2, w: X1 - X0 + 8, h: alto + 4 };
    return y + alto;
  }

  // Lo que va a enfrentar el robot: el MISMO tramo que arma la escena (fisica/perfil.js). Prueba en la Tierra (izq.) y
  // misión en el destino (der.), cada una con ↗ subida · ∠ pendiente máx. · suelo · ⚠ crítico y 3 condiciones del lugar.
  dibujarRecorrido(add, s, d, y) {
    const alto = 104;
    this.zonas.recorrido = { x: X0 - 4, y, w: X1 - X0 + 8, h: alto };
    const mitad = (X1 - X0) / 2;
    add(this.add.rectangle(X0 - 4, y, X1 - X0 + 8, alto, 0x10202a).setOrigin(0, 0).setStrokeStyle(1, 0x2a5a6b));
    add(this.add.rectangle(X0 + mitad, y + 6, 1, alto - 12, 0x2a5a6b).setOrigin(0, 0));
    const mundo = String(MUNDOS[d.mundo] || d.mundo).toUpperCase();
    // Postal de arte (Mauricio, 96 × 64 con marco): el sitio de la Tierra a la izquierda y el destino a la derecha.
    // Sin postal propia, la genérica; sin arte, solo el texto (que entonces empieza en el borde).
    const postal = (x, claves) => {
      const k = claves.find((c) => this.textures.exists(c));
      if (!k) return 0;
      add(this.add.image(x, y + Math.round((alto - 64) / 2), k).setOrigin(0, 0));
      return 96 + 10;
    };
    // Cada renglón empieza con su ícono de arte ×1 (ico_prueba / ico_mision, ico_subida, ico_pendiente, ico_suelo).
    const ico = (x, yy, clave, nombreGlifo) => { add(icono(this, x + 8, yy + 11, [clave], nombreGlifo)); return x + 20; };
    const columna = (x, titulo, perfil, claves, icoTitulo) => {
      const xt = x + postal(x, claves);
      let r = null;
      try { r = resumenRecorrido(perfil()); } catch { r = null; }
      const extra = r?.ilustrativo ? ' · ILUSTR.' : '';
      const fin = x + mitad - 12;
      const xTit = ico(xt, y + 4, icoTitulo, 'mision');
      ajustarAncho(add(txt(this, xTit, y + 4, `${titulo}${extra}`, { size: 14, color: r?.ilustrativo ? P.riesgo : P.sec })), fin - xTit);
      if (!r) {
        add(txt(this, xt, y + 28, sinDato(), { size: 16, color: P.sec }));
        return;
      }
      const xS = ico(xt, y + 28, 'iconos/ico_subida', 'pendiente');
      const tS = add(txt(this, xS, y + 28, r.subida, { size: 16 }));
      const xP = ico(xS + Math.ceil(tS.width) + 10, y + 28, 'iconos/ico_pendiente', 'pendiente');
      ajustarAncho(add(txt(this, xP, y + 28, r.pendiente, { size: 16 })), fin - xP);
      const xSu = ico(xt, y + 52, 'iconos/ico_suelo', 'dato');
      ajustarAncho(add(txt(this, xSu, y + 52, r.suelo ?? sinDato(), { size: 16, color: P.dato })), fin - xSu);
      ajustarAncho(add(txt(this, xt, y + 76, `⚠ ${r.critico}`, { size: 16, color: P.riesgo })), fin - xt);
    };
    columna(X0, tr('PRUEBA · TIERRA', 'TEST · EARTH'), () => perfilDeSitio(s), [`pantallas/sitio_${s.id}`, 'pantallas/sitio_generico'], 'iconos/ico_prueba');
    columna(X0 + mitad + 8, `${tr('MISIÓN', 'MISSION')} · ${mundo}`, () => perfilDeDestino(d), [`pantallas/destino_${d.id}`], 'iconos/ico_mision');
    // El clima de cada lugar (antes 1 línea aquí) sigue completo en «C · Condiciones» y en el detalle (I).
    return y + alto;
  }

  // ---------- Pie: regresar, tickets, botones secundarios y UN botón principal ----------

  dibujarAcciones(add) {
    // Pie en UNA fila (fuente ×2): ← Regresar · Menú · I Datos · C Condiciones · Ficha ↗ … y el botón principal a la derecha.
    // Regresar = paso anterior (elegir destino); Menú = menú principal.
    const sec = { size: 14, origen: [0, 0.5], padX: 8 };
    const x = { [Y_NAV]: 10, [Y_PIE]: 10 };
    // Cada botón deja lugar para el «▶ » del foco de teclado (la caja crece hacia la derecha sin encimarse).
    const enFila = (etiqueta, accion, extra = {}, y = Y_PIE) => {
      const b = add(boton(this, x[y], y, etiqueta, accion, { ...sec, ...extra }));
      x[y] += Math.max(64, b.medidas().w) + (y === Y_NAV ? 20 : 26);
      return b;
    };
    const regresar = enFila(tr('← Regresar', '← Back'), () => this.regresar(), {}, Y_NAV);
    const volver = enFila(tr('Menú', 'Menu'), () => irA(this, 'Menu'), {}, Y_NAV);
    // «?»: repite el tutorial rápido (también con la tecla ?). Cabe a la izquierda del recorrido.
    this.botonAyuda = enFila('?', () => this.abrirTutorial(), { size: 16, padX: 10, habilitado: !!this.seleccion && !!this.destino }, Y_NAV);
    // Tickets (AGENTS.md §4): 3 por partida, sin reposición; volver a probar un sitio ya pagado no cuesta.
    const n = Math.max(0, partida.tickets | 0);
    const totalT = Math.max(TICKETS_POR_PARTIDA, n);
    const yT = LISTA.panelY + LISTA.panelAlto + 8;
    const tT = add(txt(this, 20, yT + 2, 'TICKETS', { size: 14, color: P.sec }));
    const xi = 20 + Math.ceil(tT.width) + 12;
    const ic = iconosTickets(this, xi, yT + 13, n, totalT, { color: n ? P.accion : P.riesgo });
    ic.objs.forEach((o) => add(o));
    add(txt(this, xi + ic.ancho + 12, yT + 2, `${n}/${totalT}`, { size: 18, color: n ? P.accion : P.riesgo, estilo: 'bold' }));

    const s = this.seleccion;
    const pagado = s && sitioPagado(partida, s.id);
    let etiqueta = tr('Gastar 1 ticket y probar', 'Spend 1 ticket and test');
    if (pagado) etiqueta = tr('Probar de nuevo (gratis)', 'Test again (free)');
    else if (!n) etiqueta = tr('Sin tickets', 'No tickets');
    const puede = !!s && (pagado || n > 0);
    const datos = enFila(tr('I · Datos', 'I · Data'), () => this.alternarDetalle(), { habilitado: !!s && !!this.destino });
    this.botonCondiciones = enFila(tr('C · Condiciones', 'C · Conditions'), () => this.abrirCondiciones(), { habilitado: !!s });
    const url = urlFicha(s);
    const ficha = enFila(url ? tr('Ficha web ↗', 'Web sheet ↗') : tr('Sin ficha web', 'No web sheet'), () => this.abrirFicha(url), { habilitado: !!url });
    // Botón principal con la caja de arte (el mismo botón de todo el juego), anclado a la derecha.
    // Opción sugerida (⏎): confirma el paso del camino dorado.
    const probar = add(boton(this, X1, Y_PIE, etiqueta, () => this.probar(),
      { size: 18, origen: [1, 0.5], habilitado: puede, sugerido: puede, anchoMin: 200, altoMin: 46 }));
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
    if (this.tutorial) return; // y el tutorial rápido
    this.teclado.alEscape = () => this.regresar(); // Esc = «← Regresar» (elegir destino), como en create()
    this.teclado.extra = {
      '?': () => this.abrirTutorial(),
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
    this.teclado.poner([...this.botonesLista, this.botonAnterior, this.botonSiguiente, ...this.botonesDetalle, this.botonRegresar, this.botonVolver, this.botonAyuda], preferido);
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
      explicaTotal(mundo),
      explicaConfianza(),
      `${tr('Proceso', 'Process')}:${trDato(s, 'proceso') || sinDato()}`,
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
    const mina = esMina(s);
    const filas = (this.filas || []).map((f) => {
      const vd = f.destino?.texto && f.destino.valor == null ? f.destino.texto : formatoValor(f.destino);
      const info = infoVariable(f.clave, { mina });
      // Primero en llano (la pregunta), luego el nombre técnico con su unidad y qué quiere decir el %; después las fuentes.
      const p = [
        ...(info.pregunta ? [info.pregunta] : []),
        `${tr('Nombre técnico', 'Technical name')}: ${tecnicoConUnidad(info, f.tierra?.unidad ?? f.destino?.unidad)}`,
        f.mismaUnidad ? `${tr('Parecido', 'Match')}: ${formatoPorcentaje(f.similitud)} (${explicaSimilitud(mundo)})` : tr('⚠ unidades distintas: no se comparan', '⚠ different units: not compared'),
        `${tr('Tierra', 'Earth')}: ${formatoValor(f.tierra)}\n${lado(f.tierra).join('\n')}`,
        `${mundo}: ${vd}\n${lado(f.destino).join('\n')}`,
      ];
      if (f.detalleForma) p.push(`${tr('Puntaje de forma', 'Shape score')}: ${formatoValor(f.detalleForma)}${trDato(f.detalleForma, 'nota') ? ` · ${trDato(f.detalleForma, 'nota')}` : ''}`);
      return { titulo: `${info.llano} · ${tr('fuentes', 'sources')}`, parrafos: p, fila: true, info };
    });
    return [
      { titulo: trDato(s, 'nombre'), parrafos: sitio },
      { titulo: tr('Límites y recorrido', 'Limits and route'), parrafos: recorrido },
      ...filas,
    ];
  }

  /** Corta las secciones en páginas de DET.lineas renglones (medidos con el ajuste de línea real). */
  paginarDetalle() {
    const medidor = txt(this, 0, 0, '', { size: DET.letra, ancho: DET.x1 - DET.x0 - 32 }).setVisible(false);
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
        paginas.push({ titulo: sec.titulo, texto: trozo.join('\n'), fila: !!sec.fila, info: sec.info ?? null });
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
    // Panel de arte (ui_panel, Mauricio) sobre un fondo opaco interactivo: no deja pasar los toques a las filas de abajo.
    add(this.add.rectangle(DET.x0, DET.y0, DET.x1 - DET.x0, DET.y1 - DET.y0, P.panel).setOrigin(0, 0)
      .setStrokeStyle(2, num(P.dato)).setInteractive());
    add(cajaArte(this, 'ui/ui_panel', DET.x0, DET.y0, DET.x1 - DET.x0, DET.y1 - DET.y0));
    // Secciones de una fila: el mismo ícono de la tabla (×2) antes del título.
    const xTit = pag.info ? DET.x0 + 56 : DET.x0 + 16;
    if (pag.info) add(iconoVariable(this, DET.x0 + 32, DET.y0 + 22, pag.info, { escala: 2 }));
    ajustarAncho(add(txt(this, xTit, DET.y0 + 12, pag.titulo, { size: 18, color: P.dato })), DET.x1 - 270 - xTit);
    add(txt(this, DET.x1 - 16, DET.y0 + 12, tr('I sigue · Esc cierra', 'I next · Esc closes'), { size: 14, color: P.sec, origen: [1, 0] }));
    add(txt(this, DET.x0 + 16, DET.y0 + 42, pag.texto, { size: DET.letra, color: P.texto, interlineado: 2 }));
    const yb = DET.y1 - 26;
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
  abrirCondiciones(pagina = 0) {
    if (!this.seleccion) return;
    if (this.capaCondiciones) this.capaCondiciones.destroy(true);
    else this.cerrarDetalle(false);
    const capa = this.add.container(0, 0).setDepth(10);
    this.capaCondiciones = capa;
    const add = (o) => { capa.add(o.obj || o); return o; };
    // Fondo opaco e interactivo: tapa la lista y el detalle y no deja pasar los toques.
    add(this.add.rectangle(COND.x0, COND.y0, COND.x1 - COND.x0, COND.y1 - COND.y0, COLOR.panel).setOrigin(0, 0)
      .setStrokeStyle(1, COLOR.borde).setInteractive());
    add(cajaArte(this, 'ui/ui_panel', COND.x0, COND.y0, COND.x1 - COND.x0, COND.y1 - COND.y0));
    add(texto(this, COND.x0 + 15, COND.y0 + 14, tr('CONDICIONES: aire, luz y efecto', 'CONDITIONS: air, light and effect'),
      { size: 18, color: COLOR.texto }));
    const cerrar = add(boton(this, COND.x1 - 14, COND.y0 + 26, tr('Volver (C)', 'Back (C)'), () => this.cerrarCondiciones(),
      { size: 16, origen: [1, 0.5], sugerido: true }));
    const { tierra, destino } = columnasCondiciones(this.seleccion, this.destino);
    // Fuente ×2: el texto completo no cabe en una pantalla; se pagina (← →) sin quitar nada.
    const yTexto = COND.y0 + 106;
    const porPagina = Math.floor((COND.y1 - 50 - yTexto) / 28); // renglón de 24 px + interlineado
    const medidor = texto(this, 0, 0, '', { size: COND.letra, ancho: COND.col }).setVisible(false);
    const renglones = (col) => (col.lineas.length ? col.lineas : [tr('Sin datos de ambiente para este lugar.', 'No environment data for this place.')])
      .flatMap((l) => medidor.getWrappedText(l));
    const cols = [tierra, destino].map((c) => ({ c, r: renglones(c) }));
    medidor.destroy();
    const paginas = Math.max(1, ...cols.map((x) => Math.ceil(x.r.length / porPagina)));
    const pag = Math.max(0, Math.min(paginas - 1, pagina));
    const columna = (x, { c, r }) => {
      // El título puede ocupar 2 renglones con nombres largos (p. ej. "Maar Al Wahbah (Harrat Kishb)").
      add(texto(this, x, COND.y0 + 52, c.titulo, { size: COND.letra, color: COLOR.foco, ancho: COND.col }));
      const t = add(texto(this, x, yTexto, r.slice(pag * porPagina, (pag + 1) * porPagina).join('\n'), {
        size: COND.letra, color: c.lineas.length ? COLOR.texto : P.sec,
      }));
      t.setLineSpacing(2);
      return t;
    };
    this.textosCondiciones = [columna(COND.x0 + 15, cols[0]), columna(COND.x0 + 15 + COND.col + 20, cols[1])];
    const ir = (paso) => this.abrirCondiciones((pag + paso + paginas) % paginas);
    const items = [cerrar];
    if (paginas > 1) {
      const yb = COND.y1 - 26;
      const ant = add(boton(this, COND.x0 + 40, yb, '◀', () => ir(-1), { size: 16 }));
      add(texto(this, COND.x0 + 110, yb, `${pag + 1}/${paginas}`, { size: 14, color: P.sec, origen: [0.5, 0.5] }));
      const sig = add(boton(this, COND.x0 + 180, yb, '▶', () => ir(1), { size: 16 }));
      items.unshift(ant, sig);
    }
    this.teclado.alEscape = () => this.cerrarCondiciones();
    this.teclado.extra = {
      c: () => this.cerrarCondiciones(), C: () => this.cerrarCondiciones(),
      ...(paginas > 1 ? { ArrowLeft: () => ir(-1), ArrowRight: () => ir(1), PageUp: () => ir(-1), PageDown: () => ir(1) } : {}),
    };
    this.teclado.numerar([]);
    this.teclado.items.filter((b) => b.obj.active).forEach((b) => b.enfocar(false));
    this.teclado.poner(items, cerrar);
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
