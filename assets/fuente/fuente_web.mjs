// Fuente pixel de MARSCEPTION para la web (HTML/CSS): los mismos glifos que assets/fuentes/pixel (BMFont del juego),
// convertidos a contornos (un cuadrado por píxel, unidos por tramos horizontales).
//   docs/media/fuentes_web/marsception-pixel.otf y .woff2, y fuentes.css (@font-face + estilo de título como el logo)
// Necesita opentype.js y wawoff2, que no son dependencias del repo:
//   npm i --no-save --prefix <carpeta> opentype.js@1.3.4 wawoff2@2.0.1
//   FUENTE_NPM=<carpeta>/node_modules node assets/fuente/fuente_web.mjs
// Medidas: 1 píxel de la fuente = 100 unidades; unitsPerEm = 1100 (la celda de 11 filas). Con font-size de 22 px cada
// píxel mide 2 px exactos (como el juego a × 2); usar múltiplos de 11 px (11, 22, 33, 44) para que no se emborrone.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glifos, ALTO, BASE_Y } from './fuentes.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', '..', 'docs', 'media', 'fuentes_web');
const NPM = process.env.FUENTE_NPM;
if (!NPM) { console.error('Falta FUENTE_NPM=<carpeta node_modules con opentype.js y wawoff2>'); process.exit(2); }
const req = createRequire(join(resolve(NPM), 'x.js'));
const opentype = req('opentype.js'), wawoff2 = req('wawoff2');

const P = 100, EM = ALTO * P, ASC = BASE_Y * P, DESC = -(ALTO - BASE_Y) * P;
const G = glifos();

function glifo(ch, g) {
  const path = new opentype.Path();
  // filas de la celda (0 arriba) → unidades con la línea base en 0 (la fila BASE_Y - 1 apoya en la base)
  const filas = {};
  for (const s of g.px) { const [x, y] = s.split(',').map(Number); (filas[y] ??= []).push(x); }
  for (const [y, xs] of Object.entries(filas)) {
    xs.sort((a, b) => a - b);
    let i = 0;
    while (i < xs.length) {
      let j = i;
      while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
      const x0 = xs[i] * P, x1 = (xs[j] + 1) * P, top = (BASE_Y - Number(y)) * P, bot = top - P;
      // sentido antihorario (exterior en CFF): abajo-izq → abajo-der → arriba-der → arriba-izq
      path.moveTo(x0, bot); path.lineTo(x1, bot); path.lineTo(x1, top); path.lineTo(x0, top); path.close();
      i = j + 1;
    }
  }
  return new opentype.Glyph({ name: `u${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`, unicode: ch.codePointAt(0), advanceWidth: (g.w + 1) * P, path });
}

const lista = [
  new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 4 * P, path: new opentype.Path() }),
  new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: 4 * P, path: new opentype.Path() }),
  ...Object.keys(G).sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).map((ch) => glifo(ch, G[ch])),
];
const fuente = new opentype.Font({ familyName: 'MARSCEPTION Pixel', styleName: 'Regular', unitsPerEm: EM, ascender: ASC, descender: DESC, glyphs: lista });
const otf = Buffer.from(fuente.toArrayBuffer());
mkdirSync(SALIDA, { recursive: true });
writeFileSync(join(SALIDA, 'marsception-pixel.otf'), otf);
const woff2 = Buffer.from(await wawoff2.compress(otf));
writeFileSync(join(SALIDA, 'marsception-pixel.woff2'), woff2);

const css = `/* Fuente pixel de MARSCEPTION (la misma letra que el juego). Copiar esta carpeta a web/public/fonts/. */
@font-face {
  font-family: "MARSCEPTION Pixel";
  src: url("marsception-pixel.woff2") format("woff2"), url("marsception-pixel.otf") format("opentype");
  font-display: swap;
}
/* Cuerpo: múltiplos de 11 px para que cada píxel de la fuente caiga en píxeles enteros (22 px = × 2 como el juego). */
.pixel { font-family: "MARSCEPTION Pixel", monospace; font-size: 22px; line-height: 24px; -webkit-font-smoothing: none; font-smooth: never; }
/* Título con el estilo del logo (pixel_titulo): degradado blanco → lavanda → morado, contorno oscuro y sombra morada. */
.pixel-titulo {
  font-family: "MARSCEPTION Pixel", monospace; font-size: 33px; line-height: 42px;
  background: linear-gradient(#ffffff 0%, #f0e8ff 30%, #d4c0ff 50%, #b090ff 70%, #8a60e8 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(3px 0 0 #0d051c) drop-shadow(-3px 0 0 #0d051c) drop-shadow(0 3px 0 #0d051c) drop-shadow(0 -3px 0 #0d051c) drop-shadow(0 3px 0 #2e0d6b);
}
`;
writeFileSync(join(SALIDA, 'fuentes.css'), css);
console.log(`  marsception-pixel.otf ${otf.length} B, .woff2 ${woff2.length} B, ${lista.length} glifos; fuentes.css`);
