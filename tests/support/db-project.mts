import os from 'node:os';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import type { TestConfig } from './types.ts';

// The Postgres-backed harness, spread into both the `db` project and the
// acceptance config so the second cannot quietly diverge from the first.
//
// `.mts`, imported with its extension, and erasable syntax only: a config's
// imports run at config-load time, where Vite's native loader hands a `.ts` in
// a package without `"type": "module"` to Node as CommonJS.

/**
 * The most db workers a run opens, whatever the machine: the connection
 * budget tests/guards/db-connection-budget.test.ts holds is arithmetic over
 * this number, not over the cores a developer happens to have (MB.179).
 * Twelve clears every machine the suite runs on today, so nothing slows.
 */
export const DB_WORKER_CAP = 12;

// `project.config.maxWorkers` is `undefined` in globalSetup unless pinned here,
// and db-global-setup.ts needs the number to know how many clones to make. The
// pin is Vitest's own default (`os.availableParallelism() - 1`, floored at 1)
// under the cap, and vitest.config.mts pins its root to the same number: the
// projects share one pool group, and Vitest throws when two projects in a
// group disagree on `maxWorkers` — which is what makes "every slot has a
// clone" a guarantee rather than a hope.
export const dbMaxWorkers = Math.max(
  Math.min((os.availableParallelism?.() ?? os.cpus().length) - 1, DB_WORKER_CAP),
  1,
);

/**
 * Each worker on its own `sorrel_test_${VITEST_POOL_ID}` clone of the seeded
 * template, re-cloned before every test file. Slot naming: worker-database.ts.
 */
export const dbHarness = {
  environment: 'node',
  globals: true,
  maxWorkers: dbMaxWorkers,
  globalSetup: ['./tests/support/db-global-setup.ts'],
  setupFiles: ['./tests/support/db-setup.ts'],
} satisfies TestConfig;

export const BOUNDED_POSTGRES_PLUGIN = 'sorrel:bounded-postgres';
const BOUNDED_POSTGRES = fileURLToPath(new URL('./db/bounded-postgres.ts', import.meta.url));

/**
 * `postgres` resolved to tests/support/db/bounded-postgres.ts for every file
 * the project transforms — the app's connection.ts and each test file's own
 * client alike — so one constant caps every pool a run opens (MB.179). The
 * wrapper's own import is the one left to the real package. A `resolveId`
 * plugin rather than `resolve.alias`'s `customResolver`, which Vite deprecates
 * in favour of exactly this.
 */
export function boundedPostgres(): Plugin {
  return {
    name: BOUNDED_POSTGRES_PLUGIN,
    enforce: 'pre',
    resolveId(id, importer) {
      if (id !== 'postgres' || importer === BOUNDED_POSTGRES) return null;
      return BOUNDED_POSTGRES;
    },
  };
}
