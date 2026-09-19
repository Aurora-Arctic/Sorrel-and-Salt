import type { CoverageReportOptions } from 'monocart-coverage-reports';

// Separate outputDir from Vitest's `coverage/` (vitest.config.mts) so the two
// suites' contributions stay visible independently — CLAUDE.md's Commands
// table and .gitignore both already carve out `coverage-e2e` for this.
const coverageOptions: CoverageReportOptions = {
  name: 'Sorrel & Salt E2E Coverage',
  outputDir: './coverage-e2e',
  // 'json-summary' (M1.14) is read by .github/scripts/summarize-playwright.mjs
  // to build the PR comment's coverage stat/table, in the same istanbul-style
  // shape @vitest/coverage-v8's own 'json-summary' reporter emits.
  reports: ['v8', 'console-details', 'json-summary'],
  // next.config.ts's productionBrowserSourceMaps resolves each entry chunk
  // back to its original source. Without this filter that resolution still
  // pulls in framework/runtime source (Next/Turbopack's own files, node_modules
  // deps) alongside src/**, which is both noise and not ours to hit 80% on —
  // mirrors vitest.config.mts's `include: ['src/**/*.{ts,tsx}']`.
  //
  // node_modules must be excluded *before* the src/** allow rule: patterns
  // are checked in order and the first match wins (per monocart's docs), and
  // plenty of npm packages ship their own `src/` directory in their own
  // sourcemaps — a bare '**/src/**' matches those too, not just this repo's.
  sourceFilter: {
    '**/node_modules/**': false,
    '**/src/**': true,
  },
};

export default coverageOptions;
