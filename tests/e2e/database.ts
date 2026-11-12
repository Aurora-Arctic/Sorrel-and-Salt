import postgres from 'postgres';
import { cloneDatabase, databaseUrl, dropDatabase, seedTemplate } from '../support/seeded-database';
import { SESSION_COOKIE, signed } from './session-cookie';
import { pauseBetweenPolls } from './waits';
import { E2E_SLOTS, currentSlot, serverUrl, slotPort } from './slots';
import type { WarmUpClock } from './types';

// One database per worker slot, read by that slot's server: global-setup.ts clones each from a
// seeded template, and a db-touching spec file recreates its own in `beforeAll`.
const E2E_TEMPLATE = 'sorrel_e2e_template';
export const CONFIGURED_PROVIDERS_DATABASE = 'sorrel_e2e_providers';
/** The compendium-cache server's, which no spec reseeds: its cache would not follow. */
export const COMPENDIUM_CACHE_DATABASE = 'sorrel_e2e_cache';

export function slotDatabase(slot: number): string {
  return `sorrel_e2e_${slot}`;
}

export function e2eDatabaseUrl(database = slotDatabase(currentSlot())): string {
  return databaseUrl(database);
}

export async function seedE2eTemplate(): Promise<void> {
  await seedTemplate(E2E_TEMPLATE, { demoCoven: true });
}

export async function cloneE2eDatabases(): Promise<void> {
  const slots = Array.from({ length: E2E_SLOTS }, (_, slot) => slotDatabase(slot));
  for (const database of [...slots, CONFIGURED_PROVIDERS_DATABASE, COMPENDIUM_CACHE_DATABASE]) {
    await cloneDatabase(database, E2E_TEMPLATE);
  }
}

/**
 * Between spec files: the worker's slot database back to the seeded baseline, and the slot's server told so.
 * `DROP DATABASE ... WITH (FORCE)` kills the server's pooled connections, but it learns of it only on reading
 * each socket's close, so a request landing first fails; paused bursts of session lookups go out until every one
 * answers 200, for long enough to cover the pool's reconnect backoff after a connect that failed mid-clone.
 */
export async function recreateE2eDatabase(): Promise<void> {
  const slot = currentSlot();
  await cloneDatabase(slotDatabase(slot), E2E_TEMPLATE);
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    throw new Error('BETTER_AUTH_SECRET must be set for the runner and the server alike');
  // A validly signed token no session row holds: the server looks it up, and
  // answers 200 with no session. A 500 is the dead connection being found.
  const request = () =>
    fetch(`${serverUrl(slotPort(slot))}/api/auth/get-session`, {
      headers: { cookie: `${SESSION_COOKIE}=${signed('warm-up', secret)}` },
    }).catch(() => undefined);
  await untilSessionLookupsAnswer(serverUrl(slotPort(slot)), request);
}

const REAL_CLOCK: WarmUpClock = {
  now: () => Date.now(),
  sleep: pauseBetweenPolls,
};

// Past postgres's reconnect backoff, which caps at 20 s; the pause lets the backoff run out rather than spend it in bursts.
const WARM_UP_DEADLINE_MS = 30_000;
const WARM_UP_PAUSE_MS = 500;
const WARM_UP_BURST = 10;

/** Bursts of `request`s to `server`, paused between, until a whole burst answers OK; throws at the deadline. */
export async function untilSessionLookupsAnswer(
  server: string,
  request: () => Promise<Response | undefined>,
  clock: WarmUpClock = REAL_CLOCK,
): Promise<void> {
  const started = clock.now();
  for (;;) {
    const responses = await Promise.all(Array.from({ length: WARM_UP_BURST }, request));
    if (responses.every((response) => response?.ok)) return;
    const elapsed = clock.now() - started;
    if (elapsed >= WARM_UP_DEADLINE_MS) {
      const statuses = responses.map((response) =>
        response ? String(response.status) : 'no response',
      );
      throw new Error(
        `The slot server at ${server} kept failing session lookups for ${(elapsed / 1000).toFixed(1)} s after the database was recloned. Status codes in the last burst: ${statuses.join(', ')}.`,
      );
    }
    await clock.sleep(WARM_UP_PAUSE_MS);
  }
}

export async function dropE2eTemplate(): Promise<void> {
  await dropDatabase(E2E_TEMPLATE);
}

/**
 * Runs `use` with a raw client on a worker's e2e database and ends the client after. Setup rows go in through
 * it so that setup does not depend on the code a spec proves (CLAUDE.md, Testing). `database` names another
 * database than the worker's own.
 */
export async function withE2eSql<T>(
  use: (sql: postgres.Sql) => Promise<T>,
  database?: string,
): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(database), { onnotice: () => {} });
  try {
    return await use(sql);
  } finally {
    await sql.end();
  }
}
