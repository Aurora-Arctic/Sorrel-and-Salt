import { TestRunner } from 'vitest';
import { revalidateTag } from './next-cache';
import { cloneDatabase } from './seeded-database';
import { TEST_TEMPLATE, workerDatabaseName, workerDatabaseUrl } from './worker-database';

// Vitest awaits `onBeforeCollect` once before each test file, ahead of the file's imports, inside the worker
// (which is why it can read the slot where `globalSetup` cannot). A setup file's top level is not per file:
// some runs evaluate it once per worker, so the reset lives here.
export default class DbRunner extends TestRunner {
  async onBeforeCollect(): Promise<void> {
    await cloneDatabase(workerDatabaseName(process.env.VITEST_POOL_ID as string), TEST_TEMPLATE);
    process.env.DATABASE_URL = workerDatabaseUrl(process.env);
    // The `db` project keeps modules between files, so the record of `revalidateTag` calls is cleared too.
    revalidateTag.mockClear();
  }
}
