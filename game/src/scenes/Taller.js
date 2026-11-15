import Phaser from 'phaser';
import { irA } from './ui.js';
import * as K from './comun/pixel.js'; // botones, chips, barras, paneles e íconos de arte (DISENO.md §2)
import { PIEZAS, DESTINOS } from '../data.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { partida } from '../main.js';
import { RANURAS, DISENO_POR_DEFECTO, comoMapa, comoDiseno, resumen, validar, efectosEn } from './Taller/diseno.js';
import { historialAlEntrar, diferencias } from './Taller/historial.js';
import {
  PESTANAS, tarjetasDe, pestanaDeRanura, socketsPara, socketPreferido, poner, quitar as quitarDe, mover, ambosEjes, nombreCorto,
} from './Taller/arrastre.js';
import { RAZONES } from './Taller/bloqueadas.js';
import {
  PINTURAS, pinturaPorId, siguientePintura, normalizarNombre, personalizacionDe, fijar as fijarPersonalizacion, LARGO_NOMBRE,
} from './Taller/personalizacion.js';
import { MASA_CARGA_KG } from '../fisica/diseno.js'; // la carga que se entrega (frente juego)
import { ambienteDeDestino } from '../fisica/ambiente.js';
import { cargarArte, arteDePieza, hayArte, cuadros } from '../fisica/aspecto.js';
import { sonarBoton } from '../fisica/sonido.js';
import { tr, trDato, enIngles } from '../i18n.js';

// Dueño: frente taller. Armado por ARRASTRE en pixel art: el robot grande al centro con sus ranuras como sockets, la bandeja
// de piezas abajo por sistema, y el costo, la masa, la autonomía y el agarre en tiempo real a la derecha.
// Contrato con el frente juego: partida.diseno = [{ ranura, pieza }] (docs/juego/ESPECIFICACION.md §3).
// Tres formas de armar (AGENTS.md §12, accesible): arrastrar con ratón o dedo · tocar pieza y luego socket · teclado
// (←/→ socket, ↑/↓ pieza, Enter pone, Supr quita, Tab pestaña, A ambos ejes, Ctrl+Z/Y). Reglas puras en Taller/arrastre.js.

const C = {
  texto: '#ffffff', suave: '#9aa4c7', claro: '#cfd6ff', acento: '#ffd166', apagado: '#a3abcc',
  error: '#ff7a7a', ok: '#6ee7a8', // contraste ≥ 4.5:1 sobre el fondo oscuro (DISENO.md §2)
};
const ACENTO = 0xffd166;
const BIEN = 0x6ee7a8;
const ROJO = 0xff7a7a;
const BORDE = 0x4a5490;

// Texto del Taller: un solo punto de entrada para cambiarlo a la fuente bitmap cuando comun/pixel.js tenga `textoPixel`
// (hoy no existe en esta base). Mantiene la letra ≥ 14 px (DISENO.md §2.1).
const texto = (scene, x, y, s, o = {}) => K.txt(scene, x, y, s, o);

// ---- Disposición (960 × 540) ----
const S = 8; // escala del robot: 1 px de arte = 8 px de pantalla (el chasis de 24 px mide 192)
const ROBOT = { x: 308, y: 222 }; // centro del chasis
const ESCENARIO = { x: 14, y: 82, w: 588, h: 252 };
const LADO = { x: 612, y: 82, w: 334, h: 252 };
const SOCKET_W = 150;
const SOCKET_H = 46;
// Caja de cada socket (centro) y su punto de anclaje en el robot (px de arte desde el centro del chasis, como fisica/aspecto.js).
const SOCKETS = {
  modulo: { x: 98, y: 108, ancla: [5, -4.5] },
  carga: { x: 308, y: 108, ancla: [0, -5.5] },
  chasis: { x: 518, y: 108, ancla: [10, 0.5] },
  motor: { x: 92, y: 222, ancla: [-8, 0] },
  bateria: { x: 524, y: 222, ancla: [4.5, 0] },
  rueda_tras: { x: 108, y: 306, ancla: [-8.64, 3.2] },
  rueda_del: { x: 508, y: 306, ancla: [8.64, 3.2] },
};
const DECO = { motor: [-8, 0], bateria: [6, 0], modulo: [5, -4] }; // calcomanías sobre el chasis (fisica/aspecto.js POS_DECO)
const PESTANA_Y = 340;
const PESTANA_H = 30;
const CARTA_Y = 378;
const CARTA_W = 136;
const CARTA_H = 90;
const CARTA_X0 = 52;
const CARTA_PASO = CARTA_W + 8;
const POR_PAGINA = 6;
const BOTONES_Y = 494;
const AYUDA_Y = 530;
const UMBRAL_ARRASTRE = 6; // px que hay que mover para que un toque se vuelva arrastre

const piezaPorId = Object.fromEntries(PIEZAS.map((p) => [p.id, p]));
const ORDEN_RANURAS = RANURAS.map((r) => r.id);
const ranuraPorId = Object.fromEntries(RANURAS.map((r) => [r.id, r]));
// Pintura y nombre (cosméticos) viajan en el mismo mapa del historial, con claves que no son ranuras: así Deshacer/Rehacer
// también los revierten. comoDiseno() ignora estas claves (solo toma las de RANURAS).
const CLAVE_PINTURA = 'pintura';
const CLAVE_NOMBRE = 'nombre';
const nombreRanura = (id) => (ranuraPorId[id] ? trDato(ranuraPorId[id], 'nombre')
  : id === CLAVE_PINTURA ? tr('pintura', 'paint') : id === CLAVE_NOMBRE ? tr('nombre', 'name') : id);
const ETIQUETA_SOCKET = { carga: ['Carga', 'Cargo'], rueda_del: ['Eje del. ×2', 'Front ×2'], rueda_tras: ['Eje tras. ×2', 'Rear ×2'] };
const etiquetaSocket = (id) => (ETIQUETA_SOCKET[id] ? tr(...ETIQUETA_SOCKET[id]) : nombreRanura(id));

// Diseño con el que se cerró el Taller la última vez (Probar o Regresar), por partida (`clave` = partida.resultados).
// Si al volver partida.diseno es otro ("Aplicar y al taller" en Resultados), ese cambio queda como primer paso del historial.
let memoria = null;

// Arte de las piezas para la bandeja y el arrastre (frente arte): assets/piezas/<id>.png de 32 × 32 (#85), clave "piezas/<id>";
// si falta, el ícono 16 × 16 assets/iconos/<id>.png al doble; sin ninguno, RESPALDO_ICONO (otra pieza teñida).
const ARTE_PIEZAS = import.meta.glob('../../../assets/{piezas,iconos}/*.png', { eager: true, query: '?url', import: 'default' });
const URL_ARTE = Object.fromEntries(Object.entries(ARTE_PIEZAS).map(([ruta, url]) => [ruta.split('/').slice(-2).join('/').replace(/\.png$/, ''), url]));
const RESPALDO_ICONO = {
  chasis_titanio: ['chasis_ligero', 0xb4c0d4], chasis_carbono: ['chasis_ligero', 0x5c6274],
  rueda_nitinol: ['rueda_malla', 0xc8dcff], auto_rescate: ['ico_subida', null],
};

const SUPERFICIE_EN = { arena: 'sand', roca: 'rock', compacto: 'compact' };
const sup = (s) => tr(s, SUPERFICIE_EN[s] ?? s);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : '—');
const pct = (v) => `${Math.round(v * 100)} %`;
const MUNDO = () => ({ marte: tr('Marte', 'Mars'), luna: tr('Luna', 'Moon'), tierra: tr('Tierra', 'Earth') });
const conModificador = (ev) => Boolean(ev && (ev.ctrlKey || ev.metaKey || ev.altKey));
const corto = (p) => nombreCorto(p, enIngles());

/** Hasta 2 cifras de una pieza para su tarjeta: { k, v (0–1) } como barra, o { k } solo texto. Valores de juego (P). */
function cifrasDe(p) {
  const masa = (max) => ({ k: tr('masa', 'mass'), v: p.masa / max });
  switch (p.sistema) {
    case 'movilidad': return [{ k: sup('arena'), v: p.agarre?.arena }, { k: sup('roca'), v: p.agarre?.roca }];
    case 'estructura': return [{ k: tr('resist.', 'durab.'), v: p.resistencia / 120 }, masa(35)];
    case 'potencia': return [{ k: tr('fuerza', 'force'), v: p.fuerza / 90 }, { k: tr('gasto', 'drain'), v: p.consumo / 1.2 }];
    case 'energia': return [{ k: tr('carga', 'charge'), v: p.capacidad / 220 }, masa(11)];
    case 'carga': return [{ k: tr('protec.', 'prot.'), v: p.proteccion }, masa(6)];
    default: {
      let k = '';
      if (p.capacidad) k = tr(`recarga ${p.capacidad}`, `charge ${p.capacidad}`);
      else if (p.aislamiento_termico) k = tr('evita frío', 'stops cold');
      else if (p.radiador) k = tr('enfría motor', 'cools motor');
      else if (p.auto_rescate) k = tr('zafa atascos', 'gets unstuck');
      return [{ k }, masa(7)];
    }
  }
}

/** Una línea con todo lo de una pieza (abajo, al elegirla): nombre, costo en su ranura, masa y su dato clave. */
function detalleDe(p) {
  if (p.bloqueada) return `${tr('Bloqueada', 'Locked')} · ${trDato(p, 'nombre')} (${p.excel}, ${p.estado}): ${trDato(p, 'detalle')}`;
  const eje = p.sistema === 'movilidad';
  const costo = eje ? tr(`2 × ${p.costo} cr por eje`, `2 × ${p.costo} cr per axle`) : `${p.costo} cr`;
  const masa = `${p.masa * (eje ? 2 : 1)} kg`;
  let dato = '';
  if (p.agarre) dato = tr(`agarre arena ${f2(p.agarre.arena)} · roca ${f2(p.agarre.roca)} · comp. ${f2(p.agarre.compacto)}`,
    `grip sand ${f2(p.agarre.arena)} · rock ${f2(p.agarre.roca)} · compact ${f2(p.agarre.compacto)}`);
  if (p.amortiguacion) dato += tr(` · absorbe ${pct(p.amortiguacion)} de sacudidas`, ` · absorbs ${pct(p.amortiguacion)} of jolts`);
  else if (p.sistema === 'estructura') dato = tr(`resistencia ${p.resistencia}`, `durability ${p.resistencia}`);
  else if (p.sistema === 'potencia') dato = tr(`fuerza ${p.fuerza} · consumo ${p.consumo}/s`, `force ${p.fuerza} · drain ${p.consumo}/s`);
  else if (p.sistema === 'energia') dato = tr(`capacidad ${p.capacidad}`, `capacity ${p.capacidad}`);
  else if (p.sistema === 'carga') dato = tr(`protección ${pct(p.proteccion)}`, `protection ${pct(p.proteccion)}`);
  else if (p.capacidad) dato = tr(`recarga con la luz del lugar · capacidad ${p.capacidad}`, `recharges in local sunlight · capacity ${p.capacidad}`);
  else if (p.aislamiento_termico) dato = tr(`evita ${pct(p.aislamiento_termico)} de la pérdida por frío`, `prevents ${pct(p.aislamiento_termico)} of the cold loss`);
  else if (p.radiador) dato = tr('enfría el motor sin aire (radiación)', 'cools the motor without air (radiation)');
  else if (p.auto_rescate) {
    const a = p.auto_rescate;
    dato = tr(`atascado ${a.atasco_s} s → +${pct(a.agarre - 1)} agarre ${a.duracion_s} s, gasta ${a.energia}`,
      `stuck ${a.atasco_s} s → +${pct(a.agarre - 1)} grip for ${a.duracion_s} s, costs ${a.energia}`);
  }
  return `${trDato(p, 'nombre')} · ${costo} · ${masa} · ${dato} (P)`;
}

/** Zona de toque rectangular (coordenadas locales del objeto). */
function zonaToque(obj, x, y, w, h) {
  return obj.setInteractive({ hitArea: new Phaser.Geom.Rectangle(x, y, w, h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
}

export default class Taller extends Phaser.Scene {
  constructor() { super('Taller'); }

  preload() {
    // Normalmente el Boot ya los precargó; aquí solo se cargan los que falten.
    for (const [clave, url] of Object.entries(URL_ARTE)) if (!this.textures.exists(clave)) this.load.image(clave, url);
    cargarArte(this); // sprites del robot (fisica/aspecto.js): los mismos de la prueba
  }

  /**
   * Arte de una pieza (o de una bloqueada) a 32 px: { clave, tinte, escala } o null. Primero assets/piezas (32 × 32, escala 1),
   * luego assets/iconos (16 × 16, escala 2); sin arte propio, el de RESPALDO_ICONO teñido.
   */
  icono(p) {
    const buscar = (id, tinte = null) => {
      if (this.textures.exists(`piezas/${id}`)) return { clave: `piezas/${id}`, tinte, escala: 1 };
      if (this.textures.exists(`iconos/${id}`)) return { clave: `iconos/${id}`, tinte, escala: 2 };
      return null;
    };
    if (p.bloqueada) return this.textures.exists(p.icono) ? { clave: p.icono, tinte: null, escala: 2 } : null;
    const propio = buscar(p.id);
    if (propio) return propio;
    const r = RESPALDO_ICONO[p.id];
    return r ? buscar(r[0], r[1]) : null;
  }

  create() {
    if (this.textures.exists('pantallas/taller_fondo')) {
      this.add.image(480, 270, 'pantallas/taller_fondo').setScale(3).setDepth(-10);
      this.add.rectangle(480, 270, 960, 540, 0x0b0d17, 0.55).setDepth(-9);
    }
    this.input.mouse?.disableContextMenu(); // clic derecho en un socket = quitar
    this.presupuesto = partida.presupuesto ?? PRESUPUESTO_INICIAL;
    const cosmetica = personalizacionDe(partida);
    const conCosmetica = (m) => ({ ...m, [CLAVE_PINTURA]: cosmetica.pintura, ...(cosmetica.nombre ? { [CLAVE_NOMBRE]: cosmetica.nombre } : {}) });
    const entrada = comoMapa(partida.diseno);
    const vacia = !Object.keys(entrada).length;
    this.hist = historialAlEntrar(vacia ? null : memoria, conCosmetica(vacia ? comoMapa(DISENO_POR_DEFECTO) : entrada), partida.resultados,
      (antes, despues) => {
        const ranuras = diferencias(antes, despues, ORDEN_RANURAS);
        const lista = ranuras.map(nombreRanura).join(', ');
        return { ranura: ranuras[0] ?? null, texto: tr(`recomendación aplicada (${lista})`, `applied recommendation (${lista})`) };
      });
    this.mapa = this.hist.actual;
    this.sel = 0;        // socket elegido (índice en RANURAS)
    this.pestana = 'movilidad';
    this.cursor = 0;     // tarjeta resaltada en la pestaña
    this.pagina = 0;
    this.mano = false;   // la tarjeta del cursor está "tomada" (toque): el siguiente toque en un socket la pone
    this.aviso = '';
    this.arrastre = null;
    this.costoMostrado = null;

    this.crearEncabezado();
    this.crearEscenario();
    this.crearLado();
    this.crearBandeja();
    this.crearBotones();
    this.crearEntrada();

    const aplicado = this.hist.puedeDeshacer ? this.hist.presente.cambio : null;
    this.elegirSocket(aplicado && aplicado.ranura && ORDEN_RANURAS.includes(aplicado.ranura) ? ORDEN_RANURAS.indexOf(aplicado.ranura) : 1);
    if (aplicado) {
      const t = aplicado.texto.charAt(0).toUpperCase() + aplicado.texto.slice(1);
      this.aviso = tr(`${t}: Deshacer la revierte.`, `${t}: Undo reverts it.`);
    }
    this.refrescar();
    this.animarArmado();
  }

  // ───────────────────────── encabezado y presupuesto ─────────────────────────
  crearEncabezado() {
    const titulo = texto(this, 24, 24, tr('Taller', 'Workshop'), { size: 26, origen: [0, 0.5] });
    const destino = DESTINOS[partida.destino];
    const sitio = partida.sitio;
    const tipos = sitio?.nivel && Array.isArray(sitio.nivel.superficies)
      ? [...new Set(sitio.nivel.superficies.map((s) => s.tipo))].map(sup).join(', ') : null;
    const sub = [
      destino ? trDato(destino, 'nombre') : partida.destino,
      sitio ? tr('prueba: ', 'test: ') + trDato(sitio, 'nombre') : null,
      tipos,
    ].filter(Boolean).join(' · ');
    const xs = Math.round(titulo.x + titulo.width + 20);
    texto(this, xs, 24, sub, { size: 15, color: C.suave, origen: [0, 0.5], ancho: 815 - xs });
    this.btnAyuda = K.boton(this, 945, 24, tr('? Ayuda', '? Help'), () => this.alternarAyuda(), { size: 15, alto: 36, origen: [1, 0.5], color: K.P.dato });

    const y = 62;
    const etiqueta = texto(this, 24, y, tr('Presupuesto', 'Budget'), { size: 15, color: C.claro, origen: [0, 0.5] });
    this.barraX = etiqueta.x + etiqueta.width + 12;
    this.barraW = 250;
    this.barraPresupuesto = K.barra(this, this.barraX, y - 10, this.barraW, 20, 0, K.P.accion);
    this.txtCosto = texto(this, this.barraX + this.barraW + 12, y, '', { size: 18, origen: [0, 0.5] });
    this.txtRestante = texto(this, LADO.x + 4, y, '', { size: 15, color: C.apagado, origen: [0, 0.5] });
    // «Valores de juego»: precios, masas y agarres no son datos de ingeniería (AGENTS.md §3.4).
    texto(this, 945, y, tr('(P) valores de juego', '(P) game values'), { size: 14, color: C.apagado, origen: [1, 0.5] });
  }

  /** Barra y número del presupuesto, animados del costo anterior al nuevo; un «+N»/«−N» flota desde la barra. */
  mostrarCosto(costo, animar) {
    const pintar = (c) => {
      const pasado = c > this.presupuesto;
      this.barraPresupuesto.fijar(c / this.presupuesto, pasado ? K.P.riesgo : K.P.accion);
      this.txtCosto.setText(`${Math.round(c)} / ${this.presupuesto} cr`).setColor(pasado ? C.error : C.texto);
    };
    const antes = this.costoMostrado;
    this.costoMostrado = costo;
    const restante = this.presupuesto - costo;
    this.txtRestante.setText(restante < 0 ? tr(`✕ excede ${-restante} cr`, `✕ over by ${-restante} cr`) : tr(`quedan ${restante} cr`, `${restante} cr left`))
      .setColor(restante < 0 ? C.error : C.ok);
    if (!animar || antes == null || antes === costo) { pintar(costo); return; }
    this.tweenCosto?.stop();
    this.tweenCosto = this.tweens.addCounter({ from: antes, to: costo, duration: 260, ease: 'Quad.Out', onUpdate: (tw) => pintar(tw.getValue()), onComplete: () => pintar(costo) });
    const d = costo - antes;
    const x = this.barraX + Math.min(1, costo / this.presupuesto) * this.barraW;
    const f = texto(this, x, 50, `${d > 0 ? '+' : '−'}${Math.abs(d)} cr`, { size: 16, color: d > 0 ? C.acento : C.ok, origen: [0.5, 1], borde: true }).setDepth(30);
    this.tweens.add({ targets: f, y: 30, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => f.destroy() });
  }

  // ───────────────────────── escenario: robot y sockets ─────────────────────────
  crearEscenario() {
    K.panel(this, ESCENARIO.x, ESCENARIO.y, ESCENARIO.w, ESCENARIO.h, { alfa: 0.85 });
    this.lineas = this.add.graphics().setDepth(2);
    this.capaRobot = this.add.container(0, 0).setDepth(5);
    this.sockets = {};
    for (const r of RANURAS) {
      const s = SOCKETS[r.id];
      const x0 = s.x - SOCKET_W / 2;
      const y0 = s.y - SOCKET_H / 2;
      const caja = this.add.rectangle(x0, y0, SOCKET_W, SOCKET_H, 0x0b0d17, 0.88).setOrigin(0, 0).setStrokeStyle(2, BORDE).setDepth(3);
      zonaToque(caja, -3, -3, SOCKET_W + 6, SOCKET_H + 6);
      caja.on('pointerdown', (p) => this.alTocarSocket(r.id, p));
      caja.on('pointerover', () => { this.sobreSocket = r.id; this.pintarSockets(); });
      caja.on('pointerout', () => { if (this.sobreSocket === r.id) this.sobreSocket = null; this.pintarSockets(); });
      const img = this.add.image(x0 + 22, s.y, '__DEFAULT').setScale(2).setDepth(4).setVisible(false);
      const l1 = texto(this, x0 + 42, y0 + 5, '', { size: 14, color: C.claro }).setDepth(4);
      const l2 = texto(this, x0 + 42, y0 + 24, '', { size: 15 }).setDepth(4);
      this.sockets[r.id] = { caja, img, l1, l2, x0, y0 };
    }
    // Botón «igual en ambos ejes», entre las cajas de los ejes.
    this.btnEjes = K.boton(this, ROBOT.x, 306, tr('⇄ Igual en ambos ejes', '⇄ Same on both axles'), () => this.igualarEjes(), { size: 15, alto: 36 });
    for (const o of [this.btnEjes.obj, this.btnEjes.caja]) o.setDepth(6);
  }

  /** Punto de anclaje de un socket en el robot (px de pantalla). */
  ancla(id) {
    const [ax, ay] = SOCKETS[id].ancla;
    return { x: ROBOT.x + ax * S, y: ROBOT.y + ay * S };
  }

  /** Socket bajo un punto: cajas, anclas del robot, ruedas y cuerpo del chasis. */
  socketEn(x, y) {
    for (const r of RANURAS) {
      const s = this.sockets[r.id];
      if (x >= s.x0 - 6 && x <= s.x0 + SOCKET_W + 6 && y >= s.y0 - 6 && y <= s.y0 + SOCKET_H + 6) return r.id;
    }
    let mejor = null;
    let dMin = Infinity;
    for (const r of RANURAS) {
      const a = this.ancla(r.id);
      const radio = r.id.startsWith('rueda') ? 36 : r.id === 'chasis' ? 0 : 26;
      const d = Math.hypot(x - a.x, y - a.y);
      if (d <= radio && d < dMin) { mejor = r.id; dMin = d; }
    }
    if (mejor) return mejor;
    const cuerpo = this.cuerpoChasis;
    if (cuerpo && x >= cuerpo.x0 && x <= cuerpo.x1 && y >= cuerpo.y0 && y <= cuerpo.y1) return 'chasis';
    return null;
  }

  /** Dibuja el robot con los sprites de la prueba (×S) según el mapa; las ranuras vacías se ven como silueta. */
  dibujarRobot() {
    this.capaRobot.removeAll(true);
    this.partes = {};
    this.cajaCarga = null;
    const p = (id) => piezaPorId[this.mapa[id]] ?? null;
    const add = (o) => { this.capaRobot.add(o); return o; };
    const sprite = (nombre, x, y, tinte) => {
      const s = this.add.image(x, y, `arte:${nombre}`, cuadros(this, nombre)[0]).setScale(S);
      if (tinte != null) s.setTint(tinte);
      return add(s);
    };
    const g = add(this.add.graphics());
    const fantasma = (x, y, w, h, falta) => {
      g.lineStyle(2, falta ? ROJO : BORDE, 0.9);
      for (let i = 0; i < w; i += 10) { g.lineBetween(x + i, y, x + Math.min(w, i + 5), y); g.lineBetween(x + i, y + h, x + Math.min(w, i + 5), y + h); }
      for (let j = 0; j < h; j += 10) { g.lineBetween(x, y + j, x, y + Math.min(h, j + 5)); g.lineBetween(x + w, y + j, x + w, y + Math.min(h, j + 5)); }
    };
    // Chasis
    const chasis = p('chasis');
    const pintura = pinturaPorId(this.mapa[CLAVE_PINTURA]);
    let altoChasis = 6;
    if (chasis) {
      const arte = arteDePieza(this, chasis.id);
      const variante = `${chasis.id}_${pintura.id}`;
      const nombre = hayArte(this, variante) ? variante : arte?.nombre;
      if (nombre) {
        const tinte = nombre === variante ? null : (pintura.tinte !== 0xffffff ? pintura.tinte : arte.tinte);
        this.partes.chasis = sprite(nombre, ROBOT.x, ROBOT.y, tinte);
        altoChasis = this.partes.chasis.frame.height;
      } else {
        this.partes.chasis = add(this.add.rectangle(ROBOT.x, ROBOT.y, 24 * S, 6 * S, pintura.figura ?? 0xdfe3ee));
      }
    } else fantasma(ROBOT.x - 12 * S, ROBOT.y - 3 * S, 24 * S, 6 * S, true);
    const arriba = ROBOT.y - (altoChasis * S) / 2;
    this.cuerpoChasis = { x0: ROBOT.x - 12 * S, x1: ROBOT.x + 12 * S, y0: arriba, y1: ROBOT.y + (altoChasis * S) / 2 };
    // Calcomanías de motor, batería y módulo (si no hay calcomanía, su ícono pequeño encima del chasis)
    for (const [id, [dx, dy]] of Object.entries(DECO)) {
      const pz = p(id);
      const x = ROBOT.x + dx * S;
      const y = ROBOT.y + dy * S;
      if (!pz) { if (chasis) fantasma(x - 2.5 * S, y - 2 * S, 5 * S, 4 * S, ranuraPorId[id].obligatoria); continue; }
      if (hayArte(this, `deco_${pz.id}`)) this.partes[id] = sprite(`deco_${pz.id}`, x, y);
      else {
        const ic = this.icono(pz);
        this.partes[id] = ic ? add(this.add.image(x, y, ic.clave).setScale(ic.escala)) : add(this.add.rectangle(x, y, 5 * S, 4 * S, 0x80e0dc));
        if (ic?.tinte != null) this.partes[id].setTint(ic.tinte);
      }
    }
    // Soporte de carga y la carga encima
    const soporte = p('carga');
    if (soporte) {
      if (hayArte(this, soporte.id)) {
        const h = this.textures.getFrame(`arte:${soporte.id}`, cuadros(this, soporte.id)[0]).height;
        this.partes.carga = sprite(soporte.id, ROBOT.x, arriba - (h * S) / 2);
      } else this.partes.carga = add(this.add.rectangle(ROBOT.x, arriba - S, 10 * S, 2 * S, 0x9aa4c7));
      if (hayArte(this, 'carga')) this.cajaCarga = sprite('carga', ROBOT.x, arriba - 2.5 * S);
      else this.cajaCarga = add(this.add.rectangle(ROBOT.x, arriba - 2.5 * S, 7 * S, 5 * S, 0xffd166));
    } else fantasma(ROBOT.x - 5 * S, arriba - 3 * S, 10 * S, 3 * S, true);
    // Ruedas (encima del chasis, como en la prueba)
    for (const id of ['rueda_tras', 'rueda_del']) {
      const pz = p(id);
      const a = this.ancla(id);
      if (!pz) { fantasma(a.x - 3.5 * S, a.y - 3.5 * S, 7 * S, 7 * S, true); continue; }
      const arte = arteDePieza(this, pz.id);
      if (arte) this.partes[id] = sprite(arte.nombre, a.x, a.y, arte.tinte);
      else {
        const r = (pz.radio_m ?? 0.45) * 8 * S;
        const c = add(this.add.graphics({ x: a.x, y: a.y }));
        c.fillStyle(0x2b2d3a, 1).fillCircle(0, 0, r).lineStyle(3, 0x9aa4c7, 1).strokeCircle(0, 0, r);
        this.partes[id] = c;
      }
    }
    // Línea de suelo bajo las ruedas; las siluetas de lo que falta quedan encima de los sprites
    g.lineStyle(2, 0x5a6390, 1).lineBetween(ROBOT.x - 15 * S, ROBOT.y + 7 * S, ROBOT.x + 15 * S, ROBOT.y + 7 * S);
    this.capaRobot.bringToTop(g);
  }

  /** Cajas de los sockets: ícono, etiqueta y pieza; borde según estado (elegido, válido al arrastrar, falta). Líneas al robot. */
  pintarSockets() {
    const enMano = this.piezaEnMano();
    const validos = new Set(enMano ? socketsPara(enMano) : []);
    const t = this.time.now / 1000;
    this.lineas.clear();
    RANURAS.forEach((r, i) => {
      const s = this.sockets[r.id];
      const pz = piezaPorId[this.mapa[r.id]];
      const falta = !pz && r.obligatoria;
      const valido = validos.has(r.id);
      const elegido = i === this.sel;
      const sobre = this.sobreSocket === r.id || this.arrastre?.sobre === r.id;
      let color = falta ? ROJO : BORDE;
      let grosor = 2;
      if (elegido) { color = ACENTO; grosor = 3; }
      if (valido) { color = BIEN; grosor = sobre ? 4 : 3; }
      s.caja.setStrokeStyle(grosor, color).setFillStyle(valido ? 0x10301f : 0x0b0d17, valido && sobre ? 1 : 0.88);
      if (valido) s.caja.setAlpha(0.8 + 0.2 * Math.sin(t * 8)); else s.caja.setAlpha(1);
      const ic = pz ? this.icono(pz) : null;
      s.img.setVisible(Boolean(ic));
      if (ic) { s.img.setTexture(ic.clave).setScale(ic.escala); if (ic.tinte != null) s.img.setTint(ic.tinte); else s.img.clearTint(); }
      s.l1.setText(etiquetaSocket(r.id)).setColor(elegido ? C.acento : C.claro);
      s.l2.setText(pz ? corto(pz) : (r.obligatoria ? tr('(vacío)', '(empty)') : tr('(opcional)', '(optional)')))
        .setColor(falta ? C.error : pz ? C.texto : C.apagado);
      // Línea punteada de la caja al punto del robot
      const a = this.ancla(r.id);
      const bx = Phaser.Math.Clamp(a.x, s.x0, s.x0 + SOCKET_W);
      const by = Phaser.Math.Clamp(a.y, s.y0, s.y0 + SOCKET_H);
      const largo = Math.hypot(a.x - bx, a.y - by);
      this.lineas.lineStyle(2, valido ? BIEN : elegido ? ACENTO : 0x5a6390, valido || elegido ? 1 : 0.7);
      for (let d = 0; d < largo; d += 8) {
        const u0 = d / largo;
        const u1 = Math.min(1, (d + 4) / largo);
        this.lineas.lineBetween(bx + (a.x - bx) * u0, by + (a.y - by) * u0, bx + (a.x - bx) * u1, by + (a.y - by) * u1);
      }
      this.lineas.fillStyle(valido ? BIEN : elegido ? ACENTO : 0x5a6390, 1).fillRect(a.x - 3, a.y - 3, 6, 6);
    });
  }

  update() {
    if (this.arrastre?.activo || this.mano) this.pintarSockets(); // pulso de los sockets válidos
  }

  // ───────────────────────── panel de cifras (derecha) ─────────────────────────
  crearLado() {
    K.panel(this, LADO.x, LADO.y, LADO.w, LADO.h, { alfa: 0.85 });
    this.grupoLado = this.add.container(0, 0).setDepth(3);
    this.crearPersonalizacion();
  }

  refrescarLado(res, errores) {
    const g = this.grupoLado;
    g.removeAll(true);
    const x0 = LADO.x + 12;
    // 1) Validación en una fila de chips
    const chips = [];
    if (!errores.length) {
      chips.push({ texto: res.ejes_distintos ? tr('✓ Listo', '✓ Ready') : tr('✓ Listo para probar', '✓ Ready to test'), color: K.P.bien, size: 15 });
    }
    else {
      for (const r of RANURAS.filter((x) => x.obligatoria && !this.mapa[x.id])) {
        chips.push({ texto: tr(`✕ Falta ${String(r.nombre).toLowerCase()}`, `✕ Missing ${String(trDato(r, 'nombre')).toLowerCase()}`), tipo: 'rojo', size: 15 });
      }
      if (res.costo > this.presupuesto) chips.push({ texto: tr(`✕ Excede ${res.costo - this.presupuesto} cr`, `✕ Over by ${res.costo - this.presupuesto} cr`), tipo: 'rojo', size: 15 });
      if (!chips.length) chips.push({ texto: `✕ ${errores[0]}`, tipo: 'rojo', size: 15 });
    }
    if (res.ejes_distintos) chips.push({ texto: tr('⚠ Ejes distintos', '⚠ Mixed axles'), color: K.P.accion, size: 15 });
    g.add(K.filaChips(this, x0, LADO.y + 10, chips, LADO.x + LADO.w - 10).objs);

    // 2) Tres cifras: masa, autonomía y efecto del destino
    const destino = DESTINOS[partida.destino];
    const amb = destino ? ambienteDeDestino(destino.id, destino.mundo) : null;
    const e = efectosEn(res, amb);
    const mundo = destino ? (MUNDO()[destino.mundo] ?? destino.mundo) : '';
    let efecto = { n: '—', k: tr('destino', 'destination'), ico: 'iconos/ico_temperatura' };
    if (e) {
      if (res.radiador) efecto = { n: pct(e.potencia_caliente), k: tr('motor caliente', 'hot motor'), ico: 'iconos/ico_temperatura' };
      else if (e.recarga_s) efecto = { n: `+${e.recarga_s.toFixed(2)}/s`, k: tr('panel solar', 'solar panel'), ico: 'iconos/ico_luz' };
      else efecto = { n: pct(e.bateria), k: tr(`batería ${mundo}`, `battery ${mundo}`), ico: 'iconos/ico_temperatura' };
    }
    const cifras = [
      { n: `${res.masa} kg`, k: tr(`+${MASA_CARGA_KG} kg carga`, `+${MASA_CARGA_KG} kg cargo`), ico: 'iconos/ico_gravedad', esc: 1, resp: '↓' },
      { n: res.autonomia_s != null ? `${Math.round(res.autonomia_s)} s` : '—', k: tr('autonomía', 'run time'), ico: 'ui/ui_icono_energia', esc: 2, resp: '⚡' },
      { ...efecto, esc: 1, resp: '°' },
    ];
    cifras.forEach((c, i) => {
      const x = x0 + i * 108;
      g.add(K.icono(this, x + 8, LADO.y + 54, c.ico, { escala: c.esc, respaldo: c.resp }));
      g.add(texto(this, x + 20, LADO.y + 44, c.n, { size: 18 }));
      g.add(texto(this, x, LADO.y + 66, c.k, { size: 14, color: C.apagado }));
    });

    // 3) Agarre de las ruedas (promedio de los ejes): 3 barras con su número
    ['arena', 'roca', 'compacto'].forEach((s, i) => {
      const x = x0 + i * 106;
      const v = res.agarre[s];
      const color = v == null ? K.P.sec : v >= 0.7 ? K.P.bien : v >= 0.5 ? K.P.accion : K.P.riesgo;
      g.add(texto(this, x, LADO.y + 90, `${s === 'compacto' ? 'comp.' : sup(s)} ${f2(v)}`, { size: 15 }));
      g.add(K.barra(this, x, LADO.y + 110, 98, 12, v, color).objs);
    });

    // 4) Protección y resistencia, y la línea de lo especial del diseño (módulo, llanta o el destino)
    const prot = res.proteccion != null ? pct(res.proteccion) : '—';
    g.add(texto(this, x0, LADO.y + 130, tr(`Protección ${prot} · resistencia ${res.resistencia ?? '—'}`, `Protection ${prot} · durability ${res.resistencia ?? '—'}`), { size: 15 }));
    g.add(texto(this, x0, LADO.y + 152, this.lineaEspecial(res, e), { size: 14, color: C.ok, ancho: LADO.w - 24 }));
  }

  /** Lo que hace diferente a este diseño: auto-rescate, Nitinol o el efecto del destino (con y sin el módulo). */
  lineaEspecial(res, e) {
    if (res.auto_rescate) {
      const a = res.auto_rescate;
      return tr(`Auto-rescate: atascado ${a.atasco_s} s → +${pct(a.agarre - 1)} agarre`, `Self-rescue: stuck ${a.atasco_s} s → +${pct(a.agarre - 1)} grip`);
    }
    if (res.amortiguacion) return tr(`Llanta de Nitinol: absorbe ${pct(res.amortiguacion)} de sacudidas`, `Nitinol tire: absorbs ${pct(res.amortiguacion)} of jolts`);
    return this.lineasDestino(res, e)[0] ?? '';
  }

  // ───────────────────────── bandeja de piezas ─────────────────────────
  crearBandeja() {
    this.pestanasUI = PESTANAS.map((t, i) => {
      const w = 148;
      const x = 16 + i * (w + 6);
      const caja = this.add.rectangle(x, PESTANA_Y, w, PESTANA_H, 0x141830, 0.95).setOrigin(0, 0).setStrokeStyle(2, BORDE);
      zonaToque(caja, 0, -4, w, PESTANA_H + 6);
      caja.on('pointerdown', () => this.elegirPestana(t.id));
      const etq = texto(this, x + w / 2 + (t.bloqueadas ? 10 : 0), PESTANA_Y + PESTANA_H / 2, trDato(t, 'nombre'), { size: 15, origen: [0.5, 0.5] });
      const candado = t.bloqueadas ? this.candado(x + w / 2 - etq.width / 2 - 4, PESTANA_Y + PESTANA_H / 2, 2) : null;
      return { t, caja, etq, candado };
    });
    this.lista = this.add.container(0, 0).setDepth(3);
    this.flechaIzq = texto(this, 28, CARTA_Y + CARTA_H / 2, '‹', { size: 28, color: C.acento, origen: [0.5, 0.5] });
    this.flechaDer = texto(this, 932, CARTA_Y + CARTA_H / 2, '›', { size: 28, color: C.acento, origen: [0.5, 0.5] });
    zonaToque(this.flechaIzq, (this.flechaIzq.width - 40) / 2, (this.flechaIzq.height - 70) / 2, 40, 70).on('pointerdown', () => this.paginar(-1));
    zonaToque(this.flechaDer, (this.flechaDer.width - 40) / 2, (this.flechaDer.height - 70) / 2, 40, 70).on('pointerdown', () => this.paginar(1));
    this.input.on('wheel', (pt, _o, _dx, dy) => { if (pt.y >= CARTA_Y && pt.y <= CARTA_Y + CARTA_H) this.paginar(Math.sign(dy)); });
  }

  /** Candado en pixel art (gráficos) centrado en (x, y); escala `e` = px de pantalla por px de arte. */
  candado(x, y, e = 2, contenedor = null) {
    const g = this.add.graphics({ x: x - 3 * e, y: y - 4 * e });
    g.fillStyle(0xa3abcc, 1);
    g.fillRect(1 * e, 0, 4 * e, e); g.fillRect(0, e, e, 3 * e); g.fillRect(5 * e, e, e, 3 * e); // arco
    g.fillStyle(0xffd166, 1).fillRect(0, 3 * e, 6 * e, 5 * e); // cuerpo
    g.fillStyle(0x0b0d17, 1).fillRect(2.5 * e, 5 * e, e, 2 * e); // cerradura
    if (contenedor) contenedor.add(g);
    return g;
  }

  tarjetas() { return tarjetasDe(this.pestana, PIEZAS); }

  elegirPestana(id, { cursorEn = null } = {}) {
    this.pestana = id;
    const lista = this.tarjetas();
    const i = cursorEn ? lista.findIndex((p) => p.id === cursorEn) : -1;
    this.cursor = Math.max(0, i);
    this.pagina = Math.floor(this.cursor / POR_PAGINA);
    this.mano = false;
    this.refrescarBandeja();
    this.pintarSockets();
  }

  paginar(d) {
    const n = Math.ceil(this.tarjetas().length / POR_PAGINA);
    const p = Phaser.Math.Clamp(this.pagina + d, 0, n - 1);
    if (p === this.pagina) return;
    this.pagina = p;
    this.cursor = p * POR_PAGINA;
    this.mano = false;
    this.refrescarBandeja();
  }

  /** Tarjetas de la página: ícono, nombre corto, costo en su ranura y 2 cifras en barras. */
  refrescarBandeja() {
    for (const { t, caja, etq } of this.pestanasUI) {
      const activa = t.id === this.pestana;
      caja.setFillStyle(activa ? 0x2b3470 : 0x141830, 0.95).setStrokeStyle(activa ? 3 : 2, activa ? ACENTO : BORDE);
      etq.setColor(activa ? C.acento : C.claro);
    }
    this.lista.removeAll(true);
    this.cartasUI = [];
    const lista = this.tarjetas();
    const paginas = Math.ceil(lista.length / POR_PAGINA);
    this.flechaIzq.setVisible(paginas > 1).setAlpha(this.pagina > 0 ? 1 : 0.35);
    this.flechaDer.setVisible(paginas > 1).setAlpha(this.pagina < paginas - 1 ? 1 : 0.35);
    const puestas = new Set(Object.values(this.mapa));
    lista.slice(this.pagina * POR_PAGINA, (this.pagina + 1) * POR_PAGINA).forEach((p, j) => {
      const i = this.pagina * POR_PAGINA + j;
      const x = CARTA_X0 + j * CARTA_PASO;
      const tomada = this.mano && i === this.cursor;
      const y = CARTA_Y - (tomada ? 4 : 0);
      const resaltada = i === this.cursor;
      const puesta = !p.bloqueada && puestas.has(p.id);
      const fondo = K.nueve(this, 'ui/ui_tarjeta', x, y, CARTA_W, CARTA_H, 3, 2)
        ?? this.add.rectangle(x, y, CARTA_W, CARTA_H, 0x141830).setOrigin(0, 0);
      const marco = this.add.rectangle(x, y, CARTA_W, CARTA_H).setOrigin(0, 0)
        .setStrokeStyle(resaltada ? 3 : 2, resaltada ? ACENTO : puesta ? BIEN : BORDE, resaltada || puesta ? 1 : 0.6);
      zonaToque(marco, 0, 0, CARTA_W, CARTA_H);
      marco.on('pointerdown', (pt) => this.alTocarCarta(i, pt));
      const objs = [fondo, marco];
      const ic = this.icono(p);
      if (ic) {
        const img = this.add.image(x + 22, y + 22, ic.clave).setScale(ic.escala);
        if (ic.tinte != null) img.setTint(ic.tinte);
        if (p.bloqueada) img.setAlpha(0.45);
        objs.push(img);
      }
      if (p.bloqueada) {
        objs.push(texto(this, x + CARTA_W - 6, y + 3, p.excel.split(' · ')[0], { size: 14, color: C.claro, origen: [1, 0] }));
        objs.push(texto(this, x + CARTA_W - 6, y + 21, p.estado, { size: 14, color: C.apagado, origen: [1, 0] }));
        objs.push(texto(this, x + 6, y + 38, corto(p), { size: 15, color: C.apagado }));
        objs.push(texto(this, x + 6, y + 56, RAZONES[p.razon][enIngles() ? 'corto_en' : 'corto'], { size: 14, color: C.error }));
        objs.push(texto(this, x + 26, y + 73, tr('bloqueada', 'locked'), { size: 14, color: C.apagado }));
      } else {
        const eje = p.sistema === 'movilidad';
        objs.push(texto(this, x + CARTA_W - 6, y + 3, `${p.costo * (eje ? 2 : 1)} cr`, { size: 15, color: C.acento, origen: [1, 0] }));
        const ranura = eje ? tr('eje ×2', 'axle ×2') : etiquetaSocket(socketsPara(p)[0]);
        objs.push(texto(this, x + CARTA_W - 6, y + 21, ranura, { size: 14, color: C.apagado, origen: [1, 0] }));
        objs.push(texto(this, x + 6, y + 38, `${puesta ? '✓ ' : ''}${corto(p)}`, { size: 15, color: puesta ? C.ok : C.texto }));
        cifrasDe(p).forEach((c, k) => {
          const cy = y + 56 + k * 17;
          objs.push(texto(this, x + 6, cy, c.k, { size: 14, color: C.claro }));
          if (c.v != null) objs.push(...K.barra(this, x + 72, cy + 3, 58, 10, c.v, K.P.dato).objs);
        });
      }
      this.lista.add(objs);
      if (p.bloqueada) {
        // El candado va dentro del contenedor (se destruye con la página).
        this.candado(x + 14, y + 81, 1.6, this.lista);
      }
      this.cartasUI[i] = { x, y, p, marco };
    });
  }

  // ───────────────────────── botones de abajo ─────────────────────────
  crearBotones() {
    const opc = { size: 15, alto: 42, origen: [0, 0.5], zonaExtra: [0, 2] };
    let x = 16;
    const sig = (b) => { x = b.caja.x + b.ancho + 10; return b; };
    this.btnRegresar = sig(K.boton(this, x, BOTONES_Y, tr('← Regresar', '← Back'), () => this.regresar(), opc));
    this.btnDeshacer = sig(K.boton(this, x, BOTONES_Y, tr('Deshacer', 'Undo'), () => this.deshacer(), opc));
    this.btnRehacer = sig(K.boton(this, x, BOTONES_Y, tr('Rehacer', 'Redo'), () => this.rehacer(), opc));
    this.btnQuitar = sig(K.boton(this, x, BOTONES_Y, tr('Quitar', 'Remove'), () => this.quitarSocket(ORDEN_RANURAS[this.sel]), opc));
    this.btnRestablecer = sig(K.boton(this, x, BOTONES_Y, tr('Restablecer', 'Reset'), () => this.restablecer(), opc));
    this.btnContinuar = K.boton(this, 945, BOTONES_Y, tr('Probar el robot', 'Test the robot'), () => this.continuar(),
      { size: 18, alto: 42, origen: [1, 0.5], anchoMin: 230, zonaExtra: [0, 2] });
    this.txtAyuda = texto(this, 480, AYUDA_Y, '', { size: 14, color: C.apagado, origen: [0.5, 0.5] });
  }

  // ───────────────────────── entrada: puntero y teclado ─────────────────────────
  crearEntrada() {
    this.input.on('pointermove', (pt) => this.alMover(pt));
    this.input.on('pointerup', (pt) => this.alSoltar(pt));
    this.input.on('pointerupoutside', (pt) => this.alSoltar(pt));
    // Arrastrar desde el robot: tocar un sprite del robot es tocar su socket.
    this.input.on('pointerdown', (pt, objs) => {
      if (objs.length || this.ayuda) return;
      const id = this.socketEn(pt.x, pt.y);
      if (id) this.alTocarSocket(id, pt);
    });
    const k = this.input.keyboard;
    // A veces Phaser entrega el mismo keydown nativo dos veces: cada manejador atiende cada evento nativo una sola vez.
    const on = (nombre, fn) => {
      const vistos = new WeakSet();
      k.on(nombre, (ev) => {
        if (ev && typeof ev === 'object') { if (vistos.has(ev)) return; vistos.add(ev); }
        fn(ev);
      });
    };
    on('keydown-LEFT', () => this.elegirSocket(this.sel - 1));
    on('keydown-RIGHT', () => this.elegirSocket(this.sel + 1));
    on('keydown-UP', () => this.moverCursor(-1));
    on('keydown-DOWN', () => this.moverCursor(1));
    on('keydown-ENTER', () => this.ponerCursor());
    on('keydown-SPACE', () => this.ponerCursor());
    on('keydown-DELETE', () => this.quitarSocket(ORDEN_RANURAS[this.sel]));
    on('keydown-BACKSPACE', () => this.quitarSocket(ORDEN_RANURAS[this.sel]));
    on('keydown-TAB', (ev) => {
      ev?.preventDefault?.();
      const i = PESTANAS.findIndex((t) => t.id === this.pestana);
      this.elegirPestana(PESTANAS[(i + (ev?.shiftKey ? -1 : 1) + PESTANAS.length) % PESTANAS.length].id);
      this.refrescar();
    });
    on('keydown-A', (ev) => { if (!conModificador(ev)) this.igualarEjes(); });
    on('keydown-R', (ev) => { if (!conModificador(ev)) this.restablecer(); });
    on('keydown-C', (ev) => { if (!conModificador(ev)) this.continuar(); });
    on('keydown-P', (ev) => { if (!conModificador(ev)) this.pintar(siguientePintura(this.mapa[CLAVE_PINTURA], ev.shiftKey ? -1 : 1)); });
    on('keydown-N', (ev) => { if (!conModificador(ev)) { ev.preventDefault(); this.abrirNombre(); } });
    this.events.once('shutdown', () => this.cerrarNombre());
    on('keydown-ESC', () => (this.ayuda ? this.alternarAyuda() : this.mano ? this.soltarMano() : this.regresar()));
    on('keydown-H', (ev) => { if (!conModificador(ev)) this.alternarAyuda(); });
    on('keydown', (ev) => {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
      const tecla = ev.key.toLowerCase();
      if (tecla === 'z' && !ev.shiftKey) this.deshacer();
      else if (tecla === 'y' || (tecla === 'z' && ev.shiftKey)) this.rehacer();
      else return;
      ev.preventDefault();
    });
  }

  /** Pieza que se está arrastrando o que está "tomada" (toque o cursor con mano). */
  piezaEnMano() {
    if (this.arrastre?.activo) return this.arrastre.pieza;
    if (this.mano) return this.tarjetas()[this.cursor] ?? null;
    return null;
  }

  alTocarCarta(i, pt) {
    if (pt?.rightButtonDown?.()) return;
    const pieza = this.tarjetas()[i];
    this.arrastre = { origen: 'carta', indice: i, pieza, x0: pt.x, y0: pt.y, activo: false, sobre: null };
  }

  alTocarSocket(id, pt) {
    if (this.ayuda) return;
    if (pt?.rightButtonDown?.()) { this.quitarSocket(id); return; } // clic derecho = quitar
    const pieza = piezaPorId[this.mapa[id]] ?? null;
    this.arrastre = { origen: 'socket', ranura: id, pieza, x0: pt.x, y0: pt.y, activo: false, sobre: null };
  }

  alMover(pt) {
    const a = this.arrastre;
    if (!a || !pt.isDown) return;
    if (!a.activo) {
      if (!a.pieza || Math.hypot(pt.x - a.x0, pt.y - a.y0) < UMBRAL_ARRASTRE) return;
      if (a.pieza.bloqueada) { this.avisoBloqueada(a.pieza); this.arrastre = null; return; }
      a.activo = true;
      this.mano = false;
      if (a.origen === 'carta') { this.cursor = a.indice; this.refrescarBandeja(); }
      a.fantasma = this.crearFantasma(a.pieza);
      if (a.origen === 'socket') this.partes?.[a.ranura]?.setAlpha(0.3);
    }
    a.fantasma.setPosition(pt.x, pt.y);
    const s = this.socketEn(pt.x, pt.y);
    a.sobre = s && socketsPara(a.pieza).includes(s) ? s : null;
    this.pintarSockets();
  }

  /** Lo que sigue al puntero mientras se arrastra: el ícono grande y el nombre corto. */
  crearFantasma(p) {
    const c = this.add.container(0, 0).setDepth(50);
    const ic = this.icono(p);
    if (ic) {
      const img = this.add.image(0, 0, ic.clave).setScale(ic.escala * 2); // 64 px
      if (ic.tinte != null) img.setTint(ic.tinte);
      c.add(img);
    } else c.add(this.add.rectangle(0, 0, 40, 40, 0x80e0dc));
    c.add(texto(this, 0, 28, corto(p), { size: 14, origen: [0.5, 0], borde: true }));
    c.setScale(1.1);
    this.tweens.add({ targets: c, scale: 1, duration: 120 });
    return c;
  }

  alSoltar(pt) {
    const a = this.arrastre;
    this.arrastre = null;
    if (!a) return;
    if (!a.activo) { this.alTocar(a); return; }
    const destino = this.socketEn(pt.x, pt.y);
    const valido = destino && socketsPara(a.pieza).includes(destino);
    if (a.origen === 'carta') {
      if (valido) { a.fantasma.destroy(); this.ponerEn(a.pieza, destino); return; }
      // Inválido: la pieza vuelve a su tarjeta.
      const carta = this.cartasUI?.[a.indice];
      const vx = carta ? carta.x + 22 : a.x0;
      const vy = carta ? carta.y + 22 : a.y0;
      this.tweens.add({ targets: a.fantasma, x: vx, y: vy, alpha: 0, scale: 0.6, duration: 220, ease: 'Quad.In', onComplete: () => a.fantasma.destroy() });
      if (destino) this.avisar(tr(`${corto(a.pieza)} no va en ${etiquetaSocket(destino)}.`, `${corto(a.pieza)} does not fit in ${etiquetaSocket(destino)}.`));
      this.pintarSockets();
      return;
    }
    // Desde el robot: a otro socket válido = mover; fuera de cualquier socket = quitar; a uno inválido = vuelve.
    this.partes?.[a.ranura]?.setAlpha(1);
    if (valido && destino !== a.ranura) {
      a.fantasma.destroy();
      const r = mover(this.mapa, a.ranura, destino, PIEZAS);
      if (r.ok) this.aplicarCambio(r.mapa, { ranura: destino, texto: tr(`mover ${corto(a.pieza)} a ${etiquetaSocket(destino)}`, `move ${corto(a.pieza)} to ${etiquetaSocket(destino)}`) }, { encaja: destino, suelta: a.ranura });
      return;
    }
    if (!destino) { a.fantasma.destroy(); this.quitarSocket(a.ranura); return; }
    const o = this.ancla(a.ranura);
    this.tweens.add({ targets: a.fantasma, x: o.x, y: o.y, alpha: 0, duration: 200, onComplete: () => a.fantasma.destroy() });
    this.pintarSockets();
  }

  /** Toque sin arrastre: tomar/poner una tarjeta, o elegir un socket (o poner en él la tarjeta tomada). */
  alTocar(a) {
    if (a.origen === 'carta') {
      const p = a.pieza;
      if (this.mano && this.cursor === a.indice) { this.ponerCursor(); return; } // segundo toque = ponerla
      this.cursor = a.indice;
      if (p.bloqueada) { this.mano = false; this.avisoBloqueada(p); this.refrescarBandeja(); this.pintarSockets(); return; }
      this.mano = true;
      this.aviso = '';
      this.detalle = detalleDe(p);
      this.refrescarBandeja();
      this.pintarSockets();
      this.refrescarAyuda(tr('Toca un socket verde (o la tarjeta otra vez) para ponerla.', 'Tap a green socket (or the card again) to fit it.'));
      return;
    }
    const id = a.ranura;
    if (this.mano) {
      const p = this.tarjetas()[this.cursor];
      if (p && socketsPara(p).includes(id)) { this.ponerEn(p, id); return; }
      this.avisar(tr(`${corto(p)} no va en ${etiquetaSocket(id)}.`, `${corto(p)} does not fit in ${etiquetaSocket(id)}.`));
      return;
    }
    this.elegirSocket(ORDEN_RANURAS.indexOf(id));
  }

  soltarMano() { this.mano = false; this.refrescarBandeja(); this.pintarSockets(); this.refrescarAyuda(); }

  avisoBloqueada(p) {
    this.detalle = detalleDe(p);
    this.avisar(tr(`${trDato(p, 'nombre')}: bloqueada (${RAZONES[p.razon].es}).`, `${trDato(p, 'nombre')}: locked (${RAZONES[p.razon].en}).`));
  }

  avisar(t) {
    this.aviso = t;
    this.cameras.main.shake(90, 0.003);
    this.refrescarAyuda();
  }

  // ───────────────────────── acciones del armado ─────────────────────────
  elegirSocket(i) {
    this.sel = (i + RANURAS.length) % RANURAS.length;
    const id = ORDEN_RANURAS[this.sel];
    this.mano = false;
    this.aviso = '';
    this.detalle = null;
    this.elegirPestana(pestanaDeRanura(id), { cursorEn: this.mapa[id] ?? null });
    if (!this.mapa[id]) {
      const lista = this.tarjetas();
      this.cursor = Math.max(0, lista.findIndex((p) => socketsPara(p).includes(id)));
      this.pagina = Math.floor(this.cursor / POR_PAGINA);
      this.refrescarBandeja();
    }
    this.pintarSockets();
    this.refrescarAyuda();
    this.refrescarBotones();
  }

  moverCursor(d) {
    const n = this.tarjetas().length;
    if (!n) return;
    this.cursor = (this.cursor + d + n) % n;
    this.pagina = Math.floor(this.cursor / POR_PAGINA);
    this.mano = false;
    this.detalle = detalleDe(this.tarjetas()[this.cursor]);
    this.aviso = '';
    this.refrescarBandeja();
    this.pintarSockets();
    this.refrescarAyuda();
  }

  /** Pone la tarjeta del cursor en el socket preferido (el elegido si la acepta). */
  ponerCursor() {
    const p = this.tarjetas()[this.cursor];
    if (!p) return;
    if (p.bloqueada) { this.avisoBloqueada(p); return; }
    const id = socketPreferido(p, ORDEN_RANURAS[this.sel], this.mapa);
    this.ponerEn(p, id);
  }

  ponerEn(p, id) {
    this.mano = false;
    const r = poner(this.mapa, p, id);
    if (!r.ok) {
      if (r.motivo === 'igual') { this.aviso = tr(`${corto(p)} ya está en ${etiquetaSocket(id)}.`, `${corto(p)} is already in ${etiquetaSocket(id)}.`); this.refrescar(); }
      else if (r.motivo === 'bloqueada') this.avisoBloqueada(p);
      return;
    }
    this.sel = ORDEN_RANURAS.indexOf(id);
    this.aplicarCambio(r.mapa, { ranura: id, texto: `${nombreRanura(id)} → ${trDato(p, 'nombre')}` }, { encaja: id });
    if (id.startsWith('rueda') && r.mapa.rueda_del !== r.mapa.rueda_tras && r.mapa.rueda_del && r.mapa.rueda_tras) {
      this.aviso = tr('Rueda puesta en un eje: «⇄ Igual en ambos ejes» (A) copia la misma al otro.', 'Wheel fitted on one axle: «⇄ Same on both axles» (A) copies it to the other.');
      this.refrescarAyuda();
    }
  }

  quitarSocket(id) {
    const r = quitarDe(this.mapa, id);
    if (!r.ok) return;
    this.sel = ORDEN_RANURAS.indexOf(id);
    this.aplicarCambio(r.mapa, { ranura: id, texto: tr(`quitar ${nombreRanura(id)}`, `remove ${nombreRanura(id)}`) }, { suelta: id });
    // La bandeja salta a las piezas de ese socket para poner otra.
    this.elegirPestana(pestanaDeRanura(id), { cursorEn: r.antes });
    this.aviso = tr(`${nombreRanura(id)} quitada: arrastra otra pieza al socket.`, `${nombreRanura(id)} removed: drag another part onto the socket.`);
    this.refrescarAyuda();
  }

  igualarEjes() {
    const sel = ORDEN_RANURAS[this.sel];
    const r = ambosEjes(this.mapa, sel);
    if (!r.ok) { this.aviso = tr('Los dos ejes ya llevan la misma rueda.', 'Both axles already have the same wheel.'); this.refrescarAyuda(); return; }
    this.sel = ORDEN_RANURAS.indexOf(r.otro);
    this.aplicarCambio(r.mapa, { ranura: r.otro, texto: tr('ambos ejes → ', 'both axles → ') + trDato(piezaPorId[r.mapa[r.otro]], 'nombre') }, { encaja: r.otro });
  }

  restablecer() {
    // Vuelve a las piezas del robot mínimo; la pintura y el nombre (cosméticos) se quedan.
    const cosmetica = Object.fromEntries([CLAVE_PINTURA, CLAVE_NOMBRE].filter((c) => this.mapa[c]).map((c) => [c, this.mapa[c]]));
    this.aplicarCambio({ ...comoMapa(DISENO_POR_DEFECTO), ...cosmetica }, { ranura: null, texto: tr('restablecer', 'reset') }, {});
    this.aviso = tr('Diseño restablecido al robot mínimo (ruedas estándar).', 'Design reset to the minimal robot (standard wheels).');
    this.refrescarAyuda();
    this.animarArmado();
  }

  /** Registra un cambio en el historial y refresca todo con animación: `encaja` = socket que recibe, `suelta` = que suelta. */
  aplicarCambio(mapa, cambio, { encaja = null, suelta = null } = {}) {
    const viejo = suelta ? this.copiaParte(suelta) : null;
    this.mapa = mapa;
    this.hist.registrar(this.mapa, cambio);
    this.aviso = '';
    this.detalle = null;
    this.refrescar(true);
    if (viejo) this.animarSoltar(viejo, suelta);
    if (encaja) this.animarEncaje(encaja);
  }

  // ───────────────────────── animaciones ─────────────────────────
  /** Copia del sprite de una parte (para verla caer al quitarla). */
  copiaParte(id) {
    const o = this.partes?.[id];
    if (!o || !o.texture) return null;
    const c = this.add.image(o.x, o.y, o.texture.key, o.frame.name).setScale(o.scaleX).setDepth(20);
    if (o.isTinted) c.setTint(o.tintTopLeft);
    return c;
  }

  animarEncaje(id) {
    const o = this.partes?.[id];
    const a = id === 'chasis' ? { x: ROBOT.x, y: ROBOT.y } : (o ? { x: o.x, y: o.y } : this.ancla(id));
    sonarBoton();
    if (o) {
      const sx = o.scaleX;
      const sy = o.scaleY;
      o.setScale(sx * 1.35, sy * 1.35);
      if (o.setTintFill) {
        const tinte = o.isTinted ? o.tintTopLeft : null; // destello blanco y vuelve a su tinte (pintura o respaldo)
        o.setTintFill(0xffffff);
        this.time.delayedCall(70, () => { if (o.active) { o.clearTint(); if (tinte != null) o.setTint(tinte); } });
      }
      this.tweens.add({ targets: o, scaleX: sx, scaleY: sy, duration: 240, ease: 'Back.Out' });
    }
    this.polvo(a.x, a.y, [0xffd166, 0xffffff, 0x80e0dc]);
    const s = this.sockets[id];
    if (s) this.tweens.add({ targets: s.caja, scaleX: 1.04, scaleY: 1.08, duration: 90, yoyo: true });
  }

  animarSoltar(copia, id) {
    const lado = id.endsWith('del') || id === 'bateria' || id === 'chasis' ? 1 : -1;
    this.tweens.add({ targets: copia, y: copia.y + 60, x: copia.x + lado * 24, angle: lado * 35, alpha: 0, duration: 420, ease: 'Quad.In', onComplete: () => copia.destroy() });
    this.polvo(copia.x, copia.y + 10, [0x9aa4c7, 0x6b5a48]);
  }

  /** Polvo / chispas en pixel art: cuadritos que salen del punto y se desvanecen. */
  polvo(x, y, colores) {
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      const d = 18 + Math.random() * 22;
      const q = this.add.rectangle(x, y, 4, 4, colores[i % colores.length]).setDepth(25);
      this.tweens.add({ targets: q, x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d, alpha: 0, duration: 320 + Math.random() * 120, ease: 'Quad.Out', onComplete: () => q.destroy() });
    }
  }

  /** Al entrar (o restablecer) el robot se arma pieza por pieza: ruedas, chasis, motor, batería, carga y módulo. */
  animarArmado() {
    const orden = ['rueda_tras', 'rueda_del', 'chasis', 'motor', 'bateria', 'carga', 'modulo'];
    let k = 0;
    for (const id of orden) {
      const o = this.partes?.[id];
      if (!o) continue;
      const y = o.y;
      o.setAlpha(0).setY(y - 24);
      this.tweens.add({ targets: o, alpha: 1, y, delay: 60 + k * 70, duration: 180, ease: 'Back.Out' });
      if (id === 'carga' && this.cajaCarga) {
        const yc = this.cajaCarga.y;
        this.cajaCarga.setAlpha(0).setY(yc - 24);
        this.tweens.add({ targets: this.cajaCarga, alpha: 1, y: yc, delay: 60 + k * 70, duration: 180, ease: 'Back.Out' });
      }
      k += 1;
    }
  }

  // ───────────────────────── historial ─────────────────────────
  aplicarPaso(paso, es, en) {
    if (!paso) return;
    this.mapa = paso.estado;
    const r = paso.cambio && paso.cambio.ranura;
    if (r && ORDEN_RANURAS.includes(r)) this.elegirSocket(ORDEN_RANURAS.indexOf(r));
    this.aviso = paso.cambio && paso.cambio.texto ? tr(`${es}: ${paso.cambio.texto}`, `${en}: ${paso.cambio.texto}`) : '';
    this.refrescar(true);
    if (r && this.mapa[r]) this.animarEncaje(r);
  }

  deshacer() { this.aplicarPaso(this.hist.deshacer(), 'Deshecho', 'Undone'); }

  rehacer() { this.aplicarPaso(this.hist.rehacer(), 'Rehecho', 'Redone'); }

  // ───────────────────────── refresco general ─────────────────────────
  refrescar(animar = false) {
    const diseno = comoDiseno(this.mapa);
    const res = resumen(diseno, PIEZAS, { masaCarga: MASA_CARGA_KG });
    const errores = validar(diseno, PIEZAS, this.presupuesto, { en: enIngles() });
    this.res = res;
    this.errores = errores;
    this.lineaEjes = res.ejes_distintos
      ? tr('Ejes distintos: con la misma rueda en los dos es más seguro.', 'Mixed axles: the same wheel on both is safer.') : null;
    this.mostrarCosto(res.costo, animar);
    this.refrescarLado(res, errores);
    this.refrescarPersonalizacion();
    this.dibujarRobot();
    this.pintarSockets();
    this.refrescarBandeja();
    this.refrescarBotones();
    this.refrescarAyuda();
    if (this.ayuda) this.dibujarAyuda();
  }

  refrescarBotones() {
    if (!this.btnContinuar) return;
    // No se puede probar si falta una pieza o se pasa del presupuesto (AGENTS.md §12).
    this.btnContinuar.setHabilitado(!(this.errores?.length));
    this.btnDeshacer.setHabilitado(this.hist.puedeDeshacer);
    this.btnRehacer.setHabilitado(this.hist.puedeRehacer);
    this.btnQuitar.setHabilitado(Boolean(this.mapa[ORDEN_RANURAS[this.sel]]));
    const ejes = this.mapa.rueda_del && this.mapa.rueda_tras && this.mapa.rueda_del === this.mapa.rueda_tras;
    this.btnEjes.setHabilitado(!ejes && Boolean(this.mapa.rueda_del || this.mapa.rueda_tras));
  }

  /** Una línea abajo: aviso del momento, o el detalle de la pieza elegida, o la ayuda corta del armado. */
  refrescarAyuda(extra = null) {
    if (!this.txtAyuda) return;
    const aviso = this.aviso || extra || this.lineaEjes;
    const linea = aviso || this.detalle
      || tr('Arrastra una pieza a su socket · ←/→ socket · ↑/↓ pieza · Enter poner · Supr quitar · H ayuda',
        'Drag a part onto its socket · ←/→ socket · ↑/↓ part · Enter fit · Del remove · H help');
    this.txtAyuda.setText(linea).setColor(aviso ? C.acento : this.detalle ? C.claro : C.apagado);
    // Si no cabe en una línea (detalle largo), se achica hasta 14 px y se recorta con «…».
    while (this.txtAyuda.width > 930 && this.txtAyuda.text.length > 10) this.txtAyuda.setText(`${this.txtAyuda.text.slice(0, -2)}…`);
  }

  // ───────────────────────── panel de ayuda (H) ─────────────────────────
  lineasDetalle() {
    const res = this.res;
    const a = res.agarre;
    const ej = res.agarre_ejes;
    return [
      tr(`Costo ${res.costo} / ${this.presupuesto} cr · Restante ${this.presupuesto - res.costo} · Masa ${res.masa} kg + carga ${MASA_CARGA_KG} kg`,
        `Cost ${res.costo} / ${this.presupuesto} cr · Left ${this.presupuesto - res.costo} · Mass ${res.masa} kg + cargo ${MASA_CARGA_KG} kg`),
      tr(`Agarre: arena ${f2(a.arena)} · roca ${f2(a.roca)} · comp. ${f2(a.compacto)} (del. ${f2(ej.del.arena)}/${f2(ej.del.roca)}/${f2(ej.del.compacto)} · tras. ${f2(ej.tras.arena)}/${f2(ej.tras.roca)}/${f2(ej.tras.compacto)})`,
        `Grip: sand ${f2(a.arena)} · rock ${f2(a.roca)} · compact ${f2(a.compacto)} (front ${f2(ej.del.arena)}/${f2(ej.del.roca)}/${f2(ej.del.compacto)} · rear ${f2(ej.tras.arena)}/${f2(ej.tras.roca)}/${f2(ej.tras.compacto)})`),
      ...this.lineasDestino(res),
      tr(`Autonomía ≈ ${res.autonomia_s != null ? `${Math.round(res.autonomia_s)} s a fondo` : '—'}, con carga · Fuerza/masa ${res.fuerza_por_masa != null ? res.fuerza_por_masa.toFixed(2) : '—'}`,
        `Run time ≈ ${res.autonomia_s != null ? `${Math.round(res.autonomia_s)} s at full power` : '—'}, loaded · Force/mass ${res.fuerza_por_masa != null ? res.fuerza_por_masa.toFixed(2) : '—'}`),
      tr('En la prueba: agarre² × agarre del suelo · cada eje lleva 2 ruedas (2 × costo y masa)',
        'In the test: grip² × soil grip · each axle takes 2 wheels (2 × cost and mass)'),
      tr('Bloqueadas: filas del libro de datos sin mecánica en el juego o sin referencia espacial (no se inventa su física).',
        'Locked: workbook rows with no in-game mechanic or no space reference (their physics is not made up).'),
      ...(this.lineaEjes ? [this.lineaEjes] : []),
      this.errores.length ? `✕ ${this.errores.join(' · ')}` : tr('✓ Diseño válido', '✓ Valid design'),
    ];
  }

  alternarAyuda() {
    if (this.ayuda) { this.ayuda.forEach((o) => o.destroy()); this.ayuda = null; return; }
    this.dibujarAyuda();
  }

  dibujarAyuda() {
    this.ayuda?.forEach((o) => o.destroy());
    const capa = this.add.rectangle(480, 270, 960, 540, 0x05060c, 0.75).setDepth(60).setInteractive();
    capa.on('pointerdown', () => this.alternarAyuda());
    const t = [
      tr('Cómo armar', 'How to build'),
      tr('Ratón o dedo: arrastra una tarjeta a un socket verde. Arrastra una pieza del robot afuera para quitarla (o clic derecho).',
        'Mouse or finger: drag a card onto a green socket. Drag a part off the robot to remove it (or right-click).'),
      tr('Toque: toca una tarjeta y luego el socket. Dos toques en la tarjeta la ponen en su lugar.',
        'Tap: tap a card, then the socket. Tapping the card twice fits it in place.'),
      tr('Teclado: ←/→ socket · ↑/↓ pieza · Enter poner · Supr quitar · Tab pestaña · A ambos ejes',
        'Keyboard: ←/→ socket · ↑/↓ part · Enter fit · Del remove · Tab tab · A both axles'),
      tr('C probar · R restablecer · P pintura · N nombre · Ctrl+Z deshacer · Ctrl+Y rehacer · Esc regresar',
        'C test · R reset · P paint · N name · Ctrl+Z undo · Ctrl+Y redo · Esc back'),
      '',
      tr('Detalle del diseño (valores de juego, P)', 'Design detail (game values, P)'),
      ...this.lineasDetalle(),
      '',
      tr('H / Esc / clic: cerrar', 'H / Esc / click: close'),
    ].join('\n');
    const txt = texto(this, 92, 0, t, { size: 15, ancho: 776, interlineado: 4 }).setDepth(62);
    const alto = txt.height + 44;
    const y0 = Math.max(10, Math.round(270 - alto / 2));
    txt.setY(y0 + 22);
    const marco = K.panel(this, 70, y0, 820, alto).setDepth(61);
    this.ayuda = [capa, marco, txt];
  }

  /** Qué le hace el destino a ESTE diseño (mismas reglas que la física, fisica/ambiente.js). Una línea. */
  lineasDestino(res, e0 = undefined) {
    const destino = DESTINOS[partida.destino];
    const amb = destino ? ambienteDeDestino(destino.id, destino.mundo) : null;
    const e = e0 === undefined ? efectosEn(res, amb) : e0;
    if (!e) return [];
    const sinEl = (v) => tr(` (sin él ${pct(v)})`, ` (without it ${pct(v)})`);
    const bat = tr(`batería ${pct(e.bateria)}`, `battery ${pct(e.bateria)}`);
    const mot = tr(`motor caliente ${pct(e.potencia_caliente)}`, `hot motor ${pct(e.potencia_caliente)}`);
    let t;
    if (res.radiador) t = mot + sinEl(e.potencia_caliente_sin_modulo);
    else if (res.aislamiento) t = bat + sinEl(e.bateria_sin_modulo);
    else if (e.recarga_s) t = `panel +${e.recarga_s.toFixed(2)}/s · ${bat}`;
    else t = `${bat} · ${mot}`;
    return [`${MUNDO()[destino.mundo] ?? destino.mundo}: ${t}`];
  }

  // ───────────────────────── personalización (cosmética) ─────────────────────────
  crearPersonalizacion() {
    const y1 = LADO.y + 204;
    const y2 = LADO.y + 232;
    const etq = texto(this, LADO.x + 12, y1, tr('Pintura', 'Paint'), { size: 15, color: C.claro, origen: [0, 0.5] }).setDepth(4);
    const x0 = etq.x + etq.width + 18;
    this.muestras = PINTURAS.map((pint, i) => {
      const cuadro = this.add.rectangle(x0 + i * 28, y1, 20, 20, pint.muestra).setStrokeStyle(2, BORDE).setDepth(4);
      zonaToque(cuadro, -4, -4, 28, 28);
      cuadro.on('pointerdown', () => this.pintar(pint.id));
      return { pint, cuadro };
    });
    this.btnNombre = K.boton(this, LADO.x + LADO.w - 10, y2, tr('Nombre', 'Name'), () => this.abrirNombre(), { size: 14, alto: 30, origen: [1, 0.5], anchoMin: 64 });
    for (const o of [this.btnNombre.obj, this.btnNombre.caja]) o.setDepth(4);
    this.txtNombre = texto(this, LADO.x + 12, y2, '', { size: 15, origen: [0, 0.5] }).setDepth(4);
    this.xNombreMax = this.btnNombre.caja.x - 8;
  }

  refrescarPersonalizacion() {
    const pintura = pinturaPorId(this.mapa[CLAVE_PINTURA]);
    const nombre = this.mapa[CLAVE_NOMBRE] || null;
    fijarPersonalizacion(partida, { pintura: pintura.id, nombre }); // la usan la prueba y la misión (fisica/aspecto.js)
    for (const { pint, cuadro } of this.muestras) {
      const elegida = pint.id === pintura.id;
      cuadro.setStrokeStyle(elegida ? 3 : 2, elegida ? ACENTO : BORDE).setScale(elegida ? 1.15 : 1);
    }
    this.txtNombre.setText(nombre ? `«${nombre}»` : tr('(sin nombre)', '(no name)')).setColor(nombre ? C.texto : C.apagado);
    while (this.txtNombre.width > 0 && this.txtNombre.x + this.txtNombre.width > this.xNombreMax && this.txtNombre.text.length > 3) {
      this.txtNombre.setText(`${this.txtNombre.text.slice(0, -2)}…`);
    }
  }

  pintar(id) {
    if (!id || this.mapa[CLAVE_PINTURA] === id) return;
    const p = pinturaPorId(id);
    this.aplicarCambio({ ...this.mapa, [CLAVE_PINTURA]: id }, { ranura: CLAVE_PINTURA, texto: tr(`pintura → ${p.nombre}`, `paint → ${p.nombre_en}`) }, { encaja: 'chasis' });
  }

  renombrar(t) {
    const nombre = normalizarNombre(t);
    if ((this.mapa[CLAVE_NOMBRE] || null) === nombre) return;
    const m = { ...this.mapa };
    if (nombre) m[CLAVE_NOMBRE] = nombre; else delete m[CLAVE_NOMBRE];
    this.aplicarCambio(m, { ranura: CLAVE_NOMBRE, texto: nombre ? tr(`nombre → ${nombre}`, `name → ${nombre}`) : tr('sin nombre', 'no name') });
  }

  /** Diálogo HTML para escribir el nombre (Phaser no tiene campo de texto). Enter guarda, Esc cancela; funciona al tacto. */
  abrirNombre() {
    if (this.dialogo || typeof document === 'undefined') return;
    const kb = this.input.keyboard;
    kb.enabled = false;
    kb.disableGlobalCapture();
    const capa = document.createElement('div');
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;'
      + 'background:rgba(5,6,12,.7);font-family:monospace;';
    const caja = document.createElement('form');
    caja.style.cssText = 'background:#141830;border:2px solid #ffd166;padding:18px 20px;display:flex;flex-direction:column;gap:12px;'
      + 'width:min(380px,90vw);box-sizing:border-box;color:#fff;font-size:16px;';
    const etiqueta = document.createElement('label');
    etiqueta.textContent = tr(`Nombre del robot (hasta ${LARGO_NOMBRE} letras, cosmético)`, `Robot name (up to ${LARGO_NOMBRE} letters, cosmetic)`);
    etiqueta.htmlFor = 'mc-nombre-robot';
    const campo = document.createElement('input');
    campo.id = 'mc-nombre-robot';
    campo.type = 'text';
    campo.maxLength = LARGO_NOMBRE;
    campo.autocomplete = 'off';
    campo.value = this.mapa[CLAVE_NOMBRE] || '';
    campo.placeholder = tr('p. ej. Duna-1', 'e.g. Dune-1');
    campo.style.cssText = 'font:inherit;font-size:18px;padding:8px;background:#0b0d17;color:#fff;border:1px solid #4a5275;';
    const fila = document.createElement('div');
    fila.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
    const btn = (t, tipo, fondo) => {
      const b = document.createElement('button');
      b.type = tipo;
      b.textContent = t;
      b.style.cssText = `font:inherit;font-size:16px;padding:8px 14px;cursor:pointer;border:1px solid #ffd166;background:${fondo};color:#ffd166;`;
      return b;
    };
    const cancelar = btn(tr('Cancelar', 'Cancel'), 'button', 'transparent');
    const guardar = btn(tr('Guardar', 'Save'), 'submit', '#222844');
    fila.append(cancelar, guardar);
    caja.append(etiqueta, campo, fila);
    capa.append(caja);
    caja.addEventListener('submit', (ev) => { ev.preventDefault(); const v = campo.value; this.cerrarNombre(); this.renombrar(v); });
    cancelar.addEventListener('click', () => this.cerrarNombre());
    capa.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') { ev.preventDefault(); this.cerrarNombre(); } });
    capa.addEventListener('pointerdown', (ev) => { if (ev.target === capa) this.cerrarNombre(); });
    document.body.append(capa);
    this.dialogo = capa;
    campo.focus();
    campo.select();
  }

  cerrarNombre() {
    if (!this.dialogo) return;
    this.dialogo.remove();
    this.dialogo = null;
    const kb = this.input?.keyboard;
    if (kb) { kb.enabled = true; kb.enableGlobalCapture(); }
  }

  // ───────────────────────── salir ─────────────────────────
  continuar() {
    const diseno = comoDiseno(this.mapa);
    const errores = validar(diseno, PIEZAS, this.presupuesto, { en: enIngles() });
    if (errores.length) {
      this.avisar(tr('Corrige el diseño antes de probarlo.', 'Fix the design before testing it.'));
      return;
    }
    this.salir(diseno, 'Prueba');
  }

  /** Vuelve al expediente sin probar; el diseño (aunque aún no sea válido) se conserva en partida.diseno. */
  regresar() { this.salir(comoDiseno(this.mapa), 'Expediente'); }

  salir(diseno, destino) {
    if (this.cameras.main.fadeEffect.isRunning) return;
    partida.diseno = diseno;
    memoria = { clave: partida.resultados, mapa: { ...this.mapa } };
    irA(this, destino);
  }

  // ───────────────────────── ayudas para pruebas (e2e) ─────────────────────────
  /** Centro (coordenadas lógicas 960 × 540) de la tarjeta de una pieza en la página visible, o null. */
  cartaDe(id) {
    const c = this.cartasUI?.find((x) => x && x.p.id === id);
    return c ? { x: c.x + CARTA_W / 2, y: c.y + CARTA_H / 2 } : null;
  }

  /** Centro de la caja de un socket (coordenadas lógicas). */
  socketDe(id) { const s = SOCKETS[id]; return s ? { x: s.x, y: s.y } : null; }
}
