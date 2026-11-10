import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A text over its limit is refused with `limitMessage` (src/lib/formats.ts), so the form and the server say the same
// words; a hand-written "Keep the … characters" sentence drifts from it.

const HOME = 'src/lib/formats.ts';
const HAND_WRITTEN = /Keep the [a-z]+ to [^\n`]*characters/;

describe('the length-limit sentence', () => {
  it('is written only by limitMessage in src/', () => {
    const files = inject('repoFiles').filter(
      (file) => /^src\/.*\.(ts|tsx)$/.test(file) && !file.startsWith('src/db/seed/'),
    );

    // Precondition: the scan reached src/ and the home still holds the shared sentence.
    expect(files.length).toBeGreaterThan(500);
    expect(readFileSync(HOME, 'utf8')).toContain('characters or fewer');

    const writers = files.filter((file) => HAND_WRITTEN.test(readFileSync(file, 'utf8')));
    expect(writers).toEqual([]);
  });
});
