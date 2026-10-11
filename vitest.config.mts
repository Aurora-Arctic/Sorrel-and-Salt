import { globSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { boundedPostgres, dbHarness, dbMaxWorkers } from './tests/support/db-project.mts';

const require = createRequire(import.meta.url);
const serverOnlyStub = require.resolve('next/dist/compiled/server-only/empty.js');
const nextCacheStub = fileURLToPath(new URL('./tests/support/next-cache.ts', import.meta.url));

// The `db` project's trees: the database layer's tests and the modules'.
const DB_INCLUDE = ['tests/db/**/*.test.ts', 'tests/modules/**/*.test.ts'];

// The files under them that never reach a database — a schema's shape read
// through Drizzle's introspection, a validation schema, a pure policy or
// constant — and so run in `unit` rather than wait on a fresh clone of the
// seeded database before each (MB.189). They stay where they mirror src/,
// which is why this is a list rather than a directory.
// A database-free file added to `db` belongs here: it costs a clone, not a
// failure, so review is what notices one.
export const DB_FREE = [
  'tests/modules/**/validation/**',
  'tests/db/audit.test.ts',
  'tests/modules/coven/schema/workspaces-schema.test.ts',
  'tests/modules/coven/services/access-control.test.ts',
  'tests/modules/identity/services/site-admin.test.ts',
  'tests/modules/identity/services/workshop-access.test.ts',
  'tests/modules/ingredients/schema/units.test.ts',
];

// What `db` runs, listed at config load: Vitest's `exclude` takes no
// negation, so `unit` cannot exclude the two trees and carve DB_FREE back out
// of them. A file added under them during a watch session is in both projects
// until the session restarts.
const DB_FILES = globSync(DB_INCLUDE, {
  cwd: fileURLToPath(new URL('.', import.meta.url)),
  exclude: DB_FREE,
});

// What neither `unit` nor `dom` runs: the other projects' files, the
// acceptance suite, and Playwright's (its specs end `.spec.ts`, but say so).
export const NOT_UNIT = [...DB_FILES, 'tests/rsc/**', 'tests/acceptance/**', 'tests/e2e/**'];

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
// claude-docs/testing/acceptance.md, "Acceptance".
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
  //
  // `next/cache` gets tests/support/next-cache.ts: Next's `unstable_cache` and
  // `revalidateTag` throw outside a request, so a test reads past the data
  // cache to Postgres and a write's `revalidateTag` is recorded rather than
  // run (claude-docs/db/compendium-cache.md, "In tests").
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^graphql$/, replacement: require.resolve('graphql') },
      { find: /^server-only$/, replacement: serverOnlyStub },
      { find: /^next\/cache$/, replacement: nextCacheStub },
    ],
  },
  test: {
    // Every project at the db harness's capped count: the projects share one
    // pool group, which Vitest requires to agree (tests/support/db-project.mts).
    maxWorkers: dbMaxWorkers,
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
      // Istanbul instruments only the `include` files, at transform time. v8
      // collected everything a worker ran, jsdom and React's development build
      // included, and remapped it onto src/, which made the coverage run half as
      // long again as the plain one; istanbul's costs it a few seconds
      // (claude-docs/design-decisions/mb.191-coverage-provider.md).
      provider: 'istanbul',
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
          // One `git ls-files` and one oxlint for every guard, provided to the
          // workers (MB.184): tests/support/unit-global-setup.ts.
          globalSetup: ['./tests/support/unit-global-setup.ts'],
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
        // Every pool this project opens, the app's included, capped at one
        // constant: tests/support/db/bounded-postgres.ts.
        plugins: [boundedPostgres()],
        test: {
          name: 'db',
          include: DB_INCLUDE,
          exclude: DB_FREE,
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
