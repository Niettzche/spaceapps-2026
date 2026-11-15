// Tráiler de 30 s (guion de Leo: docs/media/TRAILER_GUION.md). Estilo de arte: entrada con el GIF de MARSCEPTION, cortes con
// transición pixel (pixelize), subtítulos en la fuente pixel del juego y cierre con el logotipo sobre el GIF del viaje.
//
//   node assets/fuente/trailer.mjs                         solo dibuja los rótulos en docs/media/trailer/
//   node assets/fuente/trailer.mjs --tomas <carpeta> [--salida tráiler.mp4] [--gif <carpeta con marsception_HD.gif y marsception_viaje_HD.gif>]
//   (sin --gif: entrada con game/public/video/inicio.mp4 y cierre sobre el fondo del título)
//
// La carpeta de tomas lleva un archivo (mp4, webm, mov, mkv) o una carpeta de cuadros con lista.txt (concat de ffmpeg) por toma,
// con el nombre de la toma: descubrir, pinacate, pingualuit, tenoumer, cananea, jabal_bayda, samalayuca, parangueo, fisica, mision.
// Opcional: tomas.json con el segundo desde el que se usa cada una ({ "pinacate": 3.5 }). Grabar el juego a 960 × 540 con ?lang=en.
// Respaldos si falta una toma: descubrir → diapositiva 3 (mapa); fisica → acercamiento lento de samalayuca.
// ffmpeg: en el PATH o en la variable FFMPEG.
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ASSETS, createFrame, guardar, hex } from './comun.mjs';
import { leerPNG } from './escenas.mjs';
import { textoTitulo } from './titulo.mjs';
import { PALETAS } from './paletas.mjs';

const RAIZ = resolve(ASSETS, '..');
const SAL = '../docs/media/trailer/';
const W = 320, H = 180, ESC = 6;                       // rótulos a la escala del arte del juego (320 × 180 → 1920 × 1080)
const T = 1 / 3;                                       // duración de cada transición pixel

// ------------------------------------------------------------------ guion (tiempos y textos de Leo; no cambiar los datos)
export const TOMAS = [
  { id: 'entrada', dur: 4 },
  { id: 'descubrir', dur: 4, lugar: 'DISCOVER', dato: "Earth's Moon and Mars twins, found with NASA and ESA data" },
  { id: 'pinacate', dur: 2, lugar: 'PINACATE, MEXICO', dato: "Apollo 14's crew trained here" },
  { id: 'pingualuit', dur: 2, lugar: 'PINGUALUIT, CANADA', dato: 'Winter lows of −34 °C' },
  { id: 'tenoumer', dur: 2, lugar: 'TENOUMER CRATER, SAHARA', dato: 'Dust devils, as on Mars' },
  { id: 'cananea', dur: 2, lugar: 'CANANEA OPEN PIT, MEXICO', dato: 'Real walls: 40–50°' },
  { id: 'jabal_bayda', dur: 2, lugar: 'JABAL BAYDA, SAUDI ARABIA', dato: 'A volcanic tuff ring' },
  { id: 'samalayuca', dur: 2, lugar: 'SAMALAYUCA, MEXICO', dato: 'Dunes shaped like Mars dunes' },
  { id: 'parangueo', dur: 2, lugar: 'RINCÓN DE PARANGUEO, MEXICO', dato: 'A dried-up salt lake' },
  { id: 'fisica', dur: 3, lugar: 'WHEELS SINK: BEKKER–WONG', dato: 'Soil data from Apollo and Viking' },
  { id: 'mision', dur: 2, lugar: 'THEN MARS', dato: "38 % of Earth's gravity" },
  { id: 'cierre', dur: 3 },
];

// ------------------------------------------------------------------ fuente BMFont del juego (assets/fuentes)
function fuente(nombre) {
  const xml = readFileSync(join(ASSETS, `fuentes/${nombre}.xml`), 'utf8');
  const chars = {};
  for (const m of xml.matchAll(/<char id="(\d+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" xoffset="(-?\d+)" yoffset="(-?\d+)" xadvance="(\d+)"/g)) {
    const [, id, x, y, w, h, xo, yo, xa] = m.map(Number);
    chars[id] = { x, y, w, h, xo, yo, xa };
  }
  return { chars, img: leerPNG(`fuentes/${nombre}.png`), alto: Number(/lineHeight="(\d+)"/.exec(xml)[1]) };
}
const ancho = (F, s) => [...s].reduce((a, c) => a + (F.chars[c.codePointAt(0)]?.xa ?? 4) + 1, -1);
function escribir(f, F, s, x, y, color, sombra) {
  for (const c of s) {
    const g = F.chars[c.codePointAt(0)] ?? F.chars[63];
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
      if (!(F.img.color[(g.y + j) * F.img.w + g.x + i] >>> 24)) continue;
      const X = x + g.xo + i, Y = y + g.yo + j;
      if (sombra && X + 1 < f.w && Y + 1 < f.h && !(f.color[(Y + 1) * f.w + X + 1] === hex(color))) f.color[(Y + 1) * f.w + X + 1] = hex(sombra);
      if (X >= 0 && Y >= 0 && X < f.w && Y < f.h) f.color[Y * f.w + X] = hex(color);
    }
    x += g.xa + 1;
  }
}
/** Corta el texto en líneas que quepan en `max` px. */
function lineas(F, s, max) {
  const out = [];
  let l = '';
  for (const p of s.split(' ')) { const t = l ? `${l} ${p}` : p; if (ancho(F, t) > max && l) { out.push(l); l = p; } else l = t; }
  return [...out, l];
}
const crecer = (f, k) => {
  const g = createFrame(f.w * k, f.h * k);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) g.color[y * g.w + x] = f.color[Math.floor(y / k) * f.w + Math.floor(x / k)];
  return g;
};
const conAlfa = (h, a) => ((Math.round(a * 255) << 24) | (hex(h) & 0xffffff)) >>> 0;

// ------------------------------------------------------------------ rótulos
export function rotulos() {
  const FT = fuente('pixel_titulo'), FC = fuente('pixel');
  for (const t of TOMAS.filter((x) => x.lugar)) {
    const f = createFrame(W, H), datos = lineas(FC, t.dato, W - 24);
    const alto = 6 + FT.alto + datos.length * FC.alto + 3, y0 = H - alto;
    // franja inferior: azul noche translúcido, filo lavanda arriba y un tramado que la funde con la toma
    for (let y = y0 - 3; y < H; y++) for (let x = 0; x < W; x++) {
      if (y < y0) { if ((x + y) % (y0 - y + 1) === 0) f.color[y * W + x] = conAlfa('#0e0c16', 0.55); continue; }
      f.color[y * W + x] = y === y0 ? hex('#7a4cff') : y === y0 + 1 ? hex('#2e0d6b') : conAlfa('#0e0c16', 0.9);
    }
    for (let y = y0 + 4; y < y0 + 4 + FT.alto - 3; y++) { f.color[y * W + 8] = hex('#ffd166'); f.color[y * W + 9] = hex('#c8901c'); }   // marca
    escribir(f, FC, t.lugar, 13, y0 + 5, '#ffd166', '#5a2a1c');                                     // lugar: mayúsculas en amarillo
    datos.forEach((l, i) => escribir(f, FC, l, 13, y0 + 5 + FT.alto + i * FC.alto, '#ffffff', '#2e0d6b'));
    guardar(`${SAL}subtitulo_${t.id}.png`, crecer(f, ESC));
  }
  // cierre: logotipo, lema y la sede (sin logo de NASA)
  const f = createFrame(W, H);
  textoTitulo(f, 'MARSCEPTION', W / 2, 52, { scale: 3, rampaTexto: PALETAS.titulo.logo, contorno: '#0d051c', sombra: '#2e0d6b', sombraDy: 3 });
  const lema = 'Train on Earth. Land on Mars.';
  escribir(f, FC, lema, Math.round((W - ancho(FC, lema)) / 2), 104, '#ffffff', '#2e0d6b');
  const sede = 'NASA Space Apps 2026';
  escribir(f, FC, sede, Math.round((W - ancho(FC, sede)) / 2), 156, '#b9a6ff', '#0d051c');
  guardar(`${SAL}cierre.png`, crecer(f, ESC));
}

// ------------------------------------------------------------------ armado con ffmpeg
function buscar(dir, id) {
  for (const e of ['mp4', 'webm', 'mov', 'mkv']) if (existsSync(join(dir, `${id}.${e}`))) return { tipo: 'video', ruta: join(dir, `${id}.${e}`) };
  if (existsSync(join(dir, id, 'lista.txt'))) return { tipo: 'lista', ruta: join(dir, id, 'lista.txt') };
  return null;
}

export function armar({ tomas, salida, gif }) {
  const FF = process.env.FFMPEG || 'ffmpeg';
  const desde = existsSync(join(tomas, 'tomas.json')) ? JSON.parse(readFileSync(join(tomas, 'tomas.json'), 'utf8')) : {};
  const entradas = [], filtros = [];
  const salidaV = [];
  const ent = (args) => { entradas.push(...args); return entradas.filter((a) => a === '-i').length - 1; };
  const NORMAL = 'fps=30,setsar=1,format=yuv420p';
  TOMAS.forEach((t, k) => {
    const L = t.dur + (k < TOMAS.length - 1 ? T : 0);
    let v;
    if (t.id === 'entrada') {
      // el GIF del título, sin el «click anywhere to play» de arriba (recorte 16:9)
      const hd = gif && existsSync(join(gif, 'marsception_HD.gif'));          // sin el GIF original: el video del menú del juego
      v = ent(['-i', hd ? join(gif, 'marsception_HD.gif') : join(RAIZ, 'game/public/video/inicio.mp4')]);
      filtros.push(`[${v}:v]trim=0:${L},setpts=PTS-STARTPTS,${hd ? 'crop=1138:640:31:35' : 'crop=904:508:28:26'},scale=1920:1080:flags=lanczos,${NORMAL}[s${k}]`);
    } else if (t.id === 'cierre') {
      const viaje = gif && existsSync(join(gif, 'marsception_viaje_HD.gif'));  // sin el GIF: el fondo estrellado del título
      const g = ent(viaje ? ['-stream_loop', '-1', '-i', join(gif, 'marsception_viaje_HD.gif')] : ['-loop', '1', '-i', join(ASSETS, 'titulo/titulo_fondo.png')]);
      const c = ent(['-loop', '1', '-i', join(ASSETS, SAL, 'cierre.png')]);
      filtros.push(`[${g}:v]trim=0:${L},setpts=PTS-STARTPTS,${viaje ? 'crop=880:495:160:150,' : ''}scale=1920:1080:flags=${viaje ? 'lanczos' : 'neighbor'},eq=brightness=-0.25:saturation=0.8[g${k}]`,
        `[${c}:v]trim=0:${L},setpts=PTS-STARTPTS[c${k}]`, `[g${k}][c${k}]overlay=0:0,${NORMAL}[s${k}]`);
    } else {
      let src = buscar(tomas, t.id), zoom = false;
      if (!src && t.id === 'fisica') { src = buscar(tomas, 'samalayuca'); zoom = true; }
      let base;
      if (src) {
        const d = desde[t.id] ?? (zoom ? 4 : 2.5);
        const i = ent(src.tipo === 'lista' ? ['-f', 'concat', '-safe', '0', '-i', src.ruta] : ['-i', src.ruta]);
        base = zoom
          ? `[${i}:v]trim=${d}:${d + L / 2},setpts=2*(PTS-STARTPTS),scale=960:540,crop=480:270:60:240,scale=1920:1080:flags=neighbor`   // cámara lenta y acercamiento a la rueda
          : `[${i}:v]trim=${d}:${d + L},setpts=PTS-STARTPTS,scale=1920:1080:flags=neighbor`;
      } else if (t.id === 'descubrir') {
        const i = ent(['-loop', '1', '-i', join(RAIZ, 'docs/media/slides/slide_3_modelo.png')]);
        base = `[${i}:v]trim=0:${L},setpts=PTS-STARTPTS,scale=1920:1080,zoompan=z='1+0.04*on/${Math.round(L * 30)}':d=1:s=1920x1080:fps=30`;
      } else throw new Error(`falta la toma «${t.id}» en ${tomas}`);
      const s = ent(['-loop', '1', '-i', join(ASSETS, SAL, `subtitulo_${t.id}.png`)]);
      filtros.push(`${base},${NORMAL}[b${k}]`, `[${s}:v]trim=0:${L},setpts=PTS-STARTPTS[t${k}]`, `[b${k}][t${k}]overlay=0:0,${NORMAL}[s${k}]`);
    }
    salidaV.push(`s${k}`);
  });
  // cadena de transiciones pixel: cada toma dura su tiempo del guion; la transición se come el T extra de la anterior
  let prev = salidaV[0], t0 = 0;
  for (let k = 1; k < salidaV.length; k++) {
    t0 += TOMAS[k - 1].dur;
    const o = k === salidaV.length - 1 ? 'v' : `x${k}`;
    filtros.push(`[${prev}][${salidaV[k]}]xfade=transition=pixelize:duration=${T.toFixed(4)}:offset=${t0.toFixed(4)}[${o}]`);
    prev = o;
  }
  // audio: la voz «MARSCEPTION» del juego al inicio y la música del menú debajo, con salida suave al final
  const total = TOMAS.reduce((a, t) => a + t.dur, 0);
  const voz = ent(['-i', join(RAIZ, 'game/public/audio/marsception_voz.ogg')]);
  const mus = ent(['-stream_loop', '-1', '-i', join(RAIZ, 'game/public/audio/musica_menu.ogg')]);
  filtros.push(`[${mus}:a]atrim=0:${total},asetpts=PTS-STARTPTS,volume=0.7,afade=t=in:d=0.5,afade=t=out:st=${total - 1.5}:d=1.5[m]`,
    `[${voz}:a]adelay=300|300,volume=1.2[vz]`, `[m][vz]amix=inputs=2:duration=first:normalize=0[a]`);
  const args = ['-y', '-v', 'error', ...entradas, '-filter_complex', filtros.join(';'), '-map', '[v]', '-map', '[a]',
    '-t', String(total), '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', salida];
  const r = spawnSync(FF, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg falló');
  console.log(`  ${salida}  ${total} s`);
}

// ------------------------------------------------------------------ línea de comandos
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const arg = (n, def) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : def; };
  mkdirSync(join(ASSETS, SAL), { recursive: true });
  rotulos();
  const tomas = arg('tomas');
  if (tomas) armar({ tomas: resolve(tomas), salida: resolve(arg('salida', 'marsception_trailer_30s.mp4')), gif: arg('gif') ? resolve(arg('gif')) : null });
}
