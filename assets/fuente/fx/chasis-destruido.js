// MARSCEPTION: el chasis se destruye. Destello, bola de fuego chica, piezas que salen volando y rebotan, y humo que sube.
import { Particles, Bits, Lights, P, PF, B, Rng, fit, sparkle, TAU } from "../../core/index.js";

export const meta = {
  name: "Chasis destruido",
  desc: "The robot breaks apart: a white flash, a small fireball rolling up into smoke, metal plates and bolts tumbling and bouncing away, sparks, and smoke that rises and thins.",
  tags: ["explosion", "debris", "robot", "smoke", "one-shot", "marsception"],
  size: [80, 88],
  origin: [40, 44],
  duration: 2.0,
  loop: false,
  fps: 15,
  bg: "ground",
  options: { palette: ["#2e3648", "#4a5468", "#9aa6ba", "#d0d8e6", "#ffffff"], seed: 11 },
};

export function create(o) {
  const C = fit(o.palette, 5), R = new Rng(o.seed), floor = () => 4;
  const ps = new Particles({ rng: R, ground: floor, sparks: ["#ffffff", "#fff08a", "#ffd23c", "#f2701f"] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  lights.add(0, -2, 22, 0xffb050, 0.9, 0.5);
  for (let i = 0; i < 10; i++)
    ps.spawn(P.FIRE, R.range(-3, 3), R.range(-4, 0), R.range(-20, 20), -R.range(10, 35), R.range(0.25, 0.5), 0, R.range(2.2, 3.6), R.range(0, 0.06), PF.SMOKES);
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + R.range(-1.2, 1.2), v = R.range(60, 120);
    ps.spawn(P.SPARK, 0, -2, Math.cos(a) * v, Math.sin(a) * v, R.range(0.25, 0.5));
  }
  for (let i = 0; i < 7; i++) {
    const s = R.sign(), v = R.range(18, 45);
    bits.add({ kind: B.CHUNK, x: s * R.range(1, 4), y: -2, vx: s * v, vy: -R.range(110, 190), a: R.range(0, TAU), va: s * R.range(6, 14),
      s: R.chance(0.4) ? 2 : 1, c: R.pick([C[1], C[2], C[3], 0xf2701f]), g: 1, drag: 0.4, bounce: 0.45, life: R.range(0.7, 1.0) });
  }
  for (let i = 0; i < 5; i++) ps.spawn(P.SMOKE, R.range(-4, 4), -R.range(2, 6), R.range(-6, 6), -R.range(8, 16), R.range(0.8, 1.2), 0, R.range(2.5, 3.5), R.range(0.15, 0.35));
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); bits.update(dt); lights.update(dt); },
    draw(p) {
      if (t < 0.07) { p.circle(0, -2, 6, C[4]); sparkle(p, 0, -2, 8, C[4], C[3], 0.9); }
      ps.draw(p, "back"); bits.draw(p); ps.draw(p, "front"); lights.draw(p);
    },
  };
}
