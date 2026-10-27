import { globSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
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
  'tests/db/connection-url.test.ts',
  'tests/db/seed/compendium-files.test.ts',
  'tests/db/seed/compendium/**',
  'tests/modules/coven/schema/workspaces-schema.test.ts',
  'tests/modules/coven/services/access-control.test.ts',
  'tests/modules/identity/services/site-admin.test.ts',
  'tests/modules/identity/services/workshop-access.test.ts',
  'tests/modules/ingredients/schema/ingredient-enums.test.ts',
  'tests/modules/ingredients/schema/units.test.ts',
  'tests/modules/ingredients/services/cupboard-entries.test.ts',
  'tests/modules/ingredients/units/**',
  'tests/modules/grimoire/categories/**',
];

const ROOT = fileURLToPath(new URL('.', import.meta.url));

// What `db` and `db-mocking` run, listed at config load: Vitest's `exclude`
// takes no negation, so `unit` cannot exclude the two trees and carve DB_FREE
// back out of them. A file added under them during a watch session is in both
// `unit` and `db` until the session restarts.
const DB_FILES = globSync(DB_INCLUDE, { cwd: ROOT, exclude: DB_FREE });

// What a file does that outlives it once a worker keeps its module registry
// from one file to the next: a module mock or a hoisted value for one, a stub
// of a global or of the environment, a reset of the registry itself, or a fake
// clock (MB.238). A mention in a comment counts too, which errs toward
// isolation.
const LEAKS_PAST_ITS_FILE =
  /\bvi\.(mock|doMock|unmock|hoisted|stubGlobal|stubEnv|resetModules|useFakeTimers)\(/;

// The tests/support helpers that do one of those for their caller, so that a
// file calling one counts as doing it: auth-module.ts's `importAuth` resets the
// registry and builds `@/lib/auth` under another environment, and the next
// file in the worker would import that build.
const LEAKING_HELPERS = globSync('tests/support/**/*.{ts,mts}', { cwd: ROOT })
  .filter((file) => LEAKS_PAST_ITS_FILE.test(readFileSync(path.join(ROOT, file), 'utf8')))
  .map((file) => file.replace(/\.m?ts$/, ''));

function leaksPastItsFile(file: string): boolean {
  const source = readFileSync(path.join(ROOT, file), 'utf8');
  if (LEAKS_PAST_ITS_FILE.test(source)) return true;
  return [...source.matchAll(/from '(\.{1,2}\/[^']+)'/g)].some(([, specifier]) =>
    LEAKING_HELPERS.includes(path.join(path.dirname(file), specifier.replace(/\.m?ts$/, ''))),
  );
}

// The `db` files split in two by a scan of their source. Most share one module
// registry per worker (`isolate: false`), so the hundred-odd modules every
// file imports are evaluated once per worker rather than once per file — the
// database is still re-cloned before each file, so no row outlives one. A file
// that does what LEAKS_PAST_ITS_FILE matches runs in `db-mocking`, isolated
// as every file was before. A scan rather than a list, so a file that starts
// mocking moves on its own and never runs unisolated by mistake
// (claude-docs/testing/db-harness.md, "Two db projects").
const DB_MOCKING = DB_FILES.filter(leaksPastItsFile);

// What neither `unit` nor `dom` runs: the other projects' files, and
// Playwright's (its specs end `.spec.ts`, but say so).
export const NOT_UNIT = [...DB_FILES, 'tests/rsc/**', 'tests/e2e/**'];

// The `.ts` tests that need a browser's `location` all the same: Better Auth's
// client reads `window.location.origin` and `document.cookie`, and the MSW
// helpers' test fetches the relative `/api/graphql` the helpers match.
export const DOM_TS = ['tests/lib/auth-client.test.ts', 'tests/support/msw/graphql.test.ts'];

// Five projects: `unit` in node and `dom` in happy-dom, both with MSW refusing any
// request a test did not register; `db` and `db-mocking` against local
// Postgres through tests/support/db-project.mts's `dbHarness`, split by
// whether a file mocks (DB_MOCKING above); and `rsc` for what can only be
// observed from inside a server render. The story suite is Playwright's, not
// Vitest's (tests/e2e/stories/; claude-docs/testing/acceptance.md).
//
// `unit` and `dom` split on the file extension: a `.tsx` test renders and gets
// happy-dom, a `.ts` test runs in node unless DOM_TS names it. The DOM library, jest-dom and
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
    // A guard against a hung test, not a speed assertion, so it has headroom
    // over the slowest honest test on the slowest runner. Vitest's 5 s default
    // tripped on GitHub's 4-vCPU runner, where three workers share four cores
    // and a test that takes 1.2 s on an idle machine ran past 5 s (run
    // 38877563430). On the shared base rather than the `dom` project alone: a
    // hang is a hang in any project, and a `db` test shares those cores too.
    // The hooks keep their own default: the clone each `db` file starts with
    // runs at the top of a setup file, not in a hook
    // (claude-docs/ci/runner-budget.md, "Where a gate run's time goes").
    testTimeout: 20_000,
    // Worker threads rather than Vitest's default forked processes: a file
    // that is given a fresh worker pays a thread's start-up, not a process's
    // (about 5 to 10% of a coverage run at three workers, measured on M11.24).
    pool: 'threads',
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
    // Node 26 ships its own `localStorage` global and warns from every worker
    // that it has no `--localstorage-file`: two lines a worker, 185 workers a
    // run. Switching the feature off removes the global (happy-dom supplies the
    // `dom` project's), where `--disable-warning` would hide every experimental
    // warning, ours included.
    execArgv: ['--no-experimental-webstorage'],
    // Both under .reports/ with the rest of the generated output; without
    // `outputFile`, the json and html reporters would write to `.vitest/`.
    // CI's `--outputFile` on the command line still wins.
    outputFile: {
      json: '.reports/vitest/results.json',
      html: '.reports/vitest/html/index.html',
    },
    coverage: {
      // Istanbul instruments only the `include` files, at transform time. v8
      // collected everything a worker ran, the DOM library and React's development build
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
          // happy-dom, chosen over jsdom for speed (M11.25: claude-docs/design-decisions/m11.25-plan.md);
          // what it leaves out is declared in tests/support/setup-dom.ts.
          environment: 'happy-dom',
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
          exclude: [...DB_FREE, ...DB_MOCKING],
          ...dbHarness,
          isolate: false,
        },
      },
      {
        extends: true,
        // As `db`: the same harness and pool cap, and its own run of the
        // global setup, which builds the template only once between them.
        plugins: [boundedPostgres()],
        test: {
          name: 'db-mocking',
          include: DB_MOCKING,
          ...dbHarness,
          isolate: true,
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
