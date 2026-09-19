import type { TestProject } from 'vitest/node';
import { cloneDatabase, dropDatabase, seedTemplate } from './seeded-database';
import { TEST_TEMPLATE, workerDatabaseName } from './worker-database';

declare module 'vitest' {
  interface ProvidedContext {
    /**
     * Every database this setup cloned, one per pool slot. Provided so a test
     * can assert the database it landed in is one that was actually made,
     * rather than recomputing the bound and agreeing with itself (MB.14).
     */
    workerDatabases: string[];
    /**
     * The migrated, `standard`-seeded template every one of those was cloned
     * from (M1.27) — provided so a test can assert it exists rather than
     * assume the seed it finds came from somewhere in particular.
     */
    templateDatabase: string;
  }
}

// Rejected alternative — wrapping each test in a rolled-back transaction —
// and why, is recorded in claude-docs/design-decisions/m1.9-test-db-isolation.md.
//
// M1.27: the template the workers clone is built here, once per run, by
// tests/support/seeded-database.ts — `sorrel_template` cloned, migrated and
// seeded with `standard`, about a second. Before that it was `sorrel_template`
// itself, which carries no schema, and every file under tests/db/ built the
// tables it needed. The slot clones made below are re-made from the same
// template before every test file by db-setup.ts; they are still made here
// so that `workerDatabases` names databases that exist from the first file
// onward, and so the provided list stays what it says it is.
export default async function setup(project: TestProject) {
  // One clone per pool slot, and `maxWorkers` is exactly what bounds a slot id
  // (`VITEST_POOL_ID`). A worker that derives some other index — as one keyed
  // off `VITEST_WORKER_ID` did until MB.14 — asks for a database this loop
  // never made.
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
