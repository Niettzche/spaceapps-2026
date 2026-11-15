// Prueba de punta a punta del control de celular, con el juego real.
// Requiere: relay y juego corriendo (npm run todo → juego en http://localhost:5174).
//   npm i --no-save playwright-core
//   NAVEGADOR="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" node prueba_e2e.mjs
// Abre el juego en una ventana de "compu" y el control en un "celular" emulado (táctil, horizontal) y toca botones
// con eventos táctiles reales (CDP). Guarda capturas en ./capturas.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { puenteDePrueba } from './prueba_comun.mjs';

const NAVEGADOR = process.env.NAVEGADOR ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const JUEGO = process.env.JUEGO ?? 'http://localhost:5174/?lang=es&mando';
const RELAY = process.env.RELAY ?? 'http://localhost:8787';
mkdirSync('capturas', { recursive: true });

const info = await (await fetch(`${RELAY}/info`)).json();
const urlPad = (info.direcciones[0]?.url ?? `http://127.0.0.1:8787/?s=${info.sala}`) + (process.env.PIEL ? `&piel=${process.env.PIEL}` : '');
console.log('sala', info.sala, '· pad', urlPad);

const nav = await chromium.launch({ executablePath: NAVEGADOR, headless: true });
const errores = [];
const pasos = [];
const paso = (ok, texto) => { pasos.push([ok, texto]); console.log(ok ? '✔' : '✘', texto); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- compu
const compu = await nav.newPage({ viewport: { width: 1280, height: 720 } });
compu.on('pageerror', (e) => errores.push(`[juego] ${e.message}`));
await compu.addInitScript(() => {
  window.__teclas = [];
  window.addEventListener('keydown', (e) => window.__teclas.push(`${e.key}/${e.keyCode}`), true);
});
await puenteDePrueba(compu, RELAY);
// Los tutoriales del Taller y de la Prueba (primera visita) se dan por vistos, como en la e2e del juego: aquí se prueba el
// control. (Con el celular se pasan igual: en el Taller con OK/Atrás; en la Prueba, Acelerar avanza y Pausa los salta.)
await compu.addInitScript(() => { try { for (const k of ['taller', 'prueba']) localStorage.setItem(`marsception.tutorial_${k}.visto`, '1'); } catch {} });
await compu.goto(JUEGO, { waitUntil: 'domcontentloaded' });
await compu.waitForFunction(() => window.__controlCelular?.juego?.(), null, { timeout: 30000 });
paso(true, 'puente cargado y juego enganchado');
const escena = () => compu.evaluate(() => window.__controlCelular.escena());
await compu.waitForFunction(() => window.__controlCelular.escena()?.clave === 'Menu', null, { timeout: 30000 });
await esperar(4000); // animación introductoria del menú
const panelAbierto = () => compu.evaluate(() => document.getElementById('control-celular').shadowRoot.querySelector('.velo').classList.contains('abierto'));
// El panel ya no se abre solo (tapaba el título): se abre al tocar la pastilla «Conectar celular».
paso(!(await panelAbierto()), 'el panel del QR no tapa el juego al cargar');
await compu.evaluate(() => document.getElementById('control-celular').shadowRoot.querySelector('.pastilla').click());
await esperar(300);
paso(await panelAbierto(), 'tocar la pastilla abre el panel con el QR');
await compu.screenshot({ path: 'capturas/1_compu_qr.png' });

// ---- celular (iPhone horizontal emulado)
const ctx = await nav.newContext({
  viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: process.env.PIEL === 'general'
    ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
    : 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});
const cel = await ctx.newPage();
cel.on('pageerror', (e) => errores.push(`[celular] ${e.message}`));
const cdp = await ctx.newCDPSession(cel);
await cel.goto(urlPad);
await cel.waitForFunction(() => document.getElementById('punto').classList.contains('ok'), null, { timeout: 10000 });
paso(true, 'celular conectado y con pantalla lista');
const piel = await cel.evaluate(() => document.documentElement.className);
paso(true, `piel elegida: ${piel}`);

async function centro(sel) {
  const b = await cel.locator(sel).first().boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
const tocarIni = (p, id = 1) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id }] });
const soltar = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
async function tocar(sel, ms = 80) { await tocarIni(await centro(sel)); await esperar(ms); await soltar(); await esperar(120); }

await tocar('#inicio');
await esperar(300);
paso(!(await panelAbierto()), 'el panel del QR se cerró solo al entrar el celular');
await cel.screenshot({ path: 'capturas/2_celular_menus.png' });

// ---- navegar con OK (Enter) hasta el Taller
const vistas = [];
// (Menú ~8 pulsaciones, tutorial del Expediente ~6, gastar ticket 1: igual que con un teclado real.)
for (let i = 0; i < 30; i++) {
  const e = await escena();
  vistas.push(e?.clave);
  if (e?.clave === 'Taller') break;
  if (e?.clave === 'Expediente' && !vistas.slice(0, -1).includes('Expediente')) await cel.screenshot({ path: 'capturas/2b_celular_expediente.png' });
  await tocar('.navegar .a');
  await esperar(1200);
}
const teclas = await compu.evaluate(() => window.__teclas.slice(0, 3));
paso(teclas[0] === 'Enter/13', `teclas recibidas por el juego: ${teclas.join(', ')}`);
paso(vistas.includes('Taller'), `escenas recorridas solo con OK: ${[...new Set(vistas)].join(' → ')}`);
await cel.waitForFunction(() => document.getElementById('escena').textContent.includes('Taller'), null, { timeout: 5000 }).catch(() => {});
await cel.screenshot({ path: 'capturas/3_celular_taller.png' });
await compu.screenshot({ path: 'capturas/3_compu_taller.png' });

// ---- Taller: "Probar" (c) → Prueba; el control cambia solo a "conducir"
await tocar('.atajo[data-k="c"]');
await compu.waitForFunction(() => window.__controlCelular.escena()?.clave === 'Prueba', null, { timeout: 15000 }).catch(() => {});
paso((await escena())?.clave === 'Prueba', 'Probar desde el celular abre la Prueba');
await cel.waitForFunction(() => document.getElementById('pad').dataset.modo === 'conducir', null, { timeout: 5000 }).catch(() => {});
paso(await cel.evaluate(() => document.getElementById('pad').dataset.modo === 'conducir'), 'el control pasó solo a modo conducir');
await esperar(2500);

// ---- mantener Acelerar 2.5 s y medir cuánto avanzó el robot
const x = () => compu.evaluate(() => {
  const s = window.__controlCelular.juego().scene.getScene('Prueba');
  const r = s.recorrido;
  const cuerpo = r?.robot?.chasis ?? r?.robot?.cuerpo ?? r?.robot?.body;
  return { x: cuerpo?.position?.x ?? cuerpo?.x ?? null, acel: r?.controles?.acelerador?.() ?? null };
});
const antes = await x();
await tocarIni(await centro('.conducir .grande:last-child'));
await esperar(600);
const durante = await x();
await esperar(1900);
await soltar();
await esperar(300);
const despues = await x();
paso(durante.acel === 1, `acelerador mientras se mantiene el botón: ${durante.acel}`);
paso(despues.acel === 0, `acelerador al soltar: ${despues.acel}`);
paso(antes.x !== null && despues.x > antes.x + 20, `robot avanzó: x ${antes.x?.toFixed?.(0)} → ${despues.x?.toFixed?.(0)}`);
await cel.screenshot({ path: 'capturas/4_celular_conducir.png' });
await compu.screenshot({ path: 'capturas/4_compu_prueba.png' });

// ---- pausa desde el celular
await tocar('.conducir [data-k="Escape"]');
await esperar(500);
paso((await escena())?.pausado === true, 'Pausa desde el celular pausa el juego');
await cel.waitForFunction(() => document.getElementById('pad').dataset.pausado === '1', null, { timeout: 3000 }).catch(() => {});
await cel.screenshot({ path: 'capturas/5_celular_pausa.png' });
await tocar('.enpausa [data-k="Enter"]');
await esperar(500);
paso((await escena())?.pausado === false, 'Seguir desde el celular reanuda');

// ---- desconexión con el acelerador presionado: no debe quedar pegado
await tocarIni(await centro('.conducir .grande:last-child'));
await esperar(400);
await cel.close();
await esperar(800);
paso((await x()).acel === 0, 'si el celular se va con el botón presionado, el acelerador se suelta');

console.log(errores.length ? `\nErrores de página:\n${errores.join('\n')}` : '\nSin errores de página.');
await nav.close();
process.exit(pasos.every(([ok]) => ok) ? 0 : 1);
