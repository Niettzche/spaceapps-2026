// Exporta todas las hojas de efectos de MARSCEPTION con pixelfx.
//   node assets/fuente/fx/exportar.mjs            (todas)
//   node assets/fuente/fx/exportar.mjs polvo      (solo las que empiezan por fx_polvo)
// Copia los efectos de esta carpeta a <pixelfx>/src/fx/marsception/, corre `check.mjs`, renderiza cada variante con
// `render.mjs --sheet --opts` y deja fx_<nombre>.png + .json en assets/fx/. Ruta de pixelfx: PIXELFX o ../../../../tools/pixelfx.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PFX = resolve(process.env.PIXELFX ?? join(AQUI, '..', '..', '..', '..', 'tools', 'pixelfx'));
const SALIDA = resolve(AQUI, '..', '..', 'fx');
const DESTINO = join(PFX, 'src', 'fx', 'marsception');

// rampas de polvo por mundo y superficie (paletas.json → polvo, y tonos de roca/compacto aclarados para que se vean sobre el suelo)
const PAL = {
  tierra_arena: ['#5e3a24', '#8a5a36', '#b8844e', '#dcae74', '#f6d698'],
  tierra_roca: ['#43363a', '#624e4c', '#8a6e62', '#b8967e', '#d8bca0'],
  tierra_compacto: ['#5e432e', '#866244', '#a88058', '#c8a070', '#e6c898'],
  marte_arena: ['#4a1e12', '#7a3420', '#a85232', '#d07c4e', '#ecb07c'],
  marte_roca: ['#56241a', '#7a3824', '#a65232', '#c8744a', '#e09a6a'],
  marte_compacto: ['#4e2216', '#743622', '#9a4e2e', '#c06c40', '#de9662'],
  luna_arena: ['#2c2c36', '#4a4a56', '#7c7c8a', '#b4b4c0', '#e8e8f0'],
  luna_roca: ['#3c3c48', '#5c5c6a', '#8a8a98', '#b4b4c0', '#dcdce6'],
};
const ARENA = { nubes: 5, granos: 3 }, ROCA = { nubes: 2, granos: 6 }, COMPACTO = { nubes: 4, granos: 2 };

// nombre de la hoja → [efecto, opciones]
const HOJAS = {
  fx_polvo_tierra_arena: ['polvo-arena', { ...ARENA, palette: PAL.tierra_arena }],
  fx_polvo_roca: ['polvo-arena', { ...ROCA, palette: PAL.tierra_roca }],
  fx_polvo_compacto: ['polvo-arena', { ...COMPACTO, palette: PAL.tierra_compacto }],
  fx_polvo_marte_arena: ['polvo-arena', { ...ARENA, palette: PAL.marte_arena }],
  fx_polvo_marte_roca: ['polvo-arena', { ...ROCA, palette: PAL.marte_roca }],
  fx_polvo_marte_compacto: ['polvo-arena', { ...COMPACTO, palette: PAL.marte_compacto }],
  fx_polvo_luna_arena: ['polvo-arena', { ...ARENA, palette: PAL.luna_arena }],
  fx_polvo_luna_roca: ['polvo-arena', { ...ROCA, palette: PAL.luna_roca }],
  fx_polvo_marte: ['polvo-arena', { ...ARENA, palette: PAL.marte_arena }],
  fx_polvo_luna: ['polvo-arena', { ...ARENA, palette: PAL.luna_arena }],
  fx_patinaje: ['patinaje', {}],
  fx_patinaje_marte: ['patinaje', { palette: PAL.marte_arena }],
  fx_patinaje_luna: ['patinaje', { palette: PAL.luna_arena }],
  fx_golpe_chasis: ['golpe-chasis', {}],
  fx_golpe_carga: ['golpe-carga', {}],
  fx_carga_perdida: ['carga-perdida', {}],
  fx_chasis_destruido: ['chasis-destruido', {}],
  fx_energia_agotada: ['energia-agotada', {}],
  fx_energia_agotada_luna: ['energia-agotada', { palette: ['#4a4a56', '#6c6c7a', '#8a8a98', '#b4b4c0', '#d4d4de'] }],
  fx_entrega: ['entrega', {}],
  fx_meta: ['meta', {}],
  fx_sobrecalentamiento: ['sobrecalentamiento', {}],
};

const filtro = process.argv[2];
mkdirSync(DESTINO, { recursive: true });
for (const f of readdirSync(AQUI).filter((f) => f.endsWith('.js'))) copyFileSync(join(AQUI, f), join(DESTINO, f));
const node = (args) => execFileSync(process.execPath, args, { cwd: PFX, stdio: ['ignore', 'pipe', 'inherit'] }).toString();
process.stdout.write(node(['tools/check.mjs', 'marsception/*']).split('\n').slice(-2).join('\n') + '\n');
for (const [nombre, [id, opts]] of Object.entries(HOJAS)) {
  if (filtro && !nombre.startsWith(`fx_${filtro}`)) continue;
  node(['tools/render.mjs', `marsception/${id}`, '--sheet', '--opts', JSON.stringify(opts)]);
  for (const ext of ['png', 'json']) copyFileSync(join(PFX, 'records', 'marsception', id, `${id}.${ext}`), join(SALIDA, `${nombre}.${ext}`));
  console.log('  ' + nombre);
}
