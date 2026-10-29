import os from 'node:os';
import type { SlotEnv } from './types';

// One `next start` and one database per worker slot. The server needs its own
// because it reads `DATABASE_URL` once at boot; the worker count is fixed here
// so the servers can be declared up front (claude-docs/testing/e2e.md, "E2E").

/** The cache server's port offset above the first slot. */
const CACHE_OFFSET = 100;

/** The workshop (Storybook) server, one above the cache server (playwright.workshop.config.ts). */
const WORKSHOP_OFFSET = CACHE_OFFSET + 1;

/**
 * The first slot's port, 8001, so `npm run dev` on 8000 and an e2e run sit side by side; `E2E_PORT_BASE`
 * moves the block. Playwright reuses a server it finds on a port off CI, so a stray dev server would answer.
 */
function portBase(env: SlotEnv = process.env): number {
  const raw = env.E2E_PORT_BASE;
  if (raw === undefined) return 8001;

  const base = Number(raw);
  if (!/^\d+$/.test(raw) || base < 1024 || base + WORKSHOP_OFFSET > 65535)
    throw new Error(
      `E2E_PORT_BASE must be a whole number from 1024 to ${65535 - WORKSHOP_OFFSET}, got "${raw}"`,
    );
  return base;
}

const FIRST_SLOT_PORT = portBase();
/** Above every slot's port, so no slot can reach or reuse it. */
export const CONFIGURED_PROVIDERS_PORT = FIRST_SLOT_PORT + 99;
/**
 * The one server that keeps its data cache; the slots turn it off because a reseed would leave it
 * answering stale rows (claude-docs/db/compendium-cache.md, "In tests").
 */
export const COMPENDIUM_CACHE_PORT = FIRST_SLOT_PORT + CACHE_OFFSET;
/** The workshop server, for playwright.workshop.config.ts alone. */
export const WORKSHOP_PORT = FIRST_SLOT_PORT + WORKSHOP_OFFSET;
const MAX_SLOTS = CONFIGURED_PROVIDERS_PORT - FIRST_SLOT_PORT;

/**
 * `E2E_WORKERS`, else half the CPUs floored at one. More workers were slower and timed out stories
 * (claude-docs/testing/e2e.md, "Where a run's time goes"). CI sets `E2E_WORKERS` itself.
 */
function slotCount(env: SlotEnv = process.env, cpus = os.cpus().length): number {
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
 * This worker's slot: Playwright's `parallelIndex`. A `--workers` above `E2E_WORKERS` lands past the
 * last server and fails on a refused connection.
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

// Set only by the `devcontainer` compose service: the browser then runs in the
// `playwright-server` service while the runner stays local, which is why
// `webServer`'s readiness poll stays on `localhost` (claude-docs/testing/e2e.md, "E2E").
export const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;

/**
 * The audit's own server: WebKit, Firefox and Chromium on the `playwright-audit` compose service. `E2E_AUDIT=1`
 * is the one switch (claude-docs/testing/e2e.md, "The audit").
 */
export const auditWsEndpoint =
  process.env.E2E_AUDIT === '1' ? process.env.PLAYWRIGHT_AUDIT_WS_ENDPOINT : undefined;

/**
 * Whether the servers drop `__Secure-` from Better Auth's cookie names and `signInAs` puts the cookie in the
 * jar: on under the audit alone, since WebKit sends neither to a plain-http origin
 * (claude-docs/testing/e2e.md, "A signed-in browser without a provider").
 */
export const plainSessionCookie = process.env.E2E_AUDIT === '1';

export const serverUrl = (port: number) => `http://localhost:${port}`;

/**
 * A remote browser cannot resolve the runner's `localhost`; `start` binds 0.0.0.0, so the compose
 * service name reaches it.
 */
export const browserUrl = (port: number) =>
  wsEndpoint || auditWsEndpoint ? `http://devcontainer:${port}` : serverUrl(port);

/**
 * A slot server's address for the browser: the `baseURL` fixture's value (tests/e2e/fixtures.ts), and what
 * a `beforeAll`, which has no `baseURL`, sets its page up with.
 */
export const slotUrl = (slot: number) => browserUrl(slotPort(slot));
