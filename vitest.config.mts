import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';
import { dbHarness } from './tests/support/db-project.mts';

const require = createRequire(import.meta.url);
const serverOnlyStub = require.resolve('next/dist/compiled/server-only/empty.js');

// What neither `unit` nor `dom` runs: the other projects' trees, the acceptance
// suite, and Playwright's (its specs end `.spec.ts`, but say so).
export const NOT_UNIT = [
  'tests/db/**',
  'tests/modules/**',
  'tests/rsc/**',
  'tests/acceptance/**',
  'tests/e2e/**',
];

// The `.ts` tests that need jsdom's `location` all the same: Better Auth's
// client reads `window.location.origin` and `document.cookie`, and the MSW
// helpers' test fetches the relative `/api/graphql` the helpers match.
export const DOM_TS = ['tests/lib/auth-client.test.ts', 'tests/support/msw/graphql.test.ts'];

// Four projects: `unit` in node and `dom` in jsdom, both with MSW refusing any
// request a test did not register; `db` against local Postgres through
// tests/support/db-project.mts's `dbHarness`, which the acceptance config
// spreads too; and `rsc` for what can only be observed from inside a server
// render. The acceptance suite is deliberately not a fifth project, and the
// first two exclude it so their globs do not sweep those files up:
// claude-docs/testing.md, "Acceptance".
//
// `unit` and `dom` split on the file extension: a `.tsx` test renders and gets
// jsdom, a `.ts` test runs in node unless DOM_TS names it. jsdom, jest-dom and
// React Testing Library together cost more per file than most guards take to
// run, and `environment` was a third of CI's worker time before the split
// (MB.97). tests/guards/test-location.test.ts holds every test file to exactly
// one of these two.
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
    // Quiet under Claude Code, which sets `CLAUDECODE=1` in its shell and
    // nothing else does: a session reads the per-file coverage table and the
    // per-file test lines, ~400 lines a run, and needs neither — a failure
    // still prints in full, and the per-file numbers are in
    // .reports/coverage/coverage-summary.json, and `passed-only` keeps a
    // failing test's console output while dropping the ~12,000 lines of pg
    // NOTICEs and React warnings a green run prints. The host and CI are
    // unchanged.
    reporters: process.env.CLAUDECODE ? ['dot'] : ['default'],
    silent: process.env.CLAUDECODE ? 'passed-only' : false,
    // Node 24 warns from every worker that `localStorage` has no
    // `--localstorage-file`: two lines a worker, 185 workers a run.
    execArgv: process.env.CLAUDECODE ? ['--disable-warning=ExperimentalWarning'] : [],
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
      reporter: process.env.CLAUDECODE
        ? ['text-summary', 'lcov', 'html', 'json-summary']
        : ['text', 'lcov', 'html', 'json-summary'],
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
          environment: 'node',
          globals: true,
          include: ['tests/**/*.test.ts'],
          exclude: [...NOT_UNIT, ...DOM_TS],
          setupFiles: ['./tests/support/setup-msw.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          globals: true,
          include: ['tests/**/*.test.tsx', ...DOM_TS],
          exclude: NOT_UNIT,
          setupFiles: [
            '@testing-library/jest-dom/vitest',
            './tests/support/setup-msw.ts',
            './tests/support/setup-dom.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          include: ['tests/db/**/*.test.ts', 'tests/modules/**/*.test.ts'],
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
