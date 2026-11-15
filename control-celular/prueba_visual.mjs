// Prueba visual del control (sin el juego): una "pantalla" falsa elige la escena y se toman capturas del celular en
// varios tamaños, pieles y modos, con un botón presionado. Revisa que nada se salga de la pantalla.
//   (relay corriendo) node prueba_visual.mjs   → capturas/visual/*.png
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import WebSocket from 'ws';

const NAVEGADOR = process.env.NAVEGADOR ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const RELAY = process.env.RELAY ?? 'http://localhost:8787';
const OUT = 'capturas/visual';
mkdirSync(OUT, { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const info = await (await fetch(`${RELAY}/info`)).json();

const pantalla = new WebSocket(RELAY.replace('http', 'ws') + '/ws?rol=pantalla');
await new Promise((ok) => pantalla.on('open', ok));
const escena = (clave, pausado = false) => pantalla.send(JSON.stringify({ t: 'escena', clave, pausado }));

const TAMANOS = [['iphone14', 844, 390], ['iphoneSE', 667, 375], ['android_chico', 640, 360], ['promax', 932, 430], ['ipad', 1024, 768]];
const ESCENAS = [['Expediente', false], ['Taller', false], ['Prueba', false], ['Prueba', true]];
const nav = await chromium.launch({ executablePath: NAVEGADOR, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const problemas = [];
const errores = [];

for (const piel of ['glass', 'general']) {
  for (const [nombre, w, h] of TAMANOS) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX' });
    const cel = await ctx.newPage();
    cel.on('pageerror', (e) => errores.push(`${piel}/${nombre}: ${e.message}`));
    cel.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(`${piel}/${nombre} consola: ${m.text()}`); });
    const cdp = await ctx.newCDPSession(cel);
    await cel.goto(`${RELAY}/?s=${info.sala}&piel=${piel}`);
    await cel.waitForFunction(() => document.getElementById('punto').classList.contains('ok'), null, { timeout: 8000 });
    // Toque real sobre el velo de inicio (genera click).
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: w / 2, y: h / 2, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await esperar(300);
    const inicioOculto = await cel.evaluate(() => document.getElementById('inicio').classList.contains('oculto'));
    if (!inicioOculto) problemas.push(`${piel}/${nombre}: el velo de inicio no se quitó con un toque`);
    if (piel === 'glass') {
      const gl = await cel.evaluate(() => window.__vidrio?.encendido?.() ?? false);
      if (!gl) problemas.push(`${piel}/${nombre}: el vidrio WebGL no se encendió`);
    }
    for (const [clave, pausado] of ESCENAS) {
      if (nombre !== 'iphone14' && pausado) continue;
      escena(clave, pausado);
      await esperar(700);
      // ¿algún botón visible se sale de la ventana o se encima con otro?
      const fuera = await cel.evaluate(() => {
        const vis = [...document.querySelectorAll('#pad .btn')].map((el) => [el, el.getBoundingClientRect()]).filter(([, r]) => r.width > 0);
        const out = [];
        for (const [el, r] of vis) {
          if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) out.push(`fuera: ${el.dataset.k}`);
          if (r.width < 40 || r.height < 36) out.push(`muy chico (${Math.round(r.width)}×${Math.round(r.height)}): ${el.dataset.k}`);
        }
        for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
          const a = vis[i][1], b = vis[j][1];
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`encimados: ${vis[i][0].dataset.k} / ${vis[j][0].dataset.k}`);
        }
        return out;
      });
      fuera.forEach((f) => problemas.push(`${piel}/${nombre}/${clave}${pausado ? '(pausa)' : ''}: ${f}`));
      // Presiona el botón principal de la vista y captura a mitad del rebote.
      const sel = clave === 'Prueba' ? (pausado ? '.enpausa [data-k="Enter"]' : '.conducir .grande:last-child') : '.navegar .a';
      const b = await cel.locator(sel).first().boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width * 0.35, y: b.y + b.height * 0.4, id: 2 }] });
      await esperar(160);
      await cel.screenshot({ path: `${OUT}/${piel}_${nombre}_${clave}${pausado ? '_pausa' : ''}.png` });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await esperar(200);
    }
    if (nombre === 'iphone14') {
      await cel.setViewportSize({ width: 390, height: 844 });
      await esperar(300);
      await cel.screenshot({ path: `${OUT}/${piel}_vertical.png` });
    }
    await ctx.close();
  }
}
pantalla.close();
await nav.close();
console.log(problemas.length ? `Problemas:\n${problemas.join('\n')}` : 'Sin problemas de distribución.');
console.log(errores.length ? `Errores:\n${[...new Set(errores)].join('\n')}` : 'Sin errores de página.');
