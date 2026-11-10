import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A day as `YYYY-MM-DD` in UTC is `isoDayInUtc` (src/lib/utc.ts), and a day shown on a page is the
// `Day` component built on it, so a change to how a day reads reaches every list and detail.

const HOME = 'src/lib/utc.ts';
const ISO_DAY_SLICE = /toISOString\(\)\.slice\(0,\s*10\)/;
const UI = /^src\/(components|app)\/.*\.tsx?$/;

describe('the ISO day', () => {
  it('is never sliced from toISOString in src/components or src/app', () => {
    const files = inject('repoFiles').filter((file) => UI.test(file));

    // Precondition: the scan reached the components, and the pattern sees the home's own slice.
    expect(files.length).toBeGreaterThan(50);
    expect(ISO_DAY_SLICE.test(readFileSync(HOME, 'utf8'))).toBe(true);

    const offending = files.filter((file) => ISO_DAY_SLICE.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });
});
