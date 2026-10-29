// Backdrop's two corner photographs as the mail shows them: sorrel top left, salt bottom right,
// each running a little under the text. Sizes are CSS pixels; the PNGs are twice that, built per
// theme by scripts/email-ornaments.ts (claude-docs/email.md, "Design").

export const ORNAMENTS = {
  // Three quarters of the salt's width, as on the site.
  sorrel: { source: 'sorrel-plate', width: 165, height: 124 },
  salt: { source: 'salt-spoon', width: 220, height: 147 },
} as const;

export type Corner = keyof typeof ORNAMENTS;

/** The image's path under public/, which is also its path on the site. */
export function ornamentPath(corner: Corner, theme: 'dark' | 'light'): string {
  return `/email/images/${corner}-${theme}.png`;
}
