import os from 'node:os';
import type { ViteUserConfig } from 'vitest/config';

type TestConfig = NonNullable<ViteUserConfig['test']>;

// The Postgres-backed harness, as one fragment two configs spread in: the
// `db` project in vitest.config.mts and the `acceptance` suite in
// vitest.stories.config.mts (M1.28). Both clone the seeded template per
// worker slot (M1.9, M1.27); keeping the wiring here means the second cannot
// quietly diverge from the first.
//
// `.mts`, and imported with its extension, because a config file's imports
// run at config-load time: Vite's coming native loader hands them to Node
// as they are, and a `.ts` in a package with no `"type": "module"` is read
// as CommonJS there. Only erasable syntax here (`satisfies`, `import type`),
// for the same reason.

// Vitest only resolves its actual worker count internally — `project.config
// .maxWorkers` is `undefined` unless set explicitly — so db-global-setup.ts
// (which needs a real number to know how many clones to make) gets one
// pinned in config instead.
//
// It must keep mirroring Vitest's own default (`os.availableParallelism() - 1`,
// floored at 1), and not merely as a courtesy: in vitest.config.mts both
// projects' specs land in the same pool group (neither sets
// `sequence.groupOrder`), the group's `maxWorkers` comes from whichever
// project's spec sorts first, and Vitest throws outright if two projects in
// one group disagree. That throw is what makes `VITEST_POOL_ID <=
// dbMaxWorkers` — every slot has a clone (MB.14) — true rather than hopeful:
// diverge from the default and the run fails loudly.
export const dbMaxWorkers = Math.max((os.availableParallelism?.() ?? os.cpus().length) - 1, 1);

/**
 * `globalSetup`/`setupFiles` wire each worker to its own
 * `sorrel_test_${VITEST_POOL_ID}` clone (M1.9) — the pool *slot*, not
 * `VITEST_WORKER_ID`; see worker-database.ts (MB.14) — of
 * `sorrel_test_template`, which `globalSetup` migrates and seeds with the
 * `standard` scenario once per run, and `setupFiles` re-clones before every
 * test file (M1.27; seeded-database.ts).
 */
export const dbHarness = {
  environment: 'node',
  globals: true,
  maxWorkers: dbMaxWorkers,
  globalSetup: ['./tests/support/db-global-setup.ts'],
  setupFiles: ['./tests/support/db-setup.ts'],
} satisfies TestConfig;
