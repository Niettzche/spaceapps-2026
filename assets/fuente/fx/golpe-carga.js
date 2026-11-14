// MARSCEPTION: la carga recibe un golpe. Destello blanco y amarillo con un brillo en cruz que se apaga.
import { Lights, Rng, fit, sparkle, ease } from "../../core/index.js";

export const meta = {
  name: "Golpe de carga",
  desc: "The cargo takes a knock: a white flash ring, a yellow star glint that shrinks, and two small glints that blink off at the corners.",
  tags: ["impact", "flash", "glint", "cargo", "one-shot", "marsception"],
  size: [24, 20],
  origin: [12, 10],
  duration: 0.4,
  loop: false,
  fps: 15,
  bg: "dark",
  options: { palette: ["#a8301a", "#f2701f", "#ffd23c", "#fff08a", "#ffffff"], seed: 2 },
};

export function create(o) {
  const C = fit(o.palette, 5), R = new Rng(o.seed), lights = new Lights();
  lights.add(0, 0, 9, 0xfff0b0, 0.7, 0.25);
  const glints = [[R.range(-6, -4), R.range(-5, -3)], [R.range(4, 6), R.range(2, 4)]];
  let t = 0;
  return {
    update(dt) { t += dt; lights.update(dt); },
    draw(p) {
      const k = t / meta.duration;
      if (k >= 1) return;
      if (t < 0.07) p.ring(0, 0, 5, 1.2, C[4]);
      else if (t < 0.14) p.ring(0, 0, 7, 1, C[3], 0.6);
      sparkle(p, 0, 0, 5 * (1 - ease.outQuart(k)), C[4], C[2], 0.7);
      glints.forEach(([x, y], i) => { if (k > 0.15 + i * 0.1 && k < 0.6 + i * 0.1) sparkle(p, x, y, 1, C[3], C[2], 0.4); });
      lights.draw(p);
    },
  };
}
