// Prueba del botón principal y del estilo estable, con el juego real.
//  1. El celular muestra el botón principal de cada escena con el texto del juego («Nueva partida», «Gastar 1 ticket y
//     probar») y lo activa aunque el foco del juego esté en otro lado (al volver del Taller queda en la lista).
//  2. Estilo y modo solo cambian desde el menú ⚙: tocar la barra no cambia nada.
//  3. Glass: si el sistema quita el contexto WebGL, el vidrio vuelve solo (antes se quedaba con el estilo de CSS).
//   (relay + juego corriendo) node prueba_botones.mjs
import { chromium } from 'playwright-core';
import { puenteDePrueba } from './prueba_comun.mjs';

const NAVEGADOR = process.env.NAVEGADOR ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const JUEGO = process.env.JUEGO ?? 'http://localhost:5174/?lang=es&mando';
const RELAY = process.env.RELAY ?? 'http://localhost:8787';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const info = await (await fetch(`${RELAY}/info`)).json();
let fallas = 0;
const paso = (ok, texto) => { if (!ok) fallas++; console.log(ok ? '✔' : '✘', texto); };
const errores = [];

const nav = await chromium.launch({ executablePath: NAVEGADOR, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const compu = await nav.newPage({ viewport: { width: 1280, height: 720 } });
compu.on('pageerror', (e) => errores.push(`[juego] ${e.message}`));
await puenteDePrueba(compu, RELAY);
await compu.goto(JUEGO, { waitUntil: 'domcontentloaded' });
await compu.waitForFunction(() => window.__controlCelular?.escena?.()?.clave === 'Menu', null, { timeout: 60000 });
await esperar(4000);
const escena = () => compu.evaluate(() => window.__controlCelular.escena());

const ctx = await nav.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const cel = await ctx.newPage();
cel.on('pageerror', (e) => errores.push(`[celular] ${e.message}`));
const cdp = await ctx.newCDPSession(cel);
await cel.goto(`${RELAY}/?s=${info.sala}&piel=glass`);
await cel.waitForFunction(() => document.getElementById('punto').classList.contains('ok'), null, { timeout: 10000 });
const toque = async (x, y, ms = 80) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await esperar(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
const tocar = async (sel) => { const b = await cel.locator(sel).first().boundingBox(); await toque(b.x + b.width / 2, b.y + b.height / 2); };
const principal = () => cel.evaluate(() => {
  const b = document.querySelector('.atajo.principal');
  return b ? { texto: b.textContent.replace('▶', '').trim(), apagado: b.classList.contains('apagado') } : null;
});
await toque(400, 200);
await esperar(300);

// ---- 1. botón principal
// En «PRESIONA ENTER» aún no hay botones; con OK aparece el menú y su botón sugerido.
for (let i = 0; i < 4 && !(await principal()); i++) { await tocar('.navegar .a'); await esperar(1200); }
let p = await principal();
paso(!!p && !p.apagado, `Menú: el celular muestra el botón principal «${p?.texto}»`);
// Hasta el Expediente con OK (menú + tutorial del Expediente); luego, solo el botón principal.
for (let i = 0; i < 30; i++) {
  const e = await escena();
  if (e?.clave === 'Expediente' && !(await compu.evaluate(() => !!window.__controlCelular.juego().scene.getScene('Expediente').tutorial))) break;
  await tocar('.navegar .a');
  await esperar(1000);
}
await esperar(800);
p = await principal();
paso(p?.texto === 'Gastar 1 ticket y probar' && !p.apagado, `Expediente: botón principal «${p?.texto}»`);
// Mueve el foco del juego a otro botón (la lista) y usa el botón principal: debe ir al Taller igual.
await tocar('.atajo[data-k="2"]');
await esperar(800);
p = await principal();
await tocar('.atajo.principal');
await compu.waitForFunction(() => window.__controlCelular.escena()?.clave === 'Taller', null, { timeout: 8000 }).catch(() => {});
paso((await escena())?.clave === 'Taller', `con el foco en la lista, el botón principal («${p?.texto}») abre el Taller`);
// Vuelve: en el Taller primero se cierra su tutorial (si está), luego Atrás.
await esperar(1500);
for (let i = 0; i < 3 && (await escena())?.clave === 'Taller'; i++) { await tocar('.navegar .b'); await esperar(1200); }
await compu.waitForFunction(() => window.__controlCelular.escena()?.clave === 'Expediente', null, { timeout: 8000 }).catch(() => {});
await esperar(1000);
const foco = await compu.evaluate(() => window.__controlCelular.juego().scene.getScene('Expediente').teclado?.actual?.rotulo?.() ?? null);
p = await principal();
paso(/gratis|free/i.test(p?.texto ?? '') && !p.apagado, `al volver del Taller (foco del juego en «${foco}»), el celular ofrece «${p?.texto}»`);
await tocar('.atajo.principal');
await compu.waitForFunction(() => window.__controlCelular.escena()?.clave === 'Taller', null, { timeout: 8000 }).catch(() => {});
paso((await escena())?.clave === 'Taller', 'y tocarlo vuelve a abrir el Taller (sin gastar otro ticket)');

// ---- 2. estilo estable: la barra ya no tiene botones de estilo/modo; solo el menú ⚙ los cambia
const clase = () => cel.evaluate(() => document.documentElement.className);
const antes = await clase();
const barra = await cel.locator('#barra').boundingBox();
for (const fx of [0.55, 0.7, 0.8, 0.9]) { await toque(barra.x + barra.width * fx, barra.y + barra.height / 2, 60); await esperar(150); }
const despues = await clase();
paso(antes === despues && (await cel.evaluate(() => document.getElementById('ajustes').classList.contains('oculto'))),
  `tocar la barra no cambia el estilo (${antes.trim()})`);
await tocar('#bAjustes');
await esperar(300);
paso(!(await cel.evaluate(() => document.getElementById('ajustes').classList.contains('oculto'))), '⚙ abre el menú de ajustes');
await tocar('#ajustes [data-v="general"]');
await esperar(200);
paso((await clase()).includes('general'), 'en el menú, «Clásico» cambia el estilo');
await tocar('#ajustes [data-v="glass"]');
await tocar('#bCerrarAjustes');
await esperar(300);
paso((await clase()).includes('glass') && (await cel.evaluate(() => document.getElementById('ajustes').classList.contains('oculto'))),
  'vuelve a Glass y «Listo» cierra el menú');

// ---- 3. vidrio WebGL: perder el contexto no deja el estilo de CSS para siempre
const gl = () => cel.evaluate(() => window.__vidrio?.encendido?.() ?? false);
paso(await gl(), 'vidrio WebGL encendido');
const pudo = await cel.evaluate(() => window.__vidrio.perder(true));
await esperar(400);
await cel.waitForFunction(() => window.__vidrio.encendido(), null, { timeout: 5000 }).catch(() => {});
paso(pudo && (await gl()), 'contexto perdido y devuelto por el sistema: el vidrio vuelve');
await cel.evaluate(() => window.__vidrio.perder(false));
await esperar(300);
const apagado = !(await gl());
await cel.waitForFunction(() => window.__vidrio.encendido(), null, { timeout: 6000 }).catch(() => {});
paso(apagado && (await gl()), 'contexto perdido sin devolver: se crea un lienzo nuevo y el vidrio vuelve');

paso(!errores.length, errores.length ? `errores: ${[...new Set(errores)].join(' | ')}` : 'sin errores de página');
await nav.close();
process.exit(fallas ? 1 : 0);
