// Eventos de fondo de los niveles destacados y de las misiones (docs/juego/PLAN_REMAKE.md §4.4). RECREACIÓN declarada,
// con semilla por nivel (mismos eventos en cada partida). programaEventos es pura (pruebas en niveles_destacados.test.mjs).
//
// | Evento         | Dónde                    | ¿Física?                                                                    | Base                    |
// | remolino       | Tenoumer, misión Marte   | Sí, leve: −1 % de luz al panel mientras pasa cerca; 1 de cada 5, −15 %      | MR-083 (0.1–1 % típico, |
// |                |                          | (lo medido: 0.1–1 % típico, > 15 % los más fuertes; la proporción es P)      | > 15 % los fuertes)      |
// |                | Samalayuca               | No: el nivel es solo visual (`soloVisual`, camino dorado calibrado)          | recreación               |
// | cresta_humea   | Samalayuca               | No: arena que se vuela de las crestas de duna, más con más viento            | WS10M (NASA POWER)       |
// | espejismo      | Rincón de Parangueo      | No: reverbero sobre la playa caliente                                        | recreación               |
// | polvo_salino   | Rincón de Parangueo      | No (el empuje lo hace el viento, viento.js)                                  | evaporitas (Aranda-Gómez 2013) |
// | rafaga_polvo   | Jabal Bayda              | No (el empuje lo hace el viento, viento.js)                                  | WS10M_MAX (NASA POWER)   |
// | nieve_sopla    | Pingualuit               | No (ídem)                                                                    | SNODP (NASA POWER)       |
// | desprendimiento| Cananea                  | Sí: piedras que ruedan desde un banco y quedan como obstáculo (P)            | recreación               |
// | fobos          | misión Marte             | No (tránsito acelerado: el real dura horas)                                  | recreación               |
// | tierra         | misión Luna              | No (desde el polo sur la Tierra se ve baja sobre el horizonte)               | recreación               |
// | micrometeorito | misión Luna              | No (destello)                                                                | recreación               |
import { aleatorio, semillaDe, alturaEn } from './perfil.js';
import { tr } from '../i18n.js';

export const EVENTOS = {
  // luz = factor del panel mientras pasa cerca: ~1 % menos en la mayoría y 15 % en los fuertes (MR-083, FUENTES_NIVELES.md);
  // fuerte = fracción de remolinos fuertes (P). Se decide con e.x (ya sorteado) para no mover el resto del programa.
  remolino: { cada_s: [16, 26], dura_s: 9, luz: 0.99, luz_fuerte: 0.85, fuerte: 0.2, cerca_px: 220 },
  rafaga_polvo: { cada_s: [10, 18], dura_s: 4 },
  polvo_salino: { cada_s: [9, 16], dura_s: 4 },
  espejismo: { cada_s: [12, 20], dura_s: 7 },
  cresta_humea: { prominencia_m: 0.8, ventana_m: 8 }, // cresta = máximo local del perfil que sobresale ≥ 0.8 m en ±8 m (P)
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
    if (tipo === 'tierra' || tipo === 'cresta_humea') { lista.push({ tipo, t0: 0, t1: Infinity }); continue; }
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

/** Factor de luz del panel bajo un remolino: fuerte (MR-083: > 15 %) en una fracción (P), si no ~1 %. */
export const factorRemolino = (e) => (e.x < EVENTOS.remolino.fuerte ? EVENTOS.remolino.luz_fuerte : EVENTOS.remolino.luz);

/** Eventos activos en t. */
export const activosEn = (programa, t) => programa.filter((e) => e.t0 != null && t >= e.t0 && t < e.t1);

/** Crestas de duna del perfil (m): máximos locales que sobresalen al menos `prominencia_m` dentro de ±`ventana_m`. Pura. */
export function crestasDe(perfil, alturaEnFn = alturaEn, { prominencia_m, ventana_m } = EVENTOS.cresta_humea) {
  if (!perfil?.largo_m) return [];
  const lista = [];
  for (let x = ventana_m; x <= perfil.largo_m - ventana_m; x += 1) {
    const y = alturaEnFn(perfil, x);
    let max = true;
    let min = Infinity;
    for (let d = -ventana_m; d <= ventana_m && max; d += 1) {
      const yd = alturaEnFn(perfil, x + d);
      if (d !== 0 && yd > y) max = false;
      min = Math.min(min, yd);
    }
    if (max && y - min >= prominencia_m && !lista.some((c) => x - c < ventana_m)) lista.push(x);
  }
  return lista;
}

/** Nota para el panel de datos. `soloVisual`: los eventos no tocan la física (nivel del camino dorado). */
export function notaEventos(tipos, { soloVisual = false } = {}) {
  if (!tipos?.length) return null;
  const n = {
    remolino: soloVisual ? tr('remolinos de polvo (solo visuales en este nivel)', 'dust devils (visual only in this level)')
      : tr('remolinos de polvo (al pasar bajan ~1 % la luz del panel; los fuertes, 15 %; MR-083)', 'dust devils (dim panel light ~1 % as they pass; strong ones 15 %; MR-083)'),
    cresta_humea: tr('arena que se vuela de las crestas de duna con el viento', 'sand blowing off the dune crests with the wind'),
    espejismo: tr('espejismo sobre el lecho seco y caliente del lago', 'heat mirage over the hot playa'),
    polvo_salino: tr('polvo salino del lago seco con las ráfagas', 'salty playa dust in the gusts'),
    rafaga_polvo: tr('ráfagas con polvo', 'dusty gusts'), nieve_sopla: tr('nieve que arrastra el viento', 'blowing snow'),
    desprendimiento: tr('desprendimientos de talud (piedras que ruedan y se quedan)', 'talus slides (stones that roll and stay)'),
    fobos: tr('Fobos cruzando (acelerado)', 'Phobos crossing (sped up)'), tierra: tr('la Tierra baja sobre el horizonte', 'Earth low over the horizon'),
    micrometeorito: tr('destellos de micrometeorito', 'micrometeorite flashes'),
  };
  return tr(`Eventos de fondo recreados: ${tipos.map((t) => n[t] ?? t).join(', ')}.`, `Recreated background events: ${tipos.map((t) => n[t] ?? t).join(', ')}.`);
}

/** Vista y efectos de los eventos. `robot`, `perfil`, `terreno` para el remolino (luz) y el desprendimiento. */
export class EventosFondo {
  constructor(scene, { tipos, semilla, robot, perfil, terreno, ambiente, sprite, hayArte, reducido = false, soloVisual = false }) {
    this.scene = scene;
    this.soloVisual = soloVisual;
    this.v10 = 0;
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
    this.luzBaja = 1;
    // Crestas de duna (en coordenadas del mundo: se dibujan en una capa que se mueve con el terreno).
    if (this.programa.some((e) => e.tipo === 'cresta_humea') && perfil && terreno) {
      this.crestas = crestasDe(perfil).map((xm) => ({ x: terreno.xMundo(xm), y: terreno.yMundo(alturaEn(perfil, xm)) }));
      this.gMundo = scene.add.graphics().setDepth(4);
    }
    if (this.programa.some((e) => e.tipo === 'tierra')) {
      // La Tierra desde el polo sur lunar: baja sobre el horizonte y a media luz (arte de Mauricio, gibosa de 24 × 24). Su lado de
      // noche es azul muy oscuro y sobre el cielo negro solo se veía una tajada: se dibuja el disco completo detrás (lado
      // nocturno con luz de la Luna llena terrestre, «earthshine» inverso) y un halo de atmósfera para que se lea como
      // planeta. Más grande (×4) para que se reconozca.
      // Encima de la Tierra pequeña que ya trae el cielo fijo de fondo_luna_1 (centro en 754, 175 de pantalla), para tapar esa y
      // que se vea una sola: la gibosa de 24 × 24 de Mauricio (#111), con el lado nocturno transparente sobre el disco oscuro.
      const X = 754, Y = 175, R = 46;
      const disco = scene.add.graphics().setScrollFactor(0).setDepth(-25.2);
      disco.fillStyle(0x6fb7ff, 0.18).fillCircle(X, Y, R + 7);
      disco.fillStyle(0x6fb7ff, 0.28).fillCircle(X, Y, R + 3);
      disco.fillStyle(0x1d2b4f, 1).fillCircle(X, Y, R);
      const s = sprite?.(scene, 'evento_tierra', { x: X, y: Y, origen: [0.5, 0.5], profundidad: -25 });
      s?.setScrollFactor(0).setScale(4);
      if (!s) this.g.fillStyle(0x4f86c6, 1).fillCircle(X, Y, R - 2);
    }
  }

  /** dt en segundos (tiempo de la física). x_m = avance del robot en metros del perfil. v10 = viento a 10 m (m/s, con signo). */
  actualizar(dt, x_m, v10 = 0) {
    this.t += dt;
    this.v10 = v10;
    this._crestas();
    const cam = this.scene.cameras.main;
    const g = this.g;
    g.clear();
    let luzBaja = 1; // factor de luz del panel (1 = sin remolino cerca)
    for (const e of this.programa) {
      if (e.tipo === 'desprendimiento') {
        if (!this.vistos.has(e) && x_m >= e.a_m) { this.vistos.add(e); this._desprendimiento(e, x_m); }
        continue;
      }
      if (e.t0 == null || e.tipo === 'tierra' || e.tipo === 'cresta_humea') continue;
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
        if (Math.abs(rx - x) < EVENTOS.remolino.cerca_px) luzBaja = Math.min(luzBaja, factorRemolino(e));
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
      } else if (e.tipo === 'rafaga_polvo' || e.tipo === 'nieve_sopla' || e.tipo === 'polvo_salino') {
        // Velo que pasa con la ráfaga (las partículas del viento hacen el resto).
        const a = Math.sin(f * Math.PI) * (this.reducido ? 0.12 : 0.22);
        g.fillStyle(e.tipo === 'rafaga_polvo' ? 0xc9a77a : 0xf4f8ff, a).fillRect(0, 150 + e.y * 80, 960, 220);
      } else if (e.tipo === 'espejismo') {
        // Reverbero: franjas claras que ondulan a la altura del horizonte (fijas sin movimiento reducido).
        const a = Math.sin(f * Math.PI) * (this.reducido ? 0.15 : 0.32);
        const y0 = 250 + e.y * 50;
        for (let k = 0; k < 7; k++) {
          const fase = this.reducido ? 0 : this.t * 4 + k;
          for (let x = 0; x < 960; x += 24) {
            const dy = Math.round((Math.sin(fase + x / 60) * 3) / 3) * 3;
            g.fillStyle(0xfff8e8, a * (1 - k / 8)).fillRect(x, y0 + k * 9 + dy, 18, 3);
          }
        }
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
  _luz(factor) {
    if (this.soloVisual) return;
    if (!this.robot || !this.ambiente || factor === this.luzBaja) return;
    this.luzBaja = factor;
    this.robot.ambiente = factor < 1 ? { ...this.ambiente, irradiancia_rel: (this.ambiente.irradiancia_rel ?? 1) * factor } : this.ambiente;
    const pct = Math.round((1 - factor) * 100);
    if (factor < 1) this.robot.alEvento?.('remolino', tr(`luz del panel −${pct} %`, `panel light −${pct} %`));
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

  /** Arena que se vuela de las crestas hacia donde sopla; el largo y la cantidad crecen con el viento real (v10). */
  _crestas() {
    const g = this.gMundo;
    if (!g) return;
    g.clear();
    const cam = this.scene.cameras.main;
    const intensidad = Math.min(1, Math.abs(this.v10) / 12);
    const sentido = this.v10 < 0 ? -1 : 1;
    const n = Math.round(6 + 14 * intensidad);
    for (const [k, c] of this.crestas.entries()) {
      if (c.x < cam.scrollX - 200 || c.x > cam.scrollX + cam.width / (cam.zoom || 1) + 200) continue;
      for (let i = 0; i < n; i++) {
        const fase = this.reducido ? i / n : ((this.t * (0.8 + intensidad) + i / n + k * 0.37) % 1);
        const largo = 50 + 170 * intensidad;
        const x = c.x + sentido * fase * largo;
        const y = c.y - 3 - fase * (8 + 20 * intensidad) + Math.sin(i * 1.7 + k) * 3;
        g.fillStyle(0xf0d9a8, (0.9 - 0.6 * fase) * (0.55 + 0.45 * intensidad)).fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 3 + 3 * Math.round(intensidad * 2), 3);
      }
    }
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
    this.gMundo?.destroy();
    if (this.robot && this.ambiente) this.robot.ambiente = this.ambiente;
  }
}
