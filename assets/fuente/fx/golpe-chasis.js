// MARSCEPTION: el chasis golpea una roca. Un cuadro blanco, chispas que saltan y rebotan, y un poco de polvo de roca.
import { Particles, Lights, P, Rng, fit, sparkle } from "../../core/index.js";

export const meta = {
  name: "Golpe de chasis",
  desc: "Metal scrapes rock: a one-frame white-hot star at the contact, a fan of sparks that fly up, fall and bounce off the floor, and a pinch of rock dust.",
  tags: ["impact", "sparks", "metal", "robot", "one-shot", "marsception"],
  size: [48, 40],
  origin: [24, 20],
  duration: 0.5,
  loop: false,
  fps: 15,
  bg: "ground",
  options: { palette: ["#2e3648", "#4a5468", "#9aa6ba", "#d0d8e6", "#ffffff"], seed: 7 },
};

export function create(o) {
  const C = fit(o.palette, 5), R = new Rng(o.seed), floor = () => 2;
  const ps = new Particles({ rng: R, ground: floor, sparks: ["#ffffff", "#fff08a", "#ffd23c", "#f2701f"] });
  const lights = new Lights();
  lights.add(0, 0, 10, 0xffe8a0, 0.8, 0.18);
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + R.range(-1.3, 1.3), v = R.range(60, 130);
    ps.spawn(P.SPARK, R.range(-1, 1), 0, Math.cos(a) * v, Math.sin(a) * v, R.range(0.2, 0.4));
  }
  for (let i = 0; i < 3; i++) ps.spawn(P.DUST, R.range(-2, 2), 1, R.range(-10, 10), -R.range(3, 8), R.range(0.25, 0.4), C[1], R.range(1.2, 2));
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      if (t < 0.07) sparkle(p, 0, 0, 3, C[4], C[3], 0.8);
      ps.draw(p, "back"); ps.draw(p, "front"); lights.draw(p);
    },
  };
}
