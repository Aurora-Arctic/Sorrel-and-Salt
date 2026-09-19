import MCR from 'monocart-coverage-reports';
import coverageOptions from './coverage.config';
import { recreateE2eDatabase, seedE2eTemplate } from './database';

// Once per run, before `webServer` starts — `sorrel_e2e` has to exist before
// the app connects. Reseeding between spec files is each spec's own `beforeAll`.
export default async function globalSetup(): Promise<void> {
  await seedE2eTemplate();
  await recreateE2eDatabase();
  // A crashed previous run's cached coverage would otherwise join this report.
  await MCR(coverageOptions).cleanCache();
}
