import type { CoverageReportOptions } from 'monocart-coverage-reports';

// Separate from Vitest's `.reports/coverage` so the two suites stay visible independently.
const coverageOptions: CoverageReportOptions = {
  name: 'Sorrel & Salt E2E Coverage',
  outputDir: './.reports/coverage-e2e',
  // 'json-summary' feeds .github/scripts/summarize-playwright.mjs and
  // summarize-stories.mjs. 'raw' keeps the unprocessed V8 data in `raw/`
  // beside the report, so it travels inside the uploaded coverage artifact and
  // .github/scripts/merge-playwright-coverage.mjs can merge the gate suite's
  // and the story suite's runs with `inputDir`.
  reports: ['v8', 'console-details', 'json-summary', 'raw'],
  // Order-sensitive: the first matching pattern wins, and plenty of packages
  // ship their own `src/` in their sourcemaps, so node_modules is excluded
  // before `src/**` is allowed.
  sourceFilter: {
    '**/node_modules/**': false,
    '**/src/**': true,
  },
};

export default coverageOptions;

/**
 * Whether this run collects JS coverage at all (M11.18). CI sets
 * `E2E_COVERAGE=1` in .github/workflows/playwright.yml, so its artifact and
 * summary are unchanged; a local run collects none unless asked
 * (`E2E_COVERAGE=1 npm run e2e`), since starting and stopping coverage on
 * every page and merging it at teardown cost about a tenth of the summed test
 * time for a report nobody read (claude-docs/testing/e2e.md, "Where a run's
 * time goes").
 */
export const coverageRequested = process.env.E2E_COVERAGE === '1';
