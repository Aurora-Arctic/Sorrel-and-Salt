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
