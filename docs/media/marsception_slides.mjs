// Editable submission deck. Run with Codex's bundled @oai/artifact-tool runtime.
// RUNTIME_NODE_MODULES, PRESENTATIONS_SKILL, RUNTIME_PYTHON and SLIDES_WORKSPACE
// select local runtime paths; no credentials or external services are required.
import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const workspace = process.env.SLIDES_WORKSPACE || path.resolve(root, '..');
const build = path.join(workspace, 'work/slides');
const out = path.join(workspace, 'outputs');
const finalPptx = path.join(out, process.env.SLIDES_FINAL_NAME || 'marsception_slides.pptx');
const modules = process.env.RUNTIME_NODE_MODULES;
if (!modules) throw new Error('Set RUNTIME_NODE_MODULES to the bundled Node packages.');
const pkg = path.join(modules, '@oai/artifact-tool');
const { Presentation, PresentationFile } = await import(pathToFileURL(path.join(pkg, 'dist/artifact_tool.mjs')));
const { Canvas, loadImage } = await import(pathToFileURL(path.join(pkg, 'node_modules/skia-canvas/lib/index.mjs')));
await fs.mkdir(build, { recursive: true });
await fs.mkdir(out, { recursive: true });

const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { bg: '#0b0d17', panel: '#141c2e', text: '#f1f5ff', muted: '#a3abcc', data: '#80e0dc', action: '#ffd166', risk: '#ff7a93' };
function box(s, x, y, w, h, fill = C.panel, stroke = '#43516b') {
  return s.shapes.add({ geometry: 'rect', position: { left: x, top: y, width: w, height: h }, fill, line: { fill: stroke, width: 2 } });
}
function text(s, value, x, y, w, h, size = 28, color = C.text, bold = false) {
  const t = s.shapes.add({ geometry: 'textbox', position: { left: x, top: y, width: w, height: h }, fill: 'none', line: { fill: 'none', width: 0 } });
  t.text = value;
  t.text.style = { typeface: 'Consolas', fontSize: size, color, bold, verticalAlignment: 'middle' };
  return t;
}
async function art(s, relative, x, y, w, h, cover = false, frame = false) {
  const source = await loadImage(path.join(root, relative));
  const canvas = new Canvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (frame) ctx.drawImage(source, 0, 0, 48, 48, 0, 0, w, h);
  else {
    const scale = cover ? Math.max(w / source.width, h / source.height) : Math.min(w / source.width, h / source.height);
    const sw = Math.round(source.width * scale), sh = Math.round(source.height * scale);
    ctx.drawImage(source, Math.round((w - sw) / 2), Math.round((h - sh) / 2), sw, sh);
  }
  const png = await canvas.toBuffer('png');
  s.images.add({ blob: png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength), contentType: 'image/png', alt: relative, fit: 'contain', position: { left: x, top: y, width: w, height: h } });
}
function slide(title, sources) {
  const s = deck.slides.add(); s.background.fill = C.bg;
  if (title) text(s, title, 48, 38, 1184, 92, 48, C.text, true);
  s.speakerNotes.text = sources + '\nOriginal MARSCEPTION art by Mauricio, AI-assisted. Game art is illustrative. Sources and AI disclosure: docs/USO_IA.md; docs/METHODOLOGY_EN.md.';
  return s;
}
function foot(s, label) { text(s, label, 48, 657, 1150, 35, 18, C.muted); }

// 1. The challenge
{
  const s = slide('', 'Challenge and limits: docs/GUION_PITCH.md; docs/METHODOLOGY_EN.md. https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/');
  await art(s, 'assets/pantallas/menu_fondo.png', 0, 0, 1280, 720, true);
  box(s, 930, 0, 350, 720, C.bg, C.bg);
  box(s, 48, 54, 780, 260, C.bg);
  text(s, 'Earth can train a rover', 72, 76, 730, 120, 54, C.text, true);
  text(s, 'Some conditions stay on\nthe Moon and Mars', 72, 211, 720, 80, 32, C.data);
  await art(s, 'assets/menu/planeta_marte.png', 974, 132, 192, 192, false, true);
  await art(s, 'assets/menu/planeta_luna.png', 1006, 416, 144, 144, false, true);
  box(s, 646, 556, 570, 104, C.bg);
  text(s, 'Comparable terrain\nDifferent mission conditions', 670, 574, 520, 70, 26, C.text);
  box(s, 48, 658, 400, 36, C.bg, C.bg);
  text(s, 'AI-assisted game art', 58, 660, 380, 30, 18, C.muted);
}
// 2. The solution
{
  const s = slide('MARSCEPTION', 'Product and scope: docs/GUION_PITCH.md; docs/METHODOLOGY_EN.md. Demo https://v1.marsception.us/');
  await art(s, 'docs/media/proyecto_space_apps.png', 456, 156, 776, 437);
  text(s, 'Earth analogs', 48, 196, 410, 56, 36, C.data, true);
  text(s, 'Evidence and limits', 48, 257, 400, 64, 28);
  text(s, 'Rover experiments', 48, 372, 410, 90, 36, C.action, true);
  text(s, 'Build. Test. Improve.', 48, 469, 420, 64, 28);
  foot(s, 'Mexico + Atacama, Arizona, Arabia. 3 of 10 prioritized arid regions.');
}
// 3. Distinct scientific checks
{
  const s = slide('An explainable terrain model', 'docs/METHODOLOGY_EN.md; model/VALIDATION.md; ciencia_datos/03_etiquetas_por_fuentes.ipynb. Detector validation 9/11; spatially grouped balanced accuracy about 78%; 296 arid candidates. These are separate evaluations.');
  const rows = [
    ['9/11', 'Known Mexican craters detected', 'Detector validation'],
    ['~78%', 'Moon / Mars balanced accuracy', 'Spatially grouped validation'],
    ['296', 'Arid candidates for review', 'Mexico + 3 arid regions'],
  ];
  rows.forEach(([n, label, detail], i) => {
    const y = 160 + i * 147;
    text(s, n, 48, y, 232, 88, 66, C.data, true);
    text(s, label, 304, y + 4, 880, 48, 32, C.text, true);
    text(s, detail, 304, y + 59, 870, 42, 24, C.muted);
  });
  foot(s, 'Separate checks. Candidates still need scientific and field review.');
}
// 4. Data sources
{
  const s = slide('NASA data across three worlds', 'NASA MODIS https://modis.gsfc.nasa.gov/data/; NASA POWER https://power.larc.nasa.gov/; LRO LOLA https://pds-geosciences.wustl.edu/missions/lro/lola.htm; HRSC+MOLA https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blend_dem_global_200m; ESA Copernicus https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM');
  const cols = [
    ['EARTH', 'web/public/data/img/j_tierra_MX0261.png', 'NASA MODIS + POWER', 'Vegetation / climate', 'ESA Copernicus DEM'],
    ['MOON', 'web/public/data/img/j_luna_0.png', 'NASA LRO / LOLA', 'Lunar elevation', 'South-pole terrain'],
    ['MARS', 'web/public/data/img/j_marte_Oxi0.png', 'NASA MOLA + ESA HRSC', 'Martian elevation', 'USGS blended DEM'],
  ];
  for (let i = 0; i < cols.length; i++) {
    const [name, image, source, use, note] = cols[i], x = 48 + i * 408;
    await art(s, image, x, 150, 368, 230, true);
    text(s, name, x, 395, 370, 48, 36, C.action, true);
    text(s, source, x, 453, 380, 68, 25, C.data, true);
    text(s, use, x, 526, 380, 40, 24);
    text(s, note, x, 574, 380, 42, 22, C.muted);
  }
  foot(s, 'Elevation-derived relief. Shared comparison resolution: 200 m per pixel.');
}
// 5. Four vignettes of the golden path
{
  const s = slide('A design improves through testing', 'AGENTS.md section 11; docs/juego/ESPECIFICACION.md; docs/METHODOLOGY_EN.md. Samalayuca standard wheels slip; wide wheels improve the calibrated game test. Artwork illustrates the intended path and is not a screenshot of a completed run.');
  const titles = ['1  Choose an analog', '2  Build a rover', '3  Test and improve', '4  Deliver supplies'];
  const details = ['Compare the evidence', 'Parts within a budget', 'Slip. Change wheels. Retry.', 'Mars or Moon mission'];
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 304;
    await art(s, `assets/tutorial/tutorial_${i + 1}.png`, x, 190, 288, 192);
    text(s, titles[i], x, 411, 288, 80, 26, C.action, true);
    text(s, details[i], x, 507, 288, 96, 24);
  }
  foot(s, 'AI-assisted game art. Prices, parts and scores are game values (P).');
}
// 6. Limits
{
  const s = slide('Where the analogy breaks down', 'docs/METHODOLOGY_EN.md; data/targets; docs/taller/Space_Apps_Game_Data.xlsx, Judges and Ambiente. https://ssd.jpl.nasa.gov/planets/phys_par.html . Soft-soil sinkage is not modeled.');
  await art(s, 'assets/pantallas/destino_polo_sur_lunar.png', 48, 192, 528, 352);
  const limits = [ ['Gravity', 'Earth 9.81 / Mars 3.71 / Moon 1.62 m/s²'], ['Atmosphere', 'Lunar vacuum / thin Martian air'], ['Radiation and cold', 'Destination conditions need separate tests'] ];
  limits.forEach(([name, detail], i) => { const y = 166 + i * 147; text(s, name, 624, y, 600, 52, 34, C.risk, true); text(s, detail, 624, y + 55, 588, 82, 26); });
  foot(s, 'AI-assisted game art. The game models slip; sinkage stays outside its scope.');
}
// 7. Impact and next step
{
  const s = slide('Evidence people can explore', 'Impact is an intended use, not a measured learning outcome. Next step: user testing with educators and scientific review. AI declaration: docs/USO_IA.md. Pixel art effects built with pixelfx, MIT License, 2026 Patch and Hugo Duprez. Demo https://v1.marsception.us/ .');
  await art(s, 'assets/pantallas/resultado_entrega.png', 624, 166, 576, 384);
  text(s, 'Classrooms', 48, 186, 540, 60, 38, C.data, true);
  text(s, 'Open scientific review', 48, 272, 550, 90, 34, C.data, true);
  text(s, 'Next: educator pilots\nand candidate review', 48, 414, 550, 100, 30);
  text(s, 'v1.marsception.us', 48, 571, 1130, 60, 40, C.action, true);
  foot(s, 'AI-assisted code, art and labels. Source checks and limits in USO_IA.md.');
}

for (const [i, s] of deck.slides.items.entries()) {
  const png = await deck.export({ slide: s, format: 'png', scale: 1 });
  await fs.writeFile(path.join(build, `slide-${i + 1}.png`), new Uint8Array(await png.arrayBuffer()));
}
const draft = path.join(build, 'draft.pptx');
await (await PresentationFile.exportPptx(deck)).save(draft);
if (process.env.PRESENTATIONS_SKILL) {
  const { finalizePresentation } = await import(pathToFileURL(path.join(process.env.PRESENTATIONS_SKILL, 'container_tools/artifact_tool_utils.mjs')));
  try { await finalizePresentation({
    workspaceDir: workspace, candidatePath: draft, finalPath: finalPptx,
    pythonExecutable: process.env.RUNTIME_PYTHON,
    integrityValidatorPath: path.join(process.env.PRESENTATIONS_SKILL, 'container_tools/inspect_presentation_package_integrity.py'),
    layoutValidatorPath: path.join(process.env.PRESENTATIONS_SKILL, 'container_tools/inspect_presentation_layout_geometry.py'),
    layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
    explicitTotalSlideCount: 7, requiredNativeTableOwnerSlides: [],
    fontPolicy: { basis: 'design', families: ['Consolas'] }, verifyArtifactToolImport: true,
    receiptPath: path.join(build, 'validation.json'),
  }); } catch (error) {
    // Windows sandbox can forbid hard links after every validator has passed.
    // Copy the same validated candidate exclusively; never overwrite a user file.
    if (error.code !== 'EPERM' || error.syscall !== 'link') throw error;
    await fs.copyFile(draft, finalPptx, fsConstants.COPYFILE_EXCL);
    await fs.writeFile(path.join(build, 'publication-fallback.json'), JSON.stringify({
      validatorsCompleted: true, reason: 'Windows rejected final atomic hard link; used exclusive copy',
      source: draft, output: finalPptx,
    }, null, 2));
  }
  await fs.copyFile(finalPptx, path.join(here, 'marsception_slides.pptx'));
} else await fs.copyFile(draft, path.join(here, 'marsception_slides.pptx'));
// The PDF operation is a separate explicit export, run after visual review.
if (process.env.EXPORT_SLIDES_PDF === '1') {
  try {
    const pdf = await deck.export({ format: 'pdf' });
    await fs.writeFile(path.join(out, 'marsception_slides.pdf'), new Uint8Array(await pdf.arrayBuffer()));
    await fs.copyFile(path.join(out, 'marsception_slides.pdf'), path.join(here, 'marsception_slides.pdf'));
    await fs.copyFile(path.join(out, 'marsception_slides.pdf'), path.join(root, 'web/public/media/marsception_slides.pdf'));
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND' || !String(error.message).includes('#standard-fonts')) throw error;
    execFileSync(process.env.RUNTIME_PYTHON || 'python', [path.join(here, 'marsception_slides_pdf.py'), build], { stdio: 'inherit' });
  }
}
console.log('Seven slides exported. Review work/slides/slide-*.png before delivery.');
