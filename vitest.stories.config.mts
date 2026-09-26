import { defineConfig } from 'vitest/config';
import { dbHarness } from './tests/support/db-project.mts';

// `npm run test:stories`: the acceptance suite alone, printed as a checklist
// of the v1 stories. A config of its own rather than a third project, so a red
// scaffold cannot fail the unit run and a passing story cannot lift the
// coverage threshold: claude-docs/testing.md, "Acceptance".
//
// The reporter is named by path, not imported: Vitest loads a path through
// its module runner, where an import here runs at config-load time. `default`
// stays first so a failing story still prints its assertion.
// `passWithNoTests` because 50 stories with no test is a true report.
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
