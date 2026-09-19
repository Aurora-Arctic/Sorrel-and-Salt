import os from 'node:os';
import { defineConfig } from 'vitest/config';

// Two projects per CLAUDE.md's Testing section: `unit` runs pure logic and
// components in jsdom with no network; `db` runs against a real local
// Postgres (never Neon — see docker-compose.yaml's `postgres` service).
// `db` includes `tests/services/**`, which has no files yet (services land
// from Wave 5), so `passWithNoTests` keeps that half from failing the run.
// `globalSetup`/`setupFiles` wire each worker to its own
// `sorrel_test_${VITEST_POOL_ID}` clone (M1.9) — the pool *slot*, not
// `VITEST_WORKER_ID`; see tests/support/worker-database.ts (MB.14) — of
// `sorrel_test_template`, which `globalSetup` migrates and seeds with the
// `standard` scenario once per run, and `setupFiles` re-clones before every
// test file (M1.27; tests/support/seeded-database.ts).

// Vitest only resolves its actual worker count internally — `project.config
// .maxWorkers` is `undefined` unless set explicitly here — so `db`'s
// `globalSetup` (which needs a real number to know how many clones to make)
// gets one pinned in config instead.
//
// It must keep mirroring Vitest's own default (`os.availableParallelism() - 1`,
// floored at 1), and not merely as a courtesy: both projects' specs land in the
// same pool group (neither sets `sequence.groupOrder`), the group's `maxWorkers`
// comes from whichever project's spec sorts first, and Vitest throws outright if
// two projects in one group disagree. That throw is what makes
// `VITEST_POOL_ID <= dbMaxWorkers` — every slot has a clone (MB.14) — true
// rather than hopeful: diverge from the default and the run fails loudly.
const dbMaxWorkers = Math.max((os.availableParallelism?.() ?? os.cpus().length) - 1, 1);
export default defineConfig({
  // MB.41 — tests live in tests/ and reach the code under test by the `@/*`
  // alias tsconfig already declares, so moving a test never re-levels a
  // `../../` chain. Vite does not read tsconfig `paths` unless asked, so
  // without this every such import fails to resolve at runtime. This is
  // Vite's own resolver rather than the `vite-tsconfig-paths` plugin, which
  // it now supersedes — the plugin warns as much on load.
  //
  // Each project spells out `extends: true` to inherit this. That is already
  // the default, and it is written anyway because it is load-bearing here:
  // the projects are what actually run, and a future `extends: false` would
  // leave them resolving `@/` nowhere.
  resolve: { tsconfigPaths: true },
  test: {
    coverage: {
      provider: 'v8',
      // 'json-summary' (M1.14) is read by .github/scripts/summarize-vitest.mjs
      // to build the PR comment's coverage stat/table — the other three are
      // for local/human consumption and untouched by CI.
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      // src/db/seed is fixture code that runs test infrastructure rather
      // than product logic — a bug there fails the tests that consume it, so
      // it doesn't need its own coverage.
      //
      // The first two look dead since MB.41: no test and no harness file
      // lives under src/ any more, so nothing should match them. They stayed
      // because `include` enumerates the *disk*, not the repo, and in CI
      // those were different. The container's image bakes the repo at
      // Docker/Dockerfile.node's `COPY . .` and checkout-to-app laid the
      // checkout over it with `cp -a`, which never deletes — so every file
      // the repo had deleted was still there, uncovered, dragging the
      // denominator down. Removing these two entries dropped CI from 92% to
      // 78.54% and failed the 80% gate while every test passed.
      //
      // MB.42 closed that: the action now runs `git clean -fd` after the copy,
      // so /app holds the checkout and nothing else. These two are therefore
      // on their way out rather than load-bearing — but not yet, and not in
      // MB.42's own PR. Every caller reaches the action at
      // `checkout-to-app@main`, so the fix is live only once it is on `main`,
      // which a merge to `staging` does not do; until then CI still sees the
      // leftovers and still needs these. MB.44 is the follow-up: it cuts that
      // release, then deletes these two and this paragraph with them. If the
      // number moves when they go, they were not dead — see that task.
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/**/*.stories.tsx',
        'src/db/migrations/**',
        'src/db/seed/**',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: ['tests/db/**', 'tests/services/**'],
          setupFiles: ['@testing-library/jest-dom/vitest', './vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          environment: 'node',
          globals: true,
          include: ['tests/db/**/*.test.ts', 'tests/services/**/*.test.ts'],
          passWithNoTests: true,
          maxWorkers: dbMaxWorkers,
          globalSetup: ['./tests/support/db-global-setup.ts'],
          setupFiles: ['./tests/support/db-setup.ts'],
        },
      },
    ],
  },
});
