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
import http from 'node:http';
import os from 'node:os';
import { readFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';

const PUERTO = Number(process.env.PUERTO ?? 8787);
const DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(DIR, 'publico');

// La sala se guarda en sala.txt: si el relay se reinicia, el celular sigue entrando con el mismo QR.
const SALA = (() => {
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
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (ruta === '/puente.js') return servirArchivo(res, path.join(DIR, 'puente.js'));

  if (ruta === '/info' || ruta === '/qr.svg' || ruta === '/pantalla') {
    if (!esLocal(req)) return res.writeHead(403).end('Solo desde la compu que corre el juego');
    if (ruta === '/info') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ sala: SALA, puerto: PUERTO, direcciones: direcciones(), pads: pads.size }));
    }
    if (ruta === '/qr.svg') {
      const svg = await QRCode.toString(url.searchParams.get('u') ?? urlPad(direcciones()[0]?.ip ?? 'localhost'),
        { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0d17', light: '#ffffff' } });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      return res.end(svg);
    }
    return servirArchivo(res, path.join(PUBLICO, 'pantalla.html'));
  }

  // Archivos del control (sin salir de /publico).
  const archivo = path.normalize(path.join(PUBLICO, ruta === '/' ? 'index.html' : ruta));
  if (!archivo.startsWith(PUBLICO + path.sep) && archivo !== PUBLICO) return res.writeHead(403).end();
  return servirArchivo(res, archivo);
}

// ---------------------------------------------------------------- WebSocket
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
const pantallas = new Set();
const pads = new Map(); // ws → { id, teclas: Set }
const cuenta = new Map(); // tecla → cuántos celulares la tienen presionada
let ultimaEscena = null;
let siguienteId = 1;

const enviar = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const aPantallas = (msg) => pantallas.forEach((ws) => enviar(ws, msg));
const aPads = (msg) => pads.forEach((_, ws) => enviar(ws, msg));
const estadoPads = () => aPantallas({ t: 'pads', n: pads.size });
const estadoPantalla = () => aPads({ t: 'estado', pantalla: pantallas.size > 0, escena: ultimaEscena });

function tecla(pad, k, abajo, repetir) {
  if (abajo === pad.teclas.has(k)) return;
  const n = cuenta.get(k) ?? 0;
  if (abajo) {
    pad.teclas.add(k);
    cuenta.set(k, n + 1);
    if (n === 0) aPantallas({ t: 'k', k, d: 1, r: repetir ? 1 : 0 });
  } else {
    pad.teclas.delete(k);
    cuenta.set(k, Math.max(0, n - 1));
    if (n === 1) aPantallas({ t: 'k', k, d: 0 });
  }
}

servidor.on('upgrade', (req, socket, cabeza) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== '/ws') return socket.destroy();
  const rol = url.searchParams.get('rol');
  if (rol === 'pantalla' && !esLocal(req)) return socket.destroy();
  socket.setNoDelay(true); // cada botón sale en cuanto se toca (sin el retraso de Nagle)
  wss.handleUpgrade(req, socket, cabeza, (ws) => {
    ws.vivo = true;
    ws.on('pong', () => { ws.vivo = true; });
    if (rol === 'pantalla') return conectarPantalla(ws);
    if (rol === 'pad') {
      if (url.searchParams.get('sala') !== SALA) return ws.close(4001, 'sala');
      return conectarPad(ws);
    }
    ws.close(4000, 'rol');
  });
});

function conectarPantalla(ws) {
  pantallas.add(ws);
  log('pantalla conectada');
  enviar(ws, { t: 'pads', n: pads.size });
  estadoPantalla();
  ws.on('message', (datos) => {
    let m; try { m = JSON.parse(datos); } catch { return; }
    if (m.t === 'escena') { ultimaEscena = { clave: String(m.clave ?? ''), pausado: !!m.pausado }; estadoPantalla(); }
    else if (m.t === 'vibrar') aPads({ t: 'vibrar', ms: Math.min(400, Number(m.ms) || 30) });
  });
  ws.on('close', () => {
    pantallas.delete(ws);
    if (!pantallas.size) ultimaEscena = null; // sin juego abierto, el celular no se queda en "conducir"
    log('pantalla desconectada');
    estadoPantalla();
  });
}

function conectarPad(ws) {
  const pad = { id: siguienteId++, teclas: new Set() };
  pads.set(ws, pad);
  log(`celular #${pad.id} conectado (${pads.size} en total)`);
  enviar(ws, { t: 'estado', pantalla: pantallas.size > 0, escena: ultimaEscena, id: pad.id });
  estadoPads();
  ws.on('message', (datos) => {
    let m; try { m = JSON.parse(datos); } catch { return; }
    if (m.t === 'k' && PERMITIDAS.has(m.k)) tecla(pad, m.k, !!m.d, !!m.r);
    else if (m.t === 'soltar') [...pad.teclas].forEach((k) => tecla(pad, k, false));
    else if (m.t === 'p') enviar(ws, { t: 'p', ts: m.ts });
  });
  ws.on('close', () => {
    [...pad.teclas].forEach((k) => tecla(pad, k, false)); // nunca dejar una tecla presionada
    pads.delete(ws);
    log(`celular #${pad.id} desconectado (${pads.size} en total)`);
    estadoPads();
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

// Si la compu cambia de red (Wi-Fi del evento ↔ hotspot del celular), se vuelve a anunciar el QR.
let firma = '';
setInterval(() => {
  const f = direcciones().map((d) => d.ip).join(',');
  if (f !== firma) { if (firma) log('cambió la red'); firma = f; anunciar(); }
}, 3000).unref();

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`El puerto ${PUERTO} ya está en uso (¿ya corre otro relay?). Usa PUERTO=8788 npm start.`);
  else console.error(e);
  process.exit(1);
});

servidor.listen(PUERTO, '0.0.0.0', () => {
  firma = direcciones().map((d) => d.ip).join(',');
  anunciar();
});
