import { readFileSync } from 'node:fs';
import { compile as compileFile, compileString } from 'sass';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/contrast';
import { fromRoot } from '../support/paths';

// The colours the sign-in, account and admin pages depend on stay legible in both themes (claude-docs/styling.md, "Brand colours"): control marks at 3:1 (WCAG 1.4.11), text and button labels at 4.5:1.
// One assertion per theme, the functional half; how they look is the workshop's and the axe scan's (claude-docs/testing/layer-ownership.md, "What a test may assert", rule 4).

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
 * A compiled colour as the `#rrggbb` a browser paints: Sass writes a mixed token as `rgb()` in fractional percentages, which the screen rounds to 8 bits per channel.
 * A part that differs by theme compiles to `light-dark(light, dark)`, and the theme picks its half.
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
/** The weight a `color-mix()` gives `token`, as a fraction: the mix the contrast rows compute. */
function weightOf(mix: string | undefined, token: string): number {
  const found = new RegExp(`var\\(${token}\\) (\\d+(?:\\.\\d+)?)%`).exec(mix ?? '');
  if (!found) throw new Error(`no ${token} weight in ${mix}`);
  return Number(found[1]) / 100;
}

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

// The recency mark is small bold text in a badge's colour with no ground of its own, so it must
// clear the text floor on the entry page, a card, and a card pointed at (claude-docs/components/entry-marks.md, "Styling").
describe('MB.120: the recency mark clears the text floor on the page, the card and a card pointed at', () => {
  it.each(['dark', 'light'] as const)('in the %s theme', (theme) => {
    const tokens = surfaces(theme);
    const css = compileFile(fromRoot('src/components/EntryMarks/index.scss')).css;
    const ink = (selector: string) => {
      const found = /^var\((--[\w-]+)\)$/.exec(declarations(css, selector).color);
      if (!found) throw new Error(`${selector} is not drawn in a token`);
      return toHex(tokens[found[1]], theme);
    };
    const table = ['.recency-mark', '.recency-mark.recency-mark--updated'].flatMap((selector) =>
      ['--surface-page', '--surface-card', '--surface-card-hover'].map((ground) => ({
        pair: `${selector} on ${ground}`,
        ratio: contrastRatio(ink(selector), toHex(tokens[ground], theme)),
      })),
    );

    expect(table.filter((entry) => entry.ratio < 4.5)).toEqual([]);
  });
});

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
    // Text, so the text floor, not the 3 a control's edge needs. The wax is text too: a destructive button's label and edge, and an error.
    // On the card as well as the page, since a banded row, a stacked card and the banner all sit on it.
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
    // The tab row's pills (TabbedPage/index.scss): the open tab's label on its pill and the pill's accent edge against the track, over the page or a card; the other labels are the muted ink on the track.
    // The edge marks the open tab because the fill alone sits under 3:1 against the track. The track's mix is the stylesheet's own `$segment-track`, read from it.
    const accent = toHex(tokens['--accent'], theme);
    row('--text-primary on the open tab', tokens['--text-primary'], mixed(accent, card, 0.18), 4.5);
    const trackMix =
      /\$segment-track: color-mix\(in srgb, \$text-muted (\d+)%, transparent\);/.exec(
        readFileSync(fromRoot('src/components/TabbedPage/index.scss'), 'utf8'),
      );
    expect(trackMix, 'TabbedPage/index.scss declares $segment-track as a grey mix').not.toBeNull();
    const trackWeight = Number(trackMix![1]) / 100;
    for (const [ground, under] of [
      ['page', page],
      ['card', card],
    ] as const) {
      const track = mixed(toHex(tokens['--text-muted'], theme), under, trackWeight);
      row(`--text-muted on the tab track on the ${ground}`, tokens['--text-muted'], track, 4.5);
      row(`the open tab's edge on the track on the ${ground}`, accent, track, 3);
    }
    // Every Edit pencil (the `icon-button-edit` mixin, _mixins.scss) is a control, so 3:1: the accent on the grounds it sits on (page, card, the modal's form)
    // and on its own tint (20% into the card) while pointed at, focused or open, which is opaque, so the same on either.
    row('an Edit pencil on the page', accent, page, 3);
    row('an Edit pencil on the card', accent, card, 3);
    row('an Edit pencil on its tint', accent, mixed(accent, card, 0.2), 3);

    // The switch (`.switch`, _primitives.scss) is a control, so 3:1 (WCAG 1.4.11): off, its muted edge against the page and card and its thumb on the card; on and hovered on, its filled track against both and its thumb on the fill.
    // Hovered off, the edge takes the body ink, which clears 4.5 above.
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

    // A chip on its wash (the muted ink 18% into the card, Combobox/index.scss): its text, the body ink, at 4.5:1; a linked substitute's accent link mark at the 3:1 a control's mark needs;
    // the linked chip pointed at, its text and mark in the accent's hover at 4.5:1. The accent is held to 3:1 alone, so the text keeps the body ink and its underline until pointed at.
    // `$fill-quiet` (_variables.scss) names this wash once; its weight is read from it.
    const named = declarations(
      compile(`@use 'variables' as v; .probe { --wash: #{v.$fill-quiet}; }`),
      '.probe',
    );
    const wash = mixed(
      toHex(tokens['--text-muted'], theme),
      card,
      weightOf(named['--wash'], '--text-muted'),
    );
    row("a chip's text on its wash", tokens['--text-primary'], wash, 4.5);
    row("a linked chip's mark on its wash", tokens['--accent'], wash, 3);
    row('a linked chip pointed at on its wash', tokens['--accent-hover'], wash, 4.5);

    // A list's highlighted row and a quiet button pointed at: the accent 12% into the card behind a menu or suggestion list, or the field a quiet button fills.
    // Text on it, the body ink and the muted ink of a row's qualifier, holds 4.5:1. `$fill-highlight` and `$fill-highlight-field` name the two mixes once; the weight is read from them.
    const highlight = declarations(
      compile(
        `@use 'variables' as v; .probe { --on-any: #{v.$fill-highlight}; --on-field: #{v.$fill-highlight-field}; }`,
      ),
      '.probe',
    );
    const lit = mixed(accent, card, weightOf(highlight['--on-any'], '--accent'));
    const litField = mixed(accent, card, weightOf(highlight['--on-field'], '--accent'));
    row('a highlighted row’s text', tokens['--text-primary'], lit, 4.5);
    row('a highlighted row’s muted text', tokens['--text-muted'], lit, 4.5);
    row('a quiet button’s label pointed at', tokens['--text-primary'], litField, 4.5);

    // A field's placeholder (`$text-placeholder`, _variables.scss): the muted
    // ink 85% into the card, the field's ground. Text, so 4.5:1, though it is
    // not yet an answer (WCAG 1.4.3).
    const placeholder = mixed(toHex(tokens['--text-muted'], theme), card, 0.85);
    row('the placeholder on the field', placeholder, card, 4.5);

    // The last-edit line (`LastEdit/index.scss`), in `$last-edit-ink`: the placeholder mix in dark,
    // the muted ink in light, where the mix is 4.22:1 on the page.
    const lastEdit = tokens['--last-edit-ink'].startsWith('color-mix')
      ? placeholder
      : toHex(
          tokens['--last-edit-ink'].replace('var(--text-muted)', tokens['--text-muted']),
          theme,
        );
    row('the last-edit line on the card', lastEdit, card, 4.5);
    row('the last-edit line on the page', lastEdit, page, 4.5);

    // A notice (`.notice`, _primitives.scss): a bar down its start edge and a tint of the bar's colour over the page or a card. The bar and the warning's triangle are marks (3:1 against the ground and the tint); the text is 4.5:1 on the tint.
    // Text is the hover shade of the error's and success's own colour, and the body ink in the plain notice, the warning and the caution. The error's triangle is drawn in its text colour, so its text row covers it.
    const tint = parseFloat(tokens['--notice-tint']) / 100;
    const warning = toHex(tokens['--warning'], theme);
    const ink = toHex(tokens['--text-primary'], theme);
    const muted = toHex(tokens['--text-muted'], theme);
    const waxText = toHex(tokens['--secondary-hover'], theme);
    const accentText = toHex(tokens['--accent-hover'], theme);
    const buttonInk = toHex(
      tokens['--notice-button-ink'].replace('var(--accent)', tokens['--accent']),
      theme,
    );
    for (const [ground, under] of [
      ['page', page],
      ['card', card],
    ] as const) {
      row(`the warning's bar on the ${ground}`, warning, under, 3);
      row(
        `the warning's triangle on its tint on the ${ground}`,
        warning,
        mixed(warning, under, tint),
        3,
      );
      row(`the plain notice's bar on the ${ground}`, accent, under, 3);
      row(`the error's bar on the ${ground}`, wax, under, 3);
      row(`the caution's bar on the ${ground}`, muted, under, 3);
      row(
        `the caution's triangle on its tint on the ${ground}`,
        warning,
        mixed(muted, under, tint),
        3,
      );
      row(`a caution's text on its tint on the ${ground}`, ink, mixed(muted, under, tint), 4.5);
      row(`a warning's text on its tint on the ${ground}`, ink, mixed(warning, under, tint), 4.5);
      row(
        `a plain notice's text on its tint on the ${ground}`,
        ink,
        mixed(accent, under, tint),
        4.5,
      );
      row(`an error's text on its tint on the ${ground}`, waxText, mixed(wax, under, tint), 4.5);
      // A button inside a warning or an error: `$notice-button-ink`, not the accent, which is 4.25:1
      // and 4.19:1 on the light tints on the page.
      row(
        `a button in a warning on its tint on the ${ground}`,
        buttonInk,
        mixed(warning, under, tint),
        4.5,
      );
      row(
        `a button in an error on its tint on the ${ground}`,
        buttonInk,
        mixed(wax, under, tint),
        4.5,
      );
      row(
        `a success's text on its tint on the ${ground}`,
        accentText,
        mixed(accent, under, tint),
        4.5,
      );
    }

    // The focus ring marks a control's state, so 3:1 (WCAG 1.4.11); its colour is mixed towards transparent, so what shows is that colour over the ground behind it.
    // The shared ring is in the body ink, against the page, a card, a card pointed at and the three parts of the ingredient card's drawer; a link's ring is the accent at its own per-theme strength. Strengths are read from the compiled mixin and the link's rule.
    const ring = (css: string, selector: string) => {
      const found =
        /color-mix\(in srgb, var\((--[\w-]+)\) (?:var\((--[\w-]+)\)|(\d+(?:\.\d+)?%)), transparent\)/.exec(
          declarations(css, selector).outline ?? '',
        );
      if (!found) throw new Error(`No faded ring in ${selector}`);
      const [, color, strengthToken, strength] = found;
      const weight = strengthToken ? tokens[strengthToken] : strength;
      expect(weight, `${strengthToken} in the ${theme} theme`).toMatch(/^\d+(\.\d+)?%$/);
      return { ink: toHex(tokens[color], theme), weight: parseFloat(weight) / 100 };
    };
    const shared = ring(compile(`@use 'mixins' as m; .probe { @include m.focus-ring; }`), '.probe');
    const link = ring(
      compile(`@use 'typography' as t; .probe { @include t.typography-base; }`),
      '.probe a:focus-visible',
    );
    const grounds = {
      page,
      card,
      'card pointed at': toHex(tokens['--surface-card-hover'], theme),
      "drawer's slot": toHex(tokens['--drawer-slot'], theme),
      "drawer's side": toHex(tokens['--drawer-side'], theme),
      "drawer's back": toHex(tokens['--drawer-back'], theme),
    };
    for (const [ground, under] of Object.entries(grounds)) {
      row(`the focus ring on the ${ground}`, mixed(shared.ink, under, shared.weight), under, 3);
    }
    for (const ground of ['page', 'card', 'card pointed at'] as const) {
      const under = grounds[ground];
      row(`a link's focus ring on the ${ground}`, mixed(link.ink, under, link.weight), under, 3);
    }
    // The tab row's ring, the accent at its own per-theme strength, drawn
    // inside the pill, so on the open pill or on the track behind the others,
    // over the page or a card.
    const tab = ring(
      compileFile(fromRoot('src/components/TabbedPage/index.scss')).css,
      '.tabbed-page__row a:focus-visible',
    );
    const pill = mixed(accent, card, 0.18);
    row("a tab's focus ring on the open pill", mixed(tab.ink, pill, tab.weight), pill, 3);
    for (const [ground, under] of [
      ['page', page],
      ['card', card],
    ] as const) {
      const track = mixed(toHex(tokens['--text-muted'], theme), under, trackWeight);
      row(
        `a tab's focus ring on the track on the ${ground}`,
        mixed(tab.ink, track, tab.weight),
        track,
        3,
      );
    }

    expect(table.filter((entry) => entry.ratio < entry.floor)).toEqual([]);
  });
});
