/**
 * Builds the client if it has not been built yet.
 *
 * Runs automatically before `npm start` (npm's prestart hook). Hosts that
 * detect a Node project and just run `npm start` — Replit, Railway, Render —
 * would otherwise boot the API with no UI behind it and serve a blank page.
 * This makes `npm start` correct on its own, with no platform config file.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const built = resolve(root, 'dist/client/index.html');

if (existsSync(built)) {
  console.log('[start] client already built');
  process.exit(0);
}

console.log('[start] no client build found — building once...');
const result = spawnSync('npx', ['vite', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
