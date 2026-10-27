import os from 'node:os';
import type { SlotEnv } from './types';

// One `next start` and one database per worker slot, as each Vitest pool slot
// has a database — but a server as well, because the code under test runs in
// the server, which reads `DATABASE_URL` once at boot
// (claude-docs/testing/e2e.md, "E2E"). The servers are declared up front, so the
// worker count is fixed here rather than chosen by Playwright.

/** The cache server sits this far above the first slot: the layout is fixed, only the base moves. */
const CACHE_OFFSET = 100;

/**
 * The workshop (Storybook) sits one above the cache server, for the specs that
 * measure a component no page uses yet (playwright.workshop.config.ts).
 */
const WORKSHOP_OFFSET = CACHE_OFFSET + 1;

/**
 * The first slot's port: 8001, not the dev server's 8000, so `npm run dev` and an
 * e2e run sit side by side. `E2E_PORT_BASE` moves the whole block (slots, then the
 * two special servers and the workshop above them), for when something else already listens on 8001.
 * Playwright reuses a server it finds on a slot's port when not on CI, so a stray dev
 * server there would silently answer the tests instead of the production build.
 * Read by the runner and by every worker alike, which inherit its environment.
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
/** Above every slot's port, so no slot can reach — or locally reuse — it. */
export const CONFIGURED_PROVIDERS_PORT = FIRST_SLOT_PORT + 99;
/**
 * The one server that keeps its data cache (M8.6): the slots' servers turn it
 * off, since a slot's reseed would leave it answering what the last spec file
 * wrote (claude-docs/db/compendium-cache.md, "In tests"). Above the
 * configured-providers server's, for the same reason that one is above the slots'.
 */
export const COMPENDIUM_CACHE_PORT = FIRST_SLOT_PORT + CACHE_OFFSET;
/** The workshop server, for playwright.workshop.config.ts alone. */
export const WORKSHOP_PORT = FIRST_SLOT_PORT + WORKSHOP_OFFSET;
const MAX_SLOTS = CONFIGURED_PROVIDERS_PORT - FIRST_SLOT_PORT;

/**
 * `E2E_WORKERS`, or else half the CPUs floored at one — Playwright's own
 * default, which a `workers` left unset would have given. Kept after trying 9
 * and 12 on 12 cores: 9 matched 6 within noise, 12 was slower and timed out
 * two stories (claude-docs/testing/e2e.md, "Where a run's time goes"). This is
 * the local default only; CI sets `E2E_WORKERS` itself.
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
// `webServer`'s readiness poll stays on `localhost`. claude-docs/testing/e2e.md,
// "E2E".
export const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;

/**
 * The audit's own server (M10.25), WebKit, Firefox and Chromium from
 * Microsoft's image on the `playwright-audit` compose service, read only
 * when the audit is asked for: `E2E_AUDIT=1` is the one switch, so the
 * variable sitting in the devcontainer's environment changes nothing for
 * `npm run e2e` (claude-docs/testing/e2e.md, "The audit").
 */
export const auditWsEndpoint =
  process.env.E2E_AUDIT === '1' ? process.env.PLAYWRIGHT_AUDIT_WS_ENDPOINT : undefined;

/**
 * Whether the e2e servers drop `__Secure-` from Better Auth's cookie names, and
 * `signInAs` puts the session cookie in the browser's jar rather than in a
 * header. On under the audit alone: WebKit sends neither a `__Secure-` cookie
 * nor a hand-added header to a plain-http origin (MB.255;
 * claude-docs/testing/e2e.md, "A signed-in browser without a provider").
 * `npm run e2e` and CI keep the production names.
 */
export const plainSessionCookie = process.env.E2E_AUDIT === '1';

export const serverUrl = (port: number) => `http://localhost:${port}`;

/**
 * A remote browser cannot resolve the runner's `localhost`; `start` binds
 * 0.0.0.0, so the compose service name reaches it. Either server is remote.
 */
export const browserUrl = (port: number) =>
  wsEndpoint || auditWsEndpoint ? `http://devcontainer:${port}` : serverUrl(port);

/**
 * A slot server's address for the browser: what the `baseURL` fixture hands
 * a test (tests/e2e/fixtures.ts), and what a file's `beforeAll`, which has
 * the worker fixtures but not that one, gives the page it sets up with.
 */
export const slotUrl = (slot: number) => browserUrl(slotPort(slot));
