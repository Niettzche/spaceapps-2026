// Viento con física (niveles destacados, docs/juego/NIVELES_DESTACADOS.md). Funciones puras + una clase que lo aplica.
//
// Fuerza de arrastre sobre el robot: F = ½ · ρ · v · |v| · Cd · A (EQ-021 del libro de datos: q = ½ ρ v²).
//  - ρ = densidad del aire del lugar (ambiente.js: NASA POWER en la Tierra, derivada; MEDA en Jezero; 0 en la Luna).
//  - v = viento a la altura del robot. NASA POWER da el viento a 10 m (WS10M); se baja a 1 m con el perfil logarítmico
//    v(z) = v10 · ln(z / z0) / ln(10 / z0), con rugosidad z0 = 0.03 m (terreno abierto) (P).
//  - Cd = 1.0 y A = 1.5 m² (caja de ~1.3 m de alto × ~1.2 m de ancho de frente) (P).
// Ráfagas: el viento base es la media WS10M; cada 8–16 s llega una ráfaga de 2–4 s cuyo pico va de la media a WS10M_MAX
// (el viento máximo diario de la climatología). Horario, duración, pico y sentido salen de una semilla por nivel (P).
// En Marte (Jezero) no hay viento medio con fuente: solo ráfagas de hasta 10 m/s (WX-017, primer reporte de MEDA, S22).
// La fuerza se escala × FACTOR_GRAVEDAD, igual que la gravedad del juego, para conservar la proporción real viento / peso.
// `empuja: false` (Samalayuca, camino dorado calibrado): el viento real se ve (partículas, ráfagas) pero no se aplica la fuerza.
import { PX_POR_M, FACTOR_GRAVEDAD } from './escala.js';
import { aleatorio, semillaDe } from './perfil.js';
import { tr } from '../i18n.js';

export const VIENTO = {
  cd: 1.0, // (P)
  area_m2: 1.5, // (P)
  z0_m: 0.03, // (P) rugosidad de terreno abierto
  altura_robot_m: 1, // (P)
  rafaga: { cada_s: [8, 16], dura_s: [2, 4], contra: 0.6 }, // contra = probabilidad de que sople de frente (P)
};

/** Viento (m/s) a la altura z a partir del de 10 m, perfil logarítmico neutro. */
export function vientoAAltura(v10, z = VIENTO.altura_robot_m, z0 = VIENTO.z0_m) {
  if (!Number.isFinite(v10)) return 0;
  return v10 * Math.log(z / z0) / Math.log(10 / z0);
}

/** Fuerza de arrastre (N) con signo: positiva empuja hacia +x. */
export function fuerzaArrastre(rho, v, cd = VIENTO.cd, area = VIENTO.area_m2) {
  return 0.5 * (rho ?? 0) * v * Math.abs(v) * cd * area;
}

/** N → unidades de fuerza de Matter (px·masa/ms²), con la misma escala que la gravedad del juego. */
export const fuerzaAMatter = (N) => (N * PX_POR_M * FACTOR_GRAVEDAD) / 1e6;

/**
 * Programa de ráfagas (función pura): lista de { t0, t1, pico, sentido } hasta `duracion_s`.
 * @param {string} semilla
 * @param {{ medio: number|null, max: number|null }} v  m/s a 10 m
 */
export function programaRafagas(semilla, { medio, max }, duracion_s = 240, R = VIENTO.rafaga) {
  const r = aleatorio(semillaDe(`viento:${semilla}`));
  const base = medio ?? 0;
  const tope = max ?? base;
  const lista = [];
  if (!(tope > 0)) return lista;
  for (let t = 3 + r() * 4; t < duracion_s; t += R.cada_s[0] + r() * (R.cada_s[1] - R.cada_s[0])) {
    const dura = R.dura_s[0] + r() * (R.dura_s[1] - R.dura_s[0]);
    const pico = base + r() * (tope - base);
    lista.push({ t0: t, t1: t + dura, pico, sentido: r() < R.contra ? -1 : 1 });
  }
  return lista;
}

/**
 * Viento a 10 m (m/s, con signo; − = de frente) en el tiempo t. Entre ráfagas sopla la media hacia el sentido de la última
 * ráfaga (de frente al empezar); durante una ráfaga sube hasta el pico con forma sen².
 */
export function vientoEn(t, programa, medio) {
  const base = medio ?? 0;
  let sentido = -1;
  for (const g of programa) {
    if (t < g.t0) break;
    sentido = g.sentido;
    if (t < g.t1) {
      const f = Math.sin((Math.PI * (t - g.t0)) / (g.t1 - g.t0)) ** 2;
      return sentido * (base + (g.pico - base) * f);
    }
  }
  return sentido * base;
}

/** Datos de viento del ambiente del nivel: { medio, max, rho } o null si no hay aire o no hay dato. */
export function datosViento(amb) {
  const rho = amb?.densidad_aire_kg_m3 ?? 0;
  const medio = amb?.viento_medio_ms ?? null;
  const max = amb?.viento_max_ms ?? null;
  if (!(rho > 0) || (medio == null && max == null)) return null;
  return { medio, max, rho };
}

/** Fuerza máxima (N) de la ráfaga más fuerte a la altura del robot, y su fracción del peso (para explicar el efecto). */
export function resumenViento(datos, masaKg, g) {
  if (!datos) return null;
  const v = vientoAAltura(datos.max ?? datos.medio);
  const F = fuerzaArrastre(datos.rho, v);
  return { v_robot: v, F, fraccionPeso: masaKg > 0 && g > 0 ? F / (masaKg * g) : 0 };
}

/** Texto del efecto del viento: "ráfagas de hasta 21 m/s (a 10 m): empujan hasta 140 N, 21 % del peso" o el de Marte. */
export function textoViento(amb, masaKg, g) {
  const d = datosViento(amb);
  if (!d) return amb?.mundo === 'luna' ? tr('Sin aire: no hay viento en la Luna.', 'No air: there is no wind on the Moon.') : null;
  const r = resumenViento(d, masaKg, g);
  const pct = r.fraccionPeso * 100;
  const pctTxt = pct < 1 ? pct.toFixed(1) : String(Math.round(pct));
  const base = tr(`Viento (NASA POWER/MEDA): ráfagas de hasta ${Math.round(d.max ?? d.medio)} m/s a 10 m → ${r.v_robot.toFixed(1)} m/s a la altura del robot; F = ½·ρ·v²·Cd·A = ${r.F.toFixed(r.F < 10 ? 1 : 0)} N (${pctTxt} % del peso; Cd y A son P)`,
    `Wind (NASA POWER/MEDA): gusts up to ${Math.round(d.max ?? d.medio)} m/s at 10 m → ${r.v_robot.toFixed(1)} m/s at robot height; F = ½·ρ·v²·Cd·A = ${r.F.toFixed(r.F < 10 ? 1 : 0)} N (${pctTxt} % of the weight; Cd and A are P)`);
  if (amb.mundo === 'marte') {
    return `${base}. ${tr('En Marte el viento levanta polvo pero casi no empuja: el aire tiene ~1.4 % de la densidad de la Tierra.',
      'On Mars the wind lifts dust but barely pushes: the air has ~1.4 % of Earth\'s density.')}`;
  }
  return `${base}.`;
}

/**
 * Viento del nivel sobre el robot: fuerza en el chasis (Matter.Body.applyForce) y partículas que vuelan con él.
 * No toca robot.js: aplica la fuerza desde fuera en cada paso de física.
 */
export class Viento {
  constructor(scene, { robot, ambiente, semilla, particula = 'polvo', reducido = false, empuja = true }) {
    this.scene = scene;
    this.empuja = empuja !== false;
    this.robot = robot;
    this.datos = datosViento(ambiente);
    this.programa = this.datos ? programaRafagas(semilla, this.datos) : [];
    this.t = 0;
    this.v10 = 0;
    this.F = 0;
    this.particula = particula;
    this.reducido = reducido;
    const r = aleatorio(semillaDe(`particulas:${semilla}`));
    const n = !particula ? 0 : reducido ? 12 : 60;
    this.puntos = Array.from({ length: n }, () => ({ x: r() * 960, y: 130 + r() * 300, k: 0.5 + r() * 0.8, s: r() }));
    this.g = particula ? scene.add.graphics().setDepth(9).setScrollFactor(0) : null;
  }

  /** dt en segundos del paso de física. Devuelve la fuerza aplicada (N). */
  actualizar(dt) {
    this.t += dt;
    if (!this.datos) { this.v10 = 0; this.F = 0; this._dibujar(dt); return 0; }
    this.v10 = vientoEn(this.t, this.programa, this.datos.medio);
    const v = Math.sign(this.v10) * vientoAAltura(Math.abs(this.v10));
    this.F = fuerzaArrastre(this.datos.rho, v);
    const c = this.robot?.chasis;
    if (this.empuja && c && !this.robot.destruido && this.F !== 0) {
      const M = this.scene.matter.body;
      M.applyForce(c, c.position, { x: fuerzaAMatter(this.F), y: 0 });
    }
    this._dibujar(dt);
    return this.F;
  }

  _dibujar(dt) {
    const g = this.g;
    if (!g) return;
    g.clear();
    // Las partículas se mueven con el viento a la altura del robot (px/s); un mínimo para que el aire "se vea" aun en calma.
    const v = this.v10 === 0 ? 0.6 : Math.sign(this.v10) * Math.max(0.6, vientoAAltura(Math.abs(this.v10)));
    const color = { polvo: 0xb07a4a, ceniza: 0x6f6a66, nieve: 0xf4f8ff, arena: 0xd9b57a, sal: 0xf7f5ee }[this.particula] ?? 0xb07a4a;
    const intensidad = Math.min(1, Math.abs(this.v10) / 12);
    g.fillStyle(color, 0.55 + 0.4 * intensidad);
    const tam = 3;
    // Arena y sal: cuántos granos vuelan depende de la intensidad del viento real (en calma, un tercio; con ráfaga, todos).
    const visibles = this.particula === 'arena' || this.particula === 'sal'
      ? Math.round(this.puntos.length * (0.3 + 0.7 * intensidad)) : this.puntos.length;
    for (const [i, p] of this.puntos.entries()) {
      if (!this.reducido) {
        p.x += v * 40 * p.k * dt;
        p.y += Math.sin((this.t + p.s * 6) * 3) * 10 * dt + (this.particula === 'nieve' ? 14 * dt : 0);
      }
      if (p.x < -10) p.x += 980; else if (p.x > 970) p.x -= 980;
      if (p.y > 440) p.y = 130; else if (p.y < 120) p.y = 430;
      if (i >= visibles) continue;
      // Con ráfaga, estela horizontal (se ve hacia dónde sopla).
      const largo = Math.round(tam + intensidad * 8 * p.k);
      g.fillRect(Math.round(p.x / 3) * 3, Math.round(p.y / 3) * 3, largo, tam);
    }
  }

  destruir() {
    this.g?.destroy();
    this.g = null;
  }
}
