import type { GroupColorColumn } from './types';

// WCAG 2.1 contrast, for the floor a category group's colours are held to on
// write (M5.6b): each against the harder of its own theme's two surfaces, the
// dark card and the light page, since an unselected chip's label is the colour
// itself on whatever holds it and clearing the harder surface clears the
// other (MB.36; claude-docs/styling.md, "Chips, badges and the solid-fill
// rule"). Shared by the schema, so the form refuses before the request, and
// the picker's preview, so the admin sees the ratio while choosing.

/**
 * The surface each colour is checked against: `$soot-raised` and
 * `$parchment`, written out because nothing at runtime can import a Sass
 * value; tests/lib/contrast.test.ts pins both to _variables.scss.
 */
export const CHIP_GROUNDS: Record<'dark' | 'light', string> = {
  dark: '#1f1c16',
  light: '#efe9da',
};

/** WCAG's AA floor for normal text, which a chip's label is. */
export const MIN_CHIP_CONTRAST = 4.5;

/** A `#rrggbb` hex's relative luminance, 0 for black to 1 for white. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio between two `#rrggbb` hexes, 1 to 21, whichever is lighter. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** A group colour's ratio against its own theme's harder surface. */
export function chipContrast(column: GroupColorColumn, hex: string): number {
  return contrastRatio(hex, CHIP_GROUNDS[column === 'colorDark' ? 'dark' : 'light']);
}

/**
 * A ratio as the admin reads it, cut to two places rather than rounded, so a
 * refused 4.499 never reads as the 4.50 it failed to reach.
 */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}
