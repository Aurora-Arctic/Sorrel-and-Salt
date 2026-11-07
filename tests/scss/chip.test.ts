import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';
import { CHIP_GROUNDS, contrastRatio } from '@/lib/contrast';
import { fromRoot } from '../support/paths';

// One assertion per theme; how it looks is the workshop story's and the axe scan's (claude-docs/testing/layer-ownership.md, "What a test may assert").

const SCSS_DIR = fromRoot('src/scss');

// The write check tests each column against CHIP_GROUNDS: the harder of its theme's two surfaces,
// the dark card and the light page. The test below proves the theme mixins still draw those two.

// An invented pair, nowhere in the seed or the Sass map, that clears 4.5:1 against what the write check tests.
const NINTH = { dark: '#5f9a9f', light: '#7a3f10' } as const;

function compile(source: string): string {
  return compileString(source, { style: 'expanded', loadPaths: [SCSS_DIR] }).css;
}

function declarations(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No rule for ${selector} in:\n${css}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries(
    body
      .split(';')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const colon = line.indexOf(':');
        return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
      }),
  );
}

describe('a group colour the write check admits is legible on its theme', () => {
  function surfaces(theme: 'dark' | 'light'): { page: string; card: string } {
    const tokens = declarations(
      compile(`@use 'mixins' as m; .probe { @include m.theme-${theme}; }`),
      '.probe',
    );
    return { page: tokens['--surface-page'], card: tokens['--surface-card'] };
  }

  // An unselected chip's label is the colour on its surface; a selected chip's is the page surface on a fill of the colour.
  // The precondition is only what the check promises: the colour clears the surface it was checked against.
  it.each(['dark', 'light'] as const)(
    'clears 4.5:1 on both surfaces, in both states, for any %s colour the write check admits',
    (theme) => {
      const { page, card } = surfaces(theme);
      expect([page, card]).toContain(CHIP_GROUNDS[theme]);
      expect(contrastRatio(NINTH[theme], CHIP_GROUNDS[theme])).toBeGreaterThanOrEqual(4.5);

      expect(contrastRatio(NINTH[theme], page)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(NINTH[theme], card)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
