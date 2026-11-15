import Phaser from 'phaser';
import { boton, irA } from './ui.js';
import { PIEZAS, DESTINOS } from '../data.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { partida } from '../main.js';
import {
  RANURAS, DISENO_POR_DEFECTO, piezasPara, costoEnRanura, comoMapa, comoDiseno, resumen, validar,
} from './Taller/diseno.js';
import { historialAlEntrar, diferencias } from './Taller/historial.js';
import { efectosEn } from './Taller/diseno.js';
import {
  PINTURAS, pinturaPorId, siguientePintura, normalizarNombre, personalizacionDe, fijar as fijarPersonalizacion, LARGO_NOMBRE,
} from './Taller/personalizacion.js';
import { MASA_CARGA_KG } from '../fisica/diseno.js'; // la carga que se entrega (frente juego)
import { ambienteDeDestino } from '../fisica/ambiente.js';
import { tr, trDato, enIngles } from '../i18n.js';

// Dueño: frente taller. Armado con ranuras fijas, presupuesto visible, validación del diseño.
// Contrato con el frente juego: partida.diseno = [{ ranura, pieza }] (docs/juego/ESPECIFICACION.md §3).
// Interfaz provisional en texto; el frente de arte reemplaza los rectángulos por sprites.

const C = {
  texto: '#ffffff', suave: '#9aa4c7', claro: '#cfd6ff', acento: '#ffd166', apagado: '#a3abcc',
  error: '#ff7a7a', ok: '#6ee7a8', // contraste ≥ 4.5:1 (DISENO.md §2): apagado antes #6c7393 (3.7:1), error #ff6b6b (4.4:1)
};
const ACENTO = 0xffd166;
const BORDE = 0x4a5275;
const RELLENO = 0x141830;
const FUENTE = 'monospace';

// Tamaño de letra (px del juego). En un teléfono en horizontal el lienzo de 960 × 540 se reduce a ~0.72:
// 16 px del juego ≈ 11.5 px reales, el mínimo legible. Nada del Taller usa menos de TXT.
const TXT = 16;       // texto general, esquema, catálogo, validación y ayuda
const TXT_MEDIO = 17; // nombres de pieza, encabezado del catálogo y presupuesto

// Posición de cada ranura en el esquema lateral (el robot avanza hacia la derecha). Columna izquierda: x 25–465;
// termina antes de la fila de Regresar / Deshacer / Rehacer (y = BOTONES_Y).
const ESQUEMA = {
  modulo: { x: 395, y: 142, w: 140, h: 56 }, // 3 renglones: "Módulo" + "Panel solar (opcional)" en 2
  // Fila de arriba alta (86) para que quepan ícono + etiqueta + nombre de la pieza en 2–3 líneas a 16 px.
  motor: { x: 95, y: 216, w: 140, h: 86 },
  bateria: { x: 245, y: 216, w: 140, h: 86 },
  carga: { x: 395, y: 216, w: 140, h: 86, etiqueta: 'Carga', etiqueta_en: 'Cargo' }, // "Soporte de carga" + nombre de la pieza no cabe con ícono
  chasis: { x: 245, y: 292, w: 440, h: 46 },
  rueda_tras: { x: 110, y: 359, rueda: true },
  rueda_del: { x: 380, y: 359, rueda: true },
};
// Columna derecha (catálogo y validación): x 490–945.
const CAT_X = 490;
const CAT_Y = 128;    // encabezado del catálogo
const FILA_Y = 152;   // primera pieza
const FILA_PASO = 68; // alto de cada pieza (3 renglones de 16–17 px)
const FILAS_VISIBLES = 3; // ranuras con más piezas (ejes y módulo: 4) se recorren con ▲ / ▼, ↑/↓ o la rueda del ratón
// Personalización (cosmética), en la franja libre arriba a la izquierda: x 25–320 (a la derecha está la caja del módulo,
// x ≥ 325) e y 114–172 (abajo empieza la fila del motor, y 173).
const PERS_X = 25;
const PERS_Y1 = 128;
const PERS_Y2 = 158;

const piezaPorId = Object.fromEntries(PIEZAS.map((p) => [p.id, p]));
const ORDEN_RANURAS = RANURAS.map((r) => r.id);
const ranuraPorId = Object.fromEntries(RANURAS.map((r) => [r.id, r]));
// Pintura y nombre (cosméticos) viajan en el mismo mapa del historial, con claves que no son ranuras: así Deshacer/Rehacer
// también los revierten. comoDiseno() ignora estas claves (solo toma las de RANURAS).
const CLAVE_PINTURA = 'pintura';
const CLAVE_NOMBRE = 'nombre';
const nombreRanura = (id) => (ranuraPorId[id] ? trDato(ranuraPorId[id], 'nombre')
  : id === CLAVE_PINTURA ? tr('pintura', 'paint') : id === CLAVE_NOMBRE ? tr('nombre', 'name') : id);

// Diseño con el que se cerró el Taller la última vez (Probar o Regresar), por partida (`clave` = partida.resultados, que
// cambia de identidad en cada partida nueva o restaurada). Si al volver partida.diseno es otro (p. ej. "Aplicar y al taller"
// en Resultados), ese cambio queda como primer paso del historial y Deshacer lo revierte.
let memoria = null;

// Íconos 16 × 16 de las piezas (frente arte): assets/iconos/<id_de_pieza>.png.
// Clave de textura = ruta sin extensión ("iconos/rueda_ancha"), la misma que usa el Boot al precargar /assets.
// Si un ícono no existe, la pieza se muestra solo con texto.
const ICONOS = import.meta.glob('../../../assets/iconos/*.png', { eager: true, query: '?url', import: 'default' });
const URL_ICONO = Object.fromEntries(Object.entries(ICONOS).map(([ruta, url]) => [ruta.split('/').pop().replace(/\.png$/, ''), url]));
const claveIcono = (id) => `iconos/${id}`;

// Columna derecha: la validación empieza bajo la tercera pieza y nunca baja de aquí (los botones están en y = BOTONES_Y).
const VALIDACION_Y = FILA_Y + 3 * FILA_PASO + 4;
const VALIDACION_MAX_Y = 462;
// Fila de botones de abajo: 2 px más arriba que el 485 original para no rozar la nota de teclado (2 líneas desde y ≈ 495).
const BOTONES_Y = 483;

// Nombre de superficie para mostrar (los datos usan arena/roca/compacto).
const SUPERFICIE_EN = { arena: 'sand', roca: 'rock', compacto: 'compact' };
const sup = (s) => tr(s, SUPERFICIE_EN[s] ?? s);

function datoClave(p) {
  if (p.agarre) {
    return tr(
      `agarre: arena ${f2(p.agarre.arena)} · roca ${f2(p.agarre.roca)} · comp. ${f2(p.agarre.compacto)}`,
      `grip: sand ${f2(p.agarre.arena)} · rock ${f2(p.agarre.roca)} · compact ${f2(p.agarre.compacto)}`,
    );
  }
  if (p.sistema === 'estructura') return tr(`resistencia ${p.resistencia}`, `durability ${p.resistencia}`);
  if (p.sistema === 'potencia') return tr(`fuerza ${p.fuerza} · consumo ${p.consumo}/s`, `force ${p.fuerza} · drain ${p.consumo}/s`);
  if (p.sistema === 'energia') return tr(`capacidad ${p.capacidad}`, `capacity ${p.capacidad}`);
  if (p.sistema === 'carga') return tr(`protección ${Math.round(p.proteccion * 100)} %`, `protection ${Math.round(p.proteccion * 100)} %`);
  // Módulo: una línea (≤ 44 caracteres a 16 px) para que la fila no crezca.
  if (p.capacidad) return tr(`recarga con luz · capacidad ${p.capacidad}`, `recharges in sunlight · capacity ${p.capacidad}`);
  if (p.aislamiento_termico) {
    const pct = Math.round(p.aislamiento_termico * 100);
    return tr(`evita ${pct} % de la pérdida por frío`, `prevents ${pct} % of the cold loss`);
  }
  if (p.radiador) return tr('enfría el motor sin aire (radiación)', 'cools the motor without air (radiation)');
  return '';
}
const conModificador = (ev) => Boolean(ev && (ev.ctrlKey || ev.metaKey || ev.altKey));
function f2(v) { return typeof v === 'number' ? v.toFixed(2) : '—'; }
const pct = (v) => `${Math.round(v * 100)} %`;
const MUNDO = () => ({ marte: tr('Marte', 'Mars'), luna: tr('Luna', 'Moon'), tierra: tr('Tierra', 'Earth') });

// Zonas de toque: lo dibujado no cambia, pero el área que responde al dedo es más grande.
// En un teléfono en horizontal el lienzo de 960 × 540 se reduce a ~0.7 y un botón de texto de 18 px queda de ~13 px de alto;
// el mínimo recomendado para un dedo es ~44 px. Las coordenadas son locales al objeto (0,0 = esquina superior izquierda).
// Ninguna zona se traslapa con la de otro control (Phaser solo atiende al de arriba, así que un traslape sería un toque equivocado).
function zonaToque(obj, x, y, w, h) {
  const zona = new Phaser.Geom.Rectangle(x, y, w, h);
  if (obj.input) { // ya era interactivo (p. ej. los botones de ui.js): Phaser ignora una zona nueva en setInteractive, hay que asignarla
    obj.input.hitArea = zona;
    obj.input.hitAreaCallback = Phaser.Geom.Rectangle.Contains;
    obj.input.customHitArea = true; // si no, Phaser vuelve la zona al tamaño del texto cada vez que cambia el texto o el color
    return obj;
  }
  return obj.setInteractive({ hitArea: zona, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
}
/** Zona centrada en el objeto, de al menos `ancho` × `alto`. */
function zonaCentrada(obj, ancho, alto) {
  const w = Math.max(obj.width, ancho);
  const h = Math.max(obj.height, alto);
  return zonaToque(obj, (obj.width - w) / 2, (obj.height - h) / 2, w, h);
}

export default class Taller extends Phaser.Scene {
  constructor() { super('Taller'); }

  preload() {
    // Normalmente el Boot ya los precargó; aquí solo se cargan los que falten (p. ej. si hay assets/manifest.json).
    for (const p of PIEZAS) {
      const url = URL_ICONO[p.id];
      if (url && !this.textures.exists(claveIcono(p.id))) this.load.image(claveIcono(p.id), url);
    }
  }

  icono(id) {
    return this.textures.exists(claveIcono(id)) ? claveIcono(id) : null;
  }

  create() {
    // Fondo de arte del taller (Mauricio, #77), oscurecido para que el texto se lea encima.
    if (this.textures.exists('pantallas/taller_fondo')) {
      this.add.image(480, 270, 'pantallas/taller_fondo').setScale(3).setDepth(-10);
      this.add.rectangle(480, 270, 960, 540, 0x0b0d17, 0.62).setDepth(-9);
    }
    this.presupuesto = partida.presupuesto ?? PRESUPUESTO_INICIAL;
    // Al volver de una prueba se conserva el diseño; la primera vez arranca con el robot mínimo (ruedas estándar).
    // La pintura y el nombre (cosméticos) viajan en el mismo mapa para que Deshacer/Rehacer también los cubran.
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
    this.sel = 0;      // índice de la ranura seleccionada en RANURAS
    this.cursor = 0;   // índice de la pieza resaltada en el catálogo
    this.desde = 0;    // primera pieza visible del catálogo (ranuras con más de FILAS_VISIBLES piezas)
    this.aviso = '';

    const destino = DESTINOS[partida.destino];
    const sitio = partida.sitio;
    const tipos = sitio && sitio.nivel && Array.isArray(sitio.nivel.superficies)
      ? [...new Set(sitio.nivel.superficies.map((s) => s.tipo))].map(sup).join(', ') : null;
    const sub = [
      tr('Destino: ', 'Destination: ') + (destino ? trDato(destino, 'nombre') : partida.destino),
      sitio ? tr('Prueba en: ', 'Test at: ') + trDato(sitio, 'nombre') : null,
      tipos ? tr(`superficies: ${tipos}`, `surfaces: ${tipos}`)
        : (sitio && sitio.prueba_util ? tr('prueba útil: ', 'tests: ') + trDato(sitio, 'prueba_util') : null),
    ].filter(Boolean).join(' · ');
    // Encabezado propio (no ui.titulo): título, subtítulo de hasta 2 líneas (los sitios de nombre largo ya no se achican)
    // y presupuesto, todo a >= 16 px.
    this.add.text(480, 22, tr('Taller', 'Workshop'), { fontFamily: FUENTE, fontSize: '28px', color: C.texto }).setOrigin(0.5);
    this.add.text(480, 42, sub, {
      fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.suave, align: 'center', wordWrap: { width: 930 },
    }).setOrigin(0.5, 0);
    this.txtPresupuesto = this.add.text(480, 98, '', { fontFamily: FUENTE, fontSize: `${TXT_MEDIO}px`, color: C.claro }).setOrigin(0.5);

    this.crearPersonalizacion();
    this.crearEsquema();
    this.add.text(245, ESQUEMA.rueda_tras.y, tr('avance →', 'forward →'), { fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.apagado }).setOrigin(0.5);

    this.txtCatalogo = this.add.text(CAT_X, CAT_Y, '', { fontFamily: FUENTE, fontSize: `${TXT_MEDIO}px`, color: C.texto }).setOrigin(0, 0.5);
    this.lista = this.add.container(0, 0);
    // Paginador del catálogo (solo si la ranura tiene más de FILAS_VISIBLES piezas): ▲ n–m/N ▼ junto al encabezado.
    this.pagArriba = this.add.text(0, CAT_Y, '▲', { fontFamily: FUENTE, fontSize: `${TXT_MEDIO}px`, color: C.acento }).setOrigin(0, 0.5)
      .on('pointerdown', () => this.desplazar(-1));
    this.pagTexto = this.add.text(0, CAT_Y, '', { fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.claro }).setOrigin(0, 0.5);
    this.pagAbajo = this.add.text(0, CAT_Y, '▼', { fontFamily: FUENTE, fontSize: `${TXT_MEDIO}px`, color: C.acento }).setOrigin(0, 0.5)
      .on('pointerdown', () => this.desplazar(1));
    // Zonas de 34 × 32 alrededor de cada flecha (y 112–144: no tocan la primera fila, que empieza en y 150).
    for (const f of [this.pagArriba, this.pagAbajo]) zonaToque(f, (f.width - 34) / 2, (f.height - 32) / 2, 34, 32);
    // Rueda del ratón sobre el catálogo.
    this.input.on('wheel', (puntero, _objs, _dx, dy) => {
      if (puntero.x >= CAT_X && puntero.y >= FILA_Y && puntero.y <= FILA_Y + FILAS_VISIBLES * FILA_PASO) this.desplazar(Math.sign(dy));
    });
    this.btnQuitar = this.add.text(945, CAT_Y, tr('[ Quitar ]', '[ Remove ]'), { fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.acento })
      .setOrigin(1, 0.5).on('pointerdown', () => this.quitar());
    // Crece hacia arriba y a la izquierda; abajo empieza la primera fila del catálogo (y >= 150).
    zonaToque(this.btnQuitar, this.btnQuitar.width - 130, -14, 135, this.btnQuitar.height + 18);
    this.txtEstado = this.add.text(CAT_X, VALIDACION_Y, '', {
      fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.ok, wordWrap: { width: 452 }, lineSpacing: 2,
    });
    this.txtValidacion = this.add.text(CAT_X, VALIDACION_Y, '', {
      fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.claro, wordWrap: { width: 452 }, lineSpacing: 2,
    });

    // Abajo a la izquierda (y BOTONES_Y, bajo el esquema): Regresar, Deshacer y Rehacer, en fila con 24 px entre botones.
    // Zonas de toque de 62 px de alto y 10 px de más a cada lado: no se tocan entre sí ni con Restablecer (x ≥ 467).
    const fila = [
      this.btnRegresar = boton(this, 0, BOTONES_Y, tr('← Regresar', '← Back'), () => this.regresar()),
      this.btnDeshacer = boton(this, 0, BOTONES_Y, tr('Deshacer', 'Undo'), () => this.deshacer()),
      this.btnRehacer = boton(this, 0, BOTONES_Y, tr('Rehacer', 'Redo'), () => this.rehacer()),
    ];
    let x = 18;
    for (const b of fila) {
      b.setFontSize(16).setOrigin(0, 0.5).setX(x);
      zonaToque(b, -10, (b.height - 62) / 2, b.width + 20, 62);
      x += b.width + 24;
    }

    // Botones de abajo (y BOTONES_Y): zona de 62 px de alto (y 452–514) y 12 px de más a cada lado; no toca la columna del catálogo.
    const btnRestablecer = boton(this, 560, BOTONES_Y, tr('Restablecer', 'Reset'), () => this.restablecer());
    zonaCentrada(btnRestablecer, btnRestablecer.width + 24, 62);
    this.btnContinuar = boton(this, 790, BOTONES_Y, tr('Probar el robot', 'Test the robot'), () => this.continuar());
    zonaCentrada(this.btnContinuar, this.btnContinuar.width + 24, 62);
    // Ayuda de teclado en 2 líneas a 16 px (antes nota() de ui.js a 12 px). "Valores de juego" va en la línea del
    // presupuesto y "cada eje lleva 2 ruedas" en el precio de las ruedas ("× 2") y al final de la validación.
    this.add.text(480, 499, tr(
      '←/→ ranura · ↑/↓ pieza · Enter equipar · Supr quitar · R restablecer\n'
        + 'C probar · P pintura · N nombre · Ctrl+Z deshacer · Ctrl+Y rehacer · Esc regresar',
      '←/→ slot · ↑/↓ part · Enter equip · Del remove · R reset\n'
        + 'C test · P paint · N name · Ctrl+Z undo · Ctrl+Y redo · Esc back',
    ), { fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.apagado, align: 'center' }).setOrigin(0.5, 0);

    const k = this.input.keyboard;
    // A veces Phaser entrega el mismo keydown nativo dos veces (dos updates del plugin antes de vaciar la cola): con P eso
    // saltaba una pintura y con Ctrl+Z deshacía dos pasos. Cada manejador atiende cada evento nativo una sola vez.
    const on = (nombre, fn) => {
      const vistos = new WeakSet();
      k.on(nombre, (ev) => {
        if (ev && typeof ev === 'object') { if (vistos.has(ev)) return; vistos.add(ev); }
        fn(ev);
      });
    };
    on('keydown-LEFT', () => this.elegirRanura(this.sel - 1));
    on('keydown-RIGHT', () => this.elegirRanura(this.sel + 1));
    on('keydown-UP', () => this.moverCursor(-1));
    on('keydown-DOWN', () => this.moverCursor(1));
    on('keydown-ENTER', () => this.equipar(this.cursor));
    on('keydown-SPACE', () => this.equipar(this.cursor));
    on('keydown-DELETE', () => this.quitar());
    on('keydown-BACKSPACE', () => this.quitar());
    on('keydown-R', (ev) => { if (!conModificador(ev)) this.restablecer(); });
    on('keydown-C', (ev) => { if (!conModificador(ev)) this.continuar(); });
    on('keydown-P', (ev) => { if (!conModificador(ev)) this.pintar(siguientePintura(this.mapa[CLAVE_PINTURA], ev.shiftKey ? -1 : 1)); });
    // preventDefault: si no, la propia "n" se escribe en el campo de texto que se enfoca durante este mismo keydown.
    on('keydown-N', (ev) => { if (!conModificador(ev)) { ev.preventDefault(); this.abrirNombre(); } });
    this.events.once('shutdown', () => this.cerrarNombre());
    on('keydown-ESC', () => this.regresar());
    // Ctrl+Z deshacer · Ctrl+Y o Ctrl+Shift+Z rehacer (Cmd en Mac).
    on('keydown', (ev) => {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
      const tecla = ev.key.toLowerCase();
      if (tecla === 'z' && !ev.shiftKey) this.deshacer();
      else if (tecla === 'y' || (tecla === 'z' && ev.shiftKey)) this.rehacer();
      else return;
      ev.preventDefault();
    });

    // Si se llegó con un cambio hecho afuera ("Aplicar y al taller"), se elige la ranura que cambió y se avisa que se puede deshacer.
    const aplicado = this.hist.puedeDeshacer ? this.hist.presente.cambio : null;
    this.elegirRanura(aplicado && aplicado.ranura ? ORDEN_RANURAS.indexOf(aplicado.ranura) : 0);
    if (aplicado) {
      const texto = aplicado.texto.charAt(0).toUpperCase() + aplicado.texto.slice(1);
      this.aviso = tr(`${texto}: Deshacer la revierte.`, `${texto}: Undo reverts it.`);
      this.refrescar();
    }
  }


  // ---------- esquema del robot ----------
  crearEsquema() {
    this.ranurasUI = {};
    const g = this.add.graphics();
    // Suspensión: ejes unidos al chasis (solo decorativo).
    g.lineStyle(3, BORDE, 1);
    const bajoChasis = ESQUEMA.chasis.y + ESQUEMA.chasis.h / 2;
    g.lineBetween(ESQUEMA.rueda_tras.x, bajoChasis, ESQUEMA.rueda_tras.x, ESQUEMA.rueda_tras.y);
    g.lineBetween(ESQUEMA.rueda_del.x, bajoChasis, ESQUEMA.rueda_del.x, ESQUEMA.rueda_del.y);
    for (const r of RANURAS) {
      const e = ESQUEMA[r.id];
      let forma;
      if (e.rueda) {
        forma = this.add.circle(e.x, e.y, 32, RELLENO).setStrokeStyle(2, BORDE);
      } else {
        forma = this.add.rectangle(e.x, e.y, e.w, e.h, RELLENO).setStrokeStyle(2, BORDE);
      }
      // Zona de toque un poco más grande que la caja, sin tocar a la vecina: ruedas +6 px por lado; motor, batería y carga
      // +2 px a los lados; módulo +3 arriba y abajo; chasis +8 arriba y abajo (hay hueco entre filas).
      const mas = e.rueda ? [6, 6] : r.id === 'chasis' ? [0, 8] : r.id === 'modulo' ? [2, 3] : [2, 0];
      zonaToque(forma, -mas[0], -mas[1], (e.rueda ? 64 : e.w) + 2 * mas[0], (e.rueda ? 64 : e.h) + 2 * mas[1]);
      forma.on('pointerdown', () => this.elegirRanura(RANURAS.indexOf(r)));
      // Ícono: × 2 dentro de la rueda; × 1 a la izquierda en las ranuras rectangulares.
      const img = e.rueda
        ? this.add.image(e.x, e.y, '__DEFAULT').setScale(2)
        : this.add.image(e.x - e.w / 2 + 14, e.y, '__DEFAULT');
      img.setVisible(false);
      const ty = e.rueda ? e.y + 34 : e.y;
      const txt = this.add.text(e.x, ty, '', {
        fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.texto, align: 'center', lineSpacing: -1,
        wordWrap: { width: e.rueda ? 170 : e.w - 8 },
      }).setOrigin(0.5, e.rueda ? 0 : 0.5);
      this.ranurasUI[r.id] = { forma, txt, img, e };
    }
  }

  refrescarEsquema() {
    RANURAS.forEach((r, i) => {
      const { forma, txt, img, e } = this.ranurasUI[r.id];
      const p = piezaPorId[this.mapa[r.id]];
      const elegida = i === this.sel;
      const falta = !p && r.obligatoria;
      forma.setStrokeStyle(elegida ? 3 : 2, elegida ? ACENTO : (falta ? 0xff6b6b : BORDE));
      if (e.rueda) forma.setRadius(p && p.radio_m ? Math.round(p.radio_m * 64) : 28);
      const clave = p ? this.icono(p.id) : null;
      if (clave) img.setTexture(clave);
      img.setVisible(Boolean(clave));
      if (!e.rueda) {
        // Con ícono, el texto se recorre a la derecha para no taparlo.
        txt.setX(clave ? e.x + 12 : e.x);
        txt.setWordWrapWidth(clave ? e.w - 32 : e.w - 8); // misma letra (TXT) con o sin ícono
      }
      const nombreRanura = e.etiqueta ? trDato(e, 'etiqueta') : trDato(r, 'nombre');
      const etiqueta = r.multiplicador > 1 ? `${nombreRanura} ×${r.multiplicador}` : nombreRanura;
      const vacio = r.obligatoria ? tr('(vacía)', '(empty)') : tr('(opcional)', '(optional)');
      txt.setText(`${etiqueta}\n${p ? trDato(p, 'nombre') : vacio}`);
      txt.setColor(falta ? C.error : (elegida ? C.acento : C.texto));
    });
  }

  // ---------- catálogo de la ranura elegida ----------
  opciones() { return piezasPara(RANURAS[this.sel].id, PIEZAS); }

  elegirRanura(i) {
    this.sel = (i + RANURAS.length) % RANURAS.length;
    const actual = this.mapa[RANURAS[this.sel].id];
    this.cursor = Math.max(0, this.opciones().findIndex((p) => p.id === actual));
    this.desde = 0;
    this.aviso = '';
    this.refrescar();
  }

  moverCursor(d) {
    const n = this.opciones().length;
    if (!n) return;
    this.cursor = (this.cursor + d + n) % n;
    this.refrescar();
  }

  /** Recorre el catálogo una pieza (▲ / ▼ o rueda del ratón); el cursor se queda dentro de lo visible. */
  desplazar(d) {
    const n = this.opciones().length;
    const desde = Math.max(0, Math.min(n - FILAS_VISIBLES, this.desde + d));
    if (desde === this.desde) return;
    this.desde = desde;
    this.cursor = Math.max(desde, Math.min(desde + FILAS_VISIBLES - 1, this.cursor));
    this.refrescarCatalogo();
  }

  equipar(i) {
    const p = this.opciones()[i];
    if (!p) return;
    const r = RANURAS[this.sel];
    this.mapa[r.id] = p.id;
    this.hist.registrar(this.mapa, { ranura: r.id, texto: `${trDato(r, 'nombre')} → ${trDato(p, 'nombre')}` });
    this.cursor = i;
    this.aviso = '';
    this.refrescar();
  }

  quitar() {
    const r = RANURAS[this.sel];
    delete this.mapa[r.id];
    this.hist.registrar(this.mapa, { ranura: r.id, texto: tr(`quitar ${trDato(r, 'nombre')}`, `remove ${trDato(r, 'nombre')}`) });
    this.aviso = '';
    this.refrescar();
  }

  restablecer() {
    // Vuelve a las piezas del robot mínimo; la pintura y el nombre (cosméticos) se quedan.
    const cosmetica = Object.fromEntries([CLAVE_PINTURA, CLAVE_NOMBRE].filter((c) => this.mapa[c]).map((c) => [c, this.mapa[c]]));
    this.mapa = { ...comoMapa(DISENO_POR_DEFECTO), ...cosmetica };
    this.hist.registrar(this.mapa, { ranura: null, texto: tr('restablecer', 'reset') });
    this.cursorEnPuesta();
    this.aviso = tr('Diseño restablecido al robot mínimo (ruedas estándar).', 'Design reset to the minimal robot (standard wheels).');
    this.refrescar();
  }

  /** Cursor del catálogo sobre la pieza puesta en la ranura elegida. */
  cursorEnPuesta() {
    const actual = this.mapa[RANURAS[this.sel].id];
    this.cursor = Math.max(0, this.opciones().findIndex((p) => p.id === actual));
  }

  // ---------- historial (Deshacer / Rehacer) ----------
  // Vuelve a un estado guardado y refresca todo (costo, masa, validación, esquema, catálogo) como un cambio a mano;
  // se elige la ranura que cambió para que se vea qué pasó.
  aplicarPaso(paso, es, en) {
    if (!paso) return;
    this.mapa = paso.estado;
    const r = paso.cambio && paso.cambio.ranura;
    if (r && ORDEN_RANURAS.includes(r)) this.sel = ORDEN_RANURAS.indexOf(r);
    this.cursorEnPuesta();
    this.aviso = paso.cambio && paso.cambio.texto ? tr(`${es}: ${paso.cambio.texto}`, `${en}: ${paso.cambio.texto}`) : '';
    this.refrescar();
  }

  deshacer() { this.aplicarPaso(this.hist.deshacer(), 'Deshecho', 'Undone'); }

  rehacer() { this.aplicarPaso(this.hist.rehacer(), 'Rehecho', 'Redone'); }

  refrescarHistorial() {
    for (const [b, activo] of [[this.btnDeshacer, this.hist.puedeDeshacer], [this.btnRehacer, this.hist.puedeRehacer]]) {
      b.setColor(activo ? C.acento : C.apagado).setAlpha(activo ? 1 : 0.6);
      if (b.input) b.input.cursor = activo ? 'pointer' : 'default';
    }
  }

  refrescarCatalogo() {
    const r = RANURAS[this.sel];
    this.txtCatalogo.setText(r.obligatoria
      ? tr(`${r.nombre} — elige pieza`, `${trDato(r, 'nombre')} — pick a part`)
      : tr(`${r.nombre} (opcional) — elige pieza`, `${trDato(r, 'nombre')} (optional) — pick a part`));
    this.lista.removeAll(true);
    // Ventana de FILAS_VISIBLES piezas que sigue al cursor (teclado) o a ▲ / ▼ (ratón y toque).
    const opciones = this.opciones();
    const n = opciones.length;
    if (this.cursor < this.desde) this.desde = this.cursor;
    if (this.cursor >= this.desde + FILAS_VISIBLES) this.desde = this.cursor - FILAS_VISIBLES + 1;
    this.desde = Math.max(0, Math.min(Math.max(0, n - FILAS_VISIBLES), this.desde));
    const pagina = n > FILAS_VISIBLES;
    if (pagina) {
      // Con paginador, el encabezado pierde "— elige pieza" para que quepan las flechas antes de [ Quitar ].
      this.txtCatalogo.setText(r.obligatoria ? trDato(r, 'nombre') : tr(`${r.nombre} (opcional)`, `${trDato(r, 'nombre')} (optional)`));
      let x = CAT_X + this.txtCatalogo.width + 18;
      this.pagArriba.setX(x).setAlpha(this.desde > 0 ? 1 : 0.35);
      x += this.pagArriba.width + 8;
      this.pagTexto.setX(x).setText(`${this.desde + 1}–${Math.min(n, this.desde + FILAS_VISIBLES)}/${n}`);
      x += this.pagTexto.width + 8;
      this.pagAbajo.setX(x).setAlpha(this.desde + FILAS_VISIBLES < n ? 1 : 0.35);
    }
    for (const o of [this.pagArriba, this.pagTexto, this.pagAbajo]) o.setVisible(pagina);
    // Si alguna pieza de la lista tiene ícono (32 px a × 2), el nombre y el precio se recorren para quedar alineados.
    const dx = opciones.some((p) => this.icono(p.id)) ? 40 : 0;
    opciones.slice(this.desde, this.desde + FILAS_VISIBLES).forEach((p, j) => {
      const i = this.desde + j;
      // Tres renglones por pieza: nombre · precio y masa · dato clave (todo a >= 16 px).
      const y = FILA_Y + j * FILA_PASO;
      const puesta = this.mapa[r.id] === p.id;
      const resaltada = i === this.cursor;
      const costo = costoEnRanura(r.id, p);
      const xN = r.multiplicador > 1 ? ` (${p.costo} × ${r.multiplicador})` : '';
      const clave = this.icono(p.id);
      const l1 = this.add.text(CAT_X + 6 + dx, y + 2, `${puesta ? '●' : '○'} ${trDato(p, 'nombre')}`, {
        fontFamily: FUENTE, fontSize: `${TXT_MEDIO}px`, color: puesta ? C.acento : C.texto,
      });
      const l2 = this.add.text(CAT_X + 6 + dx, y + 22, `${costo} cr${xN} · ${p.masa * r.multiplicador} kg`, {
        fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.claro,
      });
      const l3 = this.add.text(CAT_X + 6, y + 42, datoClave(p), {
        fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.suave, wordWrap: { width: 440 },
      });
      // Si el dato clave ocupa 2 líneas (p. ej. el panel solar, que es la única pieza de su ranura) la fila crece.
      const alto = Math.max(FILA_PASO - 4, l3.y + l3.height - y + 4);
      const fondo = this.add.rectangle(CAT_X + 227, y - 2 + alto / 2, 455, alto, resaltada ? 0x222844 : RELLENO)
        .setStrokeStyle(1, puesta ? ACENTO : BORDE)
        .on('pointerdown', () => this.equipar(i));
      zonaToque(fondo, 0, 0, 455, alto + 4); // toda la fila: sin huecos entre una pieza y la siguiente
      this.lista.add([fondo, l1, l2, l3]);
      if (clave) this.lista.add(this.add.image(CAT_X + 22, y + 20, clave).setScale(2));
    });
    this.btnQuitar.setVisible(Boolean(this.mapa[r.id]));
  }

  // ---------- presupuesto y validación ----------
  refrescar() {
    const diseno = comoDiseno(this.mapa);
    const res = resumen(diseno, PIEZAS, { masaCarga: MASA_CARGA_KG });
    const errores = validar(diseno, PIEZAS, this.presupuesto, { en: enIngles() });
    const restante = this.presupuesto - res.costo;
    this.txtPresupuesto.setText(tr(
      `Costo ${res.costo} / ${this.presupuesto} cr · Restante ${restante} · Masa ${res.masa} kg + carga ${MASA_CARGA_KG} kg (valores de juego)`,
      `Cost ${res.costo} / ${this.presupuesto} cr · Left ${restante} · Mass ${res.masa} kg + cargo ${MASA_CARGA_KG} kg (game values)`,
    ));
    this.txtPresupuesto.setColor(restante < 0 ? C.error : C.claro);

    // 1) Estado (✓ / ✗ con errores). Si los errores no caben en 2 líneas, se resumen con "(+N más)".
    const estado = (n) => (errores.length
      ? `✗ ${errores.slice(0, n).join(' · ')}${errores.length > n ? tr(` · (+${errores.length - n} más)`, ` · (+${errores.length - n} more)`) : ''}`
      : tr('✓ Diseño válido', '✓ Valid design'));
    let n = errores.length;
    this.txtEstado.setText(estado(n)).setColor(errores.length ? C.error : C.ok);
    while (n > 1 && this.txtEstado.height > 42) { n -= 1; this.txtEstado.setText(estado(n)); }

    // 2) Aviso y resumen debajo; si no caben antes de los botones, se quitan líneas de resumen desde el final.
    const a = res.agarre;
    const lineas = [
      ...(this.aviso ? [this.aviso] : []),
      ...(res.ejes_distintos
        ? [[this.mapa.rueda_del, this.mapa.rueda_tras].includes('rueda_ancha')
          ? tr('Ejes distintos: con las dos anchas es más seguro.', 'Mixed axles: two wide axles are safer.')
          : tr('Ejes distintos: con las dos ruedas iguales es más seguro.', 'Mixed axles: matching wheels on both are safer.')]
        : []),
      // Mismos datos que antes, en renglones cortos para 16 px; si no caben antes de los botones, se quitan desde el final.
      // El agarre que muestra el taller es el de la PIEZA (promedio de ejes); en la física se multiplica por el del suelo.
      tr(
        `Agarre ejes: arena ${f2(a.arena)} · roca ${f2(a.roca)} · comp. ${f2(a.compacto)}`,
        `Axle grip: sand ${f2(a.arena)} · rock ${f2(a.roca)} · compact ${f2(a.compacto)}`,
      ),
      ...this.lineasDestino(res), // efecto del módulo en el destino: segunda línea, para que no se pierda
      tr(
        `Autonomía ≈ ${res.autonomia_s != null ? Math.round(res.autonomia_s) + ' s a fondo' : '—'}, con carga (P)`,
        `Battery ≈ ${res.autonomia_s != null ? Math.round(res.autonomia_s) + ' s at full power' : '—'}, loaded (P)`,
      ),
      tr(
        `Protección de carga ${res.proteccion != null ? Math.round(res.proteccion * 100) + ' %' : '—'} · Resistencia ${res.resistencia ?? '—'}`,
        `Cargo protection ${res.proteccion != null ? Math.round(res.proteccion * 100) + ' %' : '—'} · Durability ${res.resistencia ?? '—'}`,
      ),
      tr(
        `Fuerza/masa ${res.fuerza_por_masa != null ? res.fuerza_por_masa.toFixed(2) : '—'}`,
        `Force/mass ${res.fuerza_por_masa != null ? res.fuerza_por_masa.toFixed(2) : '—'}`,
      ),
      tr('En la prueba: agarre² × agarre del suelo (P)', 'In the test: grip² × soil grip (P)'), // fisica/robot.js: friccionDeAgarre = agarre²
      tr('Cada eje lleva 2 ruedas (2 × costo y masa)', 'Each axle takes 2 wheels (2 × cost and mass)'),
    ];
    this.txtValidacion.setY(VALIDACION_Y + this.txtEstado.height + 4);
    this.txtValidacion.setText(lineas.join('\n'));
    while (lineas.length && this.txtValidacion.y + this.txtValidacion.height > VALIDACION_MAX_Y) {
      lineas.pop();
      this.txtValidacion.setText(lineas.join('\n'));
    }
    this.btnContinuar.setColor(errores.length ? C.apagado : C.acento);
    this.refrescarHistorial();
    this.refrescarPersonalizacion();

    this.refrescarEsquema();
    this.refrescarCatalogo();
  }

  /**
   * Qué le hace el destino a ESTE diseño (mismas reglas que la física, fisica/ambiente.js): batería útil por el frío,
   * potencia del motor al llegar al límite de temperatura y recarga del panel. Así el módulo elegido se nota aquí.
   */
  lineasDestino(res) {
    const destino = DESTINOS[partida.destino];
    const amb = destino ? ambienteDeDestino(destino.id, destino.mundo) : null;
    const e = efectosEn(res, amb);
    if (!e) return [];
    // Un solo renglón (≤ 47 caracteres a 16 px). Con módulo, solo su efecto contra "sin él"; sin módulo, batería y motor.
    // "motor caliente" = potencia que conserva el motor al llegar a 100 °C (fisica/ambiente.js, regla b).
    const sinEl = (v) => tr(` (sin él ${pct(v)})`, ` (without it ${pct(v)})`);
    const bat = tr(`batería ${pct(e.bateria)}`, `battery ${pct(e.bateria)}`);
    const mot = tr(`motor caliente ${pct(e.potencia_caliente)}`, `hot motor ${pct(e.potencia_caliente)}`);
    let texto;
    if (res.radiador) texto = mot + sinEl(e.potencia_caliente_sin_modulo);
    else if (res.aislamiento) texto = bat + sinEl(e.bateria_sin_modulo);
    else if (e.recarga_s) texto = `panel +${e.recarga_s.toFixed(2)}/s · ${bat}`;
    else texto = `${bat} · ${mot}`;
    return [`${MUNDO()[destino.mundo] ?? destino.mundo} (P): ${texto}`];
  }

  // ---------- personalización (cosmética: no cambia la física) ----------
  crearPersonalizacion() {
    const etiqueta = this.add.text(PERS_X, PERS_Y1, tr('Pintura', 'Paint'), { fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.claro }).setOrigin(0, 0.5);
    const x0 = PERS_X + etiqueta.width + 22;
    this.muestras = PINTURAS.map((pint, i) => {
      const cuadro = this.add.rectangle(x0 + i * 30, PERS_Y1, 22, 22, pint.muestra).setStrokeStyle(2, BORDE);
      // Zona de 30 × 30 (sin huecos entre muestras; no toca la fila del nombre, que empieza en y 143).
      zonaToque(cuadro, -4, -4, 30, 30);
      cuadro.on('pointerdown', () => this.pintar(pint.id));
      return { pint, cuadro };
    });
    this.txtNombre = this.add.text(PERS_X, PERS_Y2, '', { fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.texto }).setOrigin(0, 0.5);
    this.btnNombre = this.add.text(0, PERS_Y2, tr('[ Nombre ]', '[ Name ]'), { fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.acento })
      .setOrigin(0, 0.5).on('pointerdown', () => this.abrirNombre());
    // Zona y 144–172: no toca las muestras (hasta y 143) ni la fila del motor (desde y 173).
    zonaToque(this.btnNombre, -8, (this.btnNombre.height - 28) / 2, this.btnNombre.width + 16, 28);
  }

  refrescarPersonalizacion() {
    const pintura = pinturaPorId(this.mapa[CLAVE_PINTURA]);
    const nombre = this.mapa[CLAVE_NOMBRE] || null;
    // Copia en la partida y en el navegador (la usan la prueba y la misión: fisica/aspecto.js).
    fijarPersonalizacion(partida, { pintura: pintura.id, nombre });
    for (const { pint, cuadro } of this.muestras) {
      const elegida = pint.id === pintura.id;
      cuadro.setStrokeStyle(elegida ? 3 : 2, elegida ? ACENTO : BORDE).setScale(elegida ? 1.15 : 1);
    }
    this.txtNombre.setText(nombre ? `«${nombre}»` : tr('(sin nombre)', '(no name)')).setColor(nombre ? C.texto : C.apagado);
    this.btnNombre.setX(PERS_X + this.txtNombre.width + 12);
    // Vista previa en el esquema: el chasis toma la pintura (solo color, como en la prueba).
    const base = pintura.id === PINTURAS[0].id;
    this.ranurasUI?.chasis?.forma.setFillStyle(base ? RELLENO : pintura.figura, base ? 1 : 0.35);
  }

  pintar(id) {
    if (!id || this.mapa[CLAVE_PINTURA] === id) return;
    this.mapa[CLAVE_PINTURA] = id;
    const p = pinturaPorId(id);
    this.hist.registrar(this.mapa, { ranura: CLAVE_PINTURA, texto: tr(`pintura → ${p.nombre}`, `paint → ${p.nombre_en}`) });
    this.aviso = '';
    this.refrescar();
  }

  renombrar(texto) {
    const nombre = normalizarNombre(texto);
    if ((this.mapa[CLAVE_NOMBRE] || null) === nombre) return;
    if (nombre) this.mapa[CLAVE_NOMBRE] = nombre;
    else delete this.mapa[CLAVE_NOMBRE];
    this.hist.registrar(this.mapa, { ranura: CLAVE_NOMBRE, texto: nombre ? tr(`nombre → ${nombre}`, `name → ${nombre}`) : tr('sin nombre', 'no name') });
    this.aviso = '';
    this.refrescar();
  }

  /** Diálogo HTML para escribir el nombre (Phaser no tiene campo de texto). Enter guarda, Esc cancela; funciona al tacto. */
  abrirNombre() {
    if (this.dialogo || typeof document === 'undefined') return;
    const kb = this.input.keyboard;
    kb.enabled = false; // las teclas del taller (R, C, P, N…) no deben dispararse mientras se escribe
    kb.disableGlobalCapture(); // otras escenas capturan teclas (espacio, flechas): aquí deben llegar al campo de texto
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
    const btn = (texto, tipo, fondo) => {
      const b = document.createElement('button');
      b.type = tipo;
      b.textContent = texto;
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

  continuar() {
    const diseno = comoDiseno(this.mapa);
    const errores = validar(diseno, PIEZAS, this.presupuesto, { en: enIngles() });
    if (errores.length) {
      this.aviso = tr('Corrige el diseño antes de probarlo.', 'Fix the design before testing it.');
      this.refrescar();
      this.cameras.main.shake(120, 0.004);
      return;
    }
    this.salir(diseno, 'Prueba');
  }

  /** Vuelve al expediente del sitio sin probar; el diseño (aunque aún no sea válido) se conserva en partida.diseno. */
  regresar() {
    this.salir(comoDiseno(this.mapa), 'Expediente');
  }

  salir(diseno, destino) {
    if (this.cameras.main.fadeEffect.isRunning) return; // ya está saliendo (irA ignora la segunda transición)
    partida.diseno = diseno;
    memoria = { clave: partida.resultados, mapa: { ...this.mapa } }; // con la pintura y el nombre (ver create)
    irA(this, destino);
  }
}
