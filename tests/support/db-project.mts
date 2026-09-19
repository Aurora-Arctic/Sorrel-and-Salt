import os from 'node:os';
import type { ViteUserConfig } from 'vitest/config';

type TestConfig = NonNullable<ViteUserConfig['test']>;

// The Postgres-backed harness, spread into both the `db` project and the
// acceptance config so the second cannot quietly diverge from the first.
//
// `.mts`, imported with its extension, and erasable syntax only: a config's
// imports run at config-load time, where Vite's native loader hands a `.ts` in
// a package without `"type": "module"` to Node as CommonJS.

// `project.config.maxWorkers` is `undefined` in globalSetup unless pinned here,
// and db-global-setup.ts needs the number to know how many clones to make. The
// pin must mirror Vitest's own default (`os.availableParallelism() - 1`,
// floored at 1): both projects share one pool group, and Vitest throws when
// two projects in a group disagree on `maxWorkers` — which is what makes
// "every slot has a clone" a guarantee rather than a hope.
export const dbMaxWorkers = Math.max((os.availableParallelism?.() ?? os.cpus().length) - 1, 1);

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
