import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';
import { boundedPostgres, dbHarness } from './tests/support/db-project.mts';

const require = createRequire(import.meta.url);
const serverOnlyStub = require.resolve('next/dist/compiled/server-only/empty.js');

// `npm run test:stories`: the acceptance suite alone, printed as a checklist
// of the v1 stories. A config of its own rather than a third project, so a red
// scaffold cannot fail the unit run and a passing story cannot lift the
// coverage threshold: claude-docs/testing/acceptance.md, "Acceptance".
//
// The reporter is named by path, not imported: Vitest loads a path through
// its module runner, where an import here runs at config-load time. `default`
// stays first so a failing story still prints its assertion.
// `passWithNoTests` because 51 stories with no test is a true report.
export default defineConfig({
  // As vitest.config.mts: tests reach src/ by the `@/*` alias, a service's
  // `server-only` marker resolves to Next's empty stub, and a bare `graphql`
  // import gets the CommonJS copy Pothos and Yoga hold, so a story that runs a
  // query against the real schema does not meet "another module or realm"
  // (vitest.config.mts carries the why).
  // As the db project: every pool capped (tests/support/db/bounded-postgres.ts).
  plugins: [boundedPostgres()],
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^graphql$/, replacement: require.resolve('graphql') },
      { find: /^server-only$/, replacement: serverOnlyStub },
    ],
  },
  test: {
    name: 'acceptance',
    include: ['tests/acceptance/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    ...dbHarness,
    reporters: ['default', './tests/support/story-reporter.ts'],
  },
});
