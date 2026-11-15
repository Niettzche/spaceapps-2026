// Eventos de fondo de los niveles destacados y de las misiones (docs/juego/PLAN_REMAKE.md §4.4). RECREACIÓN declarada,
// con semilla por nivel (mismos eventos en cada partida). programaEventos es pura (pruebas en niveles_destacados.test.mjs).
//
// | Evento         | Dónde                    | ¿Física?                                                                    | Base                    |
// | remolino       | Tenoumer, misión Marte   | Sí, leve: −30 % de luz al panel solar mientras pasa cerca (P)                | WX-018/019 (S21, S24)    |
// | rafaga_polvo   | Jabal Bayda              | No (el empuje lo hace el viento, viento.js)                                  | WS10M_MAX (NASA POWER)   |
// | nieve_sopla    | Pingualuit               | No (ídem)                                                                    | SNODP (NASA POWER)       |
// | desprendimiento| Cananea                  | Sí: piedras que ruedan desde un banco y quedan como obstáculo (P)            | recreación               |
// | fobos          | misión Marte             | No (tránsito acelerado: el real dura horas)                                  | recreación               |
// | tierra         | misión Luna              | No (desde el polo sur la Tierra se ve baja sobre el horizonte)               | recreación               |
// | micrometeorito | misión Luna              | No (destello)                                                                | recreación               |
import { aleatorio, semillaDe, alturaEn } from './perfil.js';
import { tr } from '../i18n.js';

export const EVENTOS = {
  remolino: { cada_s: [16, 26], dura_s: 9, luz: 0.7, cerca_px: 220 }, // luz = factor del panel mientras pasa cerca (P)
  rafaga_polvo: { cada_s: [10, 18], dura_s: 4 },
  nieve_sopla: { cada_s: [8, 14], dura_s: 5 },
  micrometeorito: { cada_s: [7, 15], dura_s: 0.8 },
  fobos: { cada_s: [40, 40], dura_s: 30 },
  desprendimiento: { a_m: [70, 150], piedras: 3, adelante_m: 16, separacion_m: 3, radio_m: [0.1, 0.16] }, // a_m = avance del robot que lo dispara (P)
};

/**
 * Programa determinista: [{ tipo, t0, t1, y? }] por tiempo, más [{ tipo: 'desprendimiento', a_m, radios }] por avance.
 */
export function programaEventos(tipos, semilla, duracion_s = 240) {
  const lista = [];
  for (const tipo of tipos ?? []) {
    const E = EVENTOS[tipo];
    const r = aleatorio(semillaDe(`evento:${semilla}:${tipo}`));
    if (tipo === 'tierra') { lista.push({ tipo, t0: 0, t1: Infinity }); continue; }
    if (tipo === 'desprendimiento') {
      for (const a of E.a_m) {
        lista.push({ tipo, a_m: a, radios: Array.from({ length: E.piedras }, () => Math.round((E.radio_m[0] + r() * (E.radio_m[1] - E.radio_m[0])) * 100) / 100) });
      }
      continue;
    }
    if (!E) continue;
    for (let t = 2 + r() * E.cada_s[0] * 0.5; t < duracion_s; t += E.cada_s[0] + r() * (E.cada_s[1] - E.cada_s[0])) {
      lista.push({ tipo, t0: t, t1: t + E.dura_s, y: r(), x: r() });
    }
  }
  return lista;
}

/** Eventos activos en t. */
export const activosEn = (programa, t) => programa.filter((e) => e.t0 != null && t >= e.t0 && t < e.t1);

/** Nota para el panel de datos. */
export function notaEventos(tipos) {
  if (!tipos?.length) return null;
  const n = {
    remolino: tr('remolinos de polvo (bajan 30 % la luz del panel al pasar, P)', 'dust devils (cut panel light 30 % as they pass, P)'),
    rafaga_polvo: tr('ráfagas con polvo', 'dusty gusts'), nieve_sopla: tr('nieve que sopla', 'blowing snow'),
    desprendimiento: tr('desprendimientos de talud (piedras que ruedan y se quedan)', 'talus slides (stones that roll and stay)'),
    fobos: tr('Fobos cruzando (acelerado)', 'Phobos crossing (sped up)'), tierra: tr('la Tierra baja sobre el horizonte', 'Earth low over the horizon'),
    micrometeorito: tr('destellos de micrometeorito', 'micrometeorite flashes'),
  };
  return tr(`Eventos de fondo recreados: ${tipos.map((t) => n[t] ?? t).join(', ')}.`, `Recreated background events: ${tipos.map((t) => n[t] ?? t).join(', ')}.`);
}

/** Vista y efectos de los eventos. `robot`, `perfil`, `terreno` para el remolino (luz) y el desprendimiento. */
export class EventosFondo {
  constructor(scene, { tipos, semilla, robot, perfil, terreno, ambiente, sprite, hayArte, reducido = false }) {
    this.scene = scene;
    this.robot = robot;
    this.perfil = perfil;
    this.terreno = terreno;
    this.ambiente = ambiente;
    this.sprite = sprite;
    this.hayArte = hayArte;
    this.reducido = reducido;
    this.programa = programaEventos(tipos, semilla);
    this.t = 0;
    this.vistos = new Set();
    this.objetos = new Map(); // evento → objeto de Phaser
    this.piedras = [];
    this.g = scene.add.graphics().setDepth(8).setScrollFactor(0);
    this.luzBaja = false;
    if (this.programa.some((e) => e.tipo === 'tierra')) {
      const s = sprite?.(scene, 'evento_tierra', { x: 760, y: 150, origen: [0.5, 0.5], profundidad: -25 });
      s?.setScrollFactor(0);
      if (!s) this.g.fillStyle(0x4f86c6, 1).fillCircle(760, 150, 22);
    }
  }

  /** dt en segundos (tiempo de la física). x_m = avance del robot en metros del perfil. */
  actualizar(dt, x_m) {
    this.t += dt;
    const cam = this.scene.cameras.main;
    const g = this.g;
    g.clear();
    let luzBaja = false;
    for (const e of this.programa) {
      if (e.tipo === 'desprendimiento') {
        if (!this.vistos.has(e) && x_m >= e.a_m) { this.vistos.add(e); this._desprendimiento(e, x_m); }
        continue;
      }
      if (e.t0 == null || e.tipo === 'tierra') continue;
      const activo = this.t >= e.t0 && this.t < e.t1;
      const f = activo ? (this.t - e.t0) / (e.t1 - e.t0) : 0;
      let obj = this.objetos.get(e);
      if (!activo) { if (obj) { obj.destroy(); this.objetos.delete(e); } continue; }
      if (e.tipo === 'remolino') {
        // Cruza el terreno de derecha a izquierda delante del robot (coordenadas de pantalla).
        const x = 1000 - f * 1100;
        const y = 300 + e.y * 60;
        if (!obj) obj = this._sprite(e, 'evento_remolino', 'gira', 0.9);
        if (obj) obj.setPosition(x, y).setScale(3 + e.y * 2);
        else { g.fillStyle(0xc89a6a, 0.35); for (let k = 0; k < 6; k++) g.fillRect(x - 8 - k * 3, y - k * 22, 16 + k * 6, 20); }
        const rx = (this.robot?.x ?? 0) - cam.scrollX;
        if (Math.abs(rx - x) < EVENTOS.remolino.cerca_px) luzBaja = true;
      } else if (e.tipo === 'fobos') {
        const x = -20 + f * 1000;
        const y = 90 + Math.sin(f * Math.PI) * -30 + e.y * 20;
        if (!obj) obj = this._sprite(e, 'evento_fobos', null, -24);
        if (obj) obj.setPosition(x, y);
        else g.fillStyle(0x8a7a6a, 1).fillCircle(x, y, 6);
      } else if (e.tipo === 'micrometeorito') {
        const x = 200 + e.x * 700;
        const y = 330 + e.y * 60;
        if (!obj) obj = this._sprite(e, 'evento_micrometeorito', 'destello', 9);
        if (obj) obj.setPosition(x, y);
        else g.fillStyle(0xffffff, 1 - f).fillCircle(x, y, 4 + f * 10);
      } else if (e.tipo === 'rafaga_polvo' || e.tipo === 'nieve_sopla') {
        // Velo que pasa con la ráfaga (las partículas del viento hacen el resto).
        const a = Math.sin(f * Math.PI) * (this.reducido ? 0.12 : 0.22);
        g.fillStyle(e.tipo === 'nieve_sopla' ? 0xf4f8ff : 0xc9a77a, a).fillRect(0, 150 + e.y * 80, 960, 220);
      }
    }
    this._luz(luzBaja);
    this._asentarPiedras();
  }

  _sprite(e, nombre, anim, profundidad) {
    if (!this.hayArte?.(this.scene, nombre)) return null;
    const s = this.sprite(this.scene, nombre, { x: -100, y: -100, origen: [0.5, 1], profundidad, anim: this.reducido ? null : anim });
    s?.setScrollFactor(0);
    if (s) this.objetos.set(e, s);
    return s;
  }

  /** Remolino cerca: el panel recibe menos luz (P). Sustituye el ambiente del robot mientras dura (robot.js lo lee). */
  _luz(baja) {
    if (!this.robot || !this.ambiente || baja === this.luzBaja) return;
    this.luzBaja = baja;
    this.robot.ambiente = baja ? { ...this.ambiente, irradiancia_rel: (this.ambiente.irradiancia_rel ?? 1) * EVENTOS.remolino.luz } : this.ambiente;
    if (baja) this.robot.alEvento?.('remolino', tr('luz del panel −30 %', 'panel light −30 %'));
  }

  /** Piedras que caen desde un banco delante del robot (cuerpos dinámicos label 'suelo'); quietas, se vuelven estáticas. */
  _desprendimiento(e, x_m) {
    const { xMundo, yMundo } = this.terreno;
    const M = this.scene.matter;
    e.radios.forEach((r, i) => {
      const xm = Math.min(this.perfil.largo_m - 40, x_m + EVENTOS.desprendimiento.adelante_m + i * EVENTOS.desprendimiento.separacion_m);
      const x = xMundo(xm);
      const y = yMundo(alturaEn(this.perfil, xm)) - 24 * (4 + i);
      const c = M.add.circle(x, y, r * 24, { label: 'suelo', friction: 0.9, frictionStatic: 1, restitution: 0.1, density: 0.004 });
      c.obstaculo = 'desprendimiento';
      const s = this.sprite?.(this.scene, 'obstaculo_roca_' + ((i % 3) + 1), { x, y, origen: [0.5, 0.5], profundidad: 3 });
      this.piedras.push({ c, s, t: 0 });
    });
    this.robot?.alEvento?.('desprendimiento', tr(`${e.radios.length} piedras`, `${e.radios.length} stones`));
  }

  _asentarPiedras() {
    for (const p of this.piedras) {
      if (p.s) { p.s.setPosition(p.c.position.x, p.c.position.y); p.s.setRotation(p.c.angle); }
      if (p.c.isStatic) continue;
      p.t += 1 / 60;
      const v = Math.hypot(p.c.velocity.x, p.c.velocity.y);
      if ((p.t > 1.5 && v < 0.05) || p.t > 8) this.scene.matter.body.setStatic(p.c, true);
    }
  }

  destruir() {
    for (const o of this.objetos.values()) o.destroy();
    this.objetos.clear();
    this.g?.destroy();
    if (this.robot && this.ambiente) this.robot.ambiente = this.ambiente;
  }
}
