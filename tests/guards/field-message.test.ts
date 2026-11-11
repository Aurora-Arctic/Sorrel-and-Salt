import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// The server's message for one input is read with fieldMessage() in src/lib/graphql-failure.ts, so a change to the failure's
// shape reaches every form at once.

const HAND_LOOKUP = /\.field\?\.name\s*===/;

describe('a server field message in a component', () => {
  it('is read through fieldMessage, not by comparing the failure field name', () => {
    const files = inject('repoFiles').filter((file) => /^src\/components\/.*\.tsx?$/.test(file));

    // Precondition: the scan reached the components, and the helper exists to be used.
    expect(files.length).toBeGreaterThan(100);
    expect(readFileSync('src/lib/graphql-failure.ts', 'utf8')).toContain(
      'export function fieldMessage',
    );

    const offending = files.filter((file) => HAND_LOOKUP.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });
});
