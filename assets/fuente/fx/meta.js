// MARSCEPTION: prueba superada. Un fuego artificial chico en la punta de la bandera.
import { Particles, Lights, P, Rng, fit, sparkle, TAU } from "../../core/index.js";

export const meta = {
  name: "Meta",
  desc: "The test is passed: a bright pop at the flag tip, a ring of sparks bursts out in orange, yellow and turquoise, droops and fades, and a few glints twinkle after.",
  tags: ["celebration", "firework", "sparkle", "one-shot", "marsception"],
  size: [44, 76],
  origin: [22, 38],
  duration: 0.9,
  loop: false,
  fps: 15,
  bg: "dark",
  options: { palette: ["#f2701f", "#ffd23c", "#4ce8d8", "#ffffff"], seed: 6 },
};

export function create(o) {
  const C = fit(o.palette, 4), R = new Rng(o.seed), lights = new Lights();
  const warm = new Particles({ rng: R, sparks: ["#ffffff", "#fff08a", "#ffd23c", "#f2701f"] });
  const cool = new Particles({ rng: R, sparks: ["#ffffff", "#b4fff0", "#4ce8d8", "#108088"] });
  lights.add(0, 0, 12, 0xfff0b0, 0.7, 0.3);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + R.range(-0.12, 0.12), v = R.range(45, 60);
    (i % 2 ? cool : warm).spawn(P.SPARK, 0, 0, Math.cos(a) * v, Math.sin(a) * v - 20, R.range(0.3, 0.42));
  }
  for (let i = 0; i < 4; i++) warm.spawn(P.STAR, R.range(-10, 10), R.range(-10, 8), 0, 0, R.range(0.25, 0.4), R.pick([C[1], C[3]]), 1, R.range(0.3, 0.5));
  let t = 0;
  return {
    update(dt) { t += dt; warm.update(dt); cool.update(dt); lights.update(dt); },
    draw(p) {
      if (t < 0.07) sparkle(p, 0, 0, 3, C[3], C[1], 0.8);
      warm.draw(p, "front"); cool.draw(p, "front"); lights.draw(p);
    },
  };
}
