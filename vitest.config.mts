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
    // Both under .reports/ with the rest of the generated output; without
    // `outputFile`, the json and html reporters would write to `.vitest/`.
    // CI's `--outputFile` on the command line still wins.
    outputFile: {
      json: '.reports/vitest/results.json',
      html: '.reports/vitest/html/index.html',
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: '.reports/coverage',
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
          // tests/e2e/ is Playwright's; its specs end `.spec.ts`, but say so.
          exclude: ['tests/db/**', 'tests/services/**', 'tests/acceptance/**', 'tests/e2e/**'],
          setupFiles: ['@testing-library/jest-dom/vitest', './tests/support/setup.ts'],
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
