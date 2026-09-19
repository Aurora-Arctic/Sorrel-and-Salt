import { defineConfig } from 'vitest/config';
import { dbHarness } from './tests/support/db-project.mts';

// Two projects per CLAUDE.md's Testing section: `unit` runs pure logic and
// components in jsdom with no network; `db` runs against a real local
// Postgres (never Neon — see docker-compose.yaml's `postgres` service).
// `db` includes `tests/services/**`, which has no files yet (services land
// from Wave 5), so `passWithNoTests` keeps that half from failing the run.
// The Postgres wiring itself — the per-slot clone of the seeded template,
// and the pinned `maxWorkers` that wiring depends on — is
// tests/support/db-project.mts's `dbHarness`, spread into `db` below and
// into the acceptance suite's own config.
//
// The acceptance suite (tests/acceptance/, DESIGN.md §11) is deliberately
// not a third project here: it runs from vitest.stories.config.mts (M1.28),
// so a red story never fails this run and a green one never counts toward
// the coverage threshold below. That is why `unit` excludes it — its glob
// would otherwise sweep those files up under jsdom.
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
