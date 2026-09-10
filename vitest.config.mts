import os from 'node:os';
import { defineConfig } from 'vitest/config';

// Two projects per CLAUDE.md's Testing section: `unit` runs pure logic and
// components in jsdom with no network; `db` runs against a real local
// Postgres (never Neon — see docker-compose.yaml's `postgres` service).
// `db` has no test files yet (repository/service layers land from M1.16
// onward), so `passWithNoTests` keeps an empty suite from failing the run.
// `globalSetup`/`setupFiles` wire each worker to its own
// `sorrel_test_${VITEST_WORKER_ID}` clone of `sorrel_template` (M1.9).

// Vitest only resolves its actual worker count internally — `project.config
// .maxWorkers` is `undefined` unless set explicitly here — so `db`'s
// `globalSetup` (which needs a real number to know how many clones to make)
// gets one pinned in config instead. Mirrors Vitest's own default thread
// count (`os.availableParallelism() - 1`, floored at 1).
const dbMaxWorkers = Math.max((os.availableParallelism?.() ?? os.cpus().length) - 1, 1);
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.stories.tsx', 'src/db/migrations/**'],
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
