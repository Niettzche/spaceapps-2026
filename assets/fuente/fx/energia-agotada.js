// MARSCEPTION: se acaba la energía. Una chispa que se apaga y bocanadas de humo oscuro que suben y se deshacen.
import { Particles, Lights, P, Rng, fit, sparkle } from "../../core/index.js";

export const meta = {
  name: "Energía agotada",
  desc: "The motor dies: a last blue-white spark sputters twice and goes out, and a few dark puffs of smoke rise, sway and thin away.",
  tags: ["smoke", "sputter", "robot", "one-shot", "marsception"],
  size: [28, 60],
  origin: [14, 30],
  duration: 1.4,
  loop: false,
  fps: 15,
  bg: "dark",
  options: { palette: ["#0e0c12", "#1d1a22", "#2e2a35", "#433e4b", "#5c5664"], seed: 4 },
};

export function create(o) {
  const C = fit(o.palette, 5), R = new Rng(o.seed), ps = new Particles({ rng: R }), lights = new Lights();
  lights.add(0, 0, 6, 0x9fd8ff, 0.5, 0.35);
  for (let i = 0; i < 5; i++)
    ps.spawn(P.SMOKE, R.range(-2, 2), -R.range(0, 2), R.range(-4, 4), -R.range(10, 18), R.range(0.7, 1.1), R.pick([C[2], C[3], C[4]]), R.range(1.8, 2.8), i * 0.12);
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      // chisporroteo: dos parpadeos y se apaga
      if (t < 0.07 || (t > 0.14 && t < 0.2)) sparkle(p, 0, 0, t < 0.07 ? 3 : 2, 0xffffff, 0x9fd8ff, 0.6);
      ps.draw(p, "back"); ps.draw(p, "front"); lights.draw(p);
    },
  };
}
