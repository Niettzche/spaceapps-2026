import { spawnSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const game = path.resolve(web, '../game');
const base = process.env.DEMO_BASE || '/';
if (!base.startsWith('/') || !base.endsWith('/') || base.includes('..') || base.startsWith('//')) {
  throw new Error('DEMO_BASE must be a local absolute path ending in /, e.g. / or /demo/.');
}
function build(dir, env, extraBase) {
  // Use Node directly for portable builds, including Windows paths with spaces.
  const vite = path.join(dir, 'node_modules/vite/bin/vite.js');
  const result = spawnSync(process.execPath, [vite, 'build', '--base', extraBase], {
    cwd: dir, env: { ...process.env, ...env }, stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
build(web, { VITE_GAME_URL: base + 'game/' }, base);
build(game, {}, base + 'game/');
cpSync(path.join(game, 'dist'), path.join(web, 'dist/game'), { recursive: true });
console.log('VPS demo ready in web/dist: website at ' + base + ', game at ' + base + 'game/');
