import os from 'node:os';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import type { TestConfig } from './types.ts';

// `.mts`, imported with its extension, and erasable syntax only: a config's
// imports run at config-load time, where Vite's native loader hands a `.ts` in
// a package without `"type": "module"` to Node as CommonJS.

// Fixed, not the machine's cores: the connection budget (claude-docs/testing/db-harness.md, "Connections per run") is arithmetic over this number.
const DB_WORKER_CAP = 12;

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

export const dbHarness = {
  environment: 'node',
  globals: true,
  maxWorkers: dbMaxWorkers,
  globalSetup: ['./tests/support/db-global-setup.ts'],
  runner: './tests/support/db-runner.ts',
} satisfies TestConfig;

const BOUNDED_POSTGRES_PLUGIN = 'sorrel:bounded-postgres';
const BOUNDED_POSTGRES = fileURLToPath(new URL('./db/bounded-postgres.ts', import.meta.url));

// `postgres` resolves to bounded-postgres.ts in every file the project transforms, so one constant caps every pool; a `resolveId` plugin, as Vite deprecates `resolve.alias`'s `customResolver`.
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
