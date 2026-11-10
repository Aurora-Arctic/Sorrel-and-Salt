import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A Better Auth call in a component takes its dropped-connection fallback from settled() in src/lib/auth-call.ts, so the
// shape callers read (`error.status`, `error.code`) is one shape.

const HAND_CATCH = /\.catch\([^)]*\)\s*=>\s*\(\{\s*(data: null, )?error\b|error: \{\} as /;

describe('a dropped Better Auth connection in a component', () => {
  it('goes through settled, not a hand-written catch fallback', () => {
    const files = inject('repoFiles').filter((file) => /^src\/components\/.*\.tsx?$/.test(file));

    // Precondition: the scan reached the components, and the helper exists to be used.
    expect(files.length).toBeGreaterThan(100);
    expect(readFileSync('src/lib/auth-call.ts', 'utf8')).toContain('export function settled');

    const offending = files.filter((file) => HAND_CATCH.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });
});
