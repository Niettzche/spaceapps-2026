// MARSCEPTION: el motor se sobrecalienta (en la Luna y Marte casi no hay aire que lo enfríe). Se dibuja centrado en el motor
// y se repite mientras dure el calor: reverbero que sube ondulando, un brillo rojo que late y bocanadas de vapor tenue.
import { fit, rand } from "../../core/index.js";

export const meta = {
  name: "Sobrecalentamiento",
  desc: "An overheating motor: a red glow pulses on the casing, wavy heat-shimmer ribbons rise and fade, and a thin puff of pale vapour drifts up twice a loop.",
  tags: ["heat", "shimmer", "steam", "robot", "loop", "marsception"],
  size: [24, 40],
  origin: [12, 20],
  duration: 1.2,
  loop: true,
  fps: 15,
  bg: "dark",
  options: { palette: ["#6a101c", "#d42a30", "#f2701f", "#ffd8a8", "#fff6ea"], seed: 3 },
};

const D = meta.duration, TAU = Math.PI * 2;

export function draw(p, t, o) {
  const C = fit(o.palette, 5), ph = t / D;
  // brillo del motor caliente: late dos veces por vuelta
  const late = 0.5 + 0.5 * Math.sin(ph * TAU * 2);
  p.glow(0, 0, 9, C[1], 0.3 + 0.25 * late);
  p.px(-1, 0, C[2]); p.px(0, 0, late > 0.5 ? C[3] : C[2]); p.px(1, 0, C[2]);
  // reverbero: 3 cintas onduladas continuas que suben 16 px por vuelta; abajo naranja caliente, arriba pálidas y tramadas
  for (let j = 0; j < 3; j++) {
    const x0 = -3 + j * 3, fase = j / 3 + (rand(o.seed, j, 2) - 0.5) * 0.1;
    const u = (ph + fase) % 1, yb = -2 - u * 16, largo = 6;
    const nace = Math.min(1, u / 0.15), muere = 1 - Math.max(0, (u - 0.6) / 0.4);
    for (let k = 0; k < largo; k++) {
      const y = Math.round(yb - k);
      const x = Math.round(x0 + Math.sin(((yb - k) / 6) * TAU + j * 2) * 1.3);
      const a = nace * muere * (1 - k / largo);
      if (a <= 0.05) continue;
      const c = u < 0.3 && k < 2 ? C[2] : k < 3 ? C[3] : C[4];
      if (a > 0.6) p.px(x, y, c); else p.dot(x, y, c, a);
    }
  }
  // vapor: dos bocanadas tramadas por vuelta que suben, se abren y se deshacen
  for (let j = 0; j < 2; j++) {
    const u = (ph + 0.25 + j * 0.5) % 1, r = 1.2 + u * 2.2, cx = (j ? 3 : -3) + u * (j ? 1.5 : -1.5), cy = -5 - u * 14;
    const a = (1 - u) * Math.min(1, u * 4) * 0.8;
    for (let yy = Math.floor(cy - r); yy <= cy + r; yy++)
      for (let xx = Math.floor(cx - r); xx <= cx + r; xx++)
        if ((xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2 <= r * r) p.dot(xx, yy, C[4], a * 0.7);
  }
}
