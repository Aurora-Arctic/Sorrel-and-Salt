import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// Matching text is folded by `fold` in src/lib/text.ts and nowhere else, so a Turkish-locale browser
// folds "I" the same way in every picker and duplicate check.

const COMPONENT = /^src\/components\/.*\.tsx?$/;
const STORY = /\.stories\.tsx$/;
const LOCAL_FOLD = /\.trim\(\)\.toLowerCase\(\)|\.toLocaleLowerCase\(\)/;
// Not matching text: an email address normalised for storage, and a lookup key built from a database value.
const ALLOWED = new Set([
  'src/components/EmailForm/index.tsx',
  'src/components/CompendiumList/facets.ts',
]);

describe('text folding', () => {
  it('is written once, in src/lib/text.ts', () => {
    const files = inject('repoFiles').filter((file) => COMPONENT.test(file) && !STORY.test(file));
    const offenders = files.filter(
      (file) => !ALLOWED.has(file) && LOCAL_FOLD.test(readFileSync(file, 'utf8')),
    );

    // Preconditions: the scan reached the components, and the allowance still names live code.
    expect(files.length).toBeGreaterThan(200);
    expect([...ALLOWED].every((file) => LOCAL_FOLD.test(readFileSync(file, 'utf8')))).toBe(true);
    expect(offenders).toEqual([]);
  });
});
