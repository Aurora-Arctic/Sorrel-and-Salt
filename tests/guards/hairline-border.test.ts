import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// The hairline border is one token, `$hairline-border` in _variables.scss, so its weight and style change in one
// place. The pattern reads the value, so it covers every border property and side, a namespaced or interpolated
// `$hairline`, and any spacing or line break between the parts; `$hairline-` names another token.

const STYLESHEET = /^(src|\.storybook)\/.*\.scss$/;
const VARIABLES = 'src/scss/_variables.scss';
const HAND_WRITTEN = /\b1px\s+solid\s+(?:#\{\s*)?(?:[\w-]+\.)?\$hairline(?![\w-])/g;

describe('the hairline border', () => {
  it('is written as $hairline-border, never by hand in a stylesheet', () => {
    const files = inject('repoFiles').filter((file) => STYLESHEET.test(file));

    // Precondition: the scan reached the variables file, the workshop's sheets, and a component sheet that
    // reads the hairline colour.
    expect(files).toContain(VARIABLES);
    expect(files).toContain('.storybook/story-frame.scss');
    expect(files).toContain('src/components/CategoryChips/index.scss');
    expect(readFileSync('src/components/CategoryChips/index.scss', 'utf8')).toMatch(/\$hairline\b/);

    const offending = files
      .filter((file) => file !== VARIABLES)
      .flatMap((file) => {
        const text = readFileSync(file, 'utf8');
        return [...text.matchAll(HAND_WRITTEN)].map(
          (match) => `${file}:${text.slice(0, match.index).split('\n').length}`,
        );
      });
    expect(offending).toEqual([]);
  });

  it('is the token 1px solid $hairline', () => {
    const css = compileString(
      `@use 'variables' as v;
      .token { border: v.$hairline-border; }
      .by-hand { border: 1px solid v.$hairline; }`,
      { style: 'expanded', loadPaths: [fromRoot('src/scss')] },
    ).css;
    const border = (selector: string) =>
      new RegExp(`\\.${selector} \\{\\s*border: ([^;]+);`).exec(css)?.[1];

    expect(border('by-hand')).toBeDefined();
    expect(border('token')).toBe(border('by-hand'));
  });
});
