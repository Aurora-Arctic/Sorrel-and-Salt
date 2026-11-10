import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// A width query is written once, by a mixin in src/scss/_mixins.scss (phone-down, above-phone, tablet-down,
// above-tablet, or width-from / width-to for a width of a component's own). Written by hand it drifts: the
// same edge has been spelled three ways, and the `0.01rem` offset forgotten (claude-docs/styling.md).
// A container width query is written the same way, by container-from or container-to, which own the step
// past an edge; a container query on no width (a style query) is not a width query.

const STYLESHEET = /^(src|\.storybook)\/.*\.scss$/;
const MIXINS = 'src/scss/_mixins.scss';
const OWNERS = [MIXINS, 'src/scss/_variables.scss'];
const WIDTH_QUERY = /@media[^{;]*width/;
// A prelude may interpolate (`#{$edge}`), so its braces do not end it. `width` covers min-, max- and the
// range forms (`width > …`); `inline-size` is the same axis.
const CONTAINER_WIDTH_QUERY = /@container(?:[^{;]|#\{[^}]*\})*\b(?:width|inline-size)\b/;

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
  it('are written only by container-from and container-to, never by hand in a stylesheet', () => {
    // Precondition: the scan reads container queries, so a sheet with one is in reach.
    expect(readFileSync('src/components/TabbedPage/index.scss', 'utf8')).toMatch(/@container/);

    expect(offenders(CONTAINER_WIDTH_QUERY)).toEqual([]);
  });

  // Each shape a stylesheet needs: a narrow side, a wide side, both edges, and a container with no name.
  const css = () =>
    compileString(
      `@use 'mixins' as *;
      .wide { @include container-from(page-header, 10rem) { color: red; } }
      .narrow { @include container-to(page-header, 10rem) { color: red; } }
      .between {
        @include container-from(page-header, 10rem) {
          @include container-to(page-header, 20rem) { color: red; }
        }
      }
      .nearest { @include container-to(null, 10rem) { color: red; } }`,
      { style: 'expanded', loadPaths: [fromRoot('src/scss')] },
    ).css;

  // Above the edge: the step written once here, or a range or a `not` that leaves the edge to container-to.
  const ABOVE_10 = String.raw`(?:\(min-width: (?:10\.01rem|calc\(10rem \+ 0\.01rem\))\)|\(width > 10rem\)|not \(max-width: 10rem\))`;

  it('put an edge on exactly one side: container-to holds it, container-from starts above it', () => {
    const out = css();
    expect(out).toMatch(new RegExp(`@container page-header ${ABOVE_10} \\{\\s*\\.wide \\{`));
    expect(out).toMatch(/@container page-header \(max-width: 10rem\) \{\s*\.narrow \{/);
  });

  it('nest to bound a container on both sides', () => {
    expect(css()).toMatch(
      new RegExp(
        `@container page-header ${ABOVE_10} \\{\\s*@container page-header \\(max-width: 20rem\\) \\{\\s*\\.between \\{`,
      ),
    );
  });

  it('query the nearest container when given no name', () => {
    expect(css()).toMatch(/@container \(max-width: 10rem\) \{\s*\.nearest \{/);
  });
});
