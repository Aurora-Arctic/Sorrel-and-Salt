import {
  cloneDatabase,
  databaseUrl,
  dropDatabase,
  seedTemplate,
} from '../tests/support/seeded-database';

// Playwright's single `sorrel_e2e`, as against one clone per Vitest worker:
// global-setup.ts builds the seeded template once per run, each db-touching
// spec file recreates `sorrel_e2e` from it in its own `beforeAll`, and
// global-teardown.ts drops the template.
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
