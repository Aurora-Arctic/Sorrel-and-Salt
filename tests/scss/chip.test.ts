import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// A group colour the write check admits stays legible on every surface its
// theme draws a chip on, in both states (MB.36; claude-docs/styling.md, "Chips,
// badges and the solid-fill rule"). One assertion per theme: the functional half
// of the chip's styling. How the chip looks is its workshop story's, and the
// axe scan's (claude-docs/testing/layer-ownership.md, "What a test may assert").

const SCSS_DIR = fromRoot('src/scss');

// What M5.6b checks each column against: the harder of its theme's two
// surfaces, the dark card and the light page (MB.36).
const CHECKED = { dark: '#1f1c16', light: '#efe9da' } as const;

// An invented pair, nowhere in the seed or the Sass map, that clears 4.5:1
// against what M5.6b checks — what an admin's ninth group might carry.
const NINTH = { dark: '#5f9a9f', light: '#7a3f10' } as const;

function compile(source: string): string {
  return compileString(source, { style: 'expanded', loadPaths: [SCSS_DIR] }).css;
}

/** The declarations of the first rule matching `selector`, as property → value. */
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

// WCAG 2.1 contrast between two hexes.
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('MB.36: a group colour the write check admits is legible on its theme', () => {
  /** The page and card surfaces a theme mixin sets. */
  function surfaces(theme: 'dark' | 'light'): { page: string; card: string } {
    const tokens = declarations(
      compile(`@use 'mixins' as m; .probe { @include m.theme-${theme}; }`),
      '.probe',
    );
    return { page: tokens['--surface-page'], card: tokens['--surface-card'] };
  }

  // An unselected chip's label is the colour on whatever surface holds it; a
  // selected chip's is the page surface on a fill of the colour. The
  // precondition is only what the check promises: the colour clears the
  // surface it was checked against.
  it.each(['dark', 'light'] as const)(
    'clears 4.5:1 on both surfaces, in both states, for any %s colour the write check admits',
    (theme) => {
      const { page, card } = surfaces(theme);
      expect([page, card]).toContain(CHECKED[theme]);
      expect(contrastRatio(NINTH[theme], CHECKED[theme])).toBeGreaterThanOrEqual(4.5);

      expect(contrastRatio(NINTH[theme], page)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(NINTH[theme], card)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
