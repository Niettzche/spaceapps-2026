// Recorrido común de la prueba terrestre y de la misión: terreno + robot + cámara + HUD + telemetría + fin.
// Ver docs/juego/ESPECIFICACION.md §9 (prueba) y §10 (misión).
import { m, PX_POR_M, aplicarGravedad } from './escala.js';
import { construirTerreno } from './terreno.js';
import { superficieEn, alturaEn, PLANO_FINAL_M } from './perfil.js';
import { Robot } from './robot.js';
import { PASO_ROCA, velocidadPasoRoca } from './danio.js';
import { Controles } from './controles.js';
import { Hud } from './hud.js';
import { notaSuelo, nombreSuperficie } from './suelos.js';
import { Telemetria, construirResultado } from './telemetria.js';
import { Efectos } from './efectos.js';
import { Huellas } from './huellas.js';
import { Sonido } from './sonido.js';
import { Decoracion } from './decoracion.js';
import { tr } from '../i18n.js';
import { AspectoRobot, crearFondo, claveDeFondo, sprite, tira, hayArte } from './aspecto.js';
import { ambienteDe, notaAmbiente, factorFrio } from './ambiente.js';
import * as K from '../scenes/comun/pixel.js'; // botón de arte (Abandonar)
import { generarObstaculos, crearObstaculos, factorAgarreEn, notaObstaculos, aplicarCrateres } from './obstaculos.js';
import { Avisos, puntosDeAviso } from './avisos.js';
import { textoPixel } from '../scenes/comun/fuente.js'; // «⚠ Eyecta», «⚠ Arena blanda»… la primera vez de cada tipo
// Tutorial guiado de la primera prueba y la primera misión (docs/juego/PLAN_REMAKE.md §1).
import { CLAVES_TUTORIAL, marcaTutorial, pasosPrueba, pasosMision } from '../scenes/comun/tutorial.js';
import { abrirTutorial } from '../scenes/comun/tutorial_vista.js';
import { cajaArte } from '../scenes/expediente/interfaz.js';
import { movimientoReducido } from '../scenes/expediente/efectos.js';
import { GRAVEDAD } from '../config/world.js';
import { versionFisica } from './version.js';
import { NivelDestacado } from './nivel_destacado.js'; // 5 niveles destacados: bloques, parches, viento, eventos
import { lugarDeSitio, fichaFisicaV2, paredesDeArena, PARED_ARENA } from './suelo_v2.js';
import { SITIOS } from '../data.js';
import { RUEDAS_POR_RANURA } from './diseno.js';

const FONDO = { tierra: '#7f9fbf', marte: '#b98a6a', luna: '#05060b' }; // color si no hay fondo de arte (fisica/aspecto.js)
const SEG_QUIETO_ENTREGA = 2; // la entrega exige 2 s detenido en la zona
// Atasco: si el robot no gana 1.5 m de avance en 15 s, la prueba termina (evita esperar a que se agote la batería). (P)
const SEG_ATASCO = 15;
const M_AVANCE_ATASCO = 1.5;
const M_INICIO_ATASCO = 3; // atasco a menos de 3 m del inicio = no avanzó (reversa contra la pared) (P)
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
    this.mejorX = -Infinity; // mejor avance (m) y tiempo en que se logró, para detectar atascos
    this.tMejorX = 0;

    aplicarGravedad(scene, o.gravedad);
    scene.cameras.main.setBackgroundColor(FONDO[o.mundo] ?? FONDO.tierra);

    const baseY = 380;
    // Obstáculos recreados (rocas, arena blanda, cráteres lunares, extras del camino dorado). Ver ESPECIFICACION §5b.
    // Se generan antes del terreno: los cráteres pequeños de la Luna se hunden en el perfil (aplicarCrateres).
    this.obstaculos = generarObstaculos(o.perfil, { mundo: o.mundo, semilla: (o.modo === 'prueba' ? o.sitioId : o.destinoId) ?? o.mundo });
    o.perfil = aplicarCrateres(o.perfil, this.obstaculos);
    this.terreno = construirTerreno(scene, o.perfil, { mundo: o.mundo, origenX: 0, baseY });
    const { xMundo, yMundo } = this.terreno;
    this.xMundo = xMundo;
    // Ambiente real del nivel (temperatura, aire, luz) y obstáculos recreados (rocas, arena blanda). Ver ESPECIFICACION §5b.
    this.ambiente = o.ambiente ?? ambienteDe({ modo: o.modo, mundo: o.mundo, sitioId: o.sitioId, destinoId: o.destinoId });
    crearObstaculos(scene, o.perfil, this.terreno, this.obstaculos, { mundo: o.mundo, sprite, hayArte });
    // Niveles destacados (content/niveles_destacados.js): parches y bloques recreados, viento y eventos. Sin config, no hace nada.
    this.destacado = new NivelDestacado(scene, o, this.terreno);

    // Límites: paredes a los lados, sin techo ni piso (el suelo es el terreno). Las paredes van justo donde empieza y termina
    // el terreno: con 2 m de margen quedaba un hueco sin suelo al principio y el robot caía en reversa sin que pasara nada.
    const izq = xMundo(0);
    const der = xMundo(o.perfil.largo_m);
    scene.matter.world.setBounds(izq, this.terreno.arriba - m(60), der - izq, this.terreno.abajo - this.terreno.arriba + m(80), 64, true, true, false, false);

    // Meta de la prueba o zona de entrega de la misión, en el plano final.
    const inicioFinal = o.perfil.largo_m - PLANO_FINAL_M;
    this.meta_m = o.modo === 'prueba' ? inicioFinal + 4 : inicioFinal + 6;
    // La zona llega hasta la pared del final: antes terminaba 4 m antes y un robot que se pasaba quedaba contra la pared,
    // fuera de la zona y sin atasco (se apagaba al alcanzar la zona): la misión se quedaba colgada.
    this.zona = o.modo === 'mision' ? { desde: inicioFinal, hasta: o.perfil.largo_m } : null;
    this._dibujarMeta(yMundo(alturaEn(o.perfil, this.meta_m)));

    // Robot sobre el plano de inicio.
    // Física 2 (?fisica=2): terramecánica Bekker–Wong (suelo_v2.js). El tipo de lugar sale del `proceso` del sitio.
    this.fisica = o.fisica ?? versionFisica();
    const lugar = o.modo === 'prueba' ? lugarDeSitio(SITIOS.find((s) => s.id === o.sitioId)) : 'generico';
    // Regla de paredes (P, solo física 2 y prueba en la Tierra): arena en paredes de más de 20° = roca (suelo_v2.js).
    this.paredes = this.fisica === 2 && o.modo === 'prueba' ? paredesDeArena(o.perfil, alturaEn, superficieEn, lugar) : [];
    const x0 = xMundo(6);
    const y0 = yMundo(alturaEn(o.perfil, 6)) - m(1.6);
    this.robot = new Robot(scene, x0, y0, o.diseno, o.piezas, (tipo, detalle) => {
      this.telemetria.registrar(this.robot?.t ?? 0, tipo, detalle);
      this.efectos?.alTelemetria(tipo, detalle); // efectos en la rueda, el chasis o la carga
      this.sonido?.alTelemetria(tipo, detalle); // golpes, crujido, sin energía (fisica/sonido.js)
    }, {
      mundo: o.mundo, ambiente: this.ambiente, factorAgarre: (x) => factorAgarreEn(this.obstaculos, (x - xMundo(0)) / PX_POR_M) * this.destacado.factorAgarre((x - xMundo(0)) / PX_POR_M),
      fisica: this.fisica, gravedad: o.gravedad, lugar,
    });
    this.destacado.crear(this.robot, this.ambiente);
    this.avisos = new Avisos(scene, puntosDeAviso(this.obstaculos, this.destacado.elementos, { modo: o.modo }), { textoPixel });
    // Misión: paso seguro sobre cada roca recreada (robot.js, PASO_ROCA). En la Tierra no: la prueba se maneja en vivo.
    const radioRueda_m = Math.min(...this.robot.ruedas.map((w) => w.radio)) / PX_POR_M;
    this.pasosRoca = o.modo === 'mision' ? this.obstaculos.filter((x) => x.tipo === 'roca').map((x) => ({
      x_m: x.x_m, v: velocidadPasoRoca({ g: o.gravedad, radio_m: radioRueda_m, alto_m: x.alto_m ?? x.radio_m, pared_m: this.robot.paredSoporte_m }),
    })) : [];
    this.efectos = new Efectos(scene, { mundo: o.mundo, gravedad: o.gravedad, robot: this.robot, superficieDe: this.superficieDe });
    // Surcos de las ruedas en la arena, con la profundidad del hundimiento de Bekker (solo visual).
    this.huellas = new Huellas(scene, { mundo: o.mundo, robot: this.robot, ySuelo: (x) => yMundo(alturaEn(o.perfil, (x - xMundo(0)) / PX_POR_M)) });
    this.sonido = new Sonido(scene, { mundo: o.mundo }); // motor, arena, golpes y fin; M silencia
    this.g = scene.add.graphics().setDepth(10);
    this.aspecto = new AspectoRobot(scene, this.robot); // sprites de arte si existen; si no, figuras

    const cam = scene.cameras.main;
    cam.setBounds(izq, this.terreno.arriba - m(25), der - izq, this.terreno.abajo - this.terreno.arriba + m(25));
    crearFondo(scene, claveDeFondo(o.mundo, o.sitioId), { x: izq, ancho: der - izq });
    this.decoracion = new Decoracion(scene, o); // decoración de fondo, sin física (Alan, #61)
    cam.startFollow(this.robot, false, 0.12, 0.12, -m(6), m(1));

    this.controles = new Controles(scene);
    // Origen del agarre del suelo + aviso del nivel. El suelo va primero: es corto y el HUD corta el aviso a 3 líneas,
    // así los valores provisionales (P) siempre se declaran en pantalla.
    const notaObs = notaObstaculos(this.obstaculos);
    const notaDecor = this.decoracion.tipo
      ? tr('Aves, polvo distante y roca espacial: decoración recreada, sin efecto físico.', 'Birds, distant dust and space rock: recreated decoration, no physical effect.')
      : null;
    const metrosPared = (this.paredes ?? []).reduce((acc, t) => acc + t.hasta - t.desde, 0);
    const notaPared = metrosPared > 0
      ? tr(`regla (P): ${Math.round(metrosPared)} m de pared marcados como arena (OpenLandMap) con más de ${PARED_ARENA.grados}° se tratan como roca`,
        `rule (P): ${Math.round(metrosPared)} m of wall labelled sand (OpenLandMap) steeper than ${PARED_ARENA.grados}° are treated as rock`)
      : null;
    const vPaso = this.pasosRoca.length ? Math.min(...this.pasosRoca.map((x) => x.v)) : null;
    const notaPaso = vPaso != null
      ? tr(`paso seguro (P): sin control en vivo, el robot frena solo a ${vPaso.toFixed(1)} m/s al cruzar cada roca para que la carga no salte la pared del soporte`,
        `safe crossing (P): with no live control, the robot slows itself to ${vPaso.toFixed(1)} m/s over each rock so the payload does not hop over the support wall`)
      : null;
    const avisoNivel = [`${o.perfil.ilustrativo ? '⚠ ' : ''}${o.perfil.nota}${notaObs ? ` · ${notaObs}` : ''}${notaPaso ? ` · ${notaPaso}` : ''}${notaPared ? ` · ${notaPared}` : ''}`, notaDecor].filter(Boolean).join(' ');
    const avisoSuelo = notaSuelo(o.mundo, o.perfil.superficies);
    const avisoAmbiente = [this.destacado.nota(this.robot.masaTotal), notaAmbiente(this.ambiente)].filter(Boolean).join(' ');
    const nombreMundo = tr({ luna: 'la Luna', marte: 'Marte' }[o.mundo] ?? 'el destino', { luna: 'the Moon', marte: 'Mars' }[o.mundo] ?? 'the destination');
    const pctG = Math.round((o.gravedad / 9.81) * 100);
    // En la misión, la explicación de la gravedad pasa al panel de datos (I); en las instrucciones queda la keyword.
    const avisoGravedad = o.modo === 'mision'
      ? tr(`Gravedad de ${nombreMundo}: ${o.gravedad} m/s² (${pctG} % de la Tierra). Pesas menos: las ruedas empujan con menos fuerza y el robot rebota más.`,
        `Gravity on ${nombreMundo}: ${o.gravedad} m/s² (${pctG} % of Earth's). Less weight: the wheels push with less force and the robot bounces more.`)
      : null;
    // Nota corta del HUD (DISENO.md §3): «Suelo: arena · I datos». El texto completo va en el panel de la tecla I.
    const tipos = [...new Set((o.perfil.superficies ?? []).map((x) => x.tipo))].map(nombreSuperficie).join(', ');
    const notaCorta = tipos ? `${tr('Suelo', 'Ground')}: ${tipos}` : null;
    // Física 2: ficha con las ecuaciones y los valores usados en este nivel (panel de la tecla I).
    const fichaV2 = this.fisica === 2 ? fichaFisicaV2({
      masaKg: this.robot.masaTotal, g: o.gravedad, ruedas: this.robot.ruedas.length * RUEDAS_POR_RANURA, pieza: this.robot.ruedas[1].pieza,
      mundo: o.mundo, tipos: (o.perfil.superficies ?? []).map((x) => x.tipo), lugar,
    }) : null;
    this.hud = new Hud(scene, {
      titulo: o.titulo, subtitulo: o.subtitulo, nota: notaCorta,
      aviso: [avisoGravedad, fichaV2 ?? (avisoSuelo && `${avisoSuelo}.`), `${avisoNivel.replace(/\.$/, '')}.`, avisoAmbiente].filter(Boolean).join(' '),
    });
    this._botonAbandonar();
    // Instrucciones al empezar: título + 3 keywords con ícono (objetivo · regla clave del lugar · controles). Esc pausa.
    const frio = this.ambiente ? factorFrio(this.ambiente.temperatura_min_C) : 1;
    const bateriaFria = frio < 0.95 ? tr(` · batería fría ${Math.round(frio * 100)} %`, ` · cold battery ${Math.round(frio * 100)} %`) : '';
    const controles = { texto: tr('→/D acelerar · ←/A frenar · Esc pausa', '→/D accelerate · ←/A brake · Esc pause'), icono: 'ui/ui_boton_der', escala: 1, respaldo: '▶' };
    const pista = tr('I · datos del ambiente y fuentes · táctil: ◀ ▶', 'I · environment data and sources · touch: ◀ ▶');
    const instrucciones = () => {
      this.instruccionesVistas = true;
      if (o.modo === 'prueba') {
        this.hud.instrucciones(tr('Prueba en la Tierra', 'Earth test'), [
          { texto: tr('Llega a la META con la carga', 'Reach the FINISH with the payload'), icono: 'ui/ui_icono_carga', escala: 3, respaldo: '⚑' },
          { texto: `${notaCorta ?? tr('Suelo: sin dato', 'Ground: no data')}${bateriaFria}`, icono: 'iconos/ico_suelo', respaldo: '≈' },
          this.destacado.filaEntrena(),
          controles,
        ].filter(Boolean), pista);
      } else {
        const minimo = Math.round(o.umbralIntegridad * 100);
        this.hud.instrucciones(tr(`Llegada a ${nombreMundo}`, `Arrival on ${nombreMundo}`), [
          { texto: tr(`Detente 2 s en la ZONA DE ENTREGA · carga ≥ ${minimo} %`, `Stop 2 s in the DELIVERY ZONE · payload ≥ ${minimo} %`), icono: 'ui/ui_icono_carga', escala: 3, respaldo: '⚑' },
          { texto: tr(`Gravedad ${o.gravedad} m/s² (${pctG} %): rebota más${bateriaFria}`, `Gravity ${o.gravedad} m/s² (${pctG} %): more bounce${bateriaFria}`), icono: 'iconos/ico_gravedad', respaldo: '↓' },
          controles,
        ], pista);
      }
    };
    // Llegada al destino: fundido desde negro y el cambio de mundo explicado con el dato de gravedad.
    if (o.modo === 'mision') scene.cameras.main.fadeIn(900, 0, 0, 0);
    // La primera vez (en este navegador) el tutorial guiado va antes que las instrucciones; al cerrarlo con un botón,
    // salen las instrucciones (al cerrarlo acelerando, no: ya está manejando).
    this.mostrarInstrucciones = instrucciones;
    this.marcaTutorial = marcaTutorial(o.modo === 'prueba' ? CLAVES_TUTORIAL.prueba : CLAVES_TUTORIAL.mision);
    if (this.marcaTutorial.debeMostrar()) this.abrirTutorial();
    else instrucciones();
    // Esc pausa (un toque accidental ya no abandona la partida). En la pausa: Esc/Enter continúa, X abandona.
    // Con el tutorial abierto: Esc lo salta, Enter pasa al siguiente paso; ? lo repite.
    scene.input.keyboard.on('keydown-ESC', () => {
      if (this.tutorial?.abierto()) { this.tutorial.cerrar('saltar'); return; }
      if (this.pausado) this.reanudar(); else this.pausar();
    });
    scene.input.keyboard.on('keydown-ENTER', () => { if (this.pausado) this.reanudar(); else if (this.tutorial?.abierto()) this.tutorial.siguiente(); });
    scene.input.keyboard.on('keydown', (ev) => { if (ev.key === '?' && !this.pausado && !this.terminado) this.abrirTutorial(); });
    scene.input.keyboard.on('keydown-X', () => { if (this.pausado) { this.reanudar(); this._terminar(false, 'abandono'); } });
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
      this._rotulo(a + 6, yMeta - m(6) + 4, tr('ZONA DE ENTREGA · frena y espera 2 s', 'DELIVERY ZONE · stop and wait 2 s'), '#4cc38a');
      this.rectMeta = { x: a, y: yMeta - m(6), w: b - a, h: m(6) };
    } else {
      const x = this.xMundo(this.meta_m);
      const bandera = sprite(this.scene, 'meta', { x, y: yMeta, origen: [0, 1], profundidad: 5, anim: 'ondea' });
      if (!bandera) {
        g.lineStyle(3, 0xffffff, 1).lineBetween(x, yMeta, x, yMeta - m(4));
        g.fillStyle(0xff6b6b, 1).fillTriangle(x, yMeta - m(4), x + m(1.6), yMeta - m(3.5), x, yMeta - m(3));
      }
      // El texto va justo encima de la bandera (sprite de 2 m o figura provisional de 4 m).
      const alto = bandera ? bandera.displayHeight : m(4);
      const t = this._rotulo(x + 6, yMeta - alto - 30, tr('META', 'FINISH'), '#ffffff');
      this.rectMeta = { x: x - m(0.5), y: t.y - 6, w: Math.max(m(2.5), t.width + 18), h: yMeta - t.y + 6 };
    }
  }

  /**
   * Rótulo sobre el terreno (META, ZONA DE ENTREGA) a 16 px con sombra y caja oscura detrás: se lee sobre cualquier fondo
   * (contraste ≥ 4.5:1; auditoría de Leo, docs/taller/AUDITORIA_DATOS.md §4.1).
   */
  _rotulo(x, y, texto, color) {
    const t = K.txt(this.scene, x, y, texto, { size: 16, color, borde: true }).setDepth(5);
    this.scene.add.rectangle(x - 5, y - 4, t.width + 12, t.height + 8, 0x0b0d17, 0.82).setOrigin(0, 0).setDepth(4.9);
    return t;
  }

  /**
   * Tutorial guiado (primera prueba / primera misión, o con ?): no detiene la física ni bloquea los controles táctiles.
   * Mientras está abierto el robot no acelera: acelerar pasa al siguiente paso y, en el último, lo cierra y arranca.
   */
  abrirTutorial() {
    if (this.tutorial?.abierto() || this.terminado || this.pausado) return;
    this.hud.ocultarInstrucciones();
    const pasos = (this.o.modo === 'prueba' ? pasosPrueba()
      : pasosMision({ mundo: this.o.mundo, gravedad: this.o.gravedad, gravedadTierra: GRAVEDAD.tierra, segundosEntrega: SEG_QUIETO_ENTREGA }))
      .map((p) => ({ ...p, bloquear: false }));
    this.tutSoltar = true; // hay que soltar el acelerador antes de que cuente (si ya venía presionado)
    this.tutorial = abrirTutorial(this.scene, {
      pasos, zonas: (n) => this._zonaTutorial(n), marca: this.marcaTutorial, profundidad: 120, fijo: true, teclado: false,
      alCerrar: (motivo) => {
        this.tutorial = null;
        if (motivo !== 'acelero' && !this.terminado && !this.instruccionesVistas) { this.instruccionesVistas = true; this.mostrarInstrucciones(); }
      },
    });
    this._resaltarMeta();
  }

  /** Zonas del tutorial en px de pantalla: flechas táctiles (fisica/controles.js) y final de la barra de progreso (hud.js). */
  _zonaTutorial(nombre) {
    if (nombre === 'controles') return { x: 20, y: 425, w: 920, h: 90 };
    if (nombre === 'frenar') return { x: 20, y: 425, w: 120, h: 90 };
    if (nombre === 'meta' || nombre === 'entrega') return { x: 12, y: 84, w: 932, h: 20 }; // barra de avance con «⚑» al final
    return null;
  }

  /** Marco que late (quieto con prefers-reduced-motion) alrededor de la META o la ZONA DE ENTREGA, sobre el terreno. */
  _resaltarMeta() {
    if (this.resalteMeta?.active || !this.rectMeta) return;
    const r = this.rectMeta;
    const c = this.scene.textures.exists('ui/ui_resalte')
      ? cajaArte(this.scene, 'ui/ui_resalte', r.x - 8, r.y - 8, r.w + 16, r.h + 16, { escala: 2 })
      : this.scene.add.rectangle(r.x - 8, r.y - 8, r.w + 16, r.h + 16).setOrigin(0, 0).setStrokeStyle(3, 0xffd166);
    this.resalteMeta = c.setDepth(6);
    if (!movimientoReducido()) this.scene.tweens.add({ targets: c, alpha: 0.35, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Acelerar con el tutorial abierto: pasa al siguiente paso; en el último lo cierra (y el robot arranca). */
  _aceleradorTutorial(a) {
    if (a <= 0) { this.tutSoltar = false; return; }
    if (this.tutSoltar) return;
    this.tutSoltar = true;
    if (this.tutorial.paso() >= 1) this.tutorial.cerrar('acelero');
    else this.tutorial.avanzar();
  }

  _botonAbandonar() {
    // Botón de arte bajo la franja del HUD, a la derecha (antes texto de 12 px junto a la temperatura del motor).
    const b = K.boton(this.scene, 944, 104, tr('Abandonar', 'Quit'), () => this._terminar(false, 'abandono'),
      { size: 14, alto: 36, origen: [1, 0], color: '#ff9b9b', sonar: false });
    K.fijarBoton(b, 95);
    // El botón de sonido (fisica/sonido.js) va debajo.
    this.sonido?.boton?.setPosition(944, 104 + b.alto + 22);
  }

  superficieDe = (xMundo) => {
    const x = (xMundo - this.xMundo(0)) / PX_POR_M;
    const parche = this.destacado?.superficie(x); // parche recreado de un nivel destacado (toba, talud, nieve, hielo)
    if (parche) return parche;
    if (this.paredes?.some((t) => x >= t.desde && x < t.hasta)) return 'roca';
    return superficieEn(this.o.perfil, x);
  };

  actualizar(_time, deltaCuadro) {
    // Energía, patinaje y entrega corren con el tiempo de la física: con paso fijo (main.js), Matter avanza runner.delta
    // por cuadro sin importar los fps. Con el delta del cuadro, a 30 fps la batería se gastaría al doble por metro.
    const runner = this.scene.matter.world.runner;
    const delta = runner?.isFixed ? runner.delta : deltaCuadro;
    const r = this.robot;
    if (this.pausado) return; // mundo de física detenido; nada avanza
    this.decoracion.actualizar(deltaCuadro);
    let acelerador = this.terminado ? 0 : this.controles.acelerador();
    if (this.tutorial?.abierto()) { this._aceleradorTutorial(acelerador); acelerador = 0; }
    if (acelerador !== 0) this.hud.ocultarInstrucciones();
    r.limiteVelMs = this._limitePasoRoca(r);
    r.actualizar(delta, acelerador, this.superficieDe);
    this.aspecto.dibujar(this.g);
    this.efectos.actualizar(delta, r); // polvo de ruedas y arena al patinar
    this.huellas.actualizar();
    this.destacado.actualizar(delta / 1000, (r.x - this.xMundo(0)) / PX_POR_M); // viento y eventos de fondo
    if (!this.tutorial?.abierto()) {
      // Eventos dinámicos que también avisan la primera vez: piedras que ruedan (Cananea) y remolinos que sí bajan la luz.
      const ev = this.destacado.eventos;
      if (ev?.vistos?.size) this.avisos.forzar('desprendimiento');
      if (ev && !ev.soloVisual && [...(ev.objetos?.keys() ?? [])].some((e) => e.tipo === 'remolino')) this.avisos.forzar('remolino');
      this.avisos.actualizar((Math.max(...r.ruedas.map((w) => w.cuerpo.position.x)) - this.xMundo(0)) / PX_POR_M);
    }
    this.sonido.actualizar(delta, r, acelerador);
    const estado = r.estado();
    const x_m = (r.x - this.xMundo(0)) / PX_POR_M;
    this.hud.actualizar(estado, { distancia_m: r.distancia_m, meta_m: this.meta_m - 6 });
    if (this.terminado) return;

    if (r.destruido) return this._terminar(false, 'chasis_destruido');
    if (r.cargaPerdida) return this._terminar(false, 'carga_perdida');
    if (r.volcado) return this._terminar(false, 'volcado');
    // Respaldo: si el robot sale por debajo del terreno (no debería con las paredes), la partida termina en vez de colgarse.
    if (r.chasis.position.y > this.terreno.abajo + m(3)) return this._terminar(false, 'caida');
    this.tSinEnergia = r.sinEnergia ? this.tSinEnergia + delta / 1000 : 0;
    if (r.sinEnergia && (r.quieto(0.4) || this.tSinEnergia >= SEG_SIN_ENERGIA_FIN)) return this._terminar(false, 'energia_agotada');
    // Atasco: sin avanzar a pesar de seguir en marcha (p. ej. patinando contra una duna).
    if (x_m > this.mejorX + M_AVANCE_ATASCO) { this.mejorX = x_m; this.tMejorX = r.t; this.tReversa = 0; }
    else if (acelerador < 0) this.tReversa = (this.tReversa ?? 0) + delta / 1000; // reversa contra la pared del inicio
    else if (acelerador === 0) this.tMejorX += delta / 1000; // quieto a propósito no cuenta como atasco
    if (!this.enZona(r, x_m) && r.t - this.tMejorX > SEG_ATASCO) {
      // Atasco en reversa o sin salir del inicio: no es culpa de las piezas (feedback/reglas.js, diagnostico.js).
      if ((this.tReversa ?? 0) > SEG_ATASCO / 3 || r.distancia_m < M_INICIO_ATASCO) {
        this.telemetria.registrar(r.t, 'atasco_reversa', `${Math.round(r.distancia_m)} m`);
      }
      return this._terminar(false, 'atascado');
    }

    if (this.o.modo === 'prueba') {
      if (x_m >= this.meta_m) this._terminar(true, 'meta');
      return;
    }
    // Misión: carga y robot en la zona, quietos 2 s.
    this.tQuieto = this.enZona(r, x_m) && r.quieto() ? this.tQuieto + delta / 1000 : 0;
    if (this.tQuieto >= SEG_QUIETO_ENTREGA) {
      if (estado.integridad >= this.o.umbralIntegridad) this._terminar(true, 'entrega');
      else this._terminar(false, 'carga_danada');
    }
  }

  /** Límite de velocidad (m/s) si una roca está entre la rueda trasera − despues_m y la delantera + antes_m; si no, null. */
  _limitePasoRoca(r) {
    if (!this.pasosRoca?.length) return null;
    const xs = r.ruedas.map((w) => (w.cuerpo.position.x - this.xMundo(0)) / PX_POR_M);
    const desde = Math.min(...xs) - PASO_ROCA.despues_m;
    const hasta = Math.max(...xs) + PASO_ROCA.antes_m;
    let v = null;
    for (const p of this.pasosRoca) if (p.x_m >= desde && p.x_m <= hasta) v = Math.min(v ?? Infinity, p.v);
    return v;
  }

  pausar() {
    if (this.terminado || this.pausado) return;
    this.pausado = true;
    this.scene.matter.world.pause();
    this.hud.ocultarInstrucciones();
    this.overlayPausa = this.hud.pausa(() => this.reanudar(), () => { this.reanudar(); this._terminar(false, 'abandono'); });
  }

  reanudar() {
    if (!this.pausado) return;
    this.pausado = false;
    this.scene.matter.world.resume();
    this.overlayPausa?.forEach((o) => o.destroy());
    this.overlayPausa = null;
  }

  /** ¿Está en la zona de entrega (misión)? Ahí detenerse es lo esperado, no un atasco. */
  zonaAlcanzada(x_m) {
    return Boolean(this.zona) && x_m >= this.zona.desde - 2;
  }

  /** Robot y carga dentro de la zona de entrega (hasta la pared del final). Con tolerancia de 1 m en la entrada. */
  enZona(r, x_m) {
    if (!this.zona) return false;
    const cargaX_m = (r.carga.position.x - this.xMundo(0)) / PX_POR_M;
    return x_m >= this.zona.desde - 1 && cargaX_m >= this.zona.desde - 1;
  }

  _terminar(exito, motivo) {
    if (this.terminado) return;
    this.terminado = true;
    this.tutorial?.cerrar('externo');
    const r = this.robot;
    if (exito) this._efectoFin(motivo);
    this.sonido.fin(exito, motivo);
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
    const textos = tr({
      meta: '¡Prueba superada!', entrega: '¡Entrega completada!', chasis_destruido: 'Chasis destruido',
      carga_perdida: 'Se perdió la carga', volcado: 'El robot volcó', energia_agotada: 'Sin energía', atascado: 'El robot quedó atascado',
      carga_danada: 'La carga llegó muy dañada', abandono: 'Prueba abandonada', caida: 'El robot se cayó del terreno',
    }, {
      meta: 'Test passed!', entrega: 'Delivery complete!', chasis_destruido: 'Chassis destroyed',
      carga_perdida: 'Payload lost', volcado: 'The robot flipped over', energia_agotada: 'Out of energy', atascado: 'The robot got stuck',
      carga_danada: 'Payload arrived too damaged', abandono: 'Run abandoned', caida: 'The robot fell off the terrain',
    });
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
    this.destacado?.destruir();
    this.avisos?.destruir();
    this.decoracion?.destruir();
    this.huellas?.destruir();
    this.efectos?.destruir();
    this.sonido?.destruir();
    this.robot.destruir();
  }
}
