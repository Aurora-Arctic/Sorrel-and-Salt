import { defineConfig } from 'vitest/config';
import { dbHarness } from './tests/support/db-project.mts';

// Two projects: `unit` in jsdom with no network, `db` against local Postgres
// through tests/support/db-project.mts's `dbHarness`, which the acceptance
// config spreads too. The acceptance suite is deliberately not a third
// project, and `unit` excludes it so its glob does not sweep those files up:
// claude-docs/testing.md, "Acceptance".
export default defineConfig({
  // Tests reach src/ by tsconfig's `@/*` alias, which Vite ignores unless
  // told. Each project spells out `extends: true` (the default) because it is
  // load-bearing: the projects are what run.
  resolve: { tsconfigPaths: true },
  test: {
    coverage: {
      provider: 'v8',
      // 'json-summary' feeds .github/scripts/summarize-vitest.mjs.
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      // src/db/seed is test infrastructure; a bug there fails the tests that consume it.
      exclude: ['src/**/*.stories.tsx', 'src/db/migrations/**', 'src/db/seed/**'],
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
          exclude: ['tests/db/**', 'tests/services/**', 'tests/acceptance/**'],
          setupFiles: ['@testing-library/jest-dom/vitest', './vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          include: ['tests/db/**/*.test.ts', 'tests/services/**/*.test.ts'],
          passWithNoTests: true,
          ...dbHarness,
        },
      },
    ],
  },
});
