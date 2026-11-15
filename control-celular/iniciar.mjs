// Arranca todo con un comando: el relay del control (puerto 8787) y el juego (Vite, puerto 5174).
//   npm run todo
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
// Dentro del repo: control-celular/ junto a game/. Fuera (carpeta local): el repo clonado en spaceapps-2026/.
const JUEGO = [path.resolve(DIR, '..', 'game'), path.resolve(DIR, '..', 'spaceapps-2026', 'game')]
  .find((d) => existsSync(path.join(d, 'package.json')));

if (!JUEGO) {
  console.error('No encuentro el juego (../game). Corre esto desde control-celular/ dentro del repo.');
  process.exit(1);
}
// Un solo texto de comando (npm en Windows necesita shell; pasar argumentos sueltos con shell está obsoleto en Node).
const correr = (cmd) => spawn(`npm ${cmd}`, { cwd: JUEGO, stdio: 'inherit', shell: true });

if (!existsSync(path.join(JUEGO, 'node_modules'))) {
  console.log('Instalando dependencias del juego (solo la primera vez)…');
  await new Promise((ok) => correr('install').on('exit', ok));
}
// 5174 para no chocar con el juego oficial (5173) si también está abierto; si está ocupado, Vite toma el siguiente.
const vite = correr('run dev -- --port 5174');
const salir = () => { vite.kill(); process.exit(0); };
process.on('SIGINT', salir);
process.on('SIGTERM', salir);

await import('./servidor.mjs');
console.log('  Juego: abre en esta compu la URL "Local" que muestra Vite (normalmente http://localhost:5174/).');
console.log('  El panel con el QR aparece solo dentro del juego.\n');
