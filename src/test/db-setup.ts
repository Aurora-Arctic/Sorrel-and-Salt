import { workerDatabaseUrl } from './worker-database';

// Points each worker's connection.ts import at the database db-global-setup
// cloned for its pool slot, rewriting DATABASE_URL in place before any test
// file imports connection.ts. This runs inside the worker process, which is
// why it can read the slot at all — `globalSetup`, running once up front,
// cannot. worker-database.ts holds the naming and the reason the slot comes
// from VITEST_POOL_ID rather than VITEST_WORKER_ID (MB.14).
process.env.DATABASE_URL = workerDatabaseUrl(process.env);
