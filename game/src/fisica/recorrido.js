// Recorrido común de la prueba terrestre y de la misión: terreno + robot + cámara + HUD + telemetría + fin.
// Ver docs/juego/ESPECIFICACION.md §9 (prueba) y §10 (misión).
import { m, PX_POR_M, aplicarGravedad } from './escala.js';
import { construirTerreno } from './terreno.js';
import { superficieEn, alturaEn, PLANO_FINAL_M } from './perfil.js';
import { Robot } from './robot.js';
import { Controles } from './controles.js';
import { Hud } from './hud.js';
import { notaSuelo } from './suelos.js';
import { Telemetria, construirResultado } from './telemetria.js';
import { Efectos } from './efectos.js';
import { AspectoRobot, crearFondo, claveDeFondo, sprite, tira } from './aspecto.js';

const FONDO = { tierra: '#7f9fbf', marte: '#b98a6a', luna: '#05060b' }; // color si no hay fondo de arte (fisica/aspecto.js)
const SEG_QUIETO_ENTREGA = 2; // la entrega exige 2 s detenido en la zona
const SEG_SIN_ENERGIA_FIN = 5; // sin energía, la partida termina al detenerse o a los 5 s (atascado contra el borde del nivel) (P)
const ESPERA_FIN_MS = 1400;

export class Recorrido {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} o
   *   perfil, mundo ('tierra'|'marte'|'luna'), gravedad (m/s²), diseno, piezas,
   *   modo ('prueba'|'mision'), titulo, subtitulo, umbralIntegridad,
   *   sitioId, destinoId, intentos, alTerminar(registro)
   */
  constructor(scene, o) {
    this.scene = scene;
    this.o = o;
    this.terminado = false;
    this.telemetria = new Telemetria();
    this.tQuieto = 0;
    this.tSinEnergia = 0;

    aplicarGravedad(scene, o.gravedad);
    scene.cameras.main.setBackgroundColor(FONDO[o.mundo] ?? FONDO.tierra);

    const baseY = 380;
    this.terreno = construirTerreno(scene, o.perfil, { mundo: o.mundo, origenX: 0, baseY });
    const { xMundo, yMundo } = this.terreno;
    this.xMundo = xMundo;

    // Límites: paredes a los lados, sin techo ni piso (el suelo es el terreno).
    const izq = xMundo(0) - m(2);
    const der = xMundo(o.perfil.largo_m) + m(2);
    scene.matter.world.setBounds(izq, this.terreno.arriba - m(60), der - izq, this.terreno.abajo - this.terreno.arriba + m(80), 64, true, true, false, false);

    // Meta de la prueba o zona de entrega de la misión, en el plano final.
    const inicioFinal = o.perfil.largo_m - PLANO_FINAL_M;
    this.meta_m = o.modo === 'prueba' ? inicioFinal + 4 : inicioFinal + 6;
    this.zona = o.modo === 'mision' ? { desde: inicioFinal + 4, hasta: o.perfil.largo_m - 4 } : null;
    this._dibujarMeta(yMundo(alturaEn(o.perfil, this.meta_m)));

    // Robot sobre el plano de inicio.
    const x0 = xMundo(6);
    const y0 = yMundo(alturaEn(o.perfil, 6)) - m(1.6);
    this.robot = new Robot(scene, x0, y0, o.diseno, o.piezas, (tipo, detalle) => {
      this.telemetria.registrar(this.robot?.t ?? 0, tipo, detalle);
      this.efectos?.alTelemetria(tipo, detalle); // efectos en la rueda, el chasis o la carga
    }, { mundo: o.mundo });
    this.efectos = new Efectos(scene, { mundo: o.mundo, gravedad: o.gravedad, robot: this.robot, superficieDe: this.superficieDe });
    this.g = scene.add.graphics().setDepth(10);
    this.aspecto = new AspectoRobot(scene, this.robot); // sprites de arte si existen; si no, figuras

    const cam = scene.cameras.main;
    cam.setBounds(izq, this.terreno.arriba - m(25), der - izq, this.terreno.abajo - this.terreno.arriba + m(25));
    crearFondo(scene, claveDeFondo(o.mundo, o.sitioId), { x: izq, ancho: der - izq });
    cam.startFollow(this.robot, false, 0.12, 0.12, -m(6), m(1));

    this.controles = new Controles(scene);
    // Origen del agarre del suelo + aviso del nivel. El suelo va primero: es corto y el HUD corta el aviso a 3 líneas,
    // así los valores provisionales (P) siempre se declaran en pantalla.
    const avisoNivel = o.perfil.ilustrativo ? `⚠ ${o.perfil.nota}` : o.perfil.nota;
    const avisoSuelo = notaSuelo(o.mundo, o.perfil.superficies);
    this.hud = new Hud(scene, { titulo: o.titulo, subtitulo: o.subtitulo, aviso: [avisoSuelo && `${avisoSuelo}.`, avisoNivel].filter(Boolean).join(' ') });
    this._botonAbandonar();
  }

  _dibujarMeta(yMeta) {
    const g = this.scene.add.graphics().setDepth(5);
    if (this.zona) {
      const a = this.xMundo(this.zona.desde);
      const b = this.xMundo(this.zona.hasta);
      const xa = b - m(1.5);
      // Arte si existe (fisica/aspecto.js); si no, figuras provisionales. Base y baliza no tienen figura.
      sprite(this.scene, 'base', { x: b - m(1), y: yMeta, origen: [0.5, 1], profundidad: 4 });
      sprite(this.scene, 'baliza', { x: a, y: yMeta, origen: [0.5, 1], profundidad: 5, anim: 'parpadea' });
      if (!tira(this.scene, 'zona_entrega', a, yMeta, b - a, 5)) {
        g.fillStyle(0x4cc38a, 0.18).fillRect(a, yMeta - m(6), b - a, m(6));
        g.lineStyle(2, 0x4cc38a, 0.8).strokeRect(a, yMeta - m(6), b - a, m(6));
      }
      this.astronauta = sprite(this.scene, 'astronauta', { x: xa, y: yMeta, origen: [0.5, 1], profundidad: 6, anim: 'reposo' });
      if (!this.astronauta) { // astronauta provisional (1.8 m) al final de la zona
        g.fillStyle(0xffffff, 1).fillRect(xa - m(0.3), yMeta - m(1.8), m(0.6), m(1.8));
        g.fillStyle(0x6fb3ff, 1).fillRect(xa - m(0.22), yMeta - m(1.6), m(0.44), m(0.3));
      }
      this.scene.add.text(a + 6, yMeta - m(6) + 4, 'ZONA DE ENTREGA', { fontFamily: 'monospace', fontSize: '12px', color: '#4cc38a' }).setDepth(5);
    } else {
      const x = this.xMundo(this.meta_m);
      if (!sprite(this.scene, 'meta', { x, y: yMeta, origen: [0, 1], profundidad: 5, anim: 'ondea' })) {
        g.lineStyle(3, 0xffffff, 1).lineBetween(x, yMeta, x, yMeta - m(4));
        g.fillStyle(0xff6b6b, 1).fillTriangle(x, yMeta - m(4), x + m(1.6), yMeta - m(3.5), x, yMeta - m(3));
      }
      this.scene.add.text(x + 6, yMeta - m(5.2), 'META', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' }).setDepth(5);
    }
  }

  _botonAbandonar() {
    const t = this.scene.add.text(944, 54, '[ Abandonar ]', { fontFamily: 'monospace', fontSize: '12px', color: '#ff9b9b' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(95).setInteractive({ useHandCursor: true });
    t.on('pointerdown', () => this._terminar(false, 'abandono'));
  }

  superficieDe = (xMundo) => superficieEn(this.o.perfil, (xMundo - this.xMundo(0)) / PX_POR_M);

  actualizar(_time, deltaCuadro) {
    // Energía, patinaje y entrega corren con el tiempo de la física: con paso fijo (main.js), Matter avanza runner.delta
    // por cuadro sin importar los fps. Con el delta del cuadro, a 30 fps la batería se gastaría al doble por metro.
    const runner = this.scene.matter.world.runner;
    const delta = runner?.isFixed ? runner.delta : deltaCuadro;
    const r = this.robot;
    const acelerador = this.terminado ? 0 : this.controles.acelerador();
    r.actualizar(delta, acelerador, this.superficieDe);
    this.aspecto.dibujar(this.g);
    this.efectos.actualizar(delta, r); // polvo de ruedas y arena al patinar
    const estado = r.estado();
    const x_m = (r.x - this.xMundo(0)) / PX_POR_M;
    this.hud.actualizar(estado, { distancia_m: r.distancia_m, meta_m: this.meta_m - 6 });
    if (this.terminado) return;

    if (r.destruido) return this._terminar(false, 'chasis_destruido');
    if (r.cargaPerdida) return this._terminar(false, 'carga_perdida');
    if (r.volcado) return this._terminar(false, 'volcado');
    this.tSinEnergia = r.sinEnergia ? this.tSinEnergia + delta / 1000 : 0;
    if (r.sinEnergia && (r.quieto(0.4) || this.tSinEnergia >= SEG_SIN_ENERGIA_FIN)) return this._terminar(false, 'energia_agotada');

    if (this.o.modo === 'prueba') {
      if (x_m >= this.meta_m) this._terminar(true, 'meta');
      return;
    }
    // Misión: carga y robot en la zona, quietos 2 s.
    const cargaX_m = (r.carga.position.x - this.xMundo(0)) / PX_POR_M;
    const enZona = x_m >= this.zona.desde && x_m <= this.zona.hasta && cargaX_m >= this.zona.desde && cargaX_m <= this.zona.hasta;
    this.tQuieto = enZona && r.quieto() ? this.tQuieto + delta / 1000 : 0;
    if (this.tQuieto >= SEG_QUIETO_ENTREGA) {
      if (estado.integridad >= this.o.umbralIntegridad) this._terminar(true, 'entrega');
      else this._terminar(false, 'carga_danada');
    }
  }

  _terminar(exito, motivo) {
    if (this.terminado) return;
    this.terminado = true;
    const r = this.robot;
    if (exito) this._efectoFin(motivo);
    if (!exito) this.telemetria.registrar(r.t, 'fallo', motivo);
    const estado = r.estado();
    const resultado = construirResultado({
      sitio: this.o.sitioId,
      destino: this.o.destinoId,
      diseno: r.resuelto.diseno,
      distancia_m: r.distancia_m,
      entrega: this.o.modo === 'mision' && exito,
      integridad_carga: estado.integridad,
      energia_restante: estado.energia,
      costo: r.resuelto.costo,
      intentos: this.o.intentos,
      eventos: this.telemetria.eventos,
    });
    const textos = {
      meta: '¡Prueba superada!', entrega: '¡Entrega completada!', chasis_destruido: 'Chasis destruido',
      carga_perdida: 'Se perdió la carga', volcado: 'El robot volcó', energia_agotada: 'Sin energía',
      carga_danada: 'La carga llegó muy dañada', abandono: 'Prueba abandonada',
    };
    this.hud.mostrar(textos[motivo] ?? motivo);
    this.scene.time.delayedCall(ESPERA_FIN_MS, () => this.o.alTerminar({
      tipo: this.o.modo, exito, motivo, ilustrativo: this.o.perfil.ilustrativo, resultado,
    }));
  }

  /** Celebración en la meta (bandera) o en la entrega (carga). */
  _efectoFin(motivo) {
    const r = this.robot;
    const enMeta = motivo === 'meta';
    const x = enMeta ? this.xMundo(this.meta_m) : r.carga.position.x;
    const y = enMeta ? this.terreno.yMundo(alturaEn(this.o.perfil, this.meta_m)) - m(4) : r.carga.position.y - m(0.5);
    this.efectos.emitir({ tipo: motivo, x, y, superficie: this.superficieDe(x) });
  }

  destruir() {
    this.efectos?.destruir();
    this.robot.destruir();
  }
}
