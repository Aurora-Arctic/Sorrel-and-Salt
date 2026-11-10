import { describe, expect, it } from 'vitest';
import { readSource, sourceFiles } from '../support/repo-scan';

// Every Vercel Cron route is `cronRoute(job)`, so the secret check and the 401 and 204 answers are written once.

describe('the cron routes', () => {
  const routes = sourceFiles({ under: 'src/app/api/cron/' }).filter((file) =>
    file.endsWith('/route.ts'),
  );

  it('are each built by cronRoute and none checks the secret itself', () => {
    // Precondition: the three daily routes are in the scan.
    expect(routes).toEqual(
      expect.arrayContaining([
        'src/app/api/cron/document-mailing/route.ts',
        'src/app/api/cron/provisional-cleanup/route.ts',
        'src/app/api/cron/support-retention/route.ts',
      ]),
    );

    const unshared = routes.filter((file) => {
      const source = readSource(file);
      return !/export const GET = cronRoute\(/.test(source) || /\bcronAuthorised\b/.test(source);
    });
    expect(unshared).toEqual([]);
  });
});
