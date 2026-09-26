import MCR from 'monocart-coverage-reports';
import coverageOptions from './coverage.config';
import { dropE2eTemplate } from './database';

// After the last spec: the merged coverage report, then the template.
export default async function globalTeardown(): Promise<void> {
  await MCR(coverageOptions).generate();
  await dropE2eTemplate();
}
