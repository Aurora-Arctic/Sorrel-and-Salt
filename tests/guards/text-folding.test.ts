import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// Matching text is folded by `fold` in src/lib/text.ts and nowhere else, so a Turkish-locale browser
// folds "I" the same way in every picker and duplicate check.

const COMPONENT = /^src\/components\/.*\.tsx?$/;
const STORY = /\.stories\.tsx$/;
const INLINE_FOLD = /\.trim\(\)\.toLowerCase\(\)/;
const FOLD_DEFINITION =
  /^export const fold = \(text: string\): string => text\.trim\(\)\.toLowerCase\(\);$/m;
const LOCAL_FOLD = /\.trim\(\)\.toLowerCase\(\)|\.toLocaleLowerCase\(\)/;

describe('text folding', () => {
  it('is written once, in src/lib/text.ts', () => {
    const files = inject('repoFiles').filter((file) => COMPONENT.test(file) && !STORY.test(file));
    const offenders = files.filter((file) => LOCAL_FOLD.test(readFileSync(file, 'utf8')));

    // Precondition: the scan reached the components.
    expect(files.length).toBeGreaterThan(200);
    expect(offenders).toEqual([]);
  });

  it('is never typed as trim().toLowerCase() anywhere in src/ but fold itself', () => {
    const files = inject('repoFiles').filter((file) => /^src\/.*\.tsx?$/.test(file));
    const copies = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ at: `${file}:${index + 1}`, line }))
        .filter(({ line }) => INLINE_FOLD.test(line) && !FOLD_DEFINITION.test(line))
        .map(({ at }) => at),
    );

    // Preconditions: the scan reached src/, and fold itself is the shape, so the pattern matches real code.
    expect(files).toContain('src/lib/text.ts');
    expect(readFileSync('src/lib/text.ts', 'utf8')).toMatch(FOLD_DEFINITION);
    expect(copies).toEqual([]);
  });
});
