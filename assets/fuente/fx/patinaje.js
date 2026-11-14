// MARSCEPTION: arena que salta cuando una rueda patina (el problema del camino dorado: hay que leerlo de un vistazo).
// El juego lanza una hoja cada ~70 ms desde el borde trasero de la rueda; encimadas forman un chorro continuo.
import { Particles, P, Rng, fit, mix, WHITE } from "../../core/index.js";

export const meta = {
  name: "Patinaje en arena",
  desc: "A spinning wheel throws a rooster tail of sand back and up: a fan of grains in a high arc that rain down, with a low dust cloud that rolls back along the ground.",
  tags: ["dust", "sand", "wheel", "spin", "ground", "one-shot", "marsception"],
  size: [56, 26],
  origin: [28, 24],
  duration: 0.75,
  loop: false,
  fps: 15,
  bg: "ground",
  options: { palette: ["#5e3a24", "#8a5a36", "#b8844e", "#dcae74", "#f6d698"], seed: 5 },
};

export function create(o) {
  const C = fit(o.palette, 5), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor });
  const LIT = mix(C[4], WHITE, 0.1);
  // abanico de granos: salen rápido hacia atrás y arriba, en arco, y llueven
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + R.range(0.45, 1.1), v = R.range(110, 160);
    ps.spawn(P.GRIT, R.range(-1, 1), -R.range(1, 3), Math.cos(a) * v, Math.sin(a) * v, R.range(0.38, 0.55), R.pick([C[2], C[3], LIT]), R.chance(0.25) ? 2 : 1, R.range(0, 0.08));
  }
  // nube baja que rueda hacia atrás pegada al suelo
  for (let i = 0; i < 6; i++)
    ps.spawn(P.DUST, -R.range(1, 4), -R.range(1, 3), -R.range(18, 40), -R.range(2, 8), R.range(0.4, 0.7), R.chance(0.5) ? C[3] : C[2], R.range(1.8, 3.2), R.range(0, 0.1));
  // y un velo más alto y tenue que acompaña al abanico
  for (let i = 0; i < 3; i++)
    ps.spawn(P.DUST, -R.range(3, 6), -R.range(4, 7), -R.range(20, 34), -R.range(14, 24), R.range(0.35, 0.55), C[3], R.range(1.5, 2.4), R.range(0.02, 0.08));
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); },
    draw(p) { ps.draw(p, "back"); ps.draw(p, "front"); },
  };
}
