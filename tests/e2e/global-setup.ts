import MCR from 'monocart-coverage-reports';
import coverageOptions from './coverage.config';
import { cloneE2eDatabases, seedE2eTemplate } from './database';

// Once per run, before the first test — but after `webServer` has started the
// servers, which Playwright does first. They connect on their first query, and
// the readiness poll's session-less `/` makes none, so the databases need only
// exist before a spec runs. Reseeding between spec files is each spec's own
// `beforeAll`.
export default async function globalSetup(): Promise<void> {
  await seedE2eTemplate();
  await cloneE2eDatabases();
  // A crashed previous run's cached coverage would otherwise join this report.
  await MCR(coverageOptions).cleanCache();
}
