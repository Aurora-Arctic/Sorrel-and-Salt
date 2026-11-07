import MCR from 'monocart-coverage-reports';
import coverageOptions, { coverageRequested } from './coverage.config';

// After the last spec: the merged coverage report, when the run collected one. The template stays for the next run.
export default async function globalTeardown(): Promise<void> {
  if (coverageRequested) await MCR(coverageOptions).generate();
}
