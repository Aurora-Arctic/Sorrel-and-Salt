import MCR from 'monocart-coverage-reports';
import coverageOptions, { coverageRequested } from './coverage.config';
import { dropE2eTemplate } from './database';

// After the last spec: the merged coverage report, when the run collected one, then the template.
export default async function globalTeardown(): Promise<void> {
  if (coverageRequested) await MCR(coverageOptions).generate();
  await dropE2eTemplate();
}
