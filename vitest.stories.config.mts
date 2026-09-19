import { defineConfig } from 'vitest/config';
import { dbHarness } from './tests/support/db-project.mts';

// M1.28 — `npm run test:stories` / `make test-stories`: the acceptance suite
// alone, printed as a checklist of the v1 user stories (DESIGN.md §11,
// "Acceptance tests — story traceability").
//
// A config of its own rather than a third project in vitest.config.mts, and
// that is the point: `npm run test` and `npm run test:coverage` never see
// tests/acceptance/, so a deliberately red scaffold (M2.1 lands that way)
// cannot fail the unit run, and a story that passes cannot lift the 80% line
// threshold — acceptance coverage is the checklist, not a percentage, and the
// two are never summed. The `unit` project's `exclude` is the other half of
// that: its glob would otherwise sweep these files up under jsdom.
//
// The suite runs on the same harness as tests/db/ — node, one seeded
// `sorrel_test_<slot>` clone per worker, re-cloned before every file — because
// an acceptance test calls a service against the seeded world (§11's example
// is `spells.create(asUser(A), …)`). A file that needs a DOM (04-modals.test.tsx,
// M9.1) declares `// @vitest-environment jsdom` in its own docblock.
//
// `default` stays as the first reporter so a failing story still prints its
// assertion; the story reporter adds the checklist after it. It is named by
// path rather than imported: Vitest loads a path through its module runner,
// whereas an import here runs at config-load time, where Vite's coming
// native loader would hand a `.ts` file to Node — which is also why the
// harness above is a `.mts` imported with its extension. `passWithNoTests`
// because the directory is empty until M2.1, and an empty checklist — 45
// stories, none tested — is a true report rather than an error.
export default defineConfig({
  // As vitest.config.mts: tests reach src/ by the `@/*` alias.
  resolve: { tsconfigPaths: true },
  test: {
    name: 'acceptance',
    include: ['tests/acceptance/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    ...dbHarness,
    reporters: ['default', './tests/support/story-reporter.ts'],
  },
});
