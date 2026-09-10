// Points each worker's connection.ts import at the database db-global-setup
// cloned for it — VITEST_WORKER_ID is only set inside a worker process, so
// this can't be folded into globalSetup itself, which runs once up front.
// Rewrites DATABASE_URL in place, keeping its host/credentials (`postgres`
// inside the devcontainer, `localhost` on a bare host) and swapping only the
// database name.
const base = process.env.DATABASE_URL;
if (!base) throw new Error('DATABASE_URL is not set');
const url = new URL(base);
url.pathname = `/sorrel_test_${process.env.VITEST_WORKER_ID}`;
process.env.DATABASE_URL = url.toString();
