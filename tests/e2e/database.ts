import { cloneDatabase, databaseUrl, dropDatabase, seedTemplate } from '../support/seeded-database';
import { SESSION_COOKIE, signed } from './session-cookie';
import { E2E_SLOTS, currentSlot, serverUrl, slotPort } from './slots';

// One database per worker slot, which that slot's server reads: global-setup.ts builds the seeded template
// once per run and clones every slot's database from it, each db-touching spec file recreates its own
// slot's in `beforeAll`, and global-teardown.ts drops the template.
const E2E_TEMPLATE = 'sorrel_e2e_template';
/** The configured-providers server's, which no spec reseeds. */
export const CONFIGURED_PROVIDERS_DATABASE = 'sorrel_e2e_providers';
/** The compendium-cache server's, which no spec reseeds: its cache would not follow. */
export const COMPENDIUM_CACHE_DATABASE = 'sorrel_e2e_cache';

export function slotDatabase(slot: number): string {
  return `sorrel_e2e_${slot}`;
}

/** `database`'s URL; by default the calling worker's own slot's. */
export function e2eDatabaseUrl(database = slotDatabase(currentSlot())): string {
  return databaseUrl(database);
}

/** Once per run. */
export async function seedE2eTemplate(): Promise<void> {
  await seedTemplate(E2E_TEMPLATE, { demoCoven: true });
}

/** Once per run, after the template: every slot's database, the providers server's and the cache server's. */
export async function cloneE2eDatabases(): Promise<void> {
  const slots = Array.from({ length: E2E_SLOTS }, (_, slot) => slotDatabase(slot));
  for (const database of [...slots, CONFIGURED_PROVIDERS_DATABASE, COMPENDIUM_CACHE_DATABASE]) {
    await cloneDatabase(database, E2E_TEMPLATE);
  }
}

/**
 * Between spec files: the worker's slot database back to the seeded baseline, and the slot's server told so.
 * `DROP DATABASE ... WITH (FORCE)` kills the server's pooled connections, but the server learns of it only when
 * its event loop reads each socket's close; a request landing first fails (CONNECTION_CLOSED, EPIPE or 57P01).
 * So bursts of session lookups go out before this returns, each dead connection failing here, until every
 * request answers 200; after five failing bursts it throws with the last statuses.
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
  let statuses: string[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const responses = await Promise.all(Array.from({ length: 10 }, request));
    if (responses.every((response) => response?.ok)) return;
    statuses = responses.map((response) => (response ? String(response.status) : 'no response'));
  }
  throw new Error(
    `The slot server at ${serverUrl(slotPort(slot))} kept failing session lookups after the database was recloned. Status codes in the last burst: ${statuses.join(', ')}.`,
  );
}

/** Once per run, after the last spec. The slot databases are left for inspection. */
export async function dropE2eTemplate(): Promise<void> {
  await dropDatabase(E2E_TEMPLATE);
}
