import { revalidateTag } from './next-cache';
import { cloneDatabase } from './seeded-database';
import { TEST_TEMPLATE, workerDatabaseName, workerDatabaseUrl } from './worker-database';

// Runs once per test file, inside the worker, which is why it can read the slot where `globalSetup` cannot.
// Re-clones the slot's database from the seeded template and points `DATABASE_URL` at it before anything
// imports connection.ts.
const url = workerDatabaseUrl(process.env);
await cloneDatabase(workerDatabaseName(process.env.VITEST_POOL_ID as string), TEST_TEMPLATE);
process.env.DATABASE_URL = url;

// The `db` project keeps modules from one file to the next, so the record of `revalidateTag` calls is cleared.
// Imported by path, not as `next/cache`, because the lint keeps that name to the files that cache.
revalidateTag.mockClear();
