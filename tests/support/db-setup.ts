import { cloneDatabase } from './seeded-database';
import { TEST_TEMPLATE, workerDatabaseName, workerDatabaseUrl } from './worker-database';

// Points each worker's connection.ts import at the database db-global-setup
// cloned for its pool slot, rewriting DATABASE_URL in place before any test
// file imports connection.ts. This runs inside the worker process, which is
// why it can read the slot at all — `globalSetup`, running once up front,
// cannot. worker-database.ts holds the naming and the reason the slot comes
// from VITEST_POOL_ID rather than VITEST_WORKER_ID (MB.14).
//
// M1.27: a setup file runs once per *test file*, not once per worker, and
// that is used here. Before pointing at the slot's database this re-clones it
// from the seeded template, so every file under tests/db/ starts from the
// migrated schema and the `standard` scenario exactly as globalSetup built
// them — whatever the previous file in this worker inserted, deleted,
// truncated or dropped. A file therefore owes nothing to the next one: no
// teardown that puts the seed back, no discipline about which rows it may
// delete. Tens of milliseconds per file; `WITH (FORCE)` in cloneDatabase is
// what lets it work when the previous file never ended its pool.
const url = workerDatabaseUrl(process.env);
await cloneDatabase(workerDatabaseName(process.env.VITEST_POOL_ID as string), TEST_TEMPLATE);
process.env.DATABASE_URL = url;
