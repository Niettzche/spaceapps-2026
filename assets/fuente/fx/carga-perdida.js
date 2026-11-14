// MARSCEPTION: la carga se pierde (cae del robot y se revienta). El juego lo dibuja centrado en la carga (7 × 5 px).
import { Particles, Bits, P, B, Rng, fit, mix, hex, WHITE, TAU } from "../../core/index.js";

export const meta = {
  name: "Carga perdida",
  desc: "The supply crate bursts: a white pop, orange and white splinters tumble out and bounce, and a puff of dust settles where it hit.",
  tags: ["crate", "break", "debris", "dust", "one-shot", "marsception"],
  size: [60, 32],
  origin: [30, 16],
  duration: 1.1,
  loop: false,
  fps: 15,
  bg: "ground",
  options: { palette: ["#5e3a24", "#8a5a36", "#b8844e", "#dcae74", "#f6d698"], seed: 8 },
};

const CAJA = ["#d0d8e6", "#9aa6ba", "#f2701f", "#a8301a"];

export function create(o) {
  const C = fit(o.palette, 5), R = new Rng(o.seed), suelo = () => 4;
  const ps = new Particles({ rng: R, ground: suelo }), bits = new Bits({ ground: suelo });
  // astillas de la caja: blancas y naranjas, giran, rebotan y se quedan
  for (let i = 0; i < 9; i++) {
    const s = R.sign(), v = R.range(25, 65);
    bits.add({ kind: B.SHARD, x: R.range(-2, 2), y: R.range(-2, 1), vx: s * v, vy: -R.range(60, 130), g: 1, drag: 0.6, bounce: 0.4,
      life: R.range(0.7, 1.0), a: R.range(0, TAU), va: s * R.range(6, 14), s: R.chance(0.4) ? 2 : 1, c: hex(R.pick(CAJA)) });
  }
  // polvo donde golpeó
  for (let i = 0; i < 6; i++)
    ps.spawn(P.DUST, R.range(-3, 3), 3, R.range(-22, 22), -R.range(4, 14), R.range(0.45, 0.8), R.chance(0.5) ? C[3] : C[2], R.range(1.8, 3), R.range(0, 0.05));
  for (let i = 0; i < 6; i++)
    ps.spawn(P.GRIT, R.range(-2, 2), 2, R.range(-50, 50), -R.range(40, 90), R.range(0.4, 0.6), R.pick([C[2], C[3], mix(C[4], WHITE, 0.2)]), 1);
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); bits.update(dt); },
    draw(p) {
      if (t < 0.07) { p.circle(0, 0, 4 - t * 30, 0xffffff); p.glow(0, 0, 9, 0xfff0c8, 0.6); } // destello de 1 cuadro
      ps.draw(p, "back"); bits.draw(p); ps.draw(p, "front");
    },
  };
}
