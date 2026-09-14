import os from 'node:os';
import { defineConfig } from 'vitest/config';

// Two projects per CLAUDE.md's Testing section: `unit` runs pure logic and
// components in jsdom with no network; `db` runs against a real local
// Postgres (never Neon — see docker-compose.yaml's `postgres` service).
// `db` has no test files yet (repository/service layers land from M1.16
// onward), so `passWithNoTests` keeps an empty suite from failing the run.
// `globalSetup`/`setupFiles` wire each worker to its own
// `sorrel_test_${VITEST_POOL_ID}` clone of `sorrel_template` (M1.9) — the pool
// *slot*, not `VITEST_WORKER_ID`; see src/test/worker-database.ts (MB.14).

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
  test: {
    coverage: {
      provider: 'v8',
      // 'json-summary' (M1.14) is read by .github/scripts/summarize-vitest.mjs
      // to build the PR comment's coverage stat/table — the other three are
      // for local/human consumption and untouched by CI.
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      // src/db/seed and src/test are fixture/harness code that runs test
      // infrastructure rather than product logic — a bug there fails the
      // tests that consume it, so it doesn't need its own coverage.
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.tsx',
        'src/db/migrations/**',
        'src/db/seed/**',
        'src/test/**',
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
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/db/**', 'src/services/**'],
          setupFiles: ['@testing-library/jest-dom/vitest', './vitest.setup.ts'],
        },
      },
      {
        test: {
          name: 'db',
          environment: 'node',
          globals: true,
          include: ['src/db/**/*.test.ts', 'src/services/**/*.test.ts'],
          passWithNoTests: true,
          maxWorkers: dbMaxWorkers,
          globalSetup: ['./src/test/db-global-setup.ts'],
          setupFiles: ['./src/test/db-setup.ts'],
        },
      },
    ],
  },
});
