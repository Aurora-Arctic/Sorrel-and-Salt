import { revalidateTag } from './next-cache';
import { cloneDatabase } from './seeded-database';
import { TEST_TEMPLATE, workerDatabaseName, workerDatabaseUrl } from './worker-database';

// Runs once per test file, inside the worker — which is why it can read the
// slot where `globalSetup` cannot. Re-clones the slot's database from the
// seeded template, then points `DATABASE_URL` at it before anything imports
// connection.ts, so every file starts from the full schema and the `standard`
// scenario whatever the previous file did. Tens of milliseconds per file.
const url = workerDatabaseUrl(process.env);
await cloneDatabase(workerDatabaseName(process.env.VITEST_POOL_ID as string), TEST_TEMPLATE);
process.env.DATABASE_URL = url;

// The `db` project keeps a worker's modules from one file to the next, so the record of
// `revalidateTag` calls would carry the previous file's writes into this one's assertions. Imported
// by path, not as `next/cache` (the alias resolves to the same module), because the lint keeps
// `next/cache` to the files that cache.
revalidateTag.mockClear();
