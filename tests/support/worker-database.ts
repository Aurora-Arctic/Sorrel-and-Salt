// The one place the per-worker test database name is spelled. Both halves of
// M1.9's isolation wiring go through it: db-global-setup.ts to know what to
// clone, db-setup.ts to know what to connect to. They computed it separately
// before, and drifted — see MB.14.

/** `sorrel_test_<slot>` — the clone db-global-setup.ts makes for one pool slot. */
export function workerDatabaseName(slot: number | string): string {
  return `sorrel_test_${slot}`;
}

/**
 * An environment bag — `process.env` satisfies it. Named rather than typed as
 * `NodeJS.ProcessEnv` so a test can pass a two-key literal instead of a whole
 * environment.
 */
interface WorkerEnv {
  DATABASE_URL?: string;
  VITEST_POOL_ID?: string;
  [key: string]: string | undefined;
}

/**
 * `DATABASE_URL` rewritten to point at this worker's clone, keeping its host
 * and credentials (`postgres` inside the devcontainer, `localhost` on a bare
 * host) and swapping only the database name.
 *
 * The slot comes from **`VITEST_POOL_ID`**, not `VITEST_WORKER_ID`. Vitest
 * exposes both, and only the first is a slot: `PoolRunner.poolId` is handed
 * out from a free list sized by `maxWorkers` ("Value is between
 * 1-`maxWorkers`", per Vitest's own typedef), while `workerId` is a counter
 * incremented once per test file across the whole run — both projects — and
 * so exceeds `maxWorkers` the moment there are more test files than workers.
 * db-global-setup.ts clones one database per slot, so a name built from
 * `VITEST_WORKER_ID` eventually asks for a database nobody made (MB.14).
 */
export function workerDatabaseUrl(env: WorkerEnv): string {
  const base = env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is not set');
  // Thrown rather than interpolated as `undefined`: a wrong name only fails at
  // the first query, one stack frame away from anything that names the harness.
  const slot = env.VITEST_POOL_ID;
  if (!slot) throw new Error('VITEST_POOL_ID is not set — this must run inside a Vitest worker');

  const url = new URL(base);
  url.pathname = `/${workerDatabaseName(slot)}`;
  return url.toString();
}
