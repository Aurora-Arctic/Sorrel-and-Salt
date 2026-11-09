import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A width query is written once, by a mixin in src/scss/_mixins.scss (phone-down, above-phone, tablet-down,
// above-tablet, or width-from / width-to for a width of a component's own). Written by hand it drifts: the
// same edge has been spelled three ways, and the `0.01rem` offset forgotten (claude-docs/styling.md).

const STYLESHEET = /^(src|\.storybook)\/.*\.scss$/;
const OWNERS = ['src/scss/_mixins.scss', 'src/scss/_variables.scss'];
const WIDTH_QUERY = /@media[^{;]*width/;

describe('width media queries', () => {
  it('are written only by the breakpoint mixins, never by hand in a stylesheet', () => {
    const files = inject('repoFiles').filter((file) => STYLESHEET.test(file));

    // Precondition: the scan reached the mixins file and a component's stylesheet.
    expect(files).toContain('src/scss/_mixins.scss');
    expect(files).toContain('src/components/Modal/index.scss');

    const offending = files
      .filter((file) => !OWNERS.includes(file))
      .filter((file) => WIDTH_QUERY.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });

  it('are written in the mixins file', () => {
    expect(WIDTH_QUERY.test(readFileSync('src/scss/_mixins.scss', 'utf8'))).toBe(true);
  });
});
