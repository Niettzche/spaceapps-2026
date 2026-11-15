import Phaser from 'phaser';
import { boton, irA } from './ui.js';
import { PIEZAS, DESTINOS } from '../data.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { partida } from '../main.js';
import {
  RANURAS, DISENO_POR_DEFECTO, piezasPara, costoEnRanura, comoMapa, comoDiseno, resumen, validar,
} from './Taller/diseno.js';
import { historialAlEntrar, diferencias } from './Taller/historial.js';
import { MASA_CARGA_KG } from '../fisica/diseno.js'; // la carga que se entrega (frente juego)
import { tr, trDato, enIngles } from '../i18n.js';

// Dueño: frente taller. Armado con ranuras fijas, presupuesto visible, validación del diseño.
// Contrato con el frente juego: partida.diseno = [{ ranura, pieza }] (docs/juego/ESPECIFICACION.md §3).
// Interfaz provisional en texto; el frente de arte reemplaza los rectángulos por sprites.

const C = {
  texto: '#ffffff', suave: '#9aa4c7', claro: '#cfd6ff', acento: '#ffd166', apagado: '#6c7393',
  error: '#ff6b6b', ok: '#6ee7a8',
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

const piezaPorId = Object.fromEntries(PIEZAS.map((p) => [p.id, p]));
const ORDEN_RANURAS = RANURAS.map((r) => r.id);
const ranuraPorId = Object.fromEntries(RANURAS.map((r) => [r.id, r]));
const nombreRanura = (id) => (ranuraPorId[id] ? trDato(ranuraPorId[id], 'nombre') : id);

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
  if (p.id === 'panel_solar') return tr('recarga con la luz del sitio (rasante en el polo lunar, menor en Marte)', 'recharges with the site\'s sunlight (grazing at the lunar pole, weaker on Mars)');
  return '';
}
const conModificador = (ev) => Boolean(ev && (ev.ctrlKey || ev.metaKey || ev.altKey));
function f2(v) { return typeof v === 'number' ? v.toFixed(2) : '—'; }

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
    this.presupuesto = partida.presupuesto ?? PRESUPUESTO_INICIAL;
    // Al volver de una prueba se conserva el diseño; la primera vez arranca con el robot mínimo (ruedas estándar).
    const entrada = comoMapa(partida.diseno);
    const vacia = !Object.keys(entrada).length;
    this.hist = historialAlEntrar(vacia ? null : memoria, vacia ? comoMapa(DISENO_POR_DEFECTO) : entrada, partida.resultados,
      (antes, despues) => {
        const ranuras = diferencias(antes, despues, ORDEN_RANURAS);
        const lista = ranuras.map(nombreRanura).join(', ');
        return { ranura: ranuras[0] ?? null, texto: tr(`recomendación aplicada (${lista})`, `applied recommendation (${lista})`) };
      });
    this.mapa = this.hist.actual;
    this.sel = 0;      // índice de la ranura seleccionada en RANURAS
    this.cursor = 0;   // índice de la pieza resaltada en el catálogo
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

    this.crearEsquema();
    this.add.text(245, ESQUEMA.rueda_tras.y, tr('avance →', 'forward →'), { fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.apagado }).setOrigin(0.5);

    this.txtCatalogo = this.add.text(CAT_X, CAT_Y, '', { fontFamily: FUENTE, fontSize: `${TXT_MEDIO}px`, color: C.texto }).setOrigin(0, 0.5);
    this.lista = this.add.container(0, 0);
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
        + 'C probar · Ctrl+Z deshacer · Ctrl+Y rehacer · Esc regresar',
      '←/→ slot · ↑/↓ part · Enter equip · Del remove · R reset\n'
        + 'C test · Ctrl+Z undo · Ctrl+Y redo · Esc back',
    ), { fontFamily: FUENTE, fontSize: `${TXT}px`, color: C.apagado, align: 'center' }).setOrigin(0.5, 0);

    const k = this.input.keyboard;
    k.on('keydown-LEFT', () => this.elegirRanura(this.sel - 1));
    k.on('keydown-RIGHT', () => this.elegirRanura(this.sel + 1));
    k.on('keydown-UP', () => this.moverCursor(-1));
    k.on('keydown-DOWN', () => this.moverCursor(1));
    k.on('keydown-ENTER', () => this.equipar(this.cursor));
    k.on('keydown-SPACE', () => this.equipar(this.cursor));
    k.on('keydown-DELETE', () => this.quitar());
    k.on('keydown-BACKSPACE', () => this.quitar());
    k.on('keydown-R', (ev) => { if (!conModificador(ev)) this.restablecer(); });
    k.on('keydown-C', (ev) => { if (!conModificador(ev)) this.continuar(); });
    k.on('keydown-ESC', () => this.regresar());
    // Ctrl+Z deshacer · Ctrl+Y o Ctrl+Shift+Z rehacer (Cmd en Mac).
    k.on('keydown', (ev) => {
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
    this.aviso = '';
    this.refrescar();
  }

  moverCursor(d) {
    const n = this.opciones().length;
    if (!n) return;
    this.cursor = (this.cursor + d + n) % n;
    this.refrescar();
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
    this.mapa = comoMapa(DISENO_POR_DEFECTO);
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
    // Si alguna pieza de la lista tiene ícono (32 px a × 2), el nombre y el precio se recorren para quedar alineados.
    const dx = this.opciones().some((p) => this.icono(p.id)) ? 40 : 0;
    this.opciones().forEach((p, i) => {
      // Tres renglones por pieza: nombre · precio y masa · dato clave (todo a >= 16 px).
      const y = FILA_Y + i * FILA_PASO;
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

    this.refrescarEsquema();
    this.refrescarCatalogo();
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
    memoria = { clave: partida.resultados, mapa: comoMapa(diseno) };
    irA(this, destino);
  }
}
