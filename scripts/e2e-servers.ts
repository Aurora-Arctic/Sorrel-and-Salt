#!/usr/bin/env node
// Leaves the e2e servers running between local runs: builds `.next-e2e` once,
// starts every server `npm run e2e` would, and stops them on Ctrl-C. A run then
// attaches to them (`reuseExistingServer`, on whenever CI is unset) and skips the
// build and the boots. It is a developer-run process beside `npm run dev`, and
// staleness is the developer's: after a code change, stop it and start it again,
// which rebuilds. No file watcher, no hash check (claude-docs/testing/e2e.md,
// "Keeping the servers warm").
//
// Run through `tsx` because the server list is TypeScript (tests/e2e/servers.ts)
// and the point is to share it with the Playwright configs rather than keep a
// compiled copy that could drift; scripts/db-seed.ts does the same.
//
// Usage: npm run e2e:servers

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { allServers } from '../tests/e2e/servers.ts';

const READY_TIMEOUT_MS = 60_000;
const [first] = allServers;

async function answers(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return true;
  } catch {
    return false;
  }
}

async function waitUntilUp(url: string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await answers(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${url} did not answer within ${READY_TIMEOUT_MS / 1000} s`);
}

// The build always runs, so "restart after a code change" also rebuilds and a
// stale build cannot be served. It takes the first slot's environment, as the
// config's `npm run build && npm run start` does.
console.log('Building .next-e2e ...');
const build = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, ...first.env },
});
if (build.status !== 0) process.exit(build.status ?? 1);

// Each server is its own process group, so one signal reaches `next` and not
// only the `npm` that started it.
const children: ChildProcess[] = [];
function stopAll(code: number): never {
  for (const child of children) {
    try {
      if (child.pid) process.kill(-child.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
  process.exit(code);
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

const started = Date.now();
const results = await Promise.allSettled(
  allServers.map(async (server) => {
    if (await answers(server.url)) {
      console.log(`${server.url}  already up, left alone`);
      return;
    }
    const child = spawn('npm', ['run', 'start'], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, ...server.env },
    });
    children.push(child);
    child.on('exit', (code) => {
      console.error(`${server.url}  exited (${code}); stopping the rest`);
      stopAll(1);
    });
    await waitUntilUp(server.url);
    console.log(`${server.url}  up`);
  }),
);

const failed = results.filter((result) => result.status === 'rejected');
if (failed.length > 0) {
  for (const result of failed) console.error((result as PromiseRejectedResult).reason.message);
  stopAll(1);
}
console.log(
  `${allServers.length} servers ready in ${((Date.now() - started) / 1000).toFixed(1)} s. Ctrl-C stops them.`,
);

// Keep the process alive; the servers are children, and the signal handlers end it.
setInterval(() => {}, 1 << 30);
