import type { GroupColorColumn } from './types';

// WCAG 2.1 contrast for the floor a category group's colours are held to on write: each against the harder of its theme's two surfaces, as a chip's label
// is the colour itself (claude-docs/styling.md, "Chips, badges and the solid-fill rule"). Shared by the schema and the picker's preview.

/** Written out because nothing at runtime can import a Sass value; tests/lib/contrast.test.ts pins both to _variables.scss. */
export const CHIP_GROUNDS: Record<'dark' | 'light', string> = {
  dark: '#1f1c16',
  light: '#efe9da',
};

export const MIN_CHIP_CONTRAST = 4.5;

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const channels = (hex: string): number[] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

export function chipContrast(column: GroupColorColumn, hex: string): number {
  return contrastRatio(hex, CHIP_GROUNDS[column === 'colorDark' ? 'dark' : 'light']);
}

/** Cut to two places rather than rounded, so a refused 4.499 never reads as the 4.50 it failed to reach. */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}
