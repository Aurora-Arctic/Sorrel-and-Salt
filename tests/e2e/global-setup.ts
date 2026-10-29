import MCR from 'monocart-coverage-reports';
import coverageOptions, { coverageRequested } from './coverage.config';
import { cloneE2eDatabases, seedE2eTemplate } from './database';

// Once per run, after Playwright's `webServer` has started the servers. They connect on their first query
// and the readiness poll's session-less `/` makes none, so the databases need only exist before a spec
// runs. Reseeding between spec files is each spec's own `beforeAll`.
export default async function globalSetup(): Promise<void> {
  await seedE2eTemplate();
  await cloneE2eDatabases();
  // A crashed previous run's cached coverage would otherwise join this report.
  if (coverageRequested) await MCR(coverageOptions).cleanCache();
}
