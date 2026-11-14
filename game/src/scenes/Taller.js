import Phaser from 'phaser';
import * as ui from './ui.js';
import { PIEZAS, DESTINOS } from '../data.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { partida } from '../main.js';
import {
  RANURAS, DISENO_POR_DEFECTO, piezasPara, costoEnRanura, comoMapa, comoDiseno, resumen, validar,
} from './Taller/diseno.js';

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
  motor: { x: 115, y: 250, w: 120, h: 52 },
  bateria: { x: 240, y: 250, w: 120, h: 52 },
  carga: { x: 365, y: 250, w: 120, h: 52 },
  chasis: { x: 240, y: 318, w: 370, h: 52 },
  rueda_tras: { x: 115, y: 392, rueda: true },
  rueda_del: { x: 365, y: 392, rueda: true },
};

const piezaPorId = Object.fromEntries(PIEZAS.map((p) => [p.id, p]));

function datoClave(p) {
  if (p.agarre) return `agarre  arena ${f2(p.agarre.arena)} · roca ${f2(p.agarre.roca)} · compacto ${f2(p.agarre.compacto)}`;
  if (p.sistema === 'estructura') return `resistencia ${p.resistencia}`;
  if (p.sistema === 'potencia') return `fuerza ${p.fuerza} · consumo ${p.consumo}/s`;
  if (p.sistema === 'energia') return `capacidad ${p.capacidad}`;
  if (p.sistema === 'carga') return `protección ${Math.round(p.proteccion * 100)} %`;
  if (p.id === 'panel_solar') return 'sin efecto en el MVP (falta regla de iluminación)';
  return '';
}
function f2(v) { return typeof v === 'number' ? v.toFixed(2) : '—'; }

export default class Taller extends Phaser.Scene {
  constructor() { super('Taller'); }

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
      ? [...new Set(sitio.nivel.superficies.map((s) => s.tipo))].join(', ') : null;
    const sub = [
      `Destino: ${destino ? destino.nombre : partida.destino}`,
      sitio ? `Prueba en: ${sitio.nombre}` : null,
      tipos ? `superficies: ${tipos}` : (sitio && sitio.prueba_util ? `prueba útil: ${sitio.prueba_util}` : null),
    ].filter(Boolean).join(' · ');
    ui.titulo(this, 'Taller', sub);

    this.txtPresupuesto = this.add.text(480, 132, '', { fontFamily: FUENTE, fontSize: '16px', color: C.claro }).setOrigin(0.5);

    this.crearEsquema();
    this.add.text(240, 452, 'avance →', { fontFamily: FUENTE, fontSize: '11px', color: C.apagado }).setOrigin(0.5);

    this.txtCatalogo = this.add.text(480, 165, '', { fontFamily: FUENTE, fontSize: '14px', color: C.texto });
    this.lista = this.add.container(0, 0);
    this.btnQuitar = ui.boton(this, 600, 362, 'Quitar pieza', () => this.quitar());
    this.txtValidacion = this.add.text(480, 385, '', {
      fontFamily: FUENTE, fontSize: '12px', color: C.claro, wordWrap: { width: 450 }, lineSpacing: 2,
    });

    ui.boton(this, 560, 485, 'Restablecer', () => this.restablecer());
    this.btnContinuar = ui.boton(this, 790, 485, 'Probar el robot', () => this.continuar());
    ui.nota(this, 'Teclado: ←/→ ranura · ↑/↓ pieza · Enter equipar · Supr quitar · R restablecer · C continuar. '
      + 'Ruedas: cada eje lleva 2 (cobra 2 × costo y masa). Precios y estadísticas = valores de juego.');

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
      forma.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.elegirRanura(RANURAS.indexOf(r)));
      const ty = e.rueda ? e.y + 38 : e.y;
      const txt = this.add.text(e.x, ty, '', {
        fontFamily: FUENTE, fontSize: '11px', color: C.texto, align: 'center',
        wordWrap: { width: e.rueda ? 150 : e.w - 8 },
      }).setOrigin(0.5, e.rueda ? 0 : 0.5);
      this.ranurasUI[r.id] = { forma, txt, e };
    }
  }

  refrescarEsquema() {
    RANURAS.forEach((r, i) => {
      const { forma, txt, e } = this.ranurasUI[r.id];
      const p = piezaPorId[this.mapa[r.id]];
      const elegida = i === this.sel;
      const falta = !p && r.obligatoria;
      forma.setStrokeStyle(elegida ? 3 : 2, elegida ? ACENTO : (falta ? 0xff6b6b : BORDE));
      if (e.rueda) forma.setRadius(p && p.radio_m ? Math.round(p.radio_m * 64) : 28);
      const etiqueta = r.multiplicador > 1 ? `${r.nombre} ×${r.multiplicador}` : r.nombre;
      const vacio = r.obligatoria ? '(vacía)' : '(opcional)';
      txt.setText(`${etiqueta}\n${p ? p.nombre : vacio}`);
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
    this.aviso = 'Diseño restablecido al robot mínimo (ruedas estándar).';
    this.refrescar();
  }

  refrescarCatalogo() {
    const r = RANURAS[this.sel];
    this.txtCatalogo.setText(`${r.nombre}${r.obligatoria ? '' : ' (opcional)'} — elige pieza`);
    this.lista.removeAll(true);
    this.opciones().forEach((p, i) => {
      const y = 195 + i * 52;
      const puesta = this.mapa[r.id] === p.id;
      const resaltada = i === this.cursor;
      const costo = costoEnRanura(r.id, p);
      const xN = r.multiplicador > 1 ? ` (${p.costo} × ${r.multiplicador})` : '';
      const fondo = this.add.rectangle(700, y + 16, 450, 46, resaltada ? 0x222844 : RELLENO)
        .setStrokeStyle(1, puesta ? ACENTO : BORDE)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.equipar(i));
      const l1 = this.add.text(485, y, `${puesta ? '●' : '○'} ${p.nombre}`, {
        fontFamily: FUENTE, fontSize: '13px', color: puesta ? C.acento : C.texto,
      });
      const l2 = this.add.text(915, y, `${costo} cr${xN} · ${p.masa * r.multiplicador} kg`, {
        fontFamily: FUENTE, fontSize: '12px', color: C.claro,
      }).setOrigin(1, 0);
      const l3 = this.add.text(497, y + 19, datoClave(p), { fontFamily: FUENTE, fontSize: '11px', color: C.suave });
      this.lista.add([fondo, l1, l2, l3]);
    });
    this.btnQuitar.setVisible(Boolean(this.mapa[r.id]));
  }

  // ---------- presupuesto y validación ----------
  refrescar() {
    const diseno = comoDiseno(this.mapa);
    const res = resumen(diseno, PIEZAS);
    const errores = validar(diseno, PIEZAS, this.presupuesto);
    const restante = this.presupuesto - res.costo;
    this.txtPresupuesto.setText(`Costo ${res.costo} / ${this.presupuesto} créditos · Restante ${restante} · Masa ${res.masa} kg`);
    this.txtPresupuesto.setColor(restante < 0 ? C.error : C.claro);

    const a = res.agarre;
    const lineas = [];
    lineas.push(errores.length ? `✗ ${errores.join(' · ')}` : '✓ Diseño válido');
    lineas.push(
      `Agarre (peor eje): arena ${f2(a.arena)} · roca ${f2(a.roca)} · compacto ${f2(a.compacto)}`,
      `Resistencia ${res.resistencia ?? '—'} · Protección de carga ${res.proteccion != null ? Math.round(res.proteccion * 100) + ' %' : '—'}`,
      `Fuerza/masa ${res.fuerza_por_masa != null ? res.fuerza_por_masa.toFixed(2) : '—'} · `
        + `Autonomía ≈ ${res.autonomia_s != null ? Math.round(res.autonomia_s) + ' s a fondo' : '—'} (estimación de juego)`,
    );
    if (this.aviso) lineas.push(this.aviso);
    this.txtValidacion.setText(lineas.join('\n'));
    this.txtValidacion.setColor(errores.length ? C.error : C.claro);
    this.btnContinuar.setColor(errores.length ? C.apagado : C.acento);

    this.refrescarEsquema();
    this.refrescarCatalogo();
  }

  continuar() {
    const diseno = comoDiseno(this.mapa);
    const errores = validar(diseno, PIEZAS, this.presupuesto);
    if (errores.length) {
      this.aviso = 'Corrige el diseño antes de probarlo.';
      this.refrescar();
      this.cameras.main.shake(120, 0.004);
      return;
    }
    partida.diseno = diseno;
    // Transición común del integrador cuando exista (propuesta en docs/juego/ESPECIFICACION.md §13).
    if (typeof ui.irA === 'function') ui.irA(this, 'Prueba');
    else this.scene.start('Prueba');
  }
}
