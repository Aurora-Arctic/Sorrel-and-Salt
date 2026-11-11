import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A live region re-announces the same words when they change by a trailing no-break space; that
// trick is `repeatable` (src/lib/repeat-announcement.ts), so it is written once. A no-break space
// between a time and its am or pm is `TIME_PERIOD_SPACE` in src/lib/utc.ts; a JSX `&nbsp;` is not
// matched.

const HOME = 'src/lib/repeat-announcement.ts';
const NO_BREAK_SPACE = /\\u00a0| /i;

const scripts = (): string[] => inject('repoFiles').filter((file) => /^src\/.*\.tsx?$/.test(file));

describe('the repeat announcement', () => {
  it('writes no no-break space in src/components', () => {
    const files = scripts().filter((file) => file.startsWith('src/components/'));

    // Precondition: the scan reached the components, and the pattern sees the escape where it lives.
    expect(files.length).toBeGreaterThan(50);
    expect(NO_BREAK_SPACE.test(readFileSync('src/lib/utc.ts', 'utf8'))).toBe(true);

    const offending = files.filter((file) => NO_BREAK_SPACE.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });

  it('has the helper', () => {
    expect(scripts()).toContain(HOME);
    expect(readFileSync(HOME, 'utf8')).toMatch(/export function repeatable\b/);
  });
});
