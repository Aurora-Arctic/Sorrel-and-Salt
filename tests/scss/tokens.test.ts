import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/contrast';
import { fromRoot } from '../support/paths';

// The colours the sign-in and account pages depend on stay legible on the
// page, in both themes (MB.116; claude-docs/styling.md, "Brand colours"): what
// marks out a control at 3:1 (WCAG 1.4.11), and a button's label on its
// ground at 4.5:1. One assertion per theme, the functional half of the
// tokens; how they look is the workshop's and the axe scan's
// (claude-docs/testing/layer-ownership.md, "What a test may assert", rule 4).

const SCSS_DIR = fromRoot('src/scss');

type Theme = 'dark' | 'light';

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

/** The custom properties a theme mixin sets. */
function surfaces(theme: Theme): Record<string, string> {
  return declarations(
    compile(`@use 'mixins' as m; .probe { @include m.theme-${theme}; }`),
    '.probe',
  );
}

/**
 * A compiled colour as the `#rrggbb` a browser paints: Sass writes a mixed
 * token as `rgb()` in fractional percentages, and the screen rounds each
 * channel to 8 bits. A part that differs by theme compiles to
 * `light-dark(light, dark)`, and the theme picks its half.
 */
function toHex(value: string, theme: Theme): string {
  const split = /^light-dark\((.+),\s*(.+)\)$/.exec(value);
  if (split) return toHex(theme === 'light' ? split[1] : split[2], theme);
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  const rgb = /^rgb\(([^)]+)\)$/.exec(value);
  if (!rgb) throw new Error(`Not a colour: ${value}`);
  return `#${rgb[1]
    .split(/[\s,]+/)
    .map((channel) =>
      Math.round(channel.endsWith('%') ? (parseFloat(channel) / 100) * 255 : parseFloat(channel)),
    )
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Every brand's parts, each read through `brand-color()`, as brand → part → value. */
function brands(): Record<string, Record<string, string>> {
  const parts = declarations(
    compile(`@use 'variables' as v;
      .probe {
        @each $brand, $parts in v.$brand-palettes {
          @each $part, $_ in $parts {
            --#{$brand}--#{$part}: #{v.brand-color($brand, $part)};
          }
        }
      }`),
    '.probe',
  );
  const byBrand: Record<string, Record<string, string>> = {};
  for (const [property, value] of Object.entries(parts)) {
    const [brand, part] = property.slice(2).split('--');
    (byBrand[brand] ??= {})[part] = value;
  }
  return byBrand;
}

describe('MB.116: the brand and text colours clear their floors on the page', () => {
  it.each(['dark', 'light'] as const)('in the %s theme', (theme) => {
    const tokens = surfaces(theme);
    const page = toHex(tokens['--surface-page'], theme);
    const table: { pair: string; ratio: number; floor: number }[] = [];
    const row = (pair: string, a: string, b: string, floor: number) =>
      table.push({ pair, ratio: contrastRatio(toHex(a, theme), toHex(b, theme)), floor });

    // A white button is marked out by its edge; a coloured one by its fill.
    for (const [brand, { fill, ink, hover, edge }] of Object.entries(brands())) {
      row(`${brand} ${edge ? 'edge' : 'fill'} on the page`, edge ?? fill, page, 3);
      row(`${brand} ink on its fill`, ink, fill, 4.5);
      row(`${brand} ink on its hover`, ink, hover, 4.5);
    }
    // Text, so the text floor, not the 3 a control's edge needs.
    for (const token of ['--text-muted', '--text-primary', '--accent']) {
      row(`${token} on the page`, tokens[token], page, 4.5);
    }

    expect(table.filter((entry) => entry.ratio < entry.floor)).toEqual([]);
  });
});
