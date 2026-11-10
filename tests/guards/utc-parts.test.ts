import { describe, expect, it } from 'vitest';
import { readSource } from '../support/repo-scan';

// The UTC helpers read a date's parts through one formatter call, so a fix to a wrong part reaches every date they write.

describe('src/lib/utc.ts', () => {
  it('splits a date into its parts in one place', () => {
    const source = readSource('src/lib/utc.ts');
    // Precondition: the file still formats dates by their parts.
    expect(source).toMatch(/formatToParts\(/);

    expect(source.match(/formatToParts\(/g)).toHaveLength(1);
  });
});
