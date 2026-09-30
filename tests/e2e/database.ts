import { cloneDatabase, databaseUrl, dropDatabase, seedTemplate } from '../support/seeded-database';
import { E2E_SLOTS, currentSlot } from './slots';

// One database per worker slot, which that slot's server reads: global-setup.ts
// builds the seeded template once per run and clones every slot's database
// from it, each db-touching spec file recreates its own slot's in its
// `beforeAll`, and global-teardown.ts drops the template.
const E2E_TEMPLATE = 'sorrel_e2e_template';
/** The configured-providers server's, which no spec reseeds. */
export const CONFIGURED_PROVIDERS_DATABASE = 'sorrel_e2e_providers';

export function slotDatabase(slot: number): string {
  return `sorrel_e2e_${slot}`;
}

/** `database`'s URL; by default the calling worker's own slot's. */
export function e2eDatabaseUrl(database = slotDatabase(currentSlot())): string {
  return databaseUrl(database);
}

/** Once per run. */
export async function seedE2eTemplate(): Promise<void> {
  await seedTemplate(E2E_TEMPLATE);
}

/** Once per run, after the template: every slot's database and the providers server's. */
export async function cloneE2eDatabases(): Promise<void> {
  const slots = Array.from({ length: E2E_SLOTS }, (_, slot) => slotDatabase(slot));
  for (const database of [...slots, CONFIGURED_PROVIDERS_DATABASE]) {
    await cloneDatabase(database, E2E_TEMPLATE);
  }
}

/** Between spec files: the calling worker's slot database back to the seeded baseline. */
export async function recreateE2eDatabase(): Promise<void> {
  await cloneDatabase(slotDatabase(currentSlot()), E2E_TEMPLATE);
}

/** Once per run, after the last spec. The slot databases are left for inspection. */
export async function dropE2eTemplate(): Promise<void> {
  await dropDatabase(E2E_TEMPLATE);
}
