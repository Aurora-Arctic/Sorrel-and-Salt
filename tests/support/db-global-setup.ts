import type { TestProject } from 'vitest/node';
import { cloneDatabase, dropDatabase, seedTemplate } from './seeded-database';
import { TEST_TEMPLATE, workerDatabaseName } from './worker-database';

declare module 'vitest' {
  interface ProvidedContext {
    /**
     * Every database this setup cloned, one per pool slot, so a test can assert
     * its own is one that was made rather than recompute the bound.
     */
    workerDatabases: string[];
    /** The migrated, `standard`-seeded template every one of those was cloned from. */
    templateDatabase: string;
  }
}

// Builds the seeded template once per run, then one clone per pool slot. The
// slot clones are re-made before every test file by db-setup.ts; they are made
// here so `workerDatabases` names databases that exist from the first file.
export default async function setup(project: TestProject) {
  // `maxWorkers` is what bounds `VITEST_POOL_ID`; db-project.mts pins it.
  const databases = Array.from({ length: project.config.maxWorkers }, (_, i) =>
    workerDatabaseName(i + 1),
  );
  project.provide('workerDatabases', databases);
  project.provide('templateDatabase', TEST_TEMPLATE);

  await seedTemplate(TEST_TEMPLATE);
  for (const database of databases) {
    await cloneDatabase(database, TEST_TEMPLATE);
  }

  return async () => {
    for (const database of databases) {
      await dropDatabase(database);
    }
    await dropDatabase(TEST_TEMPLATE);
  };
}
