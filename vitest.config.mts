import { defineConfig } from 'vitest/config';

// Two projects per CLAUDE.md's Testing section: `unit` runs pure logic and
// components in jsdom with no network; `db` runs against a real local
// Postgres (never Neon — see docker-compose.yaml's `postgres` service).
// `db` has no test files yet (repository/service layers land from M1.16
// onward, and M1.9 wires the per-worker `sorrel_test_${VITEST_WORKER_ID}`
// clone this project will run against), so `passWithNoTests` keeps an empty
// suite from failing the run.
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
        },
      },
    ],
  },
});
