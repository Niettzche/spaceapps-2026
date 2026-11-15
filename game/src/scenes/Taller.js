import Phaser from 'phaser';
import { titulo, boton, nota, irA } from './ui.js';
import { PIEZAS, DESTINOS } from '../data.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { partida } from '../main.js';
import {
  RANURAS, DISENO_POR_DEFECTO, piezasPara, costoEnRanura, comoMapa, comoDiseno, resumen, validar,
} from './Taller/diseno.js';
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

// Posición de cada ranura en el esquema lateral (el robot avanza hacia la derecha).
const ESQUEMA = {
  modulo: { x: 365, y: 192, w: 120, h: 48 },
  // Fila de arriba un poco más alta (60) para que quepan ícono + 3–4 líneas de texto sin salirse de la caja.
  motor: { x: 115, y: 250, w: 120, h: 60 },
  bateria: { x: 240, y: 250, w: 120, h: 60 },
  carga: { x: 365, y: 250, w: 120, h: 60, etiqueta: 'Carga', etiqueta_en: 'Cargo' }, // "Soporte de carga" + nombre de la pieza no cabe con ícono
  chasis: { x: 240, y: 318, w: 370, h: 52 },
  rueda_tras: { x: 115, y: 392, rueda: true },
  rueda_del: { x: 365, y: 392, rueda: true },
};

const piezaPorId = Object.fromEntries(PIEZAS.map((p) => [p.id, p]));

// Íconos 16 × 16 de las piezas (frente arte): assets/iconos/<id_de_pieza>.png.
// Clave de textura = ruta sin extensión ("iconos/rueda_ancha"), la misma que usa el Boot al precargar /assets.
// Si un ícono no existe, la pieza se muestra solo con texto.
const ICONOS = import.meta.glob('../../../assets/iconos/*.png', { eager: true, query: '?url', import: 'default' });
const URL_ICONO = Object.fromEntries(Object.entries(ICONOS).map(([ruta, url]) => [ruta.split('/').pop().replace(/\.png$/, ''), url]));
const claveIcono = (id) => `iconos/${id}`;

// Columna derecha: la validación nunca baja de aquí (los botones están en y = 485).
const VALIDACION_Y = 352;
const VALIDACION_MAX_Y = 462;

// Nombre de superficie para mostrar (los datos usan arena/roca/compacto).
const SUPERFICIE_EN = { arena: 'sand', roca: 'rock', compacto: 'compact' };
const sup = (s) => tr(s, SUPERFICIE_EN[s] ?? s);

function datoClave(p) {
  if (p.agarre) {
    return tr(
      `agarre rueda  arena ${f2(p.agarre.arena)} · roca ${f2(p.agarre.roca)} · compacto ${f2(p.agarre.compacto)}`,
      `wheel grip  sand ${f2(p.agarre.arena)} · rock ${f2(p.agarre.roca)} · compact ${f2(p.agarre.compacto)}`,
    );
  }
  if (p.sistema === 'estructura') return tr(`resistencia ${p.resistencia}`, `durability ${p.resistencia}`);
  if (p.sistema === 'potencia') return tr(`fuerza ${p.fuerza} · consumo ${p.consumo}/s`, `force ${p.fuerza} · drain ${p.consumo}/s`);
  if (p.sistema === 'energia') return tr(`capacidad ${p.capacidad}`, `capacity ${p.capacidad}`);
  if (p.sistema === 'carga') return tr(`protección ${Math.round(p.proteccion * 100)} %`, `protection ${Math.round(p.proteccion * 100)} %`);
  if (p.id === 'panel_solar') return tr('sin efecto en el MVP (falta regla de iluminación)', 'no effect in the MVP (no lighting rule yet)');
  return '';
}
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
    this.mapa = comoMapa(partida.diseno && partida.diseno.length ? partida.diseno : DISENO_POR_DEFECTO);
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
    titulo(this, tr('Taller', 'Workshop'), sub);

    this.txtPresupuesto = this.add.text(480, 132, '', { fontFamily: FUENTE, fontSize: '16px', color: C.claro }).setOrigin(0.5);

    this.crearEsquema();
    this.add.text(240, 452, tr('avance →', 'forward →'), { fontFamily: FUENTE, fontSize: '11px', color: C.apagado }).setOrigin(0.5);

    this.txtCatalogo = this.add.text(480, 165, '', { fontFamily: FUENTE, fontSize: '14px', color: C.texto });
    this.lista = this.add.container(0, 0);
    this.btnQuitar = this.add.text(925, 167, tr('[ Quitar ]', '[ Remove ]'), { fontFamily: FUENTE, fontSize: '13px', color: C.acento })
      .setOrigin(1, 0).on('pointerdown', () => this.quitar());
    // Crece hacia arriba (y 124–187) y a la izquierda; abajo empieza la primera fila del catálogo (y 188).
    zonaToque(this.btnQuitar, this.btnQuitar.width - 130, -43, 135, 63);
    this.txtEstado = this.add.text(480, VALIDACION_Y, '', {
      fontFamily: FUENTE, fontSize: '12px', color: C.ok, wordWrap: { width: 445 }, lineSpacing: 2,
    });
    this.txtValidacion = this.add.text(480, VALIDACION_Y, '', {
      fontFamily: FUENTE, fontSize: '12px', color: C.claro, wordWrap: { width: 445 }, lineSpacing: 2,
    });

    // Botones de abajo (y 485): zona de 62 px de alto (y 454–516) y 12 px de más a cada lado; no toca la columna del catálogo.
    const btnRestablecer = boton(this, 560, 485, tr('Restablecer', 'Reset'), () => this.restablecer());
    zonaCentrada(btnRestablecer, btnRestablecer.width + 24, 62);
    this.btnContinuar = boton(this, 790, 485, tr('Probar el robot', 'Test the robot'), () => this.continuar());
    zonaCentrada(this.btnContinuar, this.btnContinuar.width + 24, 62);
    nota(this, tr(
      'Teclado: ←/→ ranura · ↑/↓ pieza · Enter equipar · Supr quitar · R restablecer · C continuar. '
        + 'Ruedas: cada eje lleva 2 (cobra 2 × costo y masa). Precios y estadísticas = valores de juego.',
      'Keys: ←/→ slot · ↑/↓ part · Enter equip · Del remove · R reset · C continue. '
        + 'Wheels: each axle takes 2 (2 × cost and mass). Prices and stats = game values.',
    ));

    const k = this.input.keyboard;
    k.on('keydown-LEFT', () => this.elegirRanura(this.sel - 1));
    k.on('keydown-RIGHT', () => this.elegirRanura(this.sel + 1));
    k.on('keydown-UP', () => this.moverCursor(-1));
    k.on('keydown-DOWN', () => this.moverCursor(1));
    k.on('keydown-ENTER', () => this.equipar(this.cursor));
    k.on('keydown-SPACE', () => this.equipar(this.cursor));
    k.on('keydown-DELETE', () => this.quitar());
    k.on('keydown-BACKSPACE', () => this.quitar());
    k.on('keydown-R', () => this.restablecer());
    k.on('keydown-C', () => this.continuar());

    this.elegirRanura(0);
  }


  // ---------- esquema del robot ----------
  crearEsquema() {
    this.ranurasUI = {};
    const g = this.add.graphics();
    // Suspensión: ejes unidos al chasis (solo decorativo).
    g.lineStyle(3, BORDE, 1);
    g.lineBetween(115, 344, 115, 392);
    g.lineBetween(365, 344, 365, 392);
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
      const ty = e.rueda ? e.y + 38 : e.y;
      const txt = this.add.text(e.x, ty, '', {
        fontFamily: FUENTE, fontSize: '11px', color: C.texto, align: 'center',
        wordWrap: { width: e.rueda ? 150 : e.w - 8 },
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
        txt.setWordWrapWidth(clave ? e.w - 32 : e.w - 8);
        txt.setFontSize(clave ? 10 : 11); // con ícono queda menos ancho: letra un punto más chica
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
    this.mapa[RANURAS[this.sel].id] = p.id;
    this.cursor = i;
    this.aviso = '';
    this.refrescar();
  }

  quitar() {
    delete this.mapa[RANURAS[this.sel].id];
    this.aviso = '';
    this.refrescar();
  }

  restablecer() {
    this.mapa = comoMapa(DISENO_POR_DEFECTO);
    const actual = this.mapa[RANURAS[this.sel].id];
    this.cursor = Math.max(0, this.opciones().findIndex((p) => p.id === actual));
    this.aviso = tr('Diseño restablecido al robot mínimo (ruedas estándar).', 'Design reset to the minimal robot (standard wheels).');
    this.refrescar();
  }

  refrescarCatalogo() {
    const r = RANURAS[this.sel];
    this.txtCatalogo.setText(r.obligatoria
      ? tr(`${r.nombre} — elige pieza`, `${trDato(r, 'nombre')} — pick a part`)
      : tr(`${r.nombre} (opcional) — elige pieza`, `${trDato(r, 'nombre')} (optional) — pick a part`));
    this.lista.removeAll(true);
    // Si alguna pieza de la lista tiene ícono (32 px a × 2), todas las filas recorren el texto para quedar alineadas.
    const dx = this.opciones().some((p) => this.icono(p.id)) ? 40 : 0;
    this.opciones().forEach((p, i) => {
      const y = 195 + i * 52;
      const puesta = this.mapa[r.id] === p.id;
      const resaltada = i === this.cursor;
      const costo = costoEnRanura(r.id, p);
      const xN = r.multiplicador > 1 ? ` (${p.costo} × ${r.multiplicador})` : '';
      const clave = this.icono(p.id);
      const fondo = this.add.rectangle(700, y + 16, 450, 46, resaltada ? 0x222844 : RELLENO)
        .setStrokeStyle(1, puesta ? ACENTO : BORDE)
        .on('pointerdown', () => this.equipar(i));
      zonaToque(fondo, 0, -3, 450, 52); // toda la fila (52 px de paso): sin huecos entre una pieza y la siguiente
      const l1 = this.add.text(485 + dx, y, `${puesta ? '●' : '○'} ${trDato(p, 'nombre')}`, {
        fontFamily: FUENTE, fontSize: '13px', color: puesta ? C.acento : C.texto,
      });
      const l2 = this.add.text(915, y, `${costo} cr${xN} · ${p.masa * r.multiplicador} kg`, {
        fontFamily: FUENTE, fontSize: '12px', color: C.claro,
      }).setOrigin(1, 0);
      const l3 = this.add.text(497 + dx, y + 19, datoClave(p), { fontFamily: FUENTE, fontSize: '11px', color: C.suave });
      this.lista.add([fondo, l1, l2, l3]);
      if (clave) this.lista.add(this.add.image(501, y + 16, clave).setScale(2));
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
      `Costo ${res.costo} / ${this.presupuesto} créditos · Restante ${restante} · Masa ${res.masa} kg + carga ${MASA_CARGA_KG} kg`,
      `Cost ${res.costo} / ${this.presupuesto} credits · Left ${restante} · Mass ${res.masa} kg + cargo ${MASA_CARGA_KG} kg`,
    ));
    this.txtPresupuesto.setColor(restante < 0 ? C.error : C.claro);

    // 1) Estado (✓ / ✗ con errores). Si los errores no caben en 2 líneas, se resumen con "(+N más)".
    const estado = (n) => (errores.length
      ? `✗ ${errores.slice(0, n).join(' · ')}${errores.length > n ? tr(` · (+${errores.length - n} más)`, ` · (+${errores.length - n} more)`) : ''}`
      : tr('✓ Diseño válido', '✓ Valid design'));
    let n = errores.length;
    this.txtEstado.setText(estado(n)).setColor(errores.length ? C.error : C.ok);
    while (n > 1 && this.txtEstado.height > 32) { n -= 1; this.txtEstado.setText(estado(n)); }

    // 2) Aviso y resumen debajo; si no caben antes de los botones, se quitan líneas de resumen desde el final.
    const a = res.agarre;
    const lineas = [
      ...(this.aviso ? [this.aviso] : []),
      ...(res.ejes_distintos
        ? [[this.mapa.rueda_del, this.mapa.rueda_tras].includes('rueda_ancha')
          ? tr('Ejes distintos: con las dos anchas es más seguro.', 'Mixed axles: two wide axles are safer.')
          : tr('Ejes distintos: con las dos ruedas iguales es más seguro.', 'Mixed axles: matching wheels on both are safer.')]
        : []),
      // El agarre que muestra el taller es el de la PIEZA; en la física se multiplica por el del suelo (fisica/suelos.js).
      tr(
        `Agarre rueda (prom. ejes): arena ${f2(a.arena)} · roca ${f2(a.roca)} · compacto ${f2(a.compacto)}`,
        `Wheel grip (axle avg.): sand ${f2(a.arena)} · rock ${f2(a.roca)} · compact ${f2(a.compacto)}`,
      ),
      tr('En la prueba: agarre² × agarre del suelo (P)', 'In the test: grip² × soil grip (P)'), // fisica/robot.js: friccionDeAgarre = agarre²
      tr(
        `Resistencia ${res.resistencia ?? '—'} · Protección de carga ${res.proteccion != null ? Math.round(res.proteccion * 100) + ' %' : '—'}`,
        `Durability ${res.resistencia ?? '—'} · Cargo protection ${res.proteccion != null ? Math.round(res.proteccion * 100) + ' %' : '—'}`,
      ),
      tr(
        `Fuerza/masa ${res.fuerza_por_masa != null ? res.fuerza_por_masa.toFixed(2) : '—'} · `
          + `Autonomía ≈ ${res.autonomia_s != null ? Math.round(res.autonomia_s) + ' s a fondo' : '—'} con carga (P)`,
        `Force/mass ${res.fuerza_por_masa != null ? res.fuerza_por_masa.toFixed(2) : '—'} · `
          + `Battery ≈ ${res.autonomia_s != null ? Math.round(res.autonomia_s) + ' s at full power' : '—'}, loaded (P)`,
      ),
    ];
    this.txtValidacion.setY(VALIDACION_Y + this.txtEstado.height + 4);
    this.txtValidacion.setText(lineas.join('\n'));
    while (lineas.length && this.txtValidacion.y + this.txtValidacion.height > VALIDACION_MAX_Y) {
      lineas.pop();
      this.txtValidacion.setText(lineas.join('\n'));
    }
    this.btnContinuar.setColor(errores.length ? C.apagado : C.acento);

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
    partida.diseno = diseno;
    irA(this, 'Prueba');
  }
}
