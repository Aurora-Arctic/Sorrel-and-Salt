// Backdrop's two corner photographs, as the mail shows them: sorrel at the top
// left of the text and salt at the bottom right, each running a little under
// it. Display sizes in CSS pixels; the PNGs are twice that, for high-density
// screens. Built by scripts/email-ornaments.ts into public/email/images/, one
// per theme, because a mail client cannot blend a transparent grey image into
// the page the way the site does (claude-docs/email.md, "Design").

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
