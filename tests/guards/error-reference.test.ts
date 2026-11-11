import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// Every error screen takes its reference and detail from useErrorReport (src/lib/error-report.ts), so the screen and the
// report it sends always name the same reference, and an error with no digest still gets one.

const BOUNDARY = /^src\/app\/(.*\/)?(global-)?error\.tsx$/;
const DIGEST_READ = /\.digest\b/;
const THROUGH_HELPER = /<ErrorScreen\b|\buseErrorReport\(/;

describe('an error screen names its reference through the one helper', () => {
  it('has every error boundary use the helper, and none read the digest itself', () => {
    const boundaries = inject('repoFiles').filter((file) => BOUNDARY.test(file));
    // Preconditions: the scan found the root, shell and global boundaries, and the patterns match the shapes they test.
    expect(boundaries).toEqual(
      expect.arrayContaining(['src/app/error.tsx', 'src/app/global-error.tsx']),
    );
    expect('reference={error.digest}').toMatch(DIGEST_READ);
    expect('<ErrorScreen error={error} retry={retry} />').toMatch(THROUGH_HELPER);

    const sources = boundaries.map((file) => [file, readFileSync(file, 'utf8')] as const);
    expect(sources.filter(([, text]) => DIGEST_READ.test(text)).map(([file]) => file)).toEqual([]);
    expect(sources.filter(([, text]) => !THROUGH_HELPER.test(text)).map(([file]) => file)).toEqual(
      [],
    );
  });
});
