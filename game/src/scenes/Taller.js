import Phaser from 'phaser';
import { irA } from './ui.js';
import * as K from './comun/pixel.js'; // botones, chips, barras, paneles e íconos de arte (DISENO.md §2)
import { ajustarAncho } from './comun/fuente.js';
import { PIEZAS, DESTINOS } from '../data.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { partida } from '../main.js';
import { RANURAS, DISENO_POR_DEFECTO, comoMapa, comoDiseno, resumen, validar, efectosEn } from './Taller/diseno.js';
import { historialAlEntrar, diferencias } from './Taller/historial.js';
import {
  PESTANAS, tarjetasDe, pestanaDeRanura, socketsPara, socketPreferido, quitar as quitarDe, mover, ambosEjes, nombreCorto,
  ponerRueda,
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
import { movimientoReducido } from './expediente/efectos.js';
import {
  nivelAgarre, sueloPrincipal, anuncioCambio, textoPanel, crearRegionViva, hayVoz, leerEnVoz, callarVoz,
} from './Taller/accesible.js';
import { pasosTutorialTaller, debeMostrarTutorialTaller } from './Taller/tutorial.js';
import { abrirTutorialTaller } from './Taller/tutorial_vista.js';
import { tocarMusica } from '../audio/musica.js';

// Dueño: frente taller. Armado por ARRASTRE en pixel art: el robot grande al centro con sus ranuras como sockets, la bandeja
// de piezas abajo por sistema, y el costo, la masa, la autonomía y el agarre en tiempo real a la derecha.
// Contrato con el frente juego: partida.diseno = [{ ranura, pieza }] (docs/juego/ESPECIFICACION.md §3).
// Tres formas de armar (AGENTS.md §12, accesible): arrastrar con ratón o dedo · tocar pieza y luego socket · teclado con
// foco por zonas (Tab: pestañas → bandeja → sockets → acciones; flechas dentro de la zona; Enter; Supr quita; 1–6 pestaña;
// A ambos ejes; Ctrl+Z/Y). Reglas puras en Taller/arrastre.js; accesibilidad (resumen aria-live, «Leer», patrones) en
// Taller/accesible.js; tutorial de la primera vez en Taller/tutorial.js + tutorial_vista.js.

const C = {
  texto: '#ffffff', suave: '#9aa4c7', claro: '#cfd6ff', acento: '#ffd166', apagado: '#a3abcc',
  error: '#ff7a7a', ok: '#6ee7a8', // contraste ≥ 4.5:1 sobre el fondo oscuro (DISENO.md §2)
};
const ACENTO = 0xffd166;
const BIEN = 0x6ee7a8;
const ROJO = 0xff7a7a;
const BORDE = 0x4a5490;

// Todo el texto del Taller va con la fuente pixel (comun/fuente.js, BitmapText ×2 = mayúscula de 14 px, DISENO.md §2.1).
// Es más ancha que monospace (~10 px por letra): cada texto tiene su ancho medido y, si no cabe, se recorta con «…»
// (`max`) o se parte en líneas (`ancho`). Una línea ×2 mide 24 px de alto (22 de glifo + 2 de interlínea): filas cada 24 px.
const texto = (scene, x, y, s, { max, ...o } = {}) => {
  const t = K.txt(scene, x, y, s, o);
  if (max) ajustarAncho(t, max);
  return t;
};
const LINEA = 24;

// ---- Disposición (960 × 540) ----
// Encabezado (0–48): título, sitio y destino en 2 líneas, Leer, Personalizar y Ayuda · escenario y panel de cifras (48–286)
// · pestañas (290–330, zona 288–332) · tarjetas (338–462, 4 por página) · botones (467–509) · línea de ayuda (515–537).
// Toda zona tocable ≥ 64 × 44 (DISENO.md §2.6; auditoría de Leo, docs/taller/AUDITORIA_DATOS.md §4.3).
const S = 8; // escala del robot: 1 px de arte = 8 px de pantalla (el chasis de 24 px mide 192)
const ROBOT = { x: 308, y: 168 }; // centro del chasis
const ESCENARIO = { x: 14, y: 48, w: 588, h: 238 };
const LADO = { x: 612, y: 48, w: 334, h: 238 };
const SOCKET_W = 168;
const SOCKET_H = 50;
const SOCKET_TEXTO = 42; // el texto empieza después del ícono de 32 px
// Caja de cada socket (centro) y su punto de anclaje en el robot (px de arte desde el centro del chasis, como fisica/aspecto.js).
const SOCKETS = {
  modulo: { x: 108, y: 77, ancla: [5, -4.5] },
  carga: { x: 308, y: 77, ancla: [0, -5.5] },
  chasis: { x: 508, y: 77, ancla: [10, 0.5] },
  motor: { x: 106, y: 168, ancla: [-8, 0] },
  bateria: { x: 510, y: 168, ancla: [4.5, 0] },
  rueda_tras: { x: 108, y: 257, ancla: [-8.64, 3.2] },
  rueda_del: { x: 508, y: 257, ancla: [8.64, 3.2] },
};
const DECO = { motor: [-8, 0], bateria: [6, 0], modulo: [5, -4] }; // calcomanías sobre el chasis (fisica/aspecto.js POS_DECO)
const PESTANA_Y = 290;
const PESTANA_H = 40;
const PESTANA_W = 148;
// Tarjetas grandes (arte de 32 px dibujado ×2 = 64 px; costo ×3, nombre ×2): 4 por página con flechas de 64 × 45.
const CARTA_Y = 338;
const CARTA_W = 190;
const CARTA_H = 124;
const CARTA_X0 = 88;
const CARTA_PASO = CARTA_W + 8;
const POR_PAGINA = 4;
const BOTONES_Y = 488;
const AYUDA_Y = 526;
const FOCO = 0xffd166; // marco de foco de teclado (amarillo grueso + ›)
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
// Archivos de arte con otro nombre que el id del juego (#89): se buscan también con este nombre.
const ALIAS_ARTE = { chasis_carbono: 'chasis_fibra_carbono', auto_rescate: 'modulo_autorescate' };

const SUPERFICIE_EN = { arena: 'sand', roca: 'rock', compacto: 'compact' };
const sup = (s) => tr(s, SUPERFICIE_EN[s] ?? s);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : '—');
const pct = (v) => `${Math.round(v * 100)} %`;
const MUNDO = () => ({ marte: tr('Marte', 'Mars'), luna: tr('Luna', 'Moon'), tierra: tr('Tierra', 'Earth') });
const conModificador = (ev) => Boolean(ev && (ev.ctrlKey || ev.metaKey || ev.altKey));
const corto = (p) => nombreCorto(p, enIngles());

/**
 * La cifra clave de una pieza para su tarjeta (keywords, DISENO.md §2.3): { k, n, v (0–1), nivel } con barra, número y patrón,
 * o { k } solo texto. En las ruedas, el agarre en el suelo principal del sitio de la prueba. Valores de juego (P).
 */
function cifraDe(p, suelo) {
  switch (p.sistema) {
    case 'movilidad': {
      const sf = suelo ?? 'arena';
      const v = p.agarre?.[sf];
      return { k: sup(sf), n: f2(v), v, nivel: nivelAgarre(v) };
    }
    case 'estructura': return { k: tr('resist.', 'durab.'), n: `${p.resistencia}`, v: p.resistencia / 120 };
    case 'potencia': return { k: tr('fuerza', 'force'), n: `${p.fuerza}`, v: p.fuerza / 90 };
    case 'energia': return { k: tr('carga', 'charge'), n: `${p.capacidad}`, v: p.capacidad / 220 };
    case 'carga': return { k: tr('protec.', 'prot.'), n: pct(p.proteccion), v: p.proteccion };
    default: {
      if (p.capacidad) return { k: tr(`recarga ${p.capacidad}`, `charge ${p.capacidad}`) };
      if (p.aislamiento_termico) return { k: tr('evita frío', 'stops cold') };
      if (p.radiador) return { k: tr('enfría motor', 'cools motor') };
      if (p.auto_rescate) return { k: tr('zafa atascos', 'gets unstuck') };
      return { k: '' };
    }
  }
}

/** Color fijo de cada nivel de agarre (DISENO.md §2.5); el patrón lo dibuja patronBarra (nada solo por color). */
const COLOR_NIVEL = { bien: K.P.bien, medio: K.P.accion, bajo: K.P.riesgo };

/**
 * Patrón encima del relleno de una barra para que el nivel no dependa del color: 'bien' liso, 'medio' rayas diagonales,
 * 'bajo' (o excedido) cuadros. `g` = Graphics; (x, y, w, h) = parte rellena.
 */
function patronBarra(g, x, y, w, h, nivel) {
  g.clear();
  if (!(w > 1) || !nivel || nivel === 'bien') return;
  g.fillStyle(0x0b0d17, 0.6);
  if (nivel === 'medio') {
    for (let i = -h; i < w; i += 6) {
      for (let k = 0; k < h; k += 2) {
        const px = i + k;
        if (px >= 0 && px < w - 1) g.fillRect(x + px, y + h - k - 2, 2, 2);
      }
    }
  } else {
    for (let i = 0; i < w; i += 4) for (let k = 0; k < h; k += 4) if (((i + k) / 4) % 2 === 0) g.fillRect(x + i, y + k, Math.min(2, w - i), Math.min(2, h - k));
  }
}

/** Barra de K.barra con patrón: devuelve { objs, fijar(frac, color, nivel) }. Alto ≥ 14 para que el patrón se vea. */
function barraConPatron(scene, x, y, w, h, frac, color, nivel) {
  const b = K.barra(scene, x, y, w, h, frac, color);
  const g = scene.add.graphics();
  const conMarco = b.objs[0]?.type === 'NineSlice';
  const ix = x + (conMarco ? 4 : 0);
  const iy = y + (conMarco ? 4 : 0);
  const iw = w - (conMarco ? 8 : 0);
  const ih = h - (conMarco ? 8 : 0);
  const fijar = (f, c = color, n = nivel) => {
    b.fijar(f, c);
    const v = typeof f === 'number' && Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : 0;
    patronBarra(g, ix, iy, Math.round(iw * v), ih, n);
  };
  fijar(frac, color, nivel);
  return { objs: [...b.objs, g], fijar };
}

/** Una línea con todo lo de una pieza (abajo, al elegirla): nombre, costo en su ranura, masa y su dato clave. */
function detalleDe(p) {
  if (p.bloqueada) return `${tr('Bloqueada', 'Locked')} · ${trDato(p, 'nombre')} (${p.excel}, ${p.estado}): ${trDato(p, 'detalle')}`;
  const eje = p.sistema === 'movilidad';
  const costo = eje ? tr(`2×${p.costo} cr/eje`, `2×${p.costo} cr/axle`) : `${p.costo} cr`;
  const masa = `${p.masa * (eje ? 2 : 1)} kg`;
  let dato = '';
  if (p.agarre) dato = tr(`agarre: arena ${f2(p.agarre.arena)}, roca ${f2(p.agarre.roca)}, comp. ${f2(p.agarre.compacto)}`,
    `grip: sand ${f2(p.agarre.arena)}, rock ${f2(p.agarre.roca)}, compact ${f2(p.agarre.compacto)}`);
  if (p.amortiguacion) dato += tr(` · absorbe ${pct(p.amortiguacion)} de golpes`, ` · absorbs ${pct(p.amortiguacion)} of jolts`);
  else if (p.sistema === 'estructura') dato = tr(`resistencia ${p.resistencia}`, `durability ${p.resistencia}`);
  else if (p.sistema === 'potencia') dato = tr(`fuerza ${p.fuerza} · consumo ${p.consumo}/s`, `force ${p.fuerza} · drain ${p.consumo}/s`);
  else if (p.sistema === 'energia') dato = tr(`capacidad ${p.capacidad}`, `capacity ${p.capacidad}`);
  else if (p.sistema === 'carga') dato = tr(`protección ${pct(p.proteccion)}`, `protection ${pct(p.proteccion)}`);
  else if (p.capacidad) dato = tr(`recarga con la luz del lugar, capacidad ${p.capacidad}`, `recharges in local sunlight, capacity ${p.capacidad}`);
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
    // Bloqueadas: su arte propio (p. ej. sellos_polvo), su silueta (#89: orugas, patas, rotor, serpiente, rappel) o el ícono genérico.
    if (p.bloqueada) {
      return buscar(p.id) ?? buscar(`silueta_${p.id}`)
        ?? (this.textures.exists(p.icono) ? { clave: p.icono, tinte: null, escala: 2 } : null);
    }
    const propio = buscar(p.id) ?? (ALIAS_ARTE[p.id] ? buscar(ALIAS_ARTE[p.id]) : null);
    if (propio) return propio;
    const r = RESPALDO_ICONO[p.id];
    return r ? buscar(r[0], r[1]) : null;
  }

  create() {
    tocarMusica('menu'); // al volver a modificaciones, la canción del nivel deja paso a la del menú (audio/musica.js)
    if (this.textures.exists('pantallas/taller_fondo')) {
      this.add.image(480, 270, 'pantallas/taller_fondo').setScale(3).setDepth(-10);
      this.add.rectangle(480, 270, 960, 540, 0x0b0d17, 0.55).setDepth(-9);
      this.add.rectangle(0, 0, 960, 48, 0x0b0d17, 0.75).setOrigin(0, 0).setDepth(-8); // banda del encabezado: texto legible
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
    // Ejes unidos por defecto: una rueda va a los dos ejes. Si el diseño guardado ya trae ejes mezclados, se abre separado.
    this.ejesSeparados = Boolean(this.mapa.rueda_del && this.mapa.rueda_tras && this.mapa.rueda_del !== this.mapa.rueda_tras);
    this.sel = 0;        // socket elegido (índice en RANURAS)
    this.pestana = 'movilidad';
    this.cursor = 0;     // tarjeta resaltada en la pestaña
    this.pagina = 0;
    this.mano = false;   // la tarjeta del cursor está "tomada" (toque): el siguiente toque en un socket la pone
    this.aviso = '';
    this.arrastre = null;
    this.costoMostrado = null;
    this.quieto = movimientoReducido(); // prefers-reduced-motion: sin animaciones de encaje, polvo ni sacudidas
    this.suelo = sueloPrincipal(partida.sitio); // la cifra de las ruedas en sus tarjetas es el agarre en este suelo
    this.zonaFoco = 'bandeja'; // foco de teclado: pestanas → bandeja → sockets → acciones (Tab / Mayús+Tab)
    this.focoAccion = 0;
    this.focoVisible = false; // el marco de foco sale al usar el teclado y se oculta al tocar con el puntero
    this.tutorial = null;
    this.voz = crearRegionViva(); // resumen textual del diseño para lector de pantalla (aria-live, fuera del lienzo)

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
    this.focoG = this.add.graphics().setDepth(45);
    this.anunciar({ accion: 'otro', texto: tr(`Taller. ${this.listaDiseno()}`, `Workshop. ${this.listaDiseno()}`) });
    this.events.once('shutdown', () => { this.voz.destruir(); callarVoz(); this.tutorial?.cerrar?.(); });
    // Tutorial de la primera vez (se repite con «?»); la e2e lo da por visto.
    if (debeMostrarTutorialTaller()) this.time.delayedCall(this.quieto ? 0 : 500, () => this.abrirTutorial());
  }

  /** «Chasis: Ligero; Eje delantero: Estándar; …» (para el resumen del lector de pantalla al entrar). */
  listaDiseno() {
    return RANURAS.filter((r) => this.mapa[r.id]).map((r) => `${trDato(r, 'nombre')}: ${trDato(piezaPorId[this.mapa[r.id]], 'nombre')}`).join('; ');
  }

  /** Escribe en el nodo aria-live una frase con el cambio, el presupuesto y si está listo. */
  anunciar({ accion, pieza = null, ranura = null, texto = '' }) {
    if (!this.res) return;
    const faltan = RANURAS.filter((x) => x.obligatoria && !this.mapa[x.id]).map((x) => trDato(x, 'nombre'));
    this.voz.decir(anuncioCambio({
      accion, pieza, ranura: ranura ? ranuraPorId[ranura] : null, texto,
      costo: this.res.costo, presupuesto: this.presupuesto, errores: this.errores, faltan,
    }));
  }

  /** «Leer» (tecla L): lee en voz alta el panel de cifras en el idioma actual (Web Speech API, si existe). */
  leer() {
    const faltan = RANURAS.filter((x) => x.obligatoria && !this.mapa[x.id]).map((x) => trDato(x, 'nombre'));
    const t = textoPanel(this.res, { presupuesto: this.presupuesto, errores: this.errores, faltan, masaCarga: MASA_CARGA_KG, suelo: this.suelo });
    this.voz.decir(t); // también al lector de pantalla
    leerEnVoz(t);
  }

  // ───────────────────────── tutorial (primera vez) ─────────────────────────
  abrirTutorial() {
    // Si el jugador ya salió (Esc o «Atrás» antes de los 500 ms del tutorial), no se abre a media salida: se abría
    // durante el fundido y, al cerrarse la escena, el tutorial redibujaba objetos ya destruidos.
    const fundido = this.cameras.main.fadeEffect;
    if (this.tutorial || !this.scene.isActive() || (fundido.isRunning && fundido.direction)) return; // direction = salida
    if (this.ayuda) this.alternarAyuda();
    this.cerrarPersonalizar();
    this.soltarMano();
    this.elegirPestana('movilidad'); // la primera página tiene las ruedas
    this.tutorial = abrirTutorialTaller(this, {
      pasos: pasosTutorialTaller(this.suelo),
      zonas: (n) => this.zonaTutorial(n),
      // Al cerrar la escena también se cierra el tutorial: entonces no hay nada que redibujar.
      alCerrar: () => { this.tutorial = null; if (!this.sys.isActive()) return; this.refrescarAyuda(); this.pintarFoco(); },
    });
  }

  /** Rectángulo de cada zona del tutorial (px del juego). */
  zonaTutorial(nombre) {
    const b = this.btnContinuar.caja.getBounds();
    switch (nombre) {
      case 'armar': return { x: ESCENARIO.x, y: SOCKETS.rueda_del.y - 28, w: 946 - ESCENARIO.x, h: CARTA_Y + CARTA_H - SOCKETS.rueda_del.y + 28 };
      case 'presupuesto': return { x: LADO.x + 4, y: LADO.y + 36, w: LADO.w - 8, h: 50 };
      case 'agarre': return { x: LADO.x + 4, y: LADO.y + 132, w: LADO.w - 8, h: 54 };
      case 'probar': return { x: b.x, y: b.y, w: b.width, h: b.height };
      default: return null;
    }
  }

  // ───────────────────────── encabezado y presupuesto ─────────────────────────
  crearEncabezado() {
    const titulo = texto(this, 20, 24, tr('Taller', 'Workshop'), { size: 26, origen: [0, 0.5] });
    this.btnAyuda = K.boton(this, 945, 22, tr('? Ayuda', '? Help'), () => this.alternarAyuda(),
      { size: 15, alto: 36, origen: [1, 0.5], color: K.P.dato, pad: 10, reservaFoco: false });
    // Pintura y nombre (cosméticos) en un panel aparte: el panel de cifras queda solo para lo que cambia la prueba.
    this.btnPersonalizar = K.boton(this, this.btnAyuda.caja.x - 8, 22, tr('Personalizar', 'Customize'), () => this.alternarPersonalizar(),
      { size: 15, alto: 36, origen: [1, 0.5], pad: 10, reservaFoco: false });
    // «Leer» (L): el panel de cifras en voz alta, solo si el navegador tiene speechSynthesis.
    this.btnLeer = hayVoz() ? K.boton(this, this.btnPersonalizar.caja.x - 8, 22, tr('Leer', 'Read'), () => this.leer(),
      { size: 15, alto: 36, origen: [1, 0.5], pad: 10, reservaFoco: false, color: K.P.dato }) : null;
    // Sitio de la prueba y destino, en dos líneas (cada una recortada a su ancho).
    const destino = DESTINOS[partida.destino];
    const sitio = partida.sitio;
    const tipos = sitio?.nivel && Array.isArray(sitio.nivel.superficies)
      ? [...new Set(sitio.nivel.superficies.map((x) => x.tipo))].map(sup).join(', ') : null;
    const xs = Math.round(titulo.x + titulo.width + 18);
    const max = (this.btnLeer ?? this.btnPersonalizar).caja.x - 12 - xs;
    const l1 = sitio ? `${tr('Prueba: ', 'Test: ')}${trDato(sitio, 'nombre')}${tipos ? ` · ${tipos}` : ''}` : '';
    const l2 = `${tr('Destino: ', 'Destination: ')}${destino ? trDato(destino, 'nombre') : (partida.destino ?? '—')}`;
    texto(this, xs, 0, l1, { size: 14, color: C.claro, max });
    texto(this, xs, LINEA, l2, { size: 14, color: C.suave, max });
  }

  /** Barra y número del presupuesto, animados del costo anterior al nuevo; un «+N»/«−N» flota desde la barra. */
  mostrarCosto(costo, animar) {
    const pintar = (c) => {
      const pasado = c > this.presupuesto;
      // Excedido: rojo **y** cuadros (nada solo por color).
      this.barraPresupuesto.fijar(c / this.presupuesto, pasado ? K.P.riesgo : K.P.accion, pasado ? 'bajo' : null);
      // «(P)»: precios, masas y agarres son valores de juego, no datos de ingeniería (AGENTS.md §3.4; lo explica la ayuda).
      this.txtCosto.setText(`${Math.round(c)} / ${this.presupuesto} cr (P)`).setColor(pasado ? C.error : C.texto);
    };
    const antes = this.costoMostrado;
    this.costoMostrado = costo;
    const restante = this.presupuesto - costo;
    this.txtRestante.setText(restante < 0 ? tr(`✕ +${-restante} cr`, `✕ +${-restante} cr`) : tr(`quedan ${restante}`, `${restante} left`))
      .setColor(restante < 0 ? C.error : C.ok);
    if (!animar || this.quieto || antes == null || antes === costo) { pintar(costo); return; }
    this.tweenCosto?.stop();
    this.tweenCosto = this.tweens.addCounter({ from: antes, to: costo, duration: 260, ease: 'Quad.Out', onUpdate: (tw) => pintar(tw.getValue()), onComplete: () => pintar(costo) });
    const d = costo - antes;
    const x = Math.min(this.barraX + this.barraW - 40, this.barraX + Math.min(1, costo / this.presupuesto) * this.barraW);
    const f = texto(this, x, this.barraY, `${d > 0 ? '+' : '−'}${Math.abs(d)} cr`, { size: 16, color: d > 0 ? C.acento : C.ok, origen: [0.5, 1], borde: true }).setDepth(30);
    this.tweens.add({ targets: f, y: this.barraY - 24, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => f.destroy() });
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
      const l1 = texto(this, x0 + SOCKET_TEXTO, y0 + 1, '', { size: 14, color: C.claro }).setDepth(4);
      const l2 = texto(this, x0 + SOCKET_TEXTO, y0 + 1 + LINEA, '', { size: 15 }).setDepth(4);
      this.sockets[r.id] = { caja, img, l1, l2, x0, y0, w: SOCKET_W };
    }
    // Botón «Separar ejes» / «Unir ejes» (A), entre las cajas de los ejes: por defecto una rueda va a los dos ejes.
    this.btnEjes = K.boton(this, ROBOT.x, SOCKETS.rueda_del.y, this.etiquetaEjes(), () => this.alternarEjes(),
      { size: 15, alto: 36, pad: 8, reservaFoco: false });
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
      if (valido && !this.quieto) s.caja.setAlpha(0.8 + 0.2 * Math.sin(t * 8)); else s.caja.setAlpha(1);
      const ic = pz ? this.icono(pz) : null;
      s.img.setVisible(Boolean(ic));
      if (ic) { s.img.setTexture(ic.clave).setScale(ic.escala); if (ic.tinte != null) s.img.setTint(ic.tinte); else s.img.clearTint(); }
      const maxTexto = SOCKET_W - SOCKET_TEXTO - 4;
      ajustarAncho(s.l1.setText(etiquetaSocket(r.id)).setColor(elegido ? C.acento : C.claro), maxTexto);
      ajustarAncho(s.l2.setText(pz ? corto(pz) : (r.obligatoria ? tr('(vacío)', '(empty)') : tr('(opcional)', '(optional)')))
        .setColor(falta ? C.error : pz ? C.texto : C.apagado), maxTexto);
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
    // Presupuesto: costo a la izquierda, lo que queda a la derecha y la barra debajo (fijos; mostrarCosto los actualiza).
    const x0 = LADO.x + 12;
    const xr = LADO.x + LADO.w - 12;
    this.txtCosto = texto(this, x0, LADO.y + 40, '', { size: 18 });
    this.txtRestante = texto(this, xr, LADO.y + 40, '', { size: 15, color: C.apagado, origen: [1, 0] });
    this.barraX = x0;
    this.barraY = LADO.y + 66;
    this.barraW = xr - x0;
    this.barraPresupuesto = barraConPatron(this, this.barraX, this.barraY, this.barraW, 16, 0, K.P.accion, null);
    this.paneles = [{ n: 'escenario', ...ESCENARIO }, { n: 'lado', ...LADO }]; // para las revisiones de maquetación
  }

  /**
   * Panel de cifras, de arriba abajo: validación (chips) · presupuesto · masa, autonomía y efecto del destino (ícono + número
   * + palabra clave) · agarre en 3 barras · protección y resistencia · lo especial del diseño.
   */
  refrescarLado(res, errores) {
    const g = this.grupoLado;
    g.removeAll(true);
    const x0 = LADO.x + 12;
    const xr = LADO.x + LADO.w - 12;
    const col = (xr - x0) / 3;
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
    g.add(K.filaChips(this, x0, LADO.y + 6, chips, xr + 2).objs);

    // 2) Tres cifras con ícono: masa, autonomía y efecto del destino; debajo, su palabra clave
    const destino = DESTINOS[partida.destino];
    const amb = destino ? ambienteDeDestino(destino.id, destino.mundo) : null;
    const e = efectosEn(res, amb);
    let efecto = { n: '—', k: tr('destino', 'destination'), ico: 'iconos/ico_temperatura' };
    if (e) {
      if (res.radiador) efecto = { n: pct(e.potencia_caliente), k: tr('motor', 'motor'), ico: 'iconos/ico_temperatura' };
      else if (e.recarga_s) efecto = { n: `+${e.recarga_s.toFixed(2)}/s`, k: tr('panel', 'panel'), ico: 'iconos/ico_luz' };
      else efecto = { n: pct(e.bateria), k: tr('batería', 'battery'), ico: 'iconos/ico_temperatura' };
    }
    const cifras = [
      { n: `${res.masa} kg`, k: tr(`+${MASA_CARGA_KG} carga`, `+${MASA_CARGA_KG} cargo`), ico: 'iconos/ico_gravedad', esc: 1, resp: '↓' },
      { n: res.autonomia_s != null ? `${Math.round(res.autonomia_s)} s` : '—', k: tr('autonom.', 'run time'), ico: 'ui/ui_icono_energia', esc: 2, resp: '!' },
      { ...efecto, esc: 1, resp: '°' },
    ];
    const yc = LADO.y + 86;
    const xc = [0, 110, 214, xr - x0]; // columnas a la medida de sus palabras clave («+10 carga» es la más ancha)
    cifras.forEach((c, i) => {
      const x = x0 + xc[i];
      const w = xc[i + 1] - xc[i];
      g.add(K.icono(this, x + 8, yc + LINEA / 2, c.ico, { escala: c.esc, respaldo: c.resp }));
      g.add(texto(this, x + 20, yc, c.n, { size: 18, max: w - 22 }));
      g.add(texto(this, x, yc + LINEA, c.k, { size: 14, color: C.apagado, max: w - 6 }));
    });

    // 3) Agarre de las ruedas (promedio de los ejes): superficie arriba (» = el suelo de este lugar), barra con número y patrón
    const ya = LADO.y + 136;
    ['arena', 'roca', 'compacto'].forEach((sf, i) => {
      const x = Math.round(x0 + i * col);
      const v = res.agarre[sf];
      const nivel = nivelAgarre(v);
      const color = nivel ? COLOR_NIVEL[nivel] : K.P.sec;
      const aqui = sf === this.suelo;
      g.add(texto(this, x, ya, `${aqui ? '» ' : ''}${sf === 'compacto' ? tr('compacto', 'compact') : sup(sf)}`, { size: 14, color: aqui ? C.acento : C.claro, max: col - 4 }));
      const num = texto(this, x + col - 6, ya + LINEA, f2(v), { size: 15, origen: [1, 0] });
      g.add(num);
      g.add(barraConPatron(this, x, ya + LINEA + 4, Math.max(20, col - 12 - num.width), 16, v, color, nivel).objs);
    });

    // 4) Protección y resistencia, y lo especial del diseño (módulo, llanta o el destino)
    const prot = res.proteccion != null ? pct(res.proteccion) : '—';
    g.add(texto(this, x0, LADO.y + 188, tr(`Protec. ${prot} · Resist. ${res.resistencia ?? '—'}`, `Prot. ${prot} · Durab. ${res.resistencia ?? '—'}`), { size: 15, max: xr - x0 }));
    g.add(texto(this, x0, LADO.y + 212, this.lineaEspecial(res, e), { size: 14, color: C.ok, max: xr - x0 }));
  }

  /** Lo que hace diferente a este diseño (una línea corta): auto-rescate, Nitinol o el otro efecto del destino. */
  lineaEspecial(res, e) {
    if (res.auto_rescate) {
      const a = res.auto_rescate;
      return tr(`Auto-rescate: +${pct(a.agarre - 1)} agarre`, `Self-rescue: +${pct(a.agarre - 1)} grip`);
    }
    if (res.amortiguacion) return tr(`Nitinol: absorbe ${pct(res.amortiguacion)} de golpes`, `Nitinol: absorbs ${pct(res.amortiguacion)} of jolts`);
    if (!e) return '';
    const destino = DESTINOS[partida.destino];
    const mundo = `${MUNDO()[destino.mundo] ?? destino.mundo}: `;
    const sinEl = (v) => tr(` (sin él ${pct(v)})`, ` (without ${pct(v)})`);
    if (res.radiador) return mundo + tr('motor ', 'motor ') + pct(e.potencia_caliente) + sinEl(e.potencia_caliente_sin_modulo);
    if (res.aislamiento) return mundo + tr('batería ', 'battery ') + pct(e.bateria) + sinEl(e.bateria_sin_modulo);
    if (e.recarga_s) return mundo + tr(`batería ${pct(e.bateria)}`, `battery ${pct(e.bateria)}`);
    return mundo + tr(`motor caliente ${pct(e.potencia_caliente)}`, `hot motor ${pct(e.potencia_caliente)}`);
  }

  // ───────────────────────── bandeja de piezas ─────────────────────────
  crearBandeja() {
    this.pestanasUI = PESTANAS.map((t, i) => {
      const w = PESTANA_W;
      const x = 16 + i * (w + 6);
      const caja = this.add.rectangle(x, PESTANA_Y, w, PESTANA_H, 0x141830, 0.95).setOrigin(0, 0).setStrokeStyle(2, BORDE);
      zonaToque(caja, 0, -2, w, PESTANA_H + 4); // 148 × 44
      caja.on('pointerdown', () => this.elegirPestana(t.id));
      const etq = texto(this, x + w / 2 + (t.bloqueadas ? 10 : 0), PESTANA_Y + PESTANA_H / 2, trDato(t, 'nombre'), { size: 16, origen: [0.5, 0.5], max: w - (t.bloqueadas ? 34 : 12) });
      const candado = t.bloqueadas ? this.candado(x + w / 2 - etq.width / 2 - 2 - 8, PESTANA_Y + PESTANA_H / 2, 2) : null;
      return { t, caja, etq, candado };
    });
    this.lista = this.add.container(0, 0).setDepth(3);
    // Flechas de página: botones de 64 × 45 a los lados de las tarjetas (también ←/→ en la bandeja y la rueda del ratón).
    const yf = CARTA_Y + CARTA_H / 2 - 12;
    const opc = { size: 26, alto: 45, anchoMin: 64, pad: 8, reservaFoco: false };
    this.btnPagIzq = K.boton(this, 16, yf, '‹', () => this.paginar(-1), { ...opc, origen: [0, 0.5] });
    this.btnPagDer = K.boton(this, 944, yf, '›', () => this.paginar(1), { ...opc, origen: [1, 0.5] });
    this.txtPagina = texto(this, 912, yf + 36, '', { size: 14, color: C.claro, origen: [0.5, 0] });
    this.input.on('wheel', (pt, _o, _dx, dy) => { if (pt.y >= CARTA_Y && pt.y <= CARTA_Y + CARTA_H) this.paginar(Math.sign(dy)); });
  }

  /** Candado en pixel art (gráficos) centrado en (x, y); escala `e` = px de pantalla por px de arte. */
  candado(x, y, e = 2, contenedor = null) {
    // Arte del candado (#89, 16 × 16) si está; si no, dibujado con figuras.
    if (this.textures.exists('iconos/candado')) {
      const img = this.add.image(x, y, 'iconos/candado');
      if (contenedor) contenedor.add(img);
      return img;
    }
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

  /**
   * Tarjetas de la página (4): arte de 64 px, costo grande, ranura, nombre corto y una cifra clave con barra, número y
   * patrón. Menos texto: el detalle completo sale abajo al elegirla y en la ayuda (H).
   */
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
    const varias = paginas > 1;
    this.btnPagIzq.setVisible(varias).setHabilitado(this.pagina > 0);
    this.btnPagDer.setVisible(varias).setHabilitado(this.pagina < paginas - 1);
    this.txtPagina.setText(varias ? `${this.pagina + 1}/${paginas}` : '').setVisible(varias);
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
        const img = this.add.image(x + 8 + 32, y + 6 + 32, ic.clave).setScale(ic.escala * 2); // 32 px de arte ×2 = 64
        if (ic.tinte != null) img.setTint(ic.tinte);
        if (p.bloqueada) img.setAlpha(ic.clave.includes('silueta_') ? 0.9 : 0.45); // las siluetas (#89) ya vienen oscuras
        objs.push(img);
      }
      // Columna derecha del arte: costo (×3) y ranura; abajo, nombre (×2) y la cifra clave.
      const der = x + CARTA_W - 8;
      const anchoDer = CARTA_W - 8 - 80;
      const anchoTexto = CARTA_W - 16;
      if (p.bloqueada) {
        objs.push(texto(this, der, y + 6, p.excel.split(' · ')[0], { size: 16, color: C.claro, origen: [1, 0], max: anchoDer }));
        objs.push(texto(this, der, y + 32, p.estado, { size: 14, color: C.apagado, origen: [1, 0], max: anchoDer }));
        objs.push(texto(this, x + 8, y + 74, corto(p), { size: 16, color: C.apagado, max: anchoTexto }));
        objs.push(texto(this, x + 8, y + 98, RAZONES[p.razon][enIngles() ? 'corto_en' : 'corto'], { size: 14, color: C.error, max: anchoTexto }));
      } else {
        const eje = p.sistema === 'movilidad';
        objs.push(texto(this, der, y + 4, `${p.costo * (eje ? 2 : 1)} cr`, { size: 26, color: C.acento, origen: [1, 0], max: anchoDer }));
        const ranura = eje ? tr('eje ×2', 'axle ×2') : etiquetaSocket(socketsPara(p)[0]);
        objs.push(texto(this, der, y + 42, ranura, { size: 14, color: C.claro, origen: [1, 0], max: anchoDer }));
        objs.push(texto(this, x + 8, y + 74, `${puesta ? '✓ ' : ''}${corto(p)}`, { size: 16, color: puesta ? C.ok : C.texto, max: anchoTexto }));
        const c = cifraDe(p, this.suelo);
        const cy = y + 98;
        const etq = texto(this, x + 8, cy, c.k, { size: 14, color: C.claro, max: c.v != null ? 74 : anchoTexto });
        objs.push(etq);
        if (c.v != null) {
          const num = texto(this, der, cy, c.n, { size: 15, origen: [1, 0] });
          objs.push(num);
          const bx = Math.max(x + 84, etq.x + etq.width + 6);
          const color = c.nivel ? COLOR_NIVEL[c.nivel] : K.P.dato;
          objs.push(...barraConPatron(this, bx, cy + 4, num.x - num.width - 6 - bx, 14, c.v, color, c.nivel ?? null).objs);
        }
      }
      this.lista.add(objs);
      if (p.bloqueada) this.candado(der - 8, y + 62, 2, this.lista); // dentro del contenedor (se destruye con la página)
      this.cartasUI[i] = { x, y, w: CARTA_W, h: CARTA_H, p, marco };
    });
    this.pintarFoco?.();
  }

  // ───────────────────────── botones de abajo ─────────────────────────
  crearBotones() {
    // Sin la reserva del «▶ » de foco (el Taller no usa foco de botones): así caben los 6 en una fila en es y en.
    const opc = { size: 15, alto: 42, origen: [0, 0.5], zonaExtra: [0, 2], pad: 10, reservaFoco: false };
    let x = 16;
    const sig = (b) => { x = b.caja.x + b.ancho + 10; return b; };
    this.btnRegresar = sig(K.boton(this, x, BOTONES_Y, tr('← Regresar', '← Back'), () => this.regresar(), opc));
    this.btnDeshacer = sig(K.boton(this, x, BOTONES_Y, tr('Deshacer', 'Undo'), () => this.deshacer(), opc));
    this.btnRehacer = sig(K.boton(this, x, BOTONES_Y, tr('Rehacer', 'Redo'), () => this.rehacer(), opc));
    this.btnQuitar = sig(K.boton(this, x, BOTONES_Y, tr('Quitar', 'Remove'), () => this.quitarSocket(ORDEN_RANURAS[this.sel]), opc));
    this.btnRestablecer = sig(K.boton(this, x, BOTONES_Y, tr('Restablecer', 'Reset'), () => this.restablecer(), opc));
    this.btnContinuar = K.boton(this, 945, BOTONES_Y, tr('Probar el robot', 'Test the robot'), () => this.continuar(),
      { size: 18, alto: 42, origen: [1, 0.5], anchoMin: 200, zonaExtra: [0, 2], pad: 12, reservaFoco: false });
    this.txtAyuda = texto(this, 480, AYUDA_Y, '', { size: 14, color: C.apagado, origen: [0.5, 0.5] });
  }

  // ───────────────────────── entrada: puntero y teclado ─────────────────────────
  crearEntrada() {
    this.input.on('pointermove', (pt) => this.alMover(pt));
    this.input.on('pointerup', (pt) => this.alSoltar(pt));
    this.input.on('pointerupoutside', (pt) => this.alSoltar(pt));
    // Arrastrar desde el robot: tocar un sprite del robot es tocar su socket.
    this.input.on('pointerdown', (pt, objs) => {
      if (this.focoVisible) { this.focoVisible = false; this.pintarFoco(); } // el marco de foco es solo para el teclado
      if (objs.length || this.ayuda || this.personal || this.tutorial) return;
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
    // Flechas, Enter y Tab según la zona con foco (pestañas → bandeja → sockets → acciones); el tutorial las toma si está abierto.
    on('keydown-LEFT', () => this.tecla('izq'));
    on('keydown-RIGHT', () => this.tecla('der'));
    on('keydown-UP', () => this.tecla('arriba'));
    on('keydown-DOWN', () => this.tecla('abajo'));
    on('keydown-ENTER', (ev) => { ev?.preventDefault?.(); this.tecla('enter'); });
    on('keydown-SPACE', (ev) => { ev?.preventDefault?.(); this.tecla('enter'); });
    on('keydown-DELETE', () => { if (!this.tutorial) this.quitarSocket(ORDEN_RANURAS[this.sel]); });
    on('keydown-BACKSPACE', () => { if (!this.tutorial) this.quitarSocket(ORDEN_RANURAS[this.sel]); });
    on('keydown-TAB', (ev) => {
      ev?.preventDefault?.();
      if (this.tutorial || this.ayuda || this.personal) return;
      this.moverZona(ev?.shiftKey ? -1 : 1);
    });
    // 1–6: pestaña directa; L: leer en voz alta; ?: repetir el tutorial.
    on('keydown', (ev) => {
      if (!ev || conModificador(ev) || this.tutorial || this.ayuda || this.personal || this.dialogo) return;
      const n = Number(ev.key);
      if (Number.isInteger(n) && n >= 1 && n <= PESTANAS.length) { this.elegirPestana(PESTANAS[n - 1].id); this.zonaFoco = 'pestanas'; this.pintarFoco(); }
      else if (ev.key === '?') this.abrirTutorial();
      else if (ev.key === 'l' || ev.key === 'L') this.leer();
    });
    const libre = (ev) => !conModificador(ev) && !this.tutorial;
    on('keydown-A', (ev) => { if (libre(ev)) this.alternarEjes(); });
    on('keydown-R', (ev) => { if (libre(ev)) this.restablecer(); });
    on('keydown-C', (ev) => { if (libre(ev)) this.continuar(); });
    on('keydown-P', (ev) => { if (libre(ev)) this.pintar(siguientePintura(this.mapa[CLAVE_PINTURA], ev.shiftKey ? -1 : 1)); });
    on('keydown-N', (ev) => { if (libre(ev)) { ev.preventDefault(); this.abrirNombre(); } });
    this.events.once('shutdown', () => { this.cerrarNombre(); this.cerrarPersonalizar(); });
    on('keydown-ESC', () => (this.tutorial ? this.tutorial.cerrar() : this.personal ? this.cerrarPersonalizar() : this.ayuda ? this.alternarAyuda()
      : this.mano ? this.soltarMano() : this.regresar()));
    on('keydown-H', (ev) => { if (libre(ev)) this.alternarAyuda(); });
    on('keydown', (ev) => {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || this.tutorial) return;
      const tecla = ev.key.toLowerCase();
      if (tecla === 'z' && !ev.shiftKey) this.deshacer();
      else if (tecla === 'y' || (tecla === 'z' && ev.shiftKey)) this.rehacer();
      else return;
      ev.preventDefault();
    });
  }

  // ───────────────────────── foco de teclado por zonas ─────────────────────────
  /** Botones de la zona «acciones», en orden de lectura (solo los habilitados y visibles). */
  acciones() {
    return [this.btnEjes, this.btnRegresar, this.btnDeshacer, this.btnRehacer, this.btnQuitar, this.btnRestablecer, this.btnContinuar,
      this.btnLeer, this.btnPersonalizar, this.btnAyuda].filter((b) => b && b.habilitado && b.obj.visible);
  }

  moverZona(d) {
    const zonas = ['pestanas', 'bandeja', 'sockets', 'acciones'];
    this.zonaFoco = zonas[(zonas.indexOf(this.zonaFoco) + d + zonas.length) % zonas.length];
    if (this.zonaFoco === 'acciones') this.focoAccion = 0;
    this.focoVisible = true;
    this.refrescarAyuda();
    this.pintarFoco();
  }

  /** Una tecla de navegación ('izq' | 'der' | 'arriba' | 'abajo' | 'enter') según la zona con foco. */
  tecla(k) {
    if (this.dialogo) return;
    const tu = this.tutorial;
    if (tu) {
      if (k === 'enter' || k === 'der') tu.siguiente();
      else if (k === 'izq') tu.anterior();
      return;
    }
    if (this.personal || this.ayuda) { if (k === 'enter') (this.personal ? this.cerrarPersonalizar() : this.alternarAyuda()); return; }
    this.focoVisible = true;
    const d = k === 'izq' || k === 'arriba' ? -1 : 1;
    switch (this.zonaFoco) {
      case 'pestanas': {
        if (k === 'enter' || k === 'abajo') { this.zonaFoco = 'bandeja'; break; }
        const i = PESTANAS.findIndex((t) => t.id === this.pestana);
        this.elegirPestana(PESTANAS[(i + d + PESTANAS.length) % PESTANAS.length].id);
        break;
      }
      case 'bandeja':
        if (k === 'enter') this.ponerCursor(); else this.moverCursor(d);
        break;
      case 'sockets':
        if (k === 'enter') { this.zonaFoco = 'bandeja'; this.elegirSocket(this.sel); } else this.elegirSocket(this.sel + d);
        break;
      default: {
        const lista = this.acciones();
        if (!lista.length) break;
        if (k === 'enter') { lista[Math.min(this.focoAccion, lista.length - 1)].activar(); break; }
        this.focoAccion = (Math.min(this.focoAccion, lista.length - 1) + d + lista.length) % lista.length;
      }
    }
    this.refrescarAyuda();
    this.pintarFoco();
  }

  /** Rectángulo del elemento con foco (px del juego) o null. */
  rectFoco() {
    switch (this.zonaFoco) {
      case 'pestanas': {
        const t = this.pestanasUI.find((x) => x.t.id === this.pestana);
        return t ? { x: t.caja.x, y: t.caja.y, w: t.caja.width, h: t.caja.height } : null;
      }
      case 'bandeja': {
        const c = this.cartasUI?.[this.cursor];
        return c ? { x: c.x, y: c.y, w: c.w, h: c.h } : null;
      }
      case 'sockets': {
        const so = this.sockets[ORDEN_RANURAS[this.sel]];
        return so ? { x: so.x0, y: so.y0, w: SOCKET_W, h: SOCKET_H } : null;
      }
      default: {
        const lista = this.acciones();
        const b = lista[Math.min(this.focoAccion, lista.length - 1)];
        if (!b) return null;
        const r = b.caja.getBounds();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }
    }
  }

  /** Marco de foco muy visible: amarillo de 4 px con borde oscuro y una flecha › a la izquierda. Solo con teclado. */
  pintarFoco() {
    const g = this.focoG;
    if (!g) return;
    g.clear();
    if (!this.focoVisible || this.tutorial || this.ayuda || this.personal) return;
    const r = this.rectFoco();
    if (!r) return;
    const x = r.x - 4;
    const y = r.y - 4;
    const w = r.w + 8;
    const h = r.h + 8;
    g.lineStyle(6, 0x05060d, 1).strokeRect(x - 1, y - 1, w + 2, h + 2);
    g.lineStyle(4, FOCO, 1).strokeRect(x, y, w, h);
    const ax = Math.max(2, x - 12);
    const ay = r.y + r.h / 2;
    g.fillStyle(0x05060d, 1).fillTriangle(ax - 2, ay - 10, ax - 2, ay + 10, ax + 11, ay);
    g.fillStyle(FOCO, 1).fillTriangle(ax, ay - 7, ax, ay + 7, ax + 8, ay);
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
    if (this.ayuda || this.personal) return;
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
    const c = this.add.container(0, 0).setDepth(90); // encima del tutorial (paso 1: arrastrar una rueda)
    const ic = this.icono(p);
    if (ic) {
      const img = this.add.image(0, 0, ic.clave).setScale(ic.escala * 2); // 64 px
      if (ic.tinte != null) img.setTint(ic.tinte);
      c.add(img);
    } else c.add(this.add.rectangle(0, 0, 40, 40, 0x80e0dc));
    c.add(texto(this, 0, 28, corto(p), { size: 14, origen: [0.5, 0], borde: true }));
    if (!this.quieto) {
      c.setScale(1.1);
      this.tweens.add({ targets: c, scale: 1, duration: 120 });
    }
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
      // Mayús al soltar una rueda = solo ese eje (opción avanzada); sin Mayús va a los dos.
      if (valido) { a.fantasma.destroy(); this.ponerEn(a.pieza, destino, { soloEse: Boolean(pt?.event?.shiftKey) }); return; }
      // Inválido: la pieza vuelve a su tarjeta.
      const carta = this.cartasUI?.[a.indice];
      const vx = carta ? carta.x + 40 : a.x0;
      const vy = carta ? carta.y + 38 : a.y0;
      if (this.quieto) a.fantasma.destroy();
      else this.tweens.add({ targets: a.fantasma, x: vx, y: vy, alpha: 0, scale: 0.6, duration: 220, ease: 'Quad.In', onComplete: () => a.fantasma.destroy() });
      if (destino) this.avisar(tr(`${corto(a.pieza)} no va en ${etiquetaSocket(destino)}.`, `${corto(a.pieza)} does not fit in ${etiquetaSocket(destino)}.`));
      this.pintarSockets();
      return;
    }
    // Desde el robot: a otro socket válido = mover; fuera de cualquier socket = quitar; a uno inválido = vuelve.
    this.partes?.[a.ranura]?.setAlpha(1);
    if (valido && destino !== a.ranura) {
      a.fantasma.destroy();
      const r = mover(this.mapa, a.ranura, destino, PIEZAS);
      if (r.ok) this.aplicarCambio(r.mapa, { ranura: destino, texto: tr(`mover ${corto(a.pieza)} a ${etiquetaSocket(destino)}`, `move ${corto(a.pieza)} to ${etiquetaSocket(destino)}`) }, { encaja: destino, suelta: a.ranura, voz: { accion: 'mover', pieza: a.pieza, ranura: destino } });
      return;
    }
    if (!destino) { a.fantasma.destroy(); this.quitarSocket(a.ranura); return; }
    const o = this.ancla(a.ranura);
    if (this.quieto) a.fantasma.destroy();
    else this.tweens.add({ targets: a.fantasma, x: o.x, y: o.y, alpha: 0, duration: 200, onComplete: () => a.fantasma.destroy() });
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
    if (!this.quieto) this.cameras.main.shake(90, 0.003);
    this.voz?.decir(t);
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

  /**
   * Pone una pieza en un socket. Una rueda va a LOS DOS ejes (una sola acción, con las dos encajando), salvo con los ejes
   * separados (botón «Separar ejes» / A) o con `soloEse` (Mayús al soltar): entonces solo al eje elegido.
   */
  ponerEn(p, id, { soloEse = false } = {}) {
    this.mano = false;
    const separar = this.ejesSeparados || soloEse;
    const r = ponerRueda(this.mapa, p, id, { separar });
    if (!r.ok) {
      if (r.motivo === 'igual') {
        this.aviso = r.ambos ? tr(`${corto(p)} ya está en los dos ejes.`, `${corto(p)} is already on both axles.`)
          : tr(`${corto(p)} ya está en ${etiquetaSocket(id)}.`, `${corto(p)} is already in ${etiquetaSocket(id)}.`);
        this.refrescar();
      } else if (r.motivo === 'bloqueada') this.avisoBloqueada(p);
      return;
    }
    this.sel = ORDEN_RANURAS.indexOf(id);
    const texto = r.ambos ? tr('ambos ejes → ', 'both axles → ') + trDato(p, 'nombre') : `${nombreRanura(id)} → ${trDato(p, 'nombre')}`;
    this.aplicarCambio(r.mapa, { ranura: id, texto }, { encaja: id, voz: { accion: r.ambos ? 'ejes' : 'poner', pieza: p, ranura: id } });
    // El otro eje encaja un instante después: se ve que la rueda quedó en los dos.
    if (r.ambos) this.time.delayedCall(this.quieto ? 0 : 140, () => { if (this.sys.isActive()) this.animarEncaje(r.otro); });
    if (id.startsWith('rueda') && r.mapa.rueda_del !== r.mapa.rueda_tras && r.mapa.rueda_del && r.mapa.rueda_tras) {
      this.aviso = tr('Ejes distintos: cada eje lleva su rueda. «Unir ejes» (A) pone la misma en los dos.',
        'Mixed axles: each axle has its own wheel. «Join axles» (A) puts the same on both.');
      this.refrescarAyuda();
    }
  }

  etiquetaEjes() {
    return this.ejesSeparados ? tr('Unir ejes (A)', 'Join axles (A)') : tr('Separar ejes (A)', 'Split axles (A)');
  }

  /**
   * «Separar ejes» / «Unir ejes» (A). Separar: la siguiente rueda va solo al eje donde la sueltes (opción avanzada).
   * Unir: si los ejes llevan ruedas distintas, la del eje elegido (o la delantera) se copia al otro.
   */
  alternarEjes() {
    if (this.ejesSeparados) {
      this.ejesSeparados = false;
      this.btnEjes.setEtiqueta(this.etiquetaEjes());
      if (this.mapa.rueda_del && this.mapa.rueda_tras && this.mapa.rueda_del !== this.mapa.rueda_tras) { this.igualarEjes(); return; }
      this.aviso = tr('Ejes unidos: cada rueda que sueltes va a los dos ejes.', 'Axles joined: every wheel you drop goes on both axles.');
    } else {
      this.ejesSeparados = true;
      this.btnEjes.setEtiqueta(this.etiquetaEjes());
      this.aviso = tr('Ejes separados: la rueda va solo al eje donde la sueltes.', 'Axles split: a wheel goes only on the axle you drop it on.');
    }
    this.refrescarAyuda();
  }

  quitarSocket(id) {
    const r = quitarDe(this.mapa, id);
    if (!r.ok) return;
    this.sel = ORDEN_RANURAS.indexOf(id);
    this.aplicarCambio(r.mapa, { ranura: id, texto: tr(`quitar ${nombreRanura(id)}`, `remove ${nombreRanura(id)}`) }, { suelta: id, voz: { accion: 'quitar', ranura: id } });
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
    this.aplicarCambio(r.mapa, { ranura: r.otro, texto: tr('ambos ejes → ', 'both axles → ') + trDato(piezaPorId[r.mapa[r.otro]], 'nombre') },
      { encaja: r.otro, voz: { accion: 'ejes', pieza: piezaPorId[r.mapa[r.otro]] } });
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
  aplicarCambio(mapa, cambio, { encaja = null, suelta = null, voz = null } = {}) {
    const viejo = suelta && !this.quieto ? this.copiaParte(suelta) : null;
    this.mapa = mapa;
    this.hist.registrar(this.mapa, cambio);
    this.aviso = '';
    this.detalle = null;
    this.refrescar(true);
    if (viejo) this.animarSoltar(viejo, suelta);
    if (encaja) this.animarEncaje(encaja);
    this.anunciar(voz ?? { accion: 'otro', texto: cambio.texto });
    // Tutorial, paso 1 («arrastra una rueda a su eje»): avanza solo cuando una rueda entra en un eje.
    if (encaja?.startsWith('rueda') && this.tutorial?.espera() === 'rueda') {
      this.time.delayedCall(this.quieto ? 0 : 450, () => { if (this.tutorial?.espera() === 'rueda') this.tutorial.siguiente(); });
    }
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
    sonarBoton();
    if (this.quieto) return; // prefers-reduced-motion: la pieza aparece en su lugar sin destello, polvo ni rebote
    const o = this.partes?.[id];
    const a = id === 'chasis' ? { x: ROBOT.x, y: ROBOT.y } : (o ? { x: o.x, y: o.y } : this.ancla(id));
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
    if (this.quieto) return;
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
    this.anunciar({ accion: 'otro', texto: this.aviso });
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
    // Ejes con ruedas distintas (Mayús al soltar, deshacer, diseño guardado) = modo separado: el botón ofrece «Unir ejes».
    if (this.mapa.rueda_del && this.mapa.rueda_tras && this.mapa.rueda_del !== this.mapa.rueda_tras) this.ejesSeparados = true;
    this.btnEjes.setHabilitado(true);
    if (this.btnEjes.etiqueta !== this.etiquetaEjes()) this.btnEjes.setEtiqueta(this.etiquetaEjes());
  }

  /** Una línea abajo: aviso del momento, o el detalle de la pieza elegida, o la ayuda corta del armado. */
  refrescarAyuda(extra = null) {
    if (!this.txtAyuda) return;
    const aviso = this.aviso || extra || this.lineaEjes;
    const ZONA = {
      pestanas: tr('Pestañas: ←→ cambiar · Enter ir a las piezas · Tab sigue', 'Tabs: ←→ switch · Enter go to parts · Tab next'),
      bandeja: tr('Piezas: ←→ elegir · Enter poner en el robot · Tab sigue', 'Parts: ←→ choose · Enter fit on robot · Tab next'),
      sockets: tr('Sockets: ←→ elegir · Supr quitar · Enter ver sus piezas · Tab sigue', 'Sockets: ←→ choose · Del remove · Enter see its parts · Tab next'),
      acciones: tr('Botones: ←→ elegir · Enter activar · Tab sigue', 'Buttons: ←→ choose · Enter press · Tab next'),
    };
    const linea = aviso || this.detalle || (this.focoVisible ? ZONA[this.zonaFoco] : null)
      || tr('Arrastra piezas al robot · Tab ←→ Enter · Supr quitar · H ayuda · ? guía · (P) valor de juego',
        'Drag parts onto the robot · Tab ←→ Enter · Del remove · H help · ? guide · (P) game value');
    this.txtAyuda.setText(linea).setColor(aviso ? C.acento : this.detalle ? C.claro : C.apagado);
    ajustarAncho(this.txtAyuda, 930); // si no cabe en una línea, se recorta con «…» (el detalle completo está en la ayuda H)
  }

  // ───────────────────────── panel de ayuda (H) ─────────────────────────
  lineasDetalle() {
    const res = this.res;
    const a = res.agarre;
    const ej = res.agarre_ejes;
    const tres = (g) => `${f2(g.arena)}/${f2(g.roca)}/${f2(g.compacto)}`;
    const fm = res.fuerza_por_masa != null ? res.fuerza_por_masa.toFixed(2) : '—';
    const aut = res.autonomia_s != null ? `${Math.round(res.autonomia_s)} s` : '—';
    return [
      tr(`Costo ${res.costo} / ${this.presupuesto} cr · quedan ${this.presupuesto - res.costo} · masa ${res.masa} kg + carga ${MASA_CARGA_KG} kg`,
        `Cost ${res.costo} / ${this.presupuesto} cr · ${this.presupuesto - res.costo} left · mass ${res.masa} kg + cargo ${MASA_CARGA_KG} kg`),
      tr(`Agarre: arena ${f2(a.arena)} · roca ${f2(a.roca)} · comp. ${f2(a.compacto)} (del. ${tres(ej.del)} · tras. ${tres(ej.tras)})`,
        `Grip: sand ${f2(a.arena)} · rock ${f2(a.roca)} · compact ${f2(a.compacto)} (front ${tres(ej.del)} · rear ${tres(ej.tras)})`),
      ...this.lineasDestino(res),
      tr(`Autonomía ≈ ${aut} a fondo, con carga · fuerza/masa ${fm}`, `Run time ≈ ${aut} at full power, loaded · force/mass ${fm}`),
      tr('En la prueba: agarre² × agarre del suelo · cada eje lleva 2 ruedas', 'In the test: grip² × soil grip · each axle takes 2 wheels'),
      tr('Bloqueadas: filas del libro sin mecánica o sin fuente espacial.', 'Locked: workbook rows with no mechanic or no space source.'),
      ...(this.lineaEjes ? [this.lineaEjes] : []),
      this.errores.length ? `✕ ${this.errores.join(' · ')}` : tr('✓ Diseño válido', '✓ Valid design'),
    ];
  }

  alternarAyuda() {
    if (this.ayuda) { this.ayuda.forEach((o) => o.destroy()); this.ayuda = null; this.btnGuia = null; this.pintarFoco(); return; }
    this.cerrarPersonalizar();
    this.dibujarAyuda();
  }

  dibujarAyuda() {
    this.ayuda?.forEach((o) => o.destroy());
    this.focoG?.clear();
    const capa = this.add.rectangle(480, 270, 960, 540, 0x05060c, 0.75).setDepth(60).setInteractive();
    capa.on('pointerdown', () => this.alternarAyuda());
    const t = [
      tr('Cómo armar', 'How to build'),
      tr('Para probar: chasis, ruedas en 2 ejes, motor, batería y carga; módulo opcional.',
        'To test you need chassis, both axles, motor, battery, payload; module optional.'),
      tr('Arrastra a un socket verde; para quitar, saca la pieza del robot o clic derecho.',
        'Drag a card onto a green socket; drag a part off (or right-click) to remove it.'),
      tr('Ruedas: van a los 2 ejes. Para mezclar: Mayús al soltar o «Separar ejes» (A).',
        'Wheels go on both axles. To mix: Shift as you drop, or «Split axles» (A).'),
      tr('Toque: tarjeta y luego socket (dos toques en la tarjeta la ponen).', 'Tap: card, then socket (tap the card twice to fit it).'),
      tr('Tab: pestañas→piezas→sockets→botones · Enter poner · Supr quitar · 1–6 pestaña',
        'Tab: tabs→parts→sockets→buttons · ←→ inside · Enter fit · Del remove · 1–6 tab'),
      tr('A ejes · C probar · R restablecer · P pintura · N nombre · L leer · ? guía · Ctrl+Z/Y',
        'A axles · C test · R reset · P paint · N name · L read · ? guide · Ctrl+Z/Y · Esc back'),
      '',
      tr('Detalle del diseño · (P) = valor de juego, no dato de ingeniería', 'Design detail · (P) = game value, not engineering data'),
      ...this.lineasDetalle(),
    ].join('\n');
    const txt = texto(this, 58, 0, t, { size: 14, ancho: 844 }).setDepth(62);
    const alto = txt.height + 14 + 60;
    const y0 = Math.max(4, Math.round(270 - alto / 2));
    txt.setY(y0 + 14);
    const marco = K.panel(this, 40, y0, 880, alto).setDepth(61);
    // Última fila: cómo cerrar y el botón para repetir la guía de la primera vez (también con la tecla ?).
    const yf = y0 + alto - 32;
    const cierre = texto(this, 58, yf, tr('H / Esc / clic: cerrar', 'H / Esc / click: close'), { size: 14, color: C.apagado, origen: [0, 0.5] }).setDepth(62);
    this.btnGuia = K.boton(this, 902, yf, tr('Ver la guía (?)', 'Show the guide (?)'), () => { this.alternarAyuda(); this.abrirTutorial(); },
      { size: 15, alto: 42, origen: [1, 0.5], pad: 12, reservaFoco: false, color: K.P.bien });
    K.fijarBoton(this.btnGuia, 63);
    this.ayuda = [capa, marco, txt, cierre, this.btnGuia.obj, this.btnGuia.caja];
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
  /**
   * Panel «Personalizar» (botón arriba, o las teclas P y N directo): pintura del chasis y nombre del robot. Cosmético:
   * no cambia la prueba. Los cambios entran al historial (Deshacer los revierte). Esc, «Listo» o un clic fuera lo cierran.
   */
  alternarPersonalizar() {
    if (this.personal) { this.cerrarPersonalizar(); return; }
    if (this.ayuda) this.alternarAyuda();
    const W = 560;
    const H = 240;
    const x0 = 480 - W / 2;
    const y0 = 270 - H / 2;
    const capa = this.add.rectangle(480, 270, 960, 540, 0x05060c, 0.75).setDepth(60).setInteractive();
    capa.on('pointerdown', () => this.cerrarPersonalizar());
    const marco = K.panel(this, x0, y0, W, H).setDepth(61);
    marco.setInteractive?.(); // los clics dentro del panel no cierran
    const objs = [capa, marco];
    const t = (x, y, s, o) => { const o2 = texto(this, x, y, s, o).setDepth(62); objs.push(o2); return o2; };
    t(x0 + 18, y0 + 14, tr('Personalizar (cosmético)', 'Customize (cosmetic)'), { size: 18, color: C.acento, max: W - 36 });
    // Muestras de pintura de 40 × 40 cada 66 px: zona táctil de 64 × 44 sin encimarse (auditoría de Leo §4.3).
    t(x0 + 18, y0 + 56, tr('Pintura (P)', 'Paint (P)'), { size: 15, color: C.claro });
    const yP = y0 + 112;
    const xs = Math.round(480 - ((PINTURAS.length - 1) * 66) / 2);
    this.muestras = PINTURAS.map((pint, i) => {
      const cuadro = this.add.rectangle(xs + i * 66, yP, 40, 40, pint.muestra).setStrokeStyle(2, BORDE).setDepth(62);
      zonaToque(cuadro, -12, -2, 64, 44);
      cuadro.on('pointerdown', () => this.pintar(pint.id));
      objs.push(cuadro);
      return { pint, cuadro };
    });
    this.marcaPintura = this.add.graphics().setDepth(63); // ✓ sobre la elegida (no solo el borde)
    objs.push(this.marcaPintura);
    const yN = y0 + 158;
    const etqN = t(x0 + 18, yN, tr('Nombre (N)', 'Name (N)'), { size: 15, color: C.claro, origen: [0, 0.5] });
    this.txtNombre = t(Math.round(etqN.x + etqN.width + 18), yN, '', { size: 15, origen: [0, 0.5] });
    this.xNombreMax = x0 + W - 18;
    const yB = y0 + H - 34;
    this.btnPNombre = K.boton(this, x0 + 18, yB, tr('Cambiar nombre', 'Rename'), () => this.abrirNombre(),
      { size: 15, alto: 42, origen: [0, 0.5], pad: 10, reservaFoco: false });
    this.btnPListo = K.boton(this, x0 + W - 18, yB, tr('Listo', 'Done'), () => this.cerrarPersonalizar(),
      { size: 15, alto: 42, origen: [1, 0.5], pad: 14, reservaFoco: false, color: K.P.bien });
    for (const bt of [this.btnPNombre, this.btnPListo]) { K.fijarBoton(bt, 62); objs.push(bt.obj, bt.caja); }
    this.personal = objs;
    this.refrescarPersonalizacion();
  }

  cerrarPersonalizar() {
    if (!this.personal) return;
    this.personal.forEach((o) => o.destroy());
    this.personal = null;
    this.muestras = [];
    this.marcaPintura = null;
    this.txtNombre = null;
    this.btnPNombre = null;
    this.btnPListo = null;
  }

  refrescarPersonalizacion() {
    const pintura = pinturaPorId(this.mapa[CLAVE_PINTURA]);
    const nombre = this.mapa[CLAVE_NOMBRE] || null;
    fijarPersonalizacion(partida, { pintura: pintura.id, nombre }); // la usan la prueba y la misión (fisica/aspecto.js)
    for (const { pint, cuadro } of this.muestras ?? []) {
      const elegida = pint.id === pintura.id;
      cuadro.setStrokeStyle(elegida ? 4 : 2, elegida ? ACENTO : BORDE).setScale(elegida ? 1.1 : 1);
      if (elegida && this.marcaPintura) {
        // Palomita con contorno oscuro en la esquina de la muestra elegida.
        const g = this.marcaPintura.clear();
        const cx = cuadro.x + 14;
        const cy = cuadro.y - 14;
        g.fillStyle(0x05060d, 1).fillCircle(cx, cy, 9);
        g.lineStyle(3, ACENTO, 1).beginPath().moveTo(cx - 5, cy).lineTo(cx - 1, cy + 4).lineTo(cx + 5, cy - 4).strokePath();
      }
    }
    if (!this.txtNombre) return;
    this.txtNombre.setText(nombre ? `«${nombre}»` : tr('(sin nombre)', '(no name)')).setColor(nombre ? C.texto : C.apagado);
    ajustarAncho(this.txtNombre, this.xNombreMax - this.txtNombre.x);
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
