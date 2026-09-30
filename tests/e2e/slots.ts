import os from 'node:os';
import type { SlotEnv } from './types';

// One `next start` and one database per worker slot, as each Vitest pool slot
// has a database — but a server as well, because the code under test runs in
// the server, which reads `DATABASE_URL` once at boot
// (claude-docs/testing.md, "E2E"). The servers are declared up front, so the
// worker count is fixed here rather than chosen by Playwright.

/** Not the dev server's 8000, so `npm run dev` and an e2e run sit side by side. */
const FIRST_SLOT_PORT = 8001;
/** Above every slot's port, so no slot can reach — or locally reuse — it. */
export const CONFIGURED_PROVIDERS_PORT = 8100;
export const MAX_SLOTS = CONFIGURED_PROVIDERS_PORT - FIRST_SLOT_PORT;

/**
 * `E2E_WORKERS`, or else half the CPUs floored at one — Playwright's own
 * default, which a `workers` left unset would have given.
 */
export function slotCount(env: SlotEnv = process.env, cpus = os.cpus().length): number {
  const raw = env.E2E_WORKERS;
  if (raw === undefined) return Math.max(1, Math.floor(cpus / 2));

  const count = Number(raw);
  if (!/^\d+$/.test(raw) || count < 1 || count > MAX_SLOTS)
    throw new Error(`E2E_WORKERS must be a whole number from 1 to ${MAX_SLOTS}, got "${raw}"`);
  return count;
}

/** Read by the runner and by every worker alike, which inherit its environment. */
export const E2E_SLOTS = slotCount();

export function slotPort(slot: number): number {
  return FIRST_SLOT_PORT + slot;
}

/**
 * This worker's slot: Playwright's `parallelIndex`, unique among running
 * workers and kept by the worker that replaces one after a failure. Thrown past
 * the last server, where a `--workers` above `E2E_WORKERS` would otherwise
 * fail each test on a refused connection to a port nothing serves.
 */
export function currentSlot(env: SlotEnv = process.env, slots = E2E_SLOTS): number {
  const raw = env.TEST_PARALLEL_INDEX;
  if (raw === undefined)
    throw new Error('TEST_PARALLEL_INDEX is not set — this must run inside a Playwright worker');

  const slot = Number(raw);
  if (slot >= slots)
    throw new Error(
      `Worker slot ${slot} has no server: playwright.config.ts starts ${slots}, one per worker. ` +
        'Set E2E_WORKERS to run more workers, rather than passing --workers.',
    );
  return slot;
}

// Set only by the `devcontainer` compose service: the browser then runs in
// the `playwright-server` service while the runner stays local, which is why
// `webServer`'s readiness poll stays on `localhost`. claude-docs/testing.md,
// "E2E".
export const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;

export const serverUrl = (port: number) => `http://localhost:${port}`;

/**
 * A remote browser cannot resolve the runner's `localhost`; `start` binds
 * 0.0.0.0, so the compose service name reaches it.
 */
export const browserUrl = (port: number) =>
  wsEndpoint ? `http://devcontainer:${port}` : serverUrl(port);
