import type { CoverageReportOptions } from 'monocart-coverage-reports';

// Separate from Vitest's `.reports/coverage` so the two suites stay visible independently.
const coverageOptions: CoverageReportOptions = {
  name: 'Sorrel & Salt E2E Coverage',
  outputDir: './.reports/coverage-e2e',
  // 'json-summary' feeds .github/scripts/summarize-playwright.mjs and summarize-stories.mjs. 'raw' keeps the
  // unprocessed V8 data in `raw/` beside the report, so the uploaded coverage artifact carries it and
  // .github/scripts/merge-playwright-coverage.mjs can merge the gate and story runs with `inputDir`.
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
 * Whether this run collects JS coverage at all. CI sets `E2E_COVERAGE=1` in .github/workflows/playwright.yml;
 * a local run collects none unless asked (`E2E_COVERAGE=1 npm run e2e`), since coverage costs about a tenth
 * of the summed test time (claude-docs/testing/e2e.md, "Where a run's time goes").
 */
export const coverageRequested = process.env.E2E_COVERAGE === '1';
