// Builds the app against the in-repo Supabase mock, starts both, runs the browser
// suite, and always stops what it started. Uses its own build folder, so a running
// `next dev` is left alone.
//   npm run test:e2e
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const APP_PORT = process.env.E2E_APP_PORT ?? '3110';
const MOCK_PORT = process.env.MOCK_PORT ?? '54399';
const env = {
  ...process.env,
  NEXT_DIST_DIR: '.next-e2e',
  NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${MOCK_PORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
  NEXT_PUBLIC_SUPABASE_SCHEMA: 'coin_shop',
  SUPABASE_SERVICE_ROLE_KEY: '',
  E2E_APP_URL: `http://localhost:${APP_PORT}`,
  E2E_MOCK_URL: `http://localhost:${MOCK_PORT}`,
  MOCK_PORT,
};

// `next build` rewrites tsconfig.json when a custom distDir is used. Put it back after.
const TSCONFIG = 'tsconfig.json';
const tsconfigBefore = readFileSync(TSCONFIG, 'utf8');

// Children run in their own process group so the whole tree (npx -> next-server) stops.
const children = [];
const start = (cmd, args, stdio) => {
  const child = spawn(cmd, args, { env, stdio, detached: true });
  children.push(child);
  return child;
};
const stopAll = () => {
  for (const c of children) {
    try { process.kill(-c.pid, 'SIGTERM'); } catch { /* already gone */ }
  }
  writeFileSync(TSCONFIG, tsconfigBefore);
  rmSync('.next-e2e', { recursive: true, force: true });
};
process.on('SIGINT', () => { stopAll(); process.exit(130); });

async function waitFor(url, label) {
  for (let i = 0; i < 100; i++) {
    try { await fetch(url, { redirect: 'manual' }); return; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  throw new Error(`${label} did not start on ${url}`);
}

let code = 1;
try {
  const build = spawnSync('node', ['node_modules/next/dist/bin/next', 'build'], { env, stdio: 'inherit' });
  if (build.status !== 0) throw new Error('build failed');

  start('node', ['e2e/mock-supabase.mjs'], 'inherit');
  start('node', ['node_modules/next/dist/bin/next', 'start', '-p', APP_PORT], 'ignore');
  await waitFor(`http://localhost:${MOCK_PORT}/__state`, 'mock');
  await waitFor(`http://localhost:${APP_PORT}/login`, 'app');

  code = spawnSync('node', ['e2e/suite.mjs'], { env, stdio: 'inherit' }).status ?? 1;
} catch (error) {
  console.error(String(error));
} finally {
  stopAll();
}
process.exit(code);
