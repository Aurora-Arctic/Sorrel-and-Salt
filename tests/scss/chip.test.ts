import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// `chip()` draws its group's colour pair, read inline from the row, rather than
// a build-time token per slug: an admin's ninth group has no token, and its
// chip must still look like the other eight (MB.36). The theme picks one of
// the pair through `light-dark()`, off the `color-scheme` the theme mixins set
// — claude-docs/styling.md, "Chips, badges and the solid-fill rule".

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

function chip(args: string): Record<string, string> {
  return declarations(
    compile(`@use 'mixins' as m; .probe { @include m.chip(${args}); }`),
    '.probe',
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

describe('MB.36: chip() takes a colour pair, not a slug', () => {
  it('lets the theme pick the dark or the light colour of the pair it is given', () => {
    const drawn = chip(`${NINTH.dark}, ${NINTH.light}`);
    const picked = `light-dark(${NINTH.light}, ${NINTH.dark})`;

    expect(drawn.border).toBe(`1px solid ${picked}`);
    expect(drawn.color).toBe(picked);
    expect(drawn['background-color']).toBe('transparent');
  });

  it('reads the pair from the element by default, where the row puts it', () => {
    expect(chip('').color).toBe('light-dark(var(--chip-light), var(--chip-dark))');
  });

  it('refuses a slug, so the old call fails to compile rather than drawing nothing', () => {
    expect(() => chip(`'protection'`)).toThrow(/colour pair/);
  });

  it('refuses a state it does not know', () => {
    expect(() => chip(`$state: loud`)).toThrow(/Unknown chip state "loud"/);
  });
});

describe('MB.36: both states keep what M0.8 tuned', () => {
  const unselected = chip(`${NINTH.dark}, ${NINTH.light}`);
  const selected = chip(`${NINTH.dark}, ${NINTH.light}, selected`);

  it('keeps one 1px edge and one padding across the two states', () => {
    expect(selected.border).toBe(unselected.border);
    expect(selected.border).toMatch(/^1px solid /);
    expect(selected.padding).toBe(unselected.padding);
  });

  it('fills the selected chip solid and inverts its label onto the page surface', () => {
    expect(selected['background-color']).toBe(`light-dark(${NINTH.light}, ${NINTH.dark})`);
    expect(selected.color).toBe('var(--surface-page)');
  });

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

  // Why the dark check is the card's: a dark colour clearing the dark page can
  // still read under the floor on a card, which is lighter.
  it('would admit a dark colour that fails on the card, were it checked against the page', () => {
    const { page, card } = surfaces('dark');
    const marginal = '#53858a';

    expect(CHECKED.dark).toBe(card);
    expect(contrastRatio(marginal, page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(marginal, card)).toBeLessThan(4.5);
  });
});

describe('MB.36: the class layer draws one chip for every group', () => {
  const css = compile(`@use 'primitives' as p; .frame { @include p.primitives-base; }`);

  it('emits .chip and .chip.is-selected, reading the pair from the element', () => {
    expect(declarations(css, '.frame .chip').color).toBe(
      'light-dark(var(--chip-light), var(--chip-dark))',
    );
    expect(declarations(css, '.frame .chip.is-selected').color).toBe('var(--surface-page)');
  });
});
