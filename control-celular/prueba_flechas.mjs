// Prueba de la cruceta con el juego real: ¿cada toque de flecha llega al juego y mueve algo?
// Toca el centro, las esquinas, las diagonales y el margen de la cruz, con toques rápidos y con el dedo moviéndose,
// y desliza el dedo en círculo (debe cambiar de flecha sin parpadear). Luego repite en el Expediente.
//   (relay + juego corriendo) node prueba_flechas.mjs     · PIEL=glass para la otra piel
import { chromium } from 'playwright-core';
import { puenteDePrueba } from './prueba_comun.mjs';

const NAVEGADOR = process.env.NAVEGADOR ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const JUEGO = process.env.JUEGO ?? 'http://localhost:5174/?lang=es';
const RELAY = process.env.RELAY ?? 'http://localhost:8787';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const info = await (await fetch(`${RELAY}/info`)).json();
let fallas = 0;
const paso = (ok, texto) => { if (!ok) fallas++; console.log(ok ? '✔' : '✘', texto); };

const nav = await chromium.launch({ executablePath: NAVEGADOR, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const compu = await nav.newPage({ viewport: { width: 1280, height: 720 } });
const errores = [];
compu.on('pageerror', (e) => errores.push(`[juego] ${e.message}`));
await compu.addInitScript(() => {
  window.__k = [];
  window.addEventListener('keydown', (e) => window.__k.push(e.repeat ? 'repetida' : e.key), true);
});
await puenteDePrueba(compu, RELAY);
// Los tutoriales del Taller y de la Prueba (primera visita) se dan por vistos, como en la e2e del juego: aquí se prueba el
// control. (Con el celular se pasan igual: en el Taller con OK/Atrás; en la Prueba, Acelerar avanza y Pausa los salta.)
await compu.addInitScript(() => { try { for (const k of ['taller', 'prueba']) localStorage.setItem(`marsception.tutorial_${k}.visto`, '1'); } catch {} });
await compu.goto(JUEGO, { waitUntil: 'domcontentloaded' });
await compu.waitForFunction(() => window.__controlCelular?.escena?.()?.clave === 'Menu', null, { timeout: 30000 });
await esperar(4000);

const ctx = await nav.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const cel = await ctx.newPage();
cel.on('pageerror', (e) => errores.push(`[celular] ${e.message}`));
await cel.addInitScript(() => {
  window.__enviados = [];
  const s = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) { try { const m = JSON.parse(d); if (m.t === 'k') window.__enviados.push(`${m.k}:${m.d}`); } catch {} return s.call(this, d); };
});
const cdp = await ctx.newCDPSession(cel);
await cel.goto(`${RELAY}/?s=${info.sala}&piel=${process.env.PIEL ?? 'general'}`);
await cel.waitForFunction(() => document.getElementById('punto').classList.contains('ok'), null, { timeout: 10000 });
const toque = async (x, y, ms, mover = 0) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  if (mover) { await esperar(ms / 2); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + mover, y: y + mover, id: 1 }] }); await esperar(ms / 2); }
  else if (ms) await esperar(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
await toque(400, 200, 60);
await esperar(300);
const escena = () => compu.evaluate(() => window.__controlCelular.escena()?.clave);
const tocarSel = async (sel) => { const b = await cel.locator(sel).first().boundingBox(); await toque(b.x + b.width / 2, b.y + b.height / 2, 80); };
for (let i = 0; i < 30 && (await escena()) !== 'Taller'; i++) { await tocarSel('.navegar .a'); await esperar(1200); }
paso((await escena()) === 'Taller', 'llegar al Taller solo con OK');
await esperar(1500);

// Cuenta lo que de verdad cambia en el juego: en el Taller, cada flecha llama a elegirSocket o moverCursor.
await compu.evaluate(() => {
  const s = window.__controlCelular.juego().scene.getScene('Taller');
  window.__mov = 0;
  for (const f of ['elegirSocket', 'moverCursor']) { const o = s[f].bind(s); s[f] = (...a) => { window.__mov++; return o(...a); }; }
});
const caja = await cel.evaluate(() => { const r = document.querySelector('.cruz').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
const [cx, cy, cw, ch] = caja;
const enCruz = (fx, fy) => [cx + cw * fx, cy + ch * fy];

async function ronda(nombre, puntos, { ms = 80, mover = 0, pausa = 180, esperado = puntos.length, contador = '__mov' } = {}) {
  await cel.evaluate(() => { window.__enviados = []; });
  await compu.evaluate((c) => { window.__k = []; window[c] = 0; }, contador);
  for (const [x, y] of puntos) { await toque(x, y, ms, mover); await esperar(pausa); }
  await esperar(400);
  const env = await cel.evaluate(() => window.__enviados.filter((s) => s.endsWith(':1')).length);
  // Si el navegador de prueba tarda y un toque dura más de 520 ms, el puente repite (como un teclado): eso no es error.
  const { k, rep, mov } = await compu.evaluate((c) => ({ k: window.__k.filter((x) => x.startsWith('Arrow')).length,
    rep: window.__k.filter((x) => x === 'repetida').length, mov: window[c] }), contador);
  paso(env === esperado && k === esperado && mov === esperado + rep,
    `${nombre}: ${puntos.length} toques · ${env} enviados · ${k} llegan al juego · ${mov} mueven algo (esperado ${esperado})${rep ? ` · ${rep} por mantener` : ''}`);
}
const rep = (arr, n) => Array.from({ length: n }, (_, i) => arr[i % arr.length]);
const brazos = [enCruz(0.5, 0.17), enCruz(0.83, 0.5), enCruz(0.5, 0.83), enCruz(0.17, 0.5)];
await ronda('centro de cada flecha', rep(brazos, 20));
await ronda('toques instantáneos (0 ms)', rep(brazos, 20), { ms: 0 });
await ronda('toques muy seguidos (60 ms)', rep(brazos, 20), { ms: 30, pausa: 60 });
await ronda('dedo que se mueve al tocar', rep(brazos, 20), { mover: 12 });
await ronda('diagonales (antes no respondían)', rep([enCruz(0.2, 0.2), enCruz(0.8, 0.2), enCruz(0.2, 0.8), enCruz(0.8, 0.8)], 20));
await ronda('esquinas de cada brazo', rep([enCruz(0.36, 0.04), enCruz(0.96, 0.36), enCruz(0.64, 0.96), enCruz(0.04, 0.64)], 20));
await ronda('margen debajo de la cruz', rep([[cx + cw * 0.5, cy + ch + cw * 0.06]], 6));
await ronda('centro exacto (no hace nada)', rep([enCruz(0.5, 0.5)], 4), { esperado: 0 });

// Dedo que sale del control y se suelta sobre la barra: la flecha debe soltarse y volver a responder.
await cel.evaluate(() => { window.__enviados = []; });
{
  const [ux, uy] = enCruz(0.5, 0.17);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ux, y: uy, id: 1 }] });
  for (let y = uy; y > 8; y -= 12) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ux, y, id: 1 }] }); await esperar(10); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ux, y: 8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await esperar(250);
  await toque(ux, uy, 80);
  await esperar(250);
  const seq = await cel.evaluate(() => window.__enviados.join(','));
  paso(seq === 'ArrowUp:1,ArrowUp:0,ArrowUp:1,ArrowUp:0', `soltar fuera del control suelta la flecha y vuelve a responder: ${seq}`);
}

// Deslizar el dedo en círculo: derecha → abajo → izquierda → arriba → derecha, sin parpadeos.
await cel.evaluate(() => { window.__enviados = []; });
const [mx, my] = enCruz(0.5, 0.5);
const R = cw * 0.33;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: mx + R, y: my, id: 1 }] });
for (let i = 1; i <= 72; i++) {
  const a = (i / 72) * Math.PI * 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: mx + R * Math.cos(a), y: my + R * Math.sin(a), id: 1 }] });
  await esperar(12);
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await esperar(300);
const giro = await cel.evaluate(() => window.__enviados.filter((s) => s.endsWith(':1')).map((s) => s.slice(5, -2)));
paso(giro.join(',') === 'Right,Down,Left,Up,Right', `deslizar en círculo: ${giro.join(' → ')}`);

// Expediente (menús con la clase Teclado del juego): Atrás desde el Taller y flechas.
await tocarSel('.navegar .b');
await compu.waitForFunction(() => window.__controlCelular.escena()?.clave !== 'Taller', null, { timeout: 8000 }).catch(() => {});
await esperar(1500);
const clave = await escena();
await compu.evaluate((c) => {
  const s = window.__controlCelular.juego().scene.getScene(c);
  window.__foco = 0;
  const t = s.teclado;
  if (t) { const o = t.enfocar.bind(t); t.enfocar = (b) => { window.__foco++; return o(b); }; }
}, clave);
// La primera flecha del juego solo muestra el foco (así es con teclado también); después, cada toque mueve.
await toque(...enCruz(0.5, 0.83), 80);
await esperar(300);
await ronda(`flechas en ${clave}`, rep([enCruz(0.5, 0.83), enCruz(0.8, 0.8), enCruz(0.5, 0.17), enCruz(0.2, 0.2)], 12), { contador: '__foco', pausa: 250 });

paso(!errores.length, errores.length ? `errores: ${errores.join(' | ')}` : 'sin errores de página');
await nav.close();
process.exit(fallas ? 1 : 0);
