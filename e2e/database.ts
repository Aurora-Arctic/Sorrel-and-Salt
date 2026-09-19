import {
  cloneDatabase,
  databaseUrl,
  dropDatabase,
  seedTemplate,
} from '../tests/support/seeded-database';

// Playwright's single `sorrel_e2e` database, as against one clone per Vitest
// worker — the same two-tier shape as tests/support/db-global-setup.ts and
// db-setup.ts, through the same module (M1.27):
//
//   - global-setup.ts builds `sorrel_e2e_template` once per run: the
//     extensions-only `sorrel_template` cloned, migrated, and seeded with the
//     `standard` scenario. About a second.
//   - every db-touching spec file recreates `sorrel_e2e` from it in its own
//     `beforeAll` (see e2e/smoke.spec.ts) — a clone, tens of milliseconds —
//     which is what DESIGN.md's "reseeded between spec files" resolves to.
//   - global-teardown.ts drops the template again.
const E2E_DATABASE = 'sorrel_e2e';
const E2E_TEMPLATE = 'sorrel_e2e_template';

export function e2eDatabaseUrl(): string {
  return databaseUrl(E2E_DATABASE);
}

/** Once per run, before `webServer` starts. */
export async function seedE2eTemplate(): Promise<void> {
  await seedTemplate(E2E_TEMPLATE);
}

/** Between spec files: `sorrel_e2e` back to the seeded baseline. */
export async function recreateE2eDatabase(): Promise<void> {
  await cloneDatabase(E2E_DATABASE, E2E_TEMPLATE);
}

/** Once per run, after the last spec. `sorrel_e2e` itself is left for inspection. */
export async function dropE2eTemplate(): Promise<void> {
  await dropDatabase(E2E_TEMPLATE);
}
