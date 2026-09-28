import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';
import { dbHarness } from './tests/support/db-project.mts';

const require = createRequire(import.meta.url);
const serverOnlyStub = require.resolve('next/dist/compiled/server-only/empty.js');

// Three projects: `unit` in jsdom with no network, `db` against local Postgres
// through tests/support/db-project.mts's `dbHarness`, which the acceptance
// config spreads too, and `rsc` for what can only be observed from inside a
// server render. The acceptance suite is deliberately not a fourth project,
// and `unit` excludes it so its glob does not sweep those files up:
// claude-docs/testing.md, "Acceptance".
export default defineConfig({
  // Tests reach src/ by tsconfig's `@/*` alias, which Vite ignores unless
  // told. Each project spells out `extends: true` (the default) because it is
  // load-bearing: the projects are what run.
  //
  // `graphql` ships CommonJS and ESM builds, and the two are different realms:
  // a schema built by one fails the other's `instanceof`. Pothos and Yoga are
  // externalized, so Node hands them the CommonJS build; a test file is
  // transformed by Vite, which would pick the ESM one. The alias gives test
  // code the copy the packages get.
  //
  // `server-only` is the marker every service carries so that a client bundle
  // reaching one fails `next build`. Next resolves it itself and the package is
  // not installed, so a test gets Next's own empty stub: a test is not a client
  // bundle.
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^graphql$/, replacement: require.resolve('graphql') },
      { find: /^server-only$/, replacement: serverOnlyStub },
    ],
  },
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
      // src/db/seed is test infrastructure; a bug there fails the tests that
      // consume it. src/gql is generated, and its guard compares it rather than
      // running it.
      exclude: ['src/**/*.stories.tsx', 'src/db/migrations/**', 'src/db/seed/**', 'src/gql/**'],
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
          exclude: [
            'tests/db/**',
            'tests/modules/**',
            'tests/rsc/**',
            'tests/acceptance/**',
            'tests/e2e/**',
          ],
          setupFiles: ['@testing-library/jest-dom/vitest', './tests/support/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          include: ['tests/db/**/*.test.ts', 'tests/modules/**/*.test.ts'],
          passWithNoTests: true,
          ...dbHarness,
        },
      },
      {
        extends: true,
        // The `react-server` export condition, which `react` and the Flight
        // renderer both switch on. Without it React's `cache()` is the default
        // build's pass-through and a server render cannot be started at all.
        // `db` cannot carry the condition: under it `react-dom/server` throws
        // on import, and three of its files reach that through `lib/auth`.
        ssr: { resolve: { conditions: ['react-server'], externalConditions: ['react-server'] } },
        test: {
          name: 'rsc',
          environment: 'node',
          globals: true,
          include: ['tests/rsc/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
