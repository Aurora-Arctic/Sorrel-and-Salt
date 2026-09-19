import MCR from 'monocart-coverage-reports';
import coverageOptions from './coverage.config';
import { dropE2eTemplate } from './database';

// Runs once after every spec file's fixtures.ts auto fixture has added its
// coverage entries — generates the merged report into coverageOptions.outputDir,
// and drops the seeded template global-setup.ts built (M1.27).
export default async function globalTeardown(): Promise<void> {
  await MCR(coverageOptions).generate();
  await dropE2eTemplate();
}
