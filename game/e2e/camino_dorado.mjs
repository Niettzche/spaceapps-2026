// Prueba de extremo a extremo del camino dorado (AGENTS.md §11) a través de la interfaz REAL de cada escena,
// en Chromium sin ventana. Hace clic con el ratón en los botones de Phaser (posición en pantalla calculada con
// Scale.FIT sobre el lienzo de 960 × 540) y maneja con las flechas del teclado. Solo si un clic real no surte
// efecto, emite 'pointerdown' sobre el objeto y lo anota como "respaldo" (eso también es un hallazgo).
//
// Recorrido, una vez para Marte (jezero → Samalayuca) y otra para la Luna (polo_sur_lunar → maar Al Wahbah, g00281):
//   Boot → Menú → Nueva partida → destino → Expediente (sitio) → gastar ticket → Taller (ruedas estándar) → Prueba
//   → Resultados (en Samalayuca y Al Wahbah: falla y recomienda rueda ancha) → Volver al taller → ruedas anchas en ambos ejes
//   → Prueba → Resultados → Lanzar misión → Misión (acelera; frena en la zona de entrega) → Resultados (puntos y estrellas)
//   → Menú (para empezar la siguiente corrida).
//
// No forma parte del build (Vite no lo importa) ni de las dependencias del juego. Cómo correrlo:
//   1) cd game && npx vite --port 5205 --strictPort        # servidor de desarrollo: window.__mc solo existe en DEV
//   2) npm i --no-save playwright-core                       # o apunta PW_CORE a una copia ya instalada
//   3) CHROMIUM=~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell \
//      URL=http://localhost:5205/ OUT=/tmp/e2e node e2e/camino_dorado.mjs [marte|luna|ambos]
// Variables: CHROMIUM (obligatoria: ejecutable de Chromium), URL (por defecto http://localhost:5173/; se le agrega ?lang=es),
//   OUT (carpeta de capturas, por defecto ./e2e-capturas), PW_CORE (ruta a playwright-core si no está en game/node_modules),
//   LIMITE_S (segundos de pared máximos por recorrido, por defecto 360).
// Sale con código 1 si algún paso falla. Al final imprime una tabla por corrida y los errores de consola o de página.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const CHROMIUM = process.env.CHROMIUM;
// Los botones se buscan por su texto en español: la página se abre con ?lang=es (salvo que URL ya traiga ?lang=).
const URL = (() => {
  const u = new globalThis.URL(process.env.URL ?? 'http://localhost:5173/');
  if (!u.searchParams.has('lang')) u.searchParams.set('lang', 'es');
  return u.toString();
})();
const OUT = resolve(process.env.OUT ?? './e2e-capturas');
const LIMITE_S = Number(process.env.LIMITE_S ?? 360);
const PX_POR_M = 24;
if (!CHROMIUM) { console.error('Falta CHROMIUM=<ruta al ejecutable de Chromium>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

async function cargarPlaywright() {
  try { return await import('playwright-core'); } catch { /* sin copia local */ }
  if (!process.env.PW_CORE) throw new Error('No se encontró playwright-core: npm i --no-save playwright-core, o define PW_CORE');
  return createRequire(join(resolve(process.env.PW_CORE), 'package.json'))(resolve(process.env.PW_CORE));
}
const { chromium } = await cargarPlaywright();

const CORRIDAS = {
  marte: { id: 'marte', boton: 'Elegir Marte', destino: 'jezero', sitio: 'Médanos de Samalayuca', sitioId: 'samalayuca', esperaFalla: true },
  // La mina de Real de Ángeles (mx0207) ya no es camino dorado: su tramo es la pared del tajo, de roca, y la rueda ancha no la
  // sube (pieza clave: tacos o estándar; perfil.js, VENTANAS_JUEGO). El maar Al Wahbah sí: salir del cráter por regolito.
  luna: { id: 'luna', boton: 'Elegir Luna', destino: 'polo_sur_lunar', sitio: 'Maar Al Wahbah', sitioId: 'g00281', esperaFalla: true },
};
const pedidas = (process.argv[2] ?? 'ambos') === 'ambos' ? ['marte', 'luna'] : [process.argv[2]];

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
// "Cómo jugar" (Menú) sale la primera vez que se pulsa "Nueva partida" en un navegador; la prueba lo da por visto con
// la misma marca que deja el juego (game/src/scenes/expediente/como_jugar.js), así el camino dorado no cambia.
await page.addInitScript(() => { try { localStorage.setItem('marsception.como_jugar.visto', '1'); } catch { /* sin almacenamiento */ } });
const errores = [];
page.on('pageerror', (e) => errores.push({ paso: pasoActual, tipo: 'pageerror', texto: e.message }));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push({ paso: pasoActual, tipo: m.type(), texto: m.text() }); });

let pasoActual = 'inicio';
let nCaptura = 0;
let prefijo = '';
const tabla = [];
const respaldos = [];

async function captura(nombre) {
  const ruta = join(OUT, `${prefijo}${String(++nCaptura).padStart(2, '0')}_${nombre}.png`);
  await page.screenshot({ path: ruta });
  return ruta;
}

// ---------- utilidades dentro de la página ----------
const escenaLista = (k) => page.waitForFunction((k) => {
  const g = window.__mc?.Prueba?.game;
  const s = g?.scene.getScene(k);
  return !!s && g.scene.isActive(k) && !s.cameras.main.fadeEffect.isRunning && s.children.list.length > 0;
}, k, { timeout: 20000, polling: 50 });

const activas = () => page.evaluate(() => window.__mc.Prueba.game.scene.getScenes(true).map((s) => s.scene.key));

/** Busca un objeto interactivo de la escena (también dentro de contenedores) cuyo texto contenga `texto`. */
async function ubicar(k, texto) {
  return page.evaluate(({ k, texto }) => {
    const g = window.__mc.Prueba.game;
    const s = g.scene.getScene(k);
    const todos = [];
    const recorrer = (lista) => { for (const o of lista) { todos.push(o); if (o.list) recorrer(o.list); } };
    recorrer(s.children.list);
    const o = todos.find((x) => x.type === 'Text' && x.text.includes(texto) && x.visible && x.active);
    if (!o) return null;
    const b = o.getBounds();
    const r = g.canvas.getBoundingClientRect();
    const fx = r.width / g.scale.width;
    const fy = r.height / g.scale.height;
    // Un texto sin entrada (p. ej. una fila del catálogo del Taller) recibe el clic en la figura interactiva de abajo.
    window.__objetivo = o.input?.enabled ? o
      : todos.filter((x) => x.input?.enabled && x.visible && x.getBounds?.().contains(b.centerX, b.centerY)).pop() ?? o;
    return { x: r.left + b.centerX * fx, y: r.top + b.centerY * fy, interactivo: !!o.input?.enabled, texto: o.text };
  }, { k, texto });
}

/** Clic real con el ratón; si `listo()` no se cumple, respaldo con emit('pointerdown'). */
async function clic(k, texto, listo, { emitirSiFalla = true, espera = 2500 } = {}) {
  const pos = await ubicar(k, texto);
  if (!pos) throw new Error(`No hay botón "${texto}" en ${k} (escenas activas: ${(await activas()).join(', ')})`);
  await page.mouse.click(pos.x, pos.y);
  if (await esperar(listo, espera)) return 'clic';
  if (!emitirSiFalla) throw new Error(`El clic en "${texto}" no tuvo efecto`);
  respaldos.push(`${prefijo}${pasoActual}: clic real en "${texto}" sin efecto; se usó emit`);
  await page.evaluate(() => window.__objetivo.emit('pointerdown', { x: 0, y: 0, button: 0, event: {} }, 0, 0, { stopPropagation() {} }));
  if (await esperar(listo, espera)) return 'emit';
  throw new Error(`"${texto}" no tuvo efecto ni con clic ni con emit`);
}

/** Clic real en una coordenada lógica (960 × 540) de la escena, p. ej. una figura sin texto. */
async function clicEn(x, y) {
  const r = await page.evaluate(() => { const g = window.__mc.Prueba.game; const b = g.canvas.getBoundingClientRect(); return { l: b.left, t: b.top, fx: b.width / g.scale.width, fy: b.height / g.scale.height }; });
  await page.mouse.click(r.l + x * r.fx, r.t + y * r.fy);
}

async function esperar(fn, ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await fn()) return true;
    await page.waitForTimeout(60);
  }
  return false;
}
const activa = (k) => () => page.evaluate((k) => window.__mc.Prueba.game.scene.isActive(k), k);
const textosDe = (k) => page.evaluate((k) => {
  const s = window.__mc.Prueba.game.scene.getScene(k);
  const todos = [];
  const recorrer = (l) => { for (const o of l) { if (o.type === 'Text' && o.visible) todos.push(o.text); if (o.list) recorrer(o.list); } };
  recorrer(s.children.list);
  return todos;
}, k);

// ---------- pasos ----------
async function paso(nombre, fn) {
  pasoActual = nombre;
  const t0 = Date.now();
  const nErr = errores.length;
  const fila = { paso: nombre, ok: false, s: 0, detalle: '' };
  try {
    fila.detalle = (await fn()) ?? '';
    fila.ok = !fila.detalle.startsWith('FALLA');
  } catch (e) {
    fila.detalle = `ERROR: ${e.message.split('\n')[0]}`;
    try { await captura(`${nombre}_error`); } catch { /* sin captura */ }
  }
  const nuevos = errores.slice(nErr).filter((e) => e.tipo !== 'warning');
  if (nuevos.length) { fila.ok = false; fila.detalle += ` · ${nuevos.length} error(es) de consola`; }
  fila.s = ((Date.now() - t0) / 1000).toFixed(1);
  tabla.push({ corrida: prefijo.replace(/_$/, ''), ...fila });
  console.log(`${fila.ok ? 'OK  ' : 'FALLA'} ${prefijo}${nombre} (${fila.s} s) ${fila.detalle}`);
  if (!fila.ok) throw Object.assign(new Error(fila.detalle), { yaReportado: true });
}

/** Maneja con el teclado real. En misión: suelta y frena (← mientras vx > 0.3 m/s) pasado zona.desde + 3 m. */
async function conducir(k) {
  const leer = () => page.evaluate((k) => {
    const sc = window.__mc[k];
    const rec = sc.recorrido;
    const r = rec.robot;
    const e = r.estado();
    return {
      x: (r.x - rec.xMundo(0)) / 24, vx: r.chasis.velocity.x / 24 * 60, t: r.t, E: e.energia, I: e.integridad,
      fin: rec.terminado, zona: rec.zona, meta: rec.meta_m, largo: rec.o.perfil.largo_m, sup: e.superficie, patina: e.patina,
      fps: sc.game.loop.actualFps, forzado: rec.controles.forzado,
    };
  }, k);
  const t0 = Date.now();
  let s = await leer();
  const inicio = s;
  let tecla = 'ArrowRight';
  await page.keyboard.down(tecla);
  let teclado = true;
  let ultimaFoto = Date.now();
  let patinajes = 0;
  let frenando = false;
  // ¿Responde el teclado real?
  await page.waitForTimeout(1500);
  s = await leer();
  if (s.x - inicio.x < 0.05 && Math.abs(s.vx) < 0.05) {
    teclado = false;
    respaldos.push(`${prefijo}${pasoActual}: el robot no se movió con la flecha real; se usó controles.forzado`);
    await page.evaluate((k) => { window.__mc[k].recorrido.controles.forzado = 1; }, k);
  }
  await captura(`${k.toLowerCase()}_arranque`);
  const pon = async (nueva) => {
    if (nueva === tecla) return;
    if (tecla) await page.keyboard.up(tecla);
    if (nueva) await page.keyboard.down(nueva);
    tecla = nueva;
    if (!teclado) await page.evaluate(({ k, a }) => { window.__mc[k].recorrido.controles.forzado = a; }, { k, a: nueva === 'ArrowRight' ? 1 : nueva === 'ArrowLeft' ? -1 : 0 });
  };
  while (!s.fin) {
    if ((Date.now() - t0) / 1000 > LIMITE_S) {
      await pon(null);
      await captura(`${k.toLowerCase()}_limite`);
      await clic(k, 'Abandonar', async () => (await leer()).fin);
      return { ...s, limite: true, teclado, patinajes };
    }
    if (s.patina) patinajes++;
    if (s.zona) {
      if (s.x > s.zona.desde + 3) frenando = true;
      await pon(frenando ? (s.vx > 0.3 ? 'ArrowLeft' : null) : 'ArrowRight');
    }
    if (Date.now() - ultimaFoto > 15000) { await captura(`${k.toLowerCase()}_x${Math.round(s.x)}m`); ultimaFoto = Date.now(); }
    await page.waitForTimeout(25);
    s = await leer();
  }
  await pon(null);
  await captura(`${k.toLowerCase()}_fin`);
  return { ...s, teclado, patinajes, pared_s: (Date.now() - t0) / 1000 };
}

async function resultados(esperado) {
  await esperar(activa('Resultados'), 8000);
  await escenaLista('Resultados');
  const reg = await page.evaluate(() => { const p = window.__mc.partida; return p.resultados[p.resultados.length - 1]; });
  const txt = await textosDe('Resultados');
  await captura(`resultados_${reg.tipo}_${reg.exito ? 'exito' : 'falla'}`);
  const recs = txt.filter((t) => t.startsWith('• ')).map((t) => t.slice(2));
  // Puntuación: texto con ★/☆ (sin arte) o estrellas de arte (Image 'ui/ui_estrella_llena|vacia') + el total como texto aparte.
  const arte = await page.evaluate(() => {
    const s = window.__mc.Prueba.game.scene.getScene('Resultados');
    const claves = s.children.list.filter((o) => o.type === 'Image' && o.visible && String(o.texture?.key).startsWith('ui/ui_estrella'))
      .map((o) => o.texture.key);
    return { n: claves.length, llenas: claves.filter((k) => k === 'ui/ui_estrella_llena').length };
  });
  const total = txt.find((t) => /^\d+$/.test(t.trim()));
  const puntos = txt.find((t) => /[★☆]/.test(t))
    ?? (arte.n >= 3 && total ? `${total.trim()} (${'★'.repeat(arte.llenas)}${'☆'.repeat(arte.n - arte.llenas)}, arte: ${arte.llenas}/${arte.n} llenas)` : null);
  const r = reg.resultado;
  const base = `${reg.exito ? 'éxito' : 'falla'} (${reg.motivo}) · ${r.distancia_m} m · E ${Math.round(r.energia_restante * 100)} % · carga ${Math.round(r.integridad_carga * 100)} %`
    + (puntos ? ` · puntos ${puntos.replace('\n', ' ')}` : '') + (recs.length ? ` · recs: ${recs.join(' | ')}` : ' · sin recs');
  const fallas = [];
  if (esperado.exito !== undefined && reg.exito !== esperado.exito) fallas.push(`se esperaba ${esperado.exito ? 'éxito' : 'falla'}`);
  if (esperado.rec && !recs.some((t) => t.toLowerCase().includes(esperado.rec))) fallas.push(`falta la recomendación "${esperado.rec}"`);
  if (esperado.puntos && !puntos) fallas.push('no se ve la puntuación con estrellas');
  return { texto: (fallas.length ? `FALLA: ${fallas.join('; ')} · ` : '') + base, reg, recs };
}

async function corrida(c) {
  prefijo = `${c.id}_`;
  nCaptura = 0;
  const marca = { t: 0 };
  await paso('menu', async () => {
    await escenaLista('Menu');
    await captura('menu');
    await clic('Menu', 'Nueva partida', async () => !!(await ubicar('Menu', c.boton)));
    await captura('menu_destino');
    return 'Nueva partida → vista de destino';
  });
  await paso('destino', async () => {
    await clic('Menu', c.boton, activa('Expediente'));
    await escenaLista('Expediente');
    const d = await page.evaluate(() => window.__mc.partida.destino);
    if (d !== c.destino) return `FALLA: partida.destino = ${d}, se esperaba ${c.destino}`;
    return `${c.boton} → Expediente (destino ${d})`;
  });
  await paso('expediente', async () => {
    await clic('Expediente', c.sitio, async () => (await textosDe('Expediente')).some((t) => t.startsWith(c.sitio)));
    await captura('expediente');
    const tickets = await page.evaluate(() => window.__mc.partida.tickets);
    await clic('Expediente', 'Gastar 1 ticket', activa('Taller'));
    await escenaLista('Taller');
    const p = await page.evaluate(() => ({ t: window.__mc.partida.tickets, s: window.__mc.partida.sitio?.id }));
    if (p.s !== c.sitioId) return `FALLA: sitio ${p.s}, se esperaba ${c.sitioId}`;
    if (p.t !== tickets - 1) return `FALLA: tickets ${tickets} → ${p.t}`;
    return `sitio ${p.s} · tickets ${tickets} → ${p.t}`;
  });
  await paso('taller_estandar', async () => {
    await captura('taller');
    const mapa = await page.evaluate(() => window.__mc.Prueba.game.scene.getScene('Taller').mapa);
    if (mapa.rueda_del !== 'rueda_estandar' || mapa.rueda_tras !== 'rueda_estandar') return `FALLA: ruedas ${mapa.rueda_del}/${mapa.rueda_tras}`;
    await clic('Taller', 'Probar el robot', activa('Prueba'));
    return 'ruedas estándar → Probar el robot';
  });
  const prueba1 = await probar('prueba_1', c.esperaFalla ? { exito: false, rec: 'ruedas anchas' } : {});
  await paso('taller_ancha', async () => {
    // Si Resultados ofrece "Aplicar y al taller", el cambio recomendado llega aplicado; si no, se cambia a mano.
    const aplica = await ubicar('Resultados', 'Aplicar y al taller');
    await clic('Resultados', aplica ? 'Aplicar y al taller' : 'Volver al taller', activa('Taller'));
    await escenaLista('Taller');
    const yaAnchas = await page.evaluate(() => { const m = window.__mc.Prueba.game.scene.getScene('Taller').mapa; return m.rueda_del === 'rueda_ancha' && m.rueda_tras === 'rueda_ancha'; });
    if (aplica && !yaAnchas) return 'FALLA: "Aplicar y al taller" no dejó las ruedas anchas puestas';
    for (const [ranura, x] of yaAnchas ? [] : [['rueda_del', 365], ['rueda_tras', 115]]) {
      const taller = () => page.evaluate(() => { const s = window.__mc.Prueba.game.scene.getScene('Taller'); return { sel: s.sel, mapa: s.mapa }; });
      await clicEn(x, 392);
      const indice = ranura === 'rueda_del' ? 1 : 2;
      if (!(await esperar(async () => (await taller()).sel === indice, 1500))) return `FALLA: el clic en la rueda (${ranura}) no la seleccionó`;
      await clic('Taller', '○ Rueda ancha para arena', async () => (await taller()).mapa[ranura] === 'rueda_ancha');
    }
    await captura('taller_ancha');
    const txt = (await textosDe('Taller')).find((t) => t.startsWith('✓') || t.startsWith('✗'));
    await clic('Taller', 'Probar el robot', activa('Prueba'));
    const d = await page.evaluate(() => window.__mc.partida.diseno.filter((x) => x.ranura.startsWith('rueda')).map((x) => x.pieza).join('/'));
    if (d !== 'rueda_ancha/rueda_ancha') return `FALLA: partida.diseno ruedas = ${d}`;
    return `ruedas ${d} · ${txt}`;
  });
  await probar('prueba_2', { exito: true });
  await paso('mision', async () => {
    const reg = await page.evaluate(() => { const p = window.__mc.partida; return p.resultados[p.resultados.length - 1]; });
    await clic('Resultados', reg.exito ? 'Lanzar misión' : 'Lanzar misión sin superar', activa('Mision'));
    await esperar(() => page.evaluate(() => !!window.__mc.Mision?.recorrido?.robot && window.__mc.Prueba.game.scene.isActive('Mision')), 8000);
    const g = await page.evaluate(() => window.__mc.Mision.matter.world.engine.gravity.y);
    const s = await conducir('Mision');
    marca.mision = s;
    return `${s.limite ? 'FALLA: límite de tiempo · ' : ''}x ${s.x.toFixed(1)} m (zona ${s.zona.desde}–${s.zona.hasta}) · juego ${s.t.toFixed(1)} s · pared ${s.pared_s?.toFixed(0)} s · ${s.fps.toFixed(0)} fps · teclado ${s.teclado ? 'real' : 'forzado'} · gravedad Matter ${g.toFixed(3)}`;
  });
  await paso('resultados_mision', async () => (await resultados({ exito: true, puntos: true })).texto);
  await paso('volver_menu', async () => {
    await clic('Resultados', 'Menú', activa('Menu'));
    await escenaLista('Menu');
    return 'Resultados → Menú';
  });
  return prueba1;
}

async function probar(nombre, esperado) {
  let s;
  await paso(nombre, async () => {
    await esperar(() => page.evaluate(() => !!window.__mc.Prueba?.recorrido?.robot && window.__mc.Prueba.game.scene.isActive('Prueba')), 8000);
    await captura(`${nombre}_inicio`);
    s = await conducir('Prueba');
    return `${s.limite ? 'FALLA: límite de tiempo · ' : ''}x ${s.x.toFixed(1)}/${s.meta.toFixed(0)} m · juego ${s.t.toFixed(1)} s · pared ${s.pared_s?.toFixed(0)} s · ${s.fps.toFixed(0)} fps · muestras patinando ${s.patinajes} · teclado ${s.teclado ? 'real' : 'forzado'}`;
  });
  await paso(`resultados_${nombre}`, async () => (await resultados(esperado)).texto);
  return s;
}

// ---------- ejecución ----------
const t0 = Date.now();
await paso('boot', async () => {
  await page.goto(URL);
  await page.waitForFunction(() => window.__mc?.Prueba?.game, null, { timeout: 15000 });
  await esperar(activa('Boot'), 5000);
  await captura('boot');
  if (!(await esperar(activa('Menu'), 10000))) return 'FALLA: Boot no pasó al Menú';
  return 'Boot → Menú';
}).catch(() => {});
for (const id of pedidas) {
  try { await corrida(CORRIDAS[id]); } catch (e) { if (!e.yaReportado) console.log('ERROR', e); }
  // Si la corrida se cortó, vuelve al menú por la vía directa para que la siguiente empiece limpia.
  if (!(await page.evaluate(() => window.__mc.Prueba.game.scene.isActive('Menu')))) {
    await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowLeft');
    await page.evaluate(() => { const g = window.__mc.Prueba.game; for (const s of g.scene.getScenes(true)) g.scene.stop(s.scene.key); g.scene.start('Menu'); });
    await page.waitForTimeout(500);
  }
}
await browser.close();

console.log(`\n=== Camino dorado (${((Date.now() - t0) / 1000).toFixed(0)} s) ===`);
for (const f of tabla) console.log(`${f.ok ? 'OK   ' : 'FALLA'} ${(f.corrida || '-').padEnd(6)} ${f.paso.padEnd(24)} ${String(f.s).padStart(6)} s  ${f.detalle}`);
if (respaldos.length) console.log('\nRespaldos usados (el clic o la tecla real no funcionó):\n- ' + respaldos.join('\n- '));
if (errores.length) console.log('\nConsola / página:\n' + errores.map((e) => `- [${e.tipo}] ${e.paso}: ${e.texto}`).join('\n'));
writeFileSync(join(OUT, 'informe.json'), JSON.stringify({ tabla, respaldos, errores }, null, 2));
console.log(`\nCapturas e informe.json en ${OUT}`);
process.exit(tabla.every((f) => f.ok) && tabla.length ? 0 : 1);
