import MCR from 'monocart-coverage-reports';
import coverageOptions from './coverage.config';

// Runs once after every spec file's fixtures.ts auto fixture has added its
// coverage entries — generates the merged report into coverageOptions.outputDir.
export default async function globalTeardown(): Promise<void> {
  await MCR(coverageOptions).generate();
}
