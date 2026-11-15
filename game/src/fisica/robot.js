// Robot físico (Matter) construido a partir del diseño. Ver docs/juego/ESPECIFICACION.md §3–§7.
// Dimensiones y constantes de motor = valores de juego (P); deben coincidir con docs/juego/ASSETS_ARTE.md.
import Phaser from 'phaser';
import { m, velAMs, msAVel } from './escala.js';
import { resolverDiseno, MASA_CARGA_KG, RUEDAS_POR_RANURA } from './diseno.js';
import { gastoPorSegundo } from './energia.js';
import { danioChasis, danioCarga, danioSacudida, UMBRAL_CARGA_MS } from './danio.js';
import { agarreSuelo } from './suelos.js';
import { factorFrio, temperaturaAmbienteMotor, pasoTemperaturaMotor, potenciaPermitida, recargaPanel, REGLAS } from './ambiente.js';

const M = Phaser.Physics.Matter.Matter;

// Dimensiones en metros. (P)
export const DIM = {
  chasis: {
    chasis_ligero: { largo: 3.0, alto: 0.7 },
    chasis_reforzado: { largo: 3.0, alto: 0.9 },
    chasis_titanio: { largo: 3.0, alto: 0.7 }, // mismo tamaño que el ligero (parts.json: otro material)
    chasis_carbono: { largo: 3.0, alto: 0.7 },
  },
  radioRueda: { rueda_estandar: 0.45, rueda_ancha: 0.5, rueda_tacos: 0.45, rueda_malla: 0.55, rueda_nitinol: 0.45 }, // respaldo si falta radio_m; igual a parts.json
  paredSoporte: { soporte_basico: 0.25, soporte_correas: 0.35, soporte_amortiguado: 0.45 },
  carga: { largo: 0.9, alto: 0.6 },
  ejeX: 0.36, // posición de los ejes como fracción del largo, desde el centro
};

// Motor. (P)
const VEL_MAX_POR_FUERZA = 0.12; // m/s por unidad de `fuerza` → eficiente 6 m/s, potente 10.8 m/s
const TORQUE_POR_FUERZA = 0.004; // torque de Matter por unidad de `fuerza`, por eje (eficiente sube ~28° si el agarre alcanza)
const FRACCION_REVERSA = 0.5; // la reversa llega a la mitad de la velocidad

// Detección de patinaje y de falta de fuerza. (P)
// Matter no usa fricción de Coulomb: el umbral estático es fricción × frictionStatic × 5 (Resolver._frictionNormalMultiplier)
// y al deslizar aplica un impulso constante. Por eso el `agarre` de la pieza se convierte con una curva de juego:
// fricción = agarre². Separa más las ruedas (0.4 → 0.16, 0.9 → 0.81) y conserva el orden. (P)
export const FRICCION_ESTATICA = 1;
export const friccionDeAgarre = (agarre) => agarre * agarre;

const PATINA_MS = 1.0; // diferencia rueda–suelo (m/s) a partir de la cual se considera patinaje
export const PATINA_SEG = 0.35; // exportada para los efectos (efectos.js)
const CONTACTO_RECIENTE_SEG = 0.15; // la suspensión hace rebotar la rueda: cuenta el contacto reciente
const SIN_FUERZA_MS = 0.3;
const SIN_FUERZA_SEG = 1.5;
const ATASCO_MS = 0.5; // auto-rescate: por debajo de esta velocidad, acelerando, el robot cuenta como atascado (P)
// Volcado: de lado (> ~75°) y casi quieto durante 2 s. Antes pedía > 115°: un robot tumbado de lado se quedaba así para
// siempre sin que la partida terminara. Las pendientes jugables no pasan de ~35°, así que 75° no se confunde con una subida. (P)
const VOLCADO_RAD = 1.3;
const VOLCADO_SEG = 2.0;
const CARGA_LEJOS_M = 4;

let siguienteGrupo = -1;

export class Robot {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x, y  posición del centro del chasis (px de mundo)
   * @param {Array} diseno  [{ ranura, pieza }]
   * @param {Array} piezas  catálogo (parts.json)
   * @param {(tipo: string, detalle: string) => void} alEvento  telemetría
   */
  constructor(scene, x, y, diseno, piezas, alEvento = () => {}, { mundo = 'tierra', ambiente = null, factorAgarre = null } = {}) {
    this.mundo = mundo; // para el agarre real del suelo (suelos.js)
    this.ambiente = ambiente; // temperatura, aire y luz del nivel (ambiente.js); null = sin reglas de ambiente
    this.factorAgarre = factorAgarre; // (xMundo) => factor; arena blanda recreada (obstaculos.js)
    this.scene = scene;
    this.alEvento = alEvento;
    this.resuelto = resolverDiseno(diseno, piezas);
    const p = this.resuelto.porRanura;
    this.piezas = p;
    this.masaTotal = this.resuelto.masa + MASA_CARGA_KG;

    const grupo = siguienteGrupo--;
    const dimC = DIM.chasis[p.chasis.id] ?? DIM.chasis.chasis_ligero;
    const L = m(dimC.largo);
    const H = m(dimC.alto);
    const cL = m(DIM.carga.largo);
    const cH = m(DIM.carga.alto);
    const alturaPared = m(DIM.paredSoporte[p.carga.id] ?? 0.25);
    const grosorPared = m(0.12);
    const filtro = { group: grupo };

    // Chasis = base + dos paredes del soporte de carga (cuerpo compuesto).
    const base = M.Bodies.rectangle(x, y, L, H, { label: 'chasis', collisionFilter: filtro });
    const xPared = cL / 2 + grosorPared / 2 + m(0.06);
    const yPared = y - H / 2 - alturaPared / 2;
    const paredes = [-1, 1].map((s) =>
      M.Bodies.rectangle(x + s * xPared, yPared, grosorPared, alturaPared, { label: 'chasis', collisionFilter: filtro }));
    this.chasis = M.Body.create({ parts: [base, ...paredes], label: 'chasis', collisionFilter: filtro, friction: 0.6, restitution: 0.05 });
    const masaChasis = p.chasis.masa + p.motor.masa + p.bateria.masa + p.carga.masa + (p.modulo?.masa ?? 0);
    M.Body.setMass(this.chasis, masaChasis);

    // Ruedas: cada una representa un eje con 2 ruedas (masa × 2).
    const ejeX = L * DIM.ejeX;
    this.ruedas = [
      { ranura: 'rueda_tras', dx: -ejeX },
      { ranura: 'rueda_del', dx: ejeX },
    ].map(({ ranura, dx }) => {
      const pieza = p[ranura];
      // Fuente única del radio: parts.json (radio_m, propuesto por taller); si no viene, la tabla de juego. (P)
      const radio = m(pieza.radio_m ?? DIM.radioRueda[pieza.id] ?? 0.5);
      const cy = y + H / 2 + m(0.05);
      const cuerpo = M.Bodies.circle(x + dx, cy, radio, {
        label: 'rueda', collisionFilter: filtro, friction: 0.8, frictionStatic: FRICCION_ESTATICA, restitution: 0,
      });
      M.Body.setMass(cuerpo, pieza.masa * RUEDAS_POR_RANURA);
      const eje = M.Constraint.create({
        bodyA: this.chasis,
        pointA: { x: x + dx - this.chasis.position.x, y: cy - this.chasis.position.y },
        bodyB: cuerpo,
        pointB: { x: 0, y: 0 },
        length: 0,
        stiffness: 0.5,
        damping: 0.15,
      });
      return { ranura, pieza, radio, cuerpo, eje, superficie: null, tocando: false, ultimoContacto: -1, tPatina: 0, deslizamiento: 0 };
    });

    // Carga: cuerpo suelto sobre el soporte. Puede caerse.
    this.carga = M.Bodies.rectangle(x, y - H / 2 - cH / 2 - 1, cL, cH, { label: 'carga', friction: 0.9, frictionStatic: 1, restitution: 0 });
    M.Body.setMass(this.carga, MASA_CARGA_KG);

    M.Composite.add(scene.matter.world.localWorld, [this.chasis, ...this.ruedas.flatMap((w) => [w.cuerpo, w.eje]), this.carga]);

    // Estado
    this.energiaMax = p.bateria.capacidad;
    // Batería fría: arranca con menos energía útil (ambiente.js, regla a). Sin ambiente = 100 %.
    // El módulo calentador (`aislamiento_termico`) evita parte de esa pérdida; el radiador (`radiador`) enfría el motor. (P)
    this.aislamiento = p.modulo?.aislamiento_termico ?? 0;
    this.radiador = p.modulo?.radiador ?? 0;
    this.factorFrio = ambiente ? factorFrio(ambiente.temperatura_min_C, REGLAS.frio, this.aislamiento) : 1;
    this.energiaUtil = this.energiaMax * this.factorFrio;
    this.energia = this.energiaUtil;
    // Queda en la telemetría para que el feedback pueda culpar al frío (feedback/reglas.js: calentador de batería).
    if (this.factorFrio < 1) alEvento('bateria_fria', `${Math.round(this.factorFrio * 100)} %`);
    // Motor: temperatura (°C), empieza a la del ambiente (regla b).
    this.tMotor = temperaturaAmbienteMotor(ambiente);
    this.tMotorMax = this.tMotor;
    // Llanta superelástica (parts.json `amortiguacion`, rueda de Nitinol): fracción de la sacudida que no llega a la carga,
    // promedio de los dos ejes. Sin la pieza = 0 (sin cambio). (P)
    this.amortiguacion = this.ruedas.reduce((s, w) => s + (w.pieza.amortiguacion ?? 0), 0) / this.ruedas.length;
    // Auto-rescate (módulo `auto_rescate`, AB-002): ver _autoRescate. Sin el módulo = null (sin cambio).
    this.rescate = p.modulo?.auto_rescate ?? null;
    this.tAtasco = 0;
    this.tRescate = 0;
    this.tEsperaRescate = 0;
    this.rescates = 0;
    this.sobrecalentado = false;
    this.potenciaMotor = 1;
    this.vidaMax = p.chasis.resistencia;
    this.vida = this.vidaMax;
    this.integridad = 1;
    this.cargaPerdida = false;
    this.destruido = false;
    this.volcado = false;
    this.sinEnergia = false;
    this.t = 0;
    this.tSinFuerza = 0;
    this.tVolcado = 0;
    this.xInicio = this.chasis.position.x;
    this.velocidadMs = 0;
    this.sacudida = 0; // g, suavizada
    this.vPrevia = null;

    this._alColisionar = (ev) => this._colisiones(ev, true);
    this._alActiva = (ev) => this._colisiones(ev, false);
    scene.matter.world.on('collisionstart', this._alColisionar);
    scene.matter.world.on('collisionactive', this._alActiva);
  }

  get x() { return this.chasis.position.x; }
  get y() { return this.chasis.position.y; }
  get fuera() { return this.destruido || this.cargaPerdida || this.volcado || this.sinEnergia; }
  /** Distancia recorrida hacia adelante (m). */
  get distancia_m() { return Math.max(0, (this.chasis.position.x - this.xInicio) / m(1)); }

  _esMio(cuerpo) {
    return cuerpo === this.chasis || cuerpo === this.carga || this.ruedas.some((w) => w.cuerpo === cuerpo);
  }

  _colisiones(evento, inicio) {
    for (const par of evento.pairs) {
      const A = par.bodyA.parent;
      const B = par.bodyB.parent;
      if (!this._esMio(A) && !this._esMio(B)) continue;
      const otro = this._esMio(A) ? B : A;
      const mio = otro === A ? B : A;

      const rueda = this.ruedas.find((w) => w.cuerpo === mio);
      if (rueda && otro.label === 'suelo') rueda.tocando = true;
      if (!inicio) continue;

      // Velocidad relativa en la normal del choque (m/s).
      const vA = M.Body.getVelocity(A);
      const vB = M.Body.getVelocity(B);
      const n = par.collision.normal;
      const vn = Math.abs(velAMs((vA.x - vB.x) * n.x + (vA.y - vB.y) * n.y));

      if (mio === this.chasis && otro.label === 'suelo') {
        const d = danioChasis(vn);
        if (d > 0) {
          this.vida = Math.max(0, this.vida - d);
          this.alEvento('golpe_chasis', `${vn.toFixed(1)} m/s`);
        }
        // La carga viaja dentro del soporte: recibe el golpe atenuado por la protección.
        this._golpearCarga(vn);
        if (this.vida <= 0 && !this.destruido) {
          this.destruido = true;
          this.alEvento('chasis_destruido', this.piezas.chasis.id);
        }
      }
      if (mio === this.carga) {
        if (otro.label === 'suelo' && !this.cargaPerdida) {
          this.cargaPerdida = true;
          this.alEvento('carga_perdida', this.piezas.carga.id);
        }
        this._golpearCarga(vn);
      }
    }
  }

  _golpearCarga(vn) {
    if (vn <= UMBRAL_CARGA_MS || this.cargaPerdida) return;
    const d = danioCarga(vn, this.piezas.carga.proteccion ?? 0);
    if (d <= 0) return;
    this.integridad = Math.max(0, this.integridad - d);
    this.alEvento('golpe_carga', `${vn.toFixed(1)} m/s`);
  }

  /**
   * Avanza el estado un cuadro.
   * @param {number} dtMs
   * @param {number} acelerador  -1 (frenar o reversa), 0, 1
   * @param {(xMundo: number) => string} superficieDe  tipo de superficie en x de mundo
   */
  actualizar(dtMs, acelerador, superficieDe) {
    const dt = dtMs / 1000;
    this.t += dt;

    // Agarre según la superficie bajo cada rueda (Matter usa el mínimo con el suelo, que vale 1).
    for (const w of this.ruedas) {
      w.superficie = superficieDe(w.cuerpo.position.x);
      // Fricción = curva(agarre de la pieza) × agarre real del suelo (suelos.js; sin dato = 1).
      w.cuerpo.friction = friccionDeAgarre(w.pieza.agarre?.[w.superficie] ?? 0.6) * agarreSuelo(this.mundo, w.superficie)
        * (this.factorAgarre?.(w.cuerpo.position.x) ?? 1)
        * (this.tRescate > 0 ? this.rescate.agarre : 1); // auto-rescate activo: más agarre unos segundos (P)
    }

    // Energía
    const motorActivo = !this.destruido && !this.sinEnergia;
    const pedido = motorActivo ? acelerador : 0;
    // Motor caliente (regla b): empuja menos, pero la batería gasta lo que se pide (la diferencia se pierde como calor).
    const a = this.ambiente ? this._termica(pedido, dt) : pedido;
    this.energia = Math.max(0, this.energia - gastoPorSegundo(this.piezas.motor, this.masaTotal, pedido) * dt);
    if (this.energia <= 0 && !this.sinEnergia) {
      this.sinEnergia = true;
      this.alEvento('energia_agotada', this.piezas.bateria.id);
    }

    // Panel solar: recarga según la luz del nivel (regla c), sin pasar de la energía útil.
    if (this.ambiente && this.energia > 0 && this.piezas.modulo) {
      this.energia = Math.min(this.energiaUtil, this.energia + recargaPanel(this.piezas.modulo, this.ambiente) * dt);
    }

    // Motor: torque limitado por `fuerza`, hasta la velocidad máxima.
    const fuerza = this.piezas.motor.fuerza;
    const vMax = msAVel(fuerza * VEL_MAX_POR_FUERZA);
    const torque = fuerza * TORQUE_POR_FUERZA;
    for (const w of this.ruedas) {
      const omega = M.Body.getAngularVelocity(w.cuerpo);
      const omegaMax = vMax / w.radio;
      if (a > 0 && omega < omegaMax) w.cuerpo.torque += torque * a;
      if (a < 0 && omega > -omegaMax * FRACCION_REVERSA) w.cuerpo.torque += torque * a;
    }

    // Patinaje: la rueda gira mucho más rápido de lo que avanza sobre el suelo.
    const vChasis = M.Body.getVelocity(this.chasis);
    this.velocidadMs = velAMs(Math.hypot(vChasis.x, vChasis.y));
    let algunaPatina = false;
    for (const w of this.ruedas) {
      const vRueda = Math.abs(M.Body.getAngularVelocity(w.cuerpo)) * w.radio;
      const vCentro = M.Body.getSpeed(w.cuerpo);
      w.deslizamiento = velAMs(vRueda - vCentro);
      if (w.tocando) w.ultimoContacto = this.t;
      const enSuelo = this.t - w.ultimoContacto < CONTACTO_RECIENTE_SEG;
      // El contador sube mientras patina y baja despacio si deja de hacerlo (no se reinicia por un rebote).
      if (enSuelo && a !== 0 && w.deslizamiento > PATINA_MS) w.tPatina = Math.min(PATINA_SEG * 3, w.tPatina + dt);
      else w.tPatina = Math.max(0, w.tPatina - dt * 0.5);
      if (w.tPatina > PATINA_SEG) {
        algunaPatina = true;
        this.alEvento('patinaje', w.superficie);
      }
    }

    // Sin fuerza: acelera, toca el suelo, no patina y aun así no avanza (pendiente demasiado fuerte para el motor).
    const tocaSuelo = this.ruedas.some((w) => this.t - w.ultimoContacto < CONTACTO_RECIENTE_SEG);
    if (a > 0 && tocaSuelo && !algunaPatina && this.velocidadMs < SIN_FUERZA_MS) this.tSinFuerza += dt;
    else this.tSinFuerza = 0;
    if (this.rescate) this._autoRescate(dt, a, tocaSuelo);
    if (this.tSinFuerza > SIN_FUERZA_SEG) {
      this.alEvento('sin_fuerza', this.piezas.motor.id);
      this.tSinFuerza = 0;
    }

    // Volcado: chasis de cabeza durante un rato.
    const angulo = Math.abs(Phaser.Math.Angle.Wrap(this.chasis.angle));
    if (angulo > VOLCADO_RAD && this.velocidadMs < 1) this.tVolcado += dt;
    else this.tVolcado = 0;
    if (this.tVolcado > VOLCADO_SEG && !this.volcado) {
      this.volcado = true;
      this.alEvento('volcado', '');
    }

    // Sacudidas del chasis (g) → daño a la carga atenuado por la protección del soporte.
    const v = M.Body.getVelocity(this.chasis);
    if (this.vPrevia && dt > 0) {
      const g = velAMs(Math.hypot(v.x - this.vPrevia.x, v.y - this.vPrevia.y)) / dt / 9.81;
      this.sacudida = 0.6 * this.sacudida + 0.4 * g;
      // La llanta superelástica absorbe parte de la sacudida antes de que llegue a la carga (amortiguacion, P).
      const d = this.cargaPerdida ? 0 : danioSacudida(this.sacudida * (1 - this.amortiguacion), dt, this.piezas.carga.proteccion ?? 0);
      if (d > 0) {
        this.integridad = Math.max(0, this.integridad - d);
        this.alEvento('golpe_carga', `sacudida ${Math.round(this.sacudida)} g`);
      }
    }
    this.vPrevia = { x: v.x, y: v.y };

    // Carga muy lejos del chasis = perdida.
    if (!this.cargaPerdida && M.Vector.magnitude(M.Vector.sub(this.carga.position, this.chasis.position)) > m(CARGA_LEJOS_M)) {
      this.cargaPerdida = true;
      this.alEvento('carga_perdida', this.piezas.carga.id);
    }

    // Los contactos se vuelven a marcar en el siguiente paso de física.
    for (const w of this.ruedas) w.tocando = false;
  }

  /**
   * Calor del motor (ambiente.js, regla b): sube con acelerador × consumo y lo baja el aire (∝ densidad) y la radiación.
   * Sobre el límite, el motor solo entrega la potencia que el ambiente alcanza a enfriar. Devuelve el acelerador efectivo.
   */
  _termica(a, dt) {
    const R = REGLAS.motor;
    const consumo = this.piezas.motor.consumo ?? 1;
    this.potenciaMotor = this.sobrecalentado ? potenciaPermitida(this.tMotor, consumo, this.ambiente, R, this.radiador) : 1;
    const ef = Math.sign(a) * Math.min(Math.abs(a), this.potenciaMotor);
    this.tMotor = pasoTemperaturaMotor(this.tMotor, { a: ef, consumo, dt, amb: this.ambiente, radiador: this.radiador });
    this.tMotorMax = Math.max(this.tMotorMax, this.tMotor);
    if (!this.sobrecalentado && this.tMotor >= R.limite_C) {
      this.sobrecalentado = true;
      this.alEvento('sobrecalentamiento', `${Math.round(this.tMotor)} °C`);
    } else if (this.sobrecalentado && this.tMotor < R.limite_C - R.histeresis_C) {
      this.sobrecalentado = false;
    }
    return ef;
  }

  /**
   * Auto-rescate (módulo `auto_rescate`; AB-002 del libro: VIPER mueve sus ruedas una a una para salir de suelo blando).
   * Si acelera y casi no avanza (< ATASCO_MS) durante `atasco_s`, gasta `energia` y multiplica el agarre por `agarre` durante
   * `duracion_s`; después espera `espera_s`. Registra el evento `auto_rescate` (feedback/reglas.js). Todo (P).
   */
  _autoRescate(dt, a, tocaSuelo) {
    const R = this.rescate;
    this.tRescate = Math.max(0, this.tRescate - dt);
    this.tEsperaRescate = Math.max(0, this.tEsperaRescate - dt);
    // Atascado = acelerando, tocando el suelo y casi sin avanzar (patine o no). Patinar avanzando no cuenta.
    const atascado = a > 0 && tocaSuelo && this.velocidadMs < ATASCO_MS;
    this.tAtasco = atascado && this.tRescate === 0 ? this.tAtasco + dt : 0;
    if (this.tAtasco < R.atasco_s || this.tEsperaRescate > 0 || this.energia <= R.energia) return;
    this.energia -= R.energia;
    this.tRescate = R.duracion_s;
    this.tEsperaRescate = R.duracion_s + R.espera_s;
    this.tAtasco = 0;
    this.rescates += 1;
    this.alEvento('auto_rescate', String(this.rescates));
  }

  /** ¿Motor cerca del límite? (para un jugador que suelta el acelerador a tiempo) */
  get motorCaliente() { return this.tMotor >= REGLAS.motor.limite_C - REGLAS.motor.aviso_C; }

  /** Estado normalizado para el HUD y la telemetría. */
  estado() {
    return {
      energia: this.energiaMax ? this.energia / this.energiaMax : 0,
      integridad: this.cargaPerdida ? 0 : this.integridad,
      chasis: this.vidaMax ? this.vida / this.vidaMax : 0,
      velocidadMs: this.velocidadMs,
      superficie: this.ruedas[1].superficie,
      patina: this.ruedas.some((w) => w.tPatina > PATINA_SEG),
      tMotor: this.ambiente ? this.tMotor : null,
      sobrecalentado: this.sobrecalentado,
      rescate: this.tRescate > 0,
    };
  }

  /** ¿Robot y carga quietos? (para la entrega) */
  quieto(umbralMs = 0.25) {
    return velAMs(M.Body.getSpeed(this.chasis)) < umbralMs && velAMs(M.Body.getSpeed(this.carga)) < umbralMs;
  }

  /**
   * Dibujo provisional con figuras. Con arte, fisica/aspecto.js (AspectoRobot) pone los sprites y pide omitir esas partes:
   * omitir = { chasis, soporte, carga, ruedas: [tras, del] }.
   */
  dibujar(g, omitir = {}) {
    g.clear();
    const partes = this.chasis.parts.length > 1 ? this.chasis.parts.slice(1) : this.chasis.parts;
    partes.forEach((parte, i) => {
      if (i === 0 ? omitir.chasis : omitir.soporte) return; // parte 0 = base; 1 y 2 = paredes del soporte
      // colorChasis: pintura elegida en el Taller (cosmética, la pone fisica/aspecto.js); sin pintura, blanco lunar.
      g.fillStyle(this.destruido ? 0x5a3a3a : (this.colorChasis ?? 0xdfe3ee), 1);
      g.fillPoints(parte.vertices, true);
    });
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xd94a3a), Phaser.Display.Color.ValueToColor(0xffd166), 100, Math.round(this.integridad * 100));
    if (!omitir.carga) {
      g.fillStyle(this.cargaPerdida ? 0x7a4040 : Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillPoints(this.carga.vertices, true);
    }
    for (const [i, w] of this.ruedas.entries()) {
      if (omitir.ruedas?.[i]) continue;
      const { x, y } = w.cuerpo.position;
      g.fillStyle(0x2b2d3a, 1);
      g.fillCircle(x, y, w.radio);
      g.lineStyle(3, w.tPatina > PATINA_SEG ? 0xff6b6b : 0x9aa4c7, 1);
      const ang = w.cuerpo.angle;
      g.lineBetween(x, y, x + Math.cos(ang) * w.radio, y + Math.sin(ang) * w.radio);
      g.lineBetween(x, y, x - Math.cos(ang) * w.radio, y - Math.sin(ang) * w.radio);
    }
  }

  destruir() {
    // Al cerrar la escena, Phaser puede haber destruido ya el mundo (y con él sus listeners).
    const mundo = this.scene.matter?.world;
    if (!mundo) return;
    mundo.off('collisionstart', this._alColisionar);
    mundo.off('collisionactive', this._alActiva);
  }
}
