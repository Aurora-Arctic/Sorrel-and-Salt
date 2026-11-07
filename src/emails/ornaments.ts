// Sizes are CSS pixels; the PNGs are twice that, built per theme by scripts/email-ornaments.ts (claude-docs/email.md, "Design").

export const ORNAMENTS = {
  sorrel: { source: 'sorrel-plate', width: 165, height: 124 },
  salt: { source: 'salt-spoon', width: 220, height: 147 },
} as const;

export type Corner = keyof typeof ORNAMENTS;

export function ornamentPath(corner: Corner, theme: 'dark' | 'light'): string {
  return `/email/images/${corner}-${theme}.png`;
}
