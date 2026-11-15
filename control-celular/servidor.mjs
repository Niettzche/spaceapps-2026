// Relay del control de celular de MARSCEPTION.
//
// Un solo puerto (8787) para todo:
//   GET  /             página del control (la abre el celular con el QR)
//   GET  /puente.js    script que la pantalla (el juego en la compu) carga para recibir botones
//   GET  /info         sala y direcciones de red (solo desde esta compu)
//   GET  /qr.svg?u=…   QR de una URL (solo desde esta compu)
//   GET  /pantalla     página con el QR grande, por si no se usa el puente
//   WS   /ws?rol=pad&sala=NNNN    celular
//   WS   /ws?rol=pantalla         juego (solo desde esta compu)
//
// El celular manda {t:'k', k:'ArrowRight', d:1|0, r:0|1}. El relay lleva la cuenta de qué tiene presionado cada
// celular y, si uno se desconecta, suelta sus teclas: así nunca se queda "pegado" el acelerador.
// El juego no depende de esto: si el relay no corre, el puente no carga y el juego sigue igual.
//
// MODO=publico (demo en internet, detrás de nginx; ver DESPLIEGUE.md). Cambia esto:
//   - Todo vive bajo BASE (p. ej. /mando): /mando/ (control), /mando/puente.js, /mando/qr.svg, /mando/salud, wss /mando/ws.
//   - Varias salas: cada pantalla que se conecta recibe una sala nueva {t:'sala', sala, token} (6 dígitos + token
//     secreto para recuperarla si se recarga la página). La sala muere cuando su pantalla se va (tras GRACIA_MS).
//   - Sin /info ni /pantalla (no se exponen IP locales). /qr.svg solo hace QR de la URL del control en el mismo host.
//   - Límites: salas, celulares por sala, salas nuevas e intentos fallidos por IP, mensajes pequeños, solo teclas
//     permitidas y WebSocket solo desde una página del mismo host.
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';

const PUERTO = Number(process.env.PUERTO ?? 8787);
const PUBLICO_MODO = process.env.MODO === 'publico';
// Prefijo de ruta (solo modo público): '/mando' → '/mando/…'. Sin barra final.
const BASE = PUBLICO_MODO ? (process.env.BASE ?? '/mando').replace(/\/+$/, '') : '';
if (PUBLICO_MODO && !/^(\/[a-z0-9_-]+)+$/i.test(BASE)) throw new Error('BASE debe ser una ruta como /mando');
const HOST = process.env.HOST ?? (PUBLICO_MODO ? '127.0.0.1' : '0.0.0.0'); // público: solo nginx le habla
const MAX_SALAS = Number(process.env.MAX_SALAS ?? 200);
const MAX_PADS = Number(process.env.MAX_PADS ?? 4); // celulares por sala
const GRACIA_MS = Number(process.env.GRACIA_MS ?? 20000); // la pantalla puede recargar sin perder la sala
const DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(DIR, 'publico');

// Modo local: una sola sala, guardada en sala.txt: si el relay se reinicia, el celular sigue entrando con el mismo QR.
const SALA = PUBLICO_MODO ? null : (() => {
  if (/^\d{4}$/.test(process.env.SALA ?? '')) return process.env.SALA;
  const archivo = path.join(DIR, 'sala.txt');
  try { const s = readFileSync(archivo, 'utf8').trim(); if (/^\d{4}$/.test(s)) return s; } catch { /* primera vez */ }
  const s = String(Math.floor(1000 + Math.random() * 9000));
  try { writeFileSync(archivo, s); } catch { /* carpeta de solo lectura: sala nueva cada vez */ }
  return s;
})();

// Teclas que el celular puede mandar (el puente sabe traducir cada una a un KeyboardEvent).
const PERMITIDAS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', ' ', 'Tab', 'Delete', 'Backspace',
  'a', 'c', 'h', 'i', 'l', 'm', 'n', 'p', 'r', 'x', '1', '2', '3', '4', '5', '6', '7', '8', '9',
]);

// ---------------------------------------------------------------- red
const VIRTUAL = /vEthernet|VirtualBox|VMware|WSL|Hyper-V|Loopback|docker|vbox|Tailscale|ZeroTier|Bluetooth/i;
const WIFI = /Wi-?Fi|WLAN|Wireless|Inal[aá]mbrica/i;

/** Direcciones IPv4 de esta compu, la más probable primero (Wi-Fi, luego cable, luego hotspot de Windows, luego virtuales). */
export function direcciones() {
  const out = [];
  for (const [nombre, lista] of Object.entries(os.networkInterfaces())) {
    for (const d of lista ?? []) {
      if (!(d.family === 'IPv4' || d.family === 4) || d.internal || d.address.startsWith('169.254.')) continue;
      const hotspotPC = d.address.startsWith('192.168.137.');
      const peso = VIRTUAL.test(nombre) ? 3 : hotspotPC ? 2 : WIFI.test(nombre) ? 0 : 1;
      out.push({ nombre: hotspotPC ? `${nombre} (hotspot de esta compu)` : nombre, ip: d.address, peso });
    }
  }
  return out.sort((a, b) => a.peso - b.peso).map(({ nombre, ip }) => ({ nombre, ip, url: urlPad(ip) }));
}
const urlPad = (ip) => `http://${ip}:${PUERTO}/?s=${SALA}`;

function propias() {
  const s = new Set(['127.0.0.1', '::1']);
  for (const lista of Object.values(os.networkInterfaces())) for (const d of lista ?? []) s.add(d.address);
  return s;
}
/** true si la petición viene de esta misma compu (loopback o una de sus propias IP). */
function esLocal(req) {
  const ip = (req.socket.remoteAddress ?? '').replace(/^::ffff:/, '');
  return propias().has(ip);
}

/** IP del cliente. En modo público (detrás de nginx y Cloudflare) se toma de las cabeceras solo si llega por loopback. */
function ipCliente(req) {
  const ip = (req.socket.remoteAddress ?? '').replace(/^::ffff:/, '');
  if (!PUBLICO_MODO || (ip !== '127.0.0.1' && ip !== '::1')) return ip;
  const h = req.headers;
  const fwd = String(h['x-forwarded-for'] ?? '').split(',')[0];
  return String(h['cf-connecting-ip'] ?? h['x-real-ip'] ?? fwd ?? '').trim() || ip;
}

/** Modo público: el WebSocket solo se acepta desde una página del mismo host (otra web no puede usar el relay). */
function mismoOrigen(req) {
  const o = req.headers.origin;
  if (!o) return false;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}

// Ventanas de 1 min por IP (salas creadas, intentos fallidos de entrar a una sala).
const cupos = new Map();
function cupo(tipo, ip, max) {
  const k = `${tipo}|${ip}`, ahora = Date.now();
  let c = cupos.get(k);
  if (!c || ahora - c.t0 > 60000) { c = { t0: ahora, n: 0 }; cupos.set(k, c); }
  return ++c.n <= max;
}
setInterval(() => {
  const ahora = Date.now();
  for (const [k, c] of cupos) if (ahora - c.t0 > 60000) cupos.delete(k);
}, 60000).unref();

// ---------------------------------------------------------------- HTTP
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

async function servirArchivo(res, archivo) {
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(datos);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}

const servidor = http.createServer((req, res) => {
  // Una petición rara (URL mal codificada, QR que falla) responde 400/500 y nunca tumba el relay.
  atender(req, res).catch((e) => {
    console.error('[control] error en', req.url, e?.message ?? e);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});

async function atender(req, res) {
  const url = new URL(req.url, 'http://x');
  let ruta;
  try { ruta = decodeURIComponent(url.pathname); } catch { return res.writeHead(400).end(); }
  if (PUBLICO_MODO) return atenderPublico(req, res, url, ruta);
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (ruta === '/puente.js') return servirArchivo(res, path.join(DIR, 'puente.js'));

  if (ruta === '/info' || ruta === '/qr.svg' || ruta === '/pantalla') {
    if (!esLocal(req)) return res.writeHead(403).end('Solo desde la compu que corre el juego');
    if (ruta === '/info') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ sala: SALA, puerto: PUERTO, direcciones: direcciones(), pads: salaLocal().pads.size }));
    }
    if (ruta === '/qr.svg') return servirQR(res, url.searchParams.get('u') ?? urlPad(direcciones()[0]?.ip ?? 'localhost'));
    return servirArchivo(res, path.join(PUBLICO, 'pantalla.html'));
  }
  return servirControl(res, ruta);
}

async function servirQR(res, texto) {
  const svg = await QRCode.toString(texto,
    { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0d17', light: '#ffffff' } });
  res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
  return res.end(svg);
}

// Archivos del control (sin salir de /publico). pantalla.html es solo del modo local.
function servirControl(res, ruta) {
  const archivo = path.normalize(path.join(PUBLICO, ruta === '/' ? 'index.html' : ruta));
  if (!archivo.startsWith(PUBLICO + path.sep) && archivo !== PUBLICO) return res.writeHead(403).end();
  if (PUBLICO_MODO && path.basename(archivo) === 'pantalla.html') return res.writeHead(404).end();
  return servirArchivo(res, archivo);
}

async function atenderPublico(req, res, url, ruta) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end();
  if (ruta === BASE) { res.writeHead(301, { Location: `${BASE}/${url.search}` }); return res.end(); }
  if (!ruta.startsWith(BASE + '/')) return res.writeHead(404).end();
  const sub = ruta.slice(BASE.length); // '/…'
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (sub === '/salud') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, salas: salas.size }));
  }
  if (sub === '/puente.js') return servirArchivo(res, path.join(DIR, 'puente.js'));
  if (sub === '/qr.svg') {
    // Solo QR de la página del control en este mismo host (no es un generador de QR abierto).
    const u = url.searchParams.get('u') ?? '';
    let ok = false;
    try {
      const d = new URL(u);
      ok = u.length <= 300 && (d.protocol === 'https:' || d.protocol === 'http:') && d.host === req.headers.host
        && d.pathname === `${BASE}/`;
    } catch { /* URL inválida */ }
    if (!ok) return res.writeHead(400).end();
    return servirQR(res, u);
  }
  return servirControl(res, sub);
}

// ---------------------------------------------------------------- WebSocket
const wss = new WebSocketServer({ noServer: true, maxPayload: PUBLICO_MODO ? 512 : 4096 });
const salas = new Map(); // código → sala
let siguienteId = 1;

const enviar = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };

function nuevaSala(codigo, token = null) {
  const sala = {
    codigo, token, pantallas: new Set(),
    pads: new Map(), // ws → { id, teclas: Set }
    cuenta: new Map(), // tecla → cuántos celulares la tienen presionada
    ultimaEscena: null, tMuerte: null,
  };
  salas.set(codigo, sala);
  return sala;
}
const salaLocal = () => salas.get(SALA) ?? nuevaSala(SALA);

function crearSalaPublica() {
  for (let i = 0; i < 50; i++) {
    const codigo = String(crypto.randomInt(100000, 1000000));
    if (!salas.has(codigo)) return nuevaSala(codigo, crypto.randomBytes(16).toString('hex'));
  }
  return null;
}
function cerrarSala(sala) {
  clearTimeout(sala.tMuerte);
  salas.delete(sala.codigo);
  for (const ws of sala.pads.keys()) ws.close(4001, 'sala');
  log(`sala ${sala.codigo} cerrada (${salas.size} abiertas)`);
}

const aPantallas = (sala, msg) => sala.pantallas.forEach((ws) => enviar(ws, msg));
const aPads = (sala, msg) => sala.pads.forEach((_, ws) => enviar(ws, msg));
const estadoPads = (sala) => aPantallas(sala, { t: 'pads', n: sala.pads.size });
const estadoPantalla = (sala) => aPads(sala, { t: 'estado', pantalla: sala.pantallas.size > 0, escena: sala.ultimaEscena });

function tecla(sala, pad, k, abajo, repetir) {
  if (abajo === pad.teclas.has(k)) return;
  const n = sala.cuenta.get(k) ?? 0;
  if (abajo) {
    pad.teclas.add(k);
    sala.cuenta.set(k, n + 1);
    if (n === 0) aPantallas(sala, { t: 'k', k, d: 1, r: repetir ? 1 : 0 });
  } else {
    pad.teclas.delete(k);
    sala.cuenta.set(k, Math.max(0, n - 1));
    if (n === 1) aPantallas(sala, { t: 'k', k, d: 0 });
  }
}

/** Modo público: sala para una pantalla (la suya tras recargar, si trae el token, o una nueva). null = rechazar. */
function salaParaPantalla(url, ip) {
  const previa = salas.get(url.searchParams.get('sala') ?? '');
  const token = url.searchParams.get('token') ?? '';
  if (previa?.token && !previa.pantallas.size && token.length === previa.token.length
    && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(previa.token))) return previa;
  if (salas.size >= MAX_SALAS || !cupo('sala', ip, 10)) return null;
  return crearSalaPublica();
}

servidor.on('upgrade', (req, socket, cabeza) => {
  socket.on('error', () => { /* el cliente se fue a medio saludo */ });
  let url;
  try { url = new URL(req.url, 'http://x'); } catch { return socket.destroy(); }
  if (url.pathname !== `${BASE}/ws`) return socket.destroy();
  const rol = url.searchParams.get('rol');
  let sala = null;
  if (PUBLICO_MODO) {
    if (!mismoOrigen(req)) return socket.destroy();
    const ip = ipCliente(req);
    if (rol === 'pantalla') {
      sala = salaParaPantalla(url, ip);
      if (!sala) return socket.destroy();
    } else if (rol === 'pad') {
      sala = salas.get(url.searchParams.get('sala') ?? '') ?? null;
      if (!sala && !cupo('fallo', ip, 20)) return socket.destroy(); // adivinar códigos sale caro
      if (sala && sala.pads.size >= MAX_PADS) return socket.destroy();
    } else return socket.destroy();
  } else {
    if (rol === 'pantalla' && !esLocal(req)) return socket.destroy();
    if (rol === 'pantalla' || url.searchParams.get('sala') === SALA) sala = salaLocal();
  }
  socket.setNoDelay(true); // cada botón sale en cuanto se toca (sin el retraso de Nagle)
  wss.handleUpgrade(req, socket, cabeza, (ws) => {
    ws.vivo = true;
    ws.on('pong', () => { ws.vivo = true; });
    ws.on('error', () => { /* se cierra solo */ });
    if (rol === 'pantalla') return conectarPantalla(ws, sala);
    if (rol === 'pad') {
      if (!sala) return ws.close(4001, 'sala');
      return conectarPad(ws, sala);
    }
    ws.close(4000, 'rol');
  });
});

function conectarPantalla(ws, sala) {
  clearTimeout(sala.tMuerte);
  sala.pantallas.add(ws);
  log(PUBLICO_MODO ? `pantalla en la sala ${sala.codigo} (${salas.size} abiertas)` : 'pantalla conectada');
  if (PUBLICO_MODO) enviar(ws, { t: 'sala', sala: sala.codigo, token: sala.token });
  enviar(ws, { t: 'pads', n: sala.pads.size });
  estadoPantalla(sala);
  ws.on('message', (datos) => {
    let m; try { m = JSON.parse(datos); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'escena') {
      sala.ultimaEscena = { clave: String(m.clave ?? '').slice(0, 32), pausado: !!m.pausado };
      estadoPantalla(sala);
    } else if (m.t === 'vibrar') aPads(sala, { t: 'vibrar', ms: Math.min(400, Number(m.ms) || 30) });
    else if (m.t === 'p') enviar(ws, { t: 'p' }); // latido de la pantalla (mantiene vivo el proxy)
  });
  ws.on('close', () => {
    sala.pantallas.delete(ws);
    if (sala.pantallas.size) return;
    sala.ultimaEscena = null; // sin juego abierto, el celular no se queda en "conducir"
    log(PUBLICO_MODO ? `pantalla salió de la sala ${sala.codigo}` : 'pantalla desconectada');
    estadoPantalla(sala);
    if (PUBLICO_MODO) sala.tMuerte = setTimeout(() => cerrarSala(sala), GRACIA_MS);
  });
}

function conectarPad(ws, sala) {
  const pad = { id: siguienteId++, teclas: new Set(), ventana: Date.now(), n: 0 };
  sala.pads.set(ws, pad);
  log(`celular #${pad.id} conectado${PUBLICO_MODO ? ` a la sala ${sala.codigo}` : ''} (${sala.pads.size} en total)`);
  enviar(ws, { t: 'estado', pantalla: sala.pantallas.size > 0, escena: sala.ultimaEscena, id: pad.id });
  estadoPads(sala);
  ws.on('message', (datos) => {
    // Tope de mensajes: un celular real manda unas decenas por segundo; más que eso se ignora.
    const ahora = Date.now();
    if (ahora - pad.ventana > 1000) { pad.ventana = ahora; pad.n = 0; }
    if (++pad.n > 120) return;
    let m; try { m = JSON.parse(datos); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'k' && typeof m.k === 'string' && PERMITIDAS.has(m.k)) tecla(sala, pad, m.k, !!m.d, !!m.r);
    else if (m.t === 'soltar') [...pad.teclas].forEach((k) => tecla(sala, pad, k, false));
    else if (m.t === 'p') enviar(ws, { t: 'p', ts: Number(m.ts) || 0 });
  });
  ws.on('close', () => {
    [...pad.teclas].forEach((k) => tecla(sala, pad, k, false)); // nunca dejar una tecla presionada
    sala.pads.delete(ws);
    log(`celular #${pad.id} desconectado (${sala.pads.size} en total)`);
    estadoPads(sala);
  });
}

// Latido: si un celular se bloquea o sale de la red, se cierra en ≤ 10 s y se sueltan sus teclas.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.vivo) { ws.terminate(); continue; }
    ws.vivo = false;
    try { ws.ping(); } catch { /* ya cerrado */ }
  }
}, 5000).unref();

// ---------------------------------------------------------------- consola
const log = (s) => console.log(`[control ${new Date().toLocaleTimeString()}] ${s}`);

async function anunciar() {
  const dirs = direcciones();
  console.log('\n  MARSCEPTION · control de celular');
  console.log(`  Sala: ${SALA}`);
  if (!dirs.length) {
    console.log('  ⚠ Esta compu no tiene red. Conéctala al Wi-Fi o al hotspot del celular; el QR aparece solo.\n');
    return;
  }
  console.log('  En el celular (misma red), escanea el QR o abre:');
  dirs.forEach((d, i) => console.log(`   ${i === 0 ? '→' : ' '} ${d.url}   [${d.nombre}]`));
  console.log(await QRCode.toString(dirs[0].url, { type: 'terminal', small: true }));
  console.log(`  QR grande en esta compu: http://localhost:${PUERTO}/pantalla\n`);
}

// Si la compu cambia de red (Wi-Fi del evento ↔ hotspot del celular), se vuelve a anunciar el QR (solo modo local).
let firma = '';
if (!PUBLICO_MODO) {
  setInterval(() => {
    const f = direcciones().map((d) => d.ip).join(',');
    if (f !== firma) { if (firma) log('cambió la red'); firma = f; anunciar(); }
  }, 3000).unref();
}

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`El puerto ${PUERTO} ya está en uso (¿ya corre otro relay?). Usa PUERTO=8788 npm start.`);
  else console.error(e);
  process.exit(1);
});

servidor.listen(PUERTO, HOST, () => {
  if (PUBLICO_MODO) {
    console.log(`\n  MARSCEPTION · control de celular (modo público)\n  Escuchando en ${HOST}:${PUERTO} bajo ${BASE}/ (detrás de nginx; ver DESPLIEGUE.md)\n`);
    return;
  }
  firma = direcciones().map((d) => d.ip).join(',');
  anunciar();
});
