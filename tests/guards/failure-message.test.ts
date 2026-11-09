import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A component shows a failed request's message through failureMessage (src/lib/graphql-failure.ts), so
// every screen words the same refusal the same way. Reading the alert or the first issue by hand is what
// this refuses.

const HAND_READ = /readGraphqlFailure\(\w+\)\.alert|readGraphqlIssues\(\w+\)\[0\]/;

describe('reading a failure message in a component', () => {
  it('goes through failureMessage, not .alert or the first issue read by hand', () => {
    const files = inject('repoFiles').filter((file) => /^src\/components\/.*\.tsx?$/.test(file));

    // Precondition: the scan reached the components, and the helper exists to be used.
    expect(files.length).toBeGreaterThan(100);
    expect(readFileSync('src/lib/graphql-failure.ts', 'utf8')).toContain(
      'export function failureMessage',
    );

    const offending = files.filter((file) => HAND_READ.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });
});
