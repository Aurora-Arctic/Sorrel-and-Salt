import MCR from 'monocart-coverage-reports';
import coverageOptions from './coverage.config';
import { recreateE2eDatabase } from './database';

// Runs once for the whole Playwright run, before `webServer` starts —
// `sorrel_e2e` has to exist before the app can connect to it. Per-file
// reseeding between spec files is each spec's own responsibility (see
// e2e/smoke.spec.ts), not this hook's.
export default async function globalSetup(): Promise<void> {
  await recreateE2eDatabase();
  // Clears stale cached coverage data from a previous run so
  // global-teardown.ts's mcr.generate() never mixes it into this run's report.
  await MCR(coverageOptions).cleanCache();
}
