import type { CoverageReportOptions } from 'monocart-coverage-reports';

// Separate from Vitest's `coverage/` so the two suites stay visible independently.
const coverageOptions: CoverageReportOptions = {
  name: 'Sorrel & Salt E2E Coverage',
  outputDir: './coverage-e2e',
  // 'json-summary' feeds .github/scripts/summarize-playwright.mjs.
  reports: ['v8', 'console-details', 'json-summary'],
  // Order-sensitive: the first matching pattern wins, and plenty of packages
  // ship their own `src/` in their sourcemaps, so node_modules is excluded
  // before `src/**` is allowed.
  sourceFilter: {
    '**/node_modules/**': false,
    '**/src/**': true,
  },
};

export default coverageOptions;
