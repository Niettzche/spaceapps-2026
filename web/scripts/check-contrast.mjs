// AA audit of every text role on the three solid surfaces used by pixel-theme.css.
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../src/pixel-theme.css', import.meta.url), 'utf8');
const vars = Object.fromEntries([...css.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]));
const lum = color => {
  const rgb = color.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
const contrast = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
let lowest = Infinity;
for (const role of ['basalt', 'ash', 'lake', 'ochre', 'oxide']) {
  for (const surface of ['regolith', 'bone', 'dust']) {
    const ratio = contrast(vars[role], vars[surface]);
    lowest = Math.min(lowest, ratio);
    if (ratio < 4.5) throw new Error(`${role} / ${surface}: ${ratio.toFixed(2)} fails AA`);
  }
}
for (const surface of ['#ffd166', '#ffe3a1', '#06d6a0']) {
  if (contrast('#0b0d17', surface) < 4.5) throw new Error('Action label fails AA');
}
console.log(`All text roles pass 4.5:1 on solid surfaces. Minimum: ${lowest.toFixed(2)}:1.`);
