import type { TestProject } from 'vitest/node';
import { cloneDatabase, dropDatabase, seedTemplate } from './seeded-database';
import type { TemplateBuildRegistry } from './types';
import { TEST_TEMPLATE, workerDatabaseName } from './worker-database';

declare module 'vitest' {
  interface ProvidedContext {
    /** Every database this setup cloned, one per pool slot, so a test can assert its own was made. */
    workerDatabases: string[];
    /** The migrated, `standard`-seeded template every one of those was cloned from. */
    templateDatabase: string;
  }
}

// Vitest evaluates this file afresh for each project that names it, so the build is kept on `globalThis`,
// keyed by the run's Vitest instance, so `db` and `db-mocking` share one and a restarted watch session builds afresh.
const registry = globalThis as typeof globalThis & TemplateBuildRegistry;
const builds = (registry.__sorrelTemplateBuilds ??= new WeakMap());

async function build(databases: string[]): Promise<void> {
  await seedTemplate(TEST_TEMPLATE);
  for (const database of databases) {
    await cloneDatabase(database, TEST_TEMPLATE);
  }
}

// Builds the seeded template once per run, then one clone per pool slot. The
// slot clones are re-made before every test file by db-setup.ts; they are made
// here so `workerDatabases` names databases that exist from the first file.
export default async function setup(project: TestProject) {
  // `maxWorkers` is what bounds `VITEST_POOL_ID`; db-project.mts pins it, and
  // every project in the pool group agrees on it.
  const databases = Array.from({ length: project.config.maxWorkers }, (_, i) =>
    workerDatabaseName(i + 1),
  );
  project.provide('workerDatabases', databases);
  project.provide('templateDatabase', TEST_TEMPLATE);

  const started = builds.get(project.vitest);
  if (started) {
    // The project that started the build owns its teardown, which Vitest runs
    // after this one's: projects tear down in reverse.
    await started;
    return;
  }
  const building = build(databases);
  builds.set(project.vitest, building);
  await building;

  return async () => {
    for (const database of databases) {
      await dropDatabase(database);
    }
    await dropDatabase(TEST_TEMPLATE);
  };
}
