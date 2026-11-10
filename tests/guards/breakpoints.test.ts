import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// A width query is written once, by a mixin in src/scss/_mixins.scss (phone-down, above-phone, tablet-down,
// above-tablet, or width-from / width-to for a width of a component's own). Written by hand it drifts: the
// same edge has been spelled three ways, and the `0.01rem` offset forgotten (claude-docs/styling.md).
// A container query's step past an edge is the same `0.01rem`, owned by container-from.

const STYLESHEET = /^(src|\.storybook)\/.*\.scss$/;
const MIXINS = 'src/scss/_mixins.scss';
const OWNERS = [MIXINS, 'src/scss/_variables.scss'];
const WIDTH_QUERY = /@media[^{;]*width/;
// A prelude may interpolate (`#{$edge}`), so its braces do not end it.
const CONTAINER_STEP = /@container(?:[^{;]|#\{[^}]*\})*0\.01rem/;

function stylesheets(): string[] {
  const files = inject('repoFiles').filter((file) => STYLESHEET.test(file));

  // Precondition: the scan reached the mixins file and a component's stylesheet.
  expect(files).toContain(MIXINS);
  expect(files).toContain('src/components/Modal/index.scss');
  return files;
}

function offenders(pattern: RegExp): string[] {
  return stylesheets()
    .filter((file) => !OWNERS.includes(file))
    .filter((file) => pattern.test(readFileSync(file, 'utf8')));
}

describe('width media queries', () => {
  it('are written only by the breakpoint mixins, never by hand in a stylesheet', () => {
    expect(offenders(WIDTH_QUERY)).toEqual([]);
  });

  it('are written in the mixins file', () => {
    expect(WIDTH_QUERY.test(readFileSync(MIXINS, 'utf8'))).toBe(true);
  });
});

describe('container width queries', () => {
  it('step past an edge only through container-from, never by a hand-written 0.01rem', () => {
    // Precondition: the scan reads container queries, so a sheet with one is in reach.
    expect(readFileSync('src/components/TabbedPage/index.scss', 'utf8')).toMatch(/@container/);

    expect(offenders(CONTAINER_STEP)).toEqual([]);
  });

  it('are written by container-from and container-to, which put an edge on exactly one side', () => {
    const css = compileString(
      `@use 'mixins' as *;
      .wide { @include container-from(page-header, 10rem) { color: red; } }
      .narrow { @include container-to(page-header, 10rem) { color: red; } }`,
      { style: 'expanded', loadPaths: [fromRoot('src/scss')] },
    ).css;

    // container-from is above the edge: the edge itself belongs to container-to.
    expect(css).toMatch(
      /@container page-header \(min-width: (?:10\.01rem|calc\(10rem \+ 0\.01rem\))\) \{\s*\.wide \{/,
    );
    expect(css).toMatch(/@container page-header \(max-width: 10rem\) \{\s*\.narrow \{/);
  });
});
