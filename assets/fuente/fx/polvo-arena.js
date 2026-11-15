// MARSCEPTION: polvo de una rueda que rueda sobre arena. El robot avanza a la derecha, así que el polvo sale hacia la izquierda.
// El juego lanza una hoja cada ~110 ms por rueda y las encima: cada una es una bocanada corta.
import { Particles, P, Rng, fit, mix, WHITE } from "../../core/index.js";

export const meta = {
  name: "Polvo de arena",
  desc: "A small puff of sand kicked back and up from a rolling wheel: soft lit dust that swells and thins, and a few grains that hop and settle.",
  tags: ["dust", "sand", "wheel", "ground", "one-shot", "marsception"],
  size: [24, 14],
  origin: [12, 14],
  duration: 0.6,
  loop: false,
  fps: 15,
  bg: "ground",
  options: { palette: ["#5e3a24", "#8a5a36", "#b8844e", "#dcae74", "#f6d698"], seed: 3, nubes: 5, granos: 3 },
};

export function create(o) {
  const C = fit(o.palette, 5), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor });
  const LIT = mix(C[3], WHITE, 0.15);
  // bocanada: 5 nubecitas que salen hacia atrás, suben un poco y se deshacen
  // superficie: arena = mucha nube y pocos granos; roca = poca nube y esquirlas; compacto = intermedio
  for (let i = 0; i < o.nubes; i++)
    ps.spawn(P.DUST, R.range(-1, 2), -R.range(2, 3), -R.range(10, 28), -R.range(3, 11), R.range(0.32, 0.55), R.chance(0.5) ? LIT : C[2], R.range(1.3, 2.3), R.range(0, 0.06));
  // granos que saltan hacia atrás y caen
  for (let i = 0; i < o.granos; i++)
    ps.spawn(P.GRIT, R.range(-1, 1), -1, -R.range(18, 40), -R.range(30, 60), R.range(0.35, 0.5), R.pick([C[1], C[2], C[3]]), 1);
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); },
    draw(p) { ps.draw(p, "back"); ps.draw(p, "front"); },
  };
}
