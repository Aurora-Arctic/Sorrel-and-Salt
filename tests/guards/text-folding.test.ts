import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// Matching text is folded by `fold` in src/lib/text.ts and nowhere else, so a Turkish-locale browser
// folds "I" the same way in every picker and duplicate check.

const COMPONENT = /^src\/components\/.*\.tsx?$/;
const STORY = /\.stories\.tsx$/;
const LOCAL_FOLD = /\.trim\(\)\.toLowerCase\(\)|\.toLocaleLowerCase\(\)/;

describe('text folding', () => {
  it('is written once, in src/lib/text.ts', () => {
    const files = inject('repoFiles').filter((file) => COMPONENT.test(file) && !STORY.test(file));
    const offenders = files.filter((file) => LOCAL_FOLD.test(readFileSync(file, 'utf8')));

    // Precondition: the scan reached the components.
    expect(files.length).toBeGreaterThan(200);
    expect(offenders).toEqual([]);
  });
});
