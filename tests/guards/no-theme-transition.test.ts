import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A theme change swaps the whole page in one cross-fade (ThemeToggle), so no element runs a colour
// fade of its own on it. The mixin and the timing variables that drew those fades are gone from the
// stylesheets, and this keeps them gone (claude-docs/styling.md).

const STYLESHEET = /^(src|\.storybook)\/.*\.(scss|css)$/;
const MIXIN = /@(mixin|include)\s+theme-transition\b/;
const VARIABLE = /\$theme-transition-[\w-]+/;

describe('the per-element theme fades', () => {
  it('are gone: no theme-transition mixin and no $theme-transition-* variable in src/ or .storybook/', () => {
    const files = inject('repoFiles').filter((file) => STYLESHEET.test(file));
    const sources = files.map((file) => ({ file, text: readFileSync(file, 'utf8') }));

    // Precondition: the scan reached the stylesheets, the mixins file and the workshop's among them.
    expect(sources.length).toBeGreaterThan(50);
    expect(files).toContain('src/scss/_mixins.scss');
    expect(files).toContain('.storybook/theme.scss');

    const offending = sources
      .filter(({ text }) => MIXIN.test(text) || VARIABLE.test(text))
      .map(({ file }) => file);
    expect(offending).toEqual([]);
  });
});
