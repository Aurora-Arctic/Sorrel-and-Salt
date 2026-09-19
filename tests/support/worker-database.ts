// The one spelling of the per-worker database name, shared by the setup that
// clones it and the setup that connects to it.

/**
 * The migrated, `standard`-seeded template every worker clone is made from.
 * Never `sorrel_template`, the extensions-only base, which stays pristine.
 */
export const TEST_TEMPLATE = 'sorrel_test_template';

/** `sorrel_test_<slot>` — the clone db-global-setup.ts makes for one pool slot. */
export function workerDatabaseName(slot: number | string): string {
  return `sorrel_test_${slot}`;
}

/** `process.env` satisfies it; named so a test can pass a two-key literal. */
interface WorkerEnv {
  DATABASE_URL?: string;
  VITEST_POOL_ID?: string;
  [key: string]: string | undefined;
}

/**
 * `DATABASE_URL` with only the database name swapped for this worker's clone.
 *
 * The slot is `VITEST_POOL_ID`, never `VITEST_WORKER_ID`: the first is a pool
 * slot in `1..maxWorkers`, the second counts test files across the run and so
 * soon names a clone db-global-setup.ts never made.
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
