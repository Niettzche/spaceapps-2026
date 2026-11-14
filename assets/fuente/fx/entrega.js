// MARSCEPTION: entrega del suministro. Estallido de confeti y estrellas sobre la carga, con los colores del juego.
import { Particles, Lights, P, Rng, fit, sparkle } from "../../core/index.js";

export const meta = {
  name: "Entrega",
  desc: "The supply is delivered: a pop of light over the cargo, confetti in orange, yellow, turquoise and white bursts up, stalls and flutters down, and star glints twinkle round it.",
  tags: ["celebration", "confetti", "stars", "ui", "one-shot", "marsception"],
  size: [60, 64],
  origin: [30, 32],
  duration: 1.2,
  loop: false,
  fps: 15,
  bg: "dark",
  options: { palette: ["#f2701f", "#ffd23c", "#4ce8d8", "#ffffff"], seed: 9 },
};

export function create(o) {
  const C = fit(o.palette, 4), R = new Rng(o.seed), ps = new Particles({ rng: R }), lights = new Lights();
  lights.add(0, -4, 14, 0xfff0b0, 0.6, 0.3);
  // confeti: sale disparado hacia arriba, el aire lo frena y cae despacio meciéndose
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + R.range(-1.0, 1.0), v = R.range(45, 80);
    ps.spawn(P.FLAKE, R.range(-2, 2), -3, Math.cos(a) * v, Math.sin(a) * v, R.range(0.75, 1.05), R.pick(C), R.chance(0.3) ? 1.5 : 1, R.range(0, 0.05));
  }
  for (let i = 0; i < 5; i++) ps.spawn(P.STAR, R.range(-14, 14), R.range(-22, -6), 0, 0, R.range(0.35, 0.6), R.pick([C[1], C[3]]), R.range(1, 2), R.range(0.05, 0.5));
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      if (t < 0.07) sparkle(p, 0, -3, 4, C[3], C[1], 0.8);
      ps.draw(p, "front"); lights.draw(p);
    },
  };
}
