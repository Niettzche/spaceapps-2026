// Genera el arte de MARSCEPTION en /assets.
//   node assets/fuente/generar.mjs [grupo ...] [--vista carpeta]
// Grupos: entidades, terreno, fondos, ui, iconos, titulo, menu, fuentes, escenas (sin grupos = todos).
// --vista escribe hojas de revisión ampliadas (no van al repo).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { registro, composite, core } from './comun.mjs';

const args = process.argv.slice(2);
const iv = args.indexOf('--vista');
const vista = iv >= 0 ? args.splice(iv, 2)[1] : null;
const GRUPOS = ['entidades', 'terreno', 'fondos', 'ui', 'iconos', 'titulo', 'menu', 'fuentes', 'escenas']; // escenas va al final: compone el arte ya generado
const pedidos = args.length ? args : GRUPOS;

for (const g of pedidos) {
  if (!GRUPOS.includes(g)) throw new Error(`grupo desconocido: ${g}`);
  console.log(g);
  const mod = await import(`./${g}.mjs`);
  mod.generar();
}

if (vista) {
  const { encodePNG } = await import('./comun.mjs');
  mkdirSync(vista, { recursive: true });
  // una hoja por grupo de archivos: cada imagen ampliada sobre fondo neutro oscuro
  const porCarpeta = {};
  for (const r of registro) (porCarpeta[r.ruta.split('/')[0]] ??= []).push(r);
  for (const [carpeta, lista] of Object.entries(porCarpeta)) {
    const zoom = carpeta === 'fondos' || carpeta === 'titulo' ? 3 : 8, pad = 6;
    const W = Math.max(...lista.map((r) => r.frame.w * zoom)) + pad * 2;
    const H = lista.reduce((a, r) => a + r.frame.h * zoom + pad, pad);
    const out = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) { const chk = ((i % W) >> 3 ^ ((i / W) | 0) >> 3) & 1; out.set(chk ? [44, 40, 56, 255] : [34, 31, 44, 255], i * 4); }
    let y0 = pad;
    for (const { frame } of lista) {
      const rgba = new Uint8ClampedArray(frame.w * frame.h * 4);
      composite(frame, rgba, null);
      for (let y = 0; y < frame.h * zoom; y++)
        for (let x = 0; x < frame.w * zoom; x++) {
          const s = (((y / zoom) | 0) * frame.w + ((x / zoom) | 0)) * 4, a = rgba[s + 3] / 255;
          if (!a) continue;
          const d = ((y0 + y) * W + pad + x) * 4;
          for (let k = 0; k < 3; k++) out[d + k] = rgba[s + k] * a + out[d + k] * (1 - a);
        }
      y0 += frame.h * zoom + pad;
    }
    writeFileSync(join(vista, `vista_${carpeta}.png`), encodePNG(W, H, out));
  }
  console.log('vista en', vista);
}
void core;
