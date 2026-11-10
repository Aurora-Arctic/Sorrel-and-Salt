import { readFileSync } from 'node:fs';
import { compile } from 'sass';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Every box is sized by its border edge through one reset, so a component sheet never repeats it and a
// `content-box` that remains is visibly the exception. The reset is written once in the layout partial and
// emitted by both global sheets: the app's, and the workshop's, which does not load the app's.

const STYLESHEET = /^(src|\.storybook)\/.*\.scss$/;
const RESET_OWNER = 'src/scss/_layout.scss';
const GLOBAL_SHEETS = ['src/app/globals.scss', '.storybook/layout.scss'];
const BORDER_BOX = /box-sizing:\s*border-box/;

/** The top-level rule setting `border-box` on every element and both pseudo-elements, if `css` has one. */
function resetRule(css: string): string | undefined {
  // A top-level rule starts its line: a rule nested in a query or under a selector is indented or prefixed.
  return [...css.matchAll(/^([^\s@}][^{]*)\{([^}]*)\}/gm)].find(
    ([, selector, body]) =>
      /(^|,)\s*\*\s*(,|$)/.test(selector) &&
      /::before/.test(selector) &&
      /::after/.test(selector) &&
      BORDER_BOX.test(body),
  )?.[0];
}

describe('box-sizing: border-box', () => {
  it('is declared by no sheet but the one reset', () => {
    const files = inject('repoFiles').filter((file) => STYLESHEET.test(file));

    // Precondition: the scan reached the reset's sheet, a component's and the workshop's.
    expect(files).toContain(RESET_OWNER);
    expect(files).toContain('src/components/Modal/index.scss');
    expect(files).toContain('.storybook/story-frame.scss');

    const offending = files
      .filter((file) => file !== RESET_OWNER)
      .filter((file) => BORDER_BOX.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });

  it.each(GLOBAL_SHEETS)(
    'is set on every element and pseudo-element by %s, outside any query',
    (sheet) => {
      const css = compile(fromRoot(sheet), { style: 'expanded' }).css;
      expect(resetRule(css)).toBeDefined();
    },
  );
});
