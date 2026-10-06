import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { compile, compileString } from 'sass';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, fromRoot } from '../support/paths';

// A chip wears its group's colour pair from the row, inline (MB.36). The shape
// it replaced — a `--group-<slug>` custom property and a `.chip--<slug>` class
// per key of `$category-groups`, both generated at Sass compile time — cannot
// colour a group an admin adds at runtime, so neither may come back.
// claude-docs/styling.md, "Chips, badges and the solid-fill rule".
//
// Two scans, since each misses what the other sees: the source text, for a
// component spelling a class or a property by hand, and every stylesheet's
// compiled CSS, for a selector Sass assembles — `.chip { &--#{$slug} {} }`
// spells neither in full.

/** `--group-…` anywhere, or a `chip--` that is not the tail of a longer BEM block. */
const OLD_SHAPE_IN_SOURCE = /--group-|(?<![\w-])chip--/;
const OLD_SHAPE_IN_CSS = /--group-|\.chip--/;

const SCANNED = /\.(scss|tsx?|mts|mjs)$/;

/** Everything under the two trees that style or render a chip, untracked included. */
const files = execFileSync(
  'git',
  [
    '-c',
    'safe.directory=*',
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    'src',
    '.ladle',
  ],
  { cwd: REPO_ROOT, encoding: 'utf8' },
)
  .split('\n')
  .filter((file) => SCANNED.test(file));

/** A partial emits only through a stylesheet that `@use`s it, which is scanned. */
const stylesheets = files.filter(
  (file) => file.endsWith('.scss') && !basename(file).startsWith('_'),
);

function hitsInSource(text: string): string[] {
  return text.split('\n').filter((line) => OLD_SHAPE_IN_SOURCE.test(line));
}

function hitsInCss(css: string): string[] {
  return css.split('\n').filter((line) => OLD_SHAPE_IN_CSS.test(line));
}

describe('MB.36: the scans find the old shape', () => {
  it('flags a class or a property spelled by hand, and not a longer BEM block', () => {
    expect(hitsInSource(`<span className="chip chip--mind">`)).toHaveLength(1);
    expect(hitsInSource(`.chip--#{$slug} {`)).toHaveLength(1);
    expect(hitsInSource(`color: var(--group-mind);`)).toHaveLength(1);
    expect(hitsInSource(`.sign-in-panel__icon-chip--facebook {`)).toEqual([]);
  });

  it('flags a selector Sass assembles, which no source line spells', () => {
    const source = `.chip { &--#{'mind'} { color: red; } }
      :root { #{'--gr' + 'oup-mind'}: red; }`;

    expect(hitsInSource(source)).toEqual([]);
    expect(hitsInCss(compileString(source).css)).toHaveLength(2);
  });
});

describe('MB.36: nothing reads a group colour by slug', () => {
  // Precondition: an empty scan also says "nothing found" — a wrong `cwd`, a
  // filter matching no real filename.
  it('scans the app’s and the workshop’s stylesheets and sources', () => {
    expect(stylesheets).toEqual(
      expect.arrayContaining([
        'src/app/globals.scss',
        '.ladle/primitives.scss',
        '.ladle/theme.scss',
      ]),
    );
    expect(files).toEqual(
      expect.arrayContaining(['.ladle/foundations.tsx', 'src/scss/_mixins.scss']),
    );
  });

  it('spells neither shape in any source file', () => {
    const hits = files.flatMap((file) =>
      hitsInSource(readFileSync(fromRoot(file), 'utf8')).map((line) => `${file}: ${line.trim()}`),
    );

    expect(hits).toEqual([]);
  });

  it.each(stylesheets)('%s compiles to neither shape', (file) => {
    const css = compile(fromRoot(file), { style: 'expanded' }).css;

    expect(hitsInCss(css)).toEqual([]);
  });
});
