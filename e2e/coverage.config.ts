import type { CoverageReportOptions } from 'monocart-coverage-reports';

// Separate outputDir from Vitest's `coverage/` (vitest.config.mts) so the two
// suites' contributions stay visible independently — CLAUDE.md's Commands
// table and .gitignore both already carve out `coverage-e2e` for this.
const coverageOptions: CoverageReportOptions = {
  name: 'Sorrel & Salt E2E Coverage',
  outputDir: './coverage-e2e',
  reports: ['v8', 'console-details'],
};

export default coverageOptions;
