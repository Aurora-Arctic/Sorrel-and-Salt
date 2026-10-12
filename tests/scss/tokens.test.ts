import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/contrast';
import { fromRoot } from '../support/paths';

// The colours the sign-in and account pages depend on stay legible on the
// page, in both themes (MB.116; claude-docs/styling.md, "Brand colours"): what
// marks out a control at 3:1 (WCAG 1.4.11), and a button's label on its
// ground at 4.5:1. The admin area's text and wax hold on the card surface
// too (MB.115), the ground of a banded row, a stacked table's card and the
// impersonation banner, the tab row's open tab holds on its track, and the
// switch's track and thumb hold in either state, and a chip's text and a
// linked chip's mark hold on the chip's wash. One assertion per theme,
// the functional half of the tokens; how they look is the workshop's and the
// axe scan's (claude-docs/testing/layer-ownership.md, "What a test may assert", rule 4).

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

/** `color-mix(in srgb, a weight, b)` for two hexes, each channel rounded to a byte as the browser does. */
function mixed(a: string, b: string, weight: number): string {
  const channels = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const [from, to] = [channels(a), channels(b)];
  return `#${from
    .map((channel, i) => Math.round(channel * weight + to[i] * (1 - weight)))
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

describe('MB.116, MB.115: the brand and text colours clear their floors on the page and the card', () => {
  it.each(['dark', 'light'] as const)('in the %s theme', (theme) => {
    const tokens = surfaces(theme);
    const page = toHex(tokens['--surface-page'], theme);
    const card = toHex(tokens['--surface-card'], theme);
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
    // The wax is text too: a destructive button's label and edge, and an error.
    // On the card as well as the page, since a banded row, a stacked card
    // and the banner all sit on it, with small buttons and muted facts in them.
    for (const token of ['--text-muted', '--text-primary', '--accent', '--secondary']) {
      row(`${token} on the page`, tokens[token], page, 4.5);
      row(`${token} on the card`, tokens[token], card, 4.5);
    }
    // The banner's heavy foot rule, a line rather than text, against the page
    // beneath it.
    row('the banner rule on the page', tokens['--secondary'], page, 3);
    // The user list's Impersonate column: wax text on a wax tint, 6% over the
    // page and 5% over a banded row's card (UserList/index.scss).
    const wax = toHex(tokens['--secondary'], theme);
    row('--secondary on the Impersonate tint on the page', wax, mixed(wax, page, 0.06), 4.5);
    row('--secondary on the Impersonate tint on the card', wax, mixed(wax, card, 0.05), 4.5);
    // The tab row's segmented control (TabbedPage/index.scss): the open
    // tab's label on its pill, the accent 18% into the card, and the pill's
    // accent edge against the card track, the line that marks which tab is
    // open, since the fill alone sits under 3:1 against the track. The other
    // labels are the muted ink on the card, above.
    const accent = toHex(tokens['--accent'], theme);
    row('--text-primary on the open tab', tokens['--text-primary'], mixed(accent, card, 0.18), 4.5);
    row("the open tab's edge on the card", accent, card, 3);
    // Every Edit pencil (the `icon-button-edit` mixin, _mixins.scss), a
    // control, so 3:1: the accent on the grounds it sits on — a list's
    // unbanded row on the page; a banded row, a stacked card and the modal's
    // form on the card — and on its own tint, 20% into the card, while
    // pointed at, focused or open, which is opaque, so the same on either.
    row('an Edit pencil on the page', accent, page, 3);
    row('an Edit pencil on the card', accent, card, 3);
    row('an Edit pencil on its tint', accent, mixed(accent, card, 0.2), 3);

    // The switch (`.switch`, _primitives.scss), a control, so 3:1 (WCAG
    // 1.4.11): off, its muted edge against the page and the card it may sit
    // on, and its muted thumb on its card ground; on, and hovered on, its
    // filled track against both, and its thumb, the page's colour, on the
    // fill. Hovered off, the edge takes the body ink, which clears 4.5 above.
    for (const [state, fill] of [
      ['on', tokens['--accent']],
      ['hovered on', tokens['--accent-solid-hover']],
    ] as const) {
      row(`the switch's track ${state} on the page`, fill, page, 3);
      row(`the switch's track ${state} on the card`, fill, card, 3);
      row(`the switch's thumb ${state} on its track`, page, fill, 3);
    }
    row("the switch's edge off on the page", tokens['--text-muted'], page, 3);
    row("the switch's edge off on the card", tokens['--text-muted'], card, 3);
    row("the switch's thumb off on its track", tokens['--text-muted'], card, 3);

    // A chip on its wash, the muted ink 18% into the card (Combobox/index.scss):
    // its text, the body ink, at 4.5:1; a linked substitute's link mark
    // (MB.115), a glyph in the accent, at the 3:1 a control's mark needs;
    // and the linked chip pointed at, its text and mark in the accent's
    // hover, at 4.5:1. The accent itself is held to 3:1 alone, so the text
    // keeps the body ink and its underline until pointed at.
    // `$fill-quiet` (_variables.scss) names this wash once, so it must be the 18% mix.
    const named = declarations(
      compile(
        `@use 'variables' as v; .probe { --wash: #{v.$fill-quiet}; --edge: #{v.$hairline}; }`,
      ),
      '.probe',
    );
    expect(named['--wash']).toContain('var(--text-muted) 18%, var(--surface-card)');
    expect(named['--edge']).toContain('var(--text-muted) 45%, transparent');
    const wash = mixed(toHex(tokens['--text-muted'], theme), card, 0.18);
    row("a chip's text on its wash", tokens['--text-primary'], wash, 4.5);
    row("a linked chip's mark on its wash", tokens['--accent'], wash, 3);
    row('a linked chip pointed at on its wash', tokens['--accent-hover'], wash, 4.5);

    // A field's placeholder (`$text-placeholder`, _variables.scss): the muted
    // ink 85% into the card, the field's ground. Text, so 4.5:1, though it is
    // not yet an answer (WCAG 1.4.3).
    const placeholder = mixed(toHex(tokens['--text-muted'], theme), card, 0.85);
    row('the placeholder on the field', placeholder, card, 4.5);

    expect(table.filter((entry) => entry.ratio < entry.floor)).toEqual([]);
  });
});
