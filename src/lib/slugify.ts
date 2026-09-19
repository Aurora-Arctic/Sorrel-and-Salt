import baseSlugify from 'slugify';

// `strict` drops underscores entirely, welding `grief_work` into `griefwork`;
// mapping to a hyphen first is what every other separator already does. The
// package's charmap is global, so the extension applies once, here.
baseSlugify.extend({ _: '-' });

/**
 * Turns a display name into the slug stored beside it — the only slug rule in
 * the project (CLAUDE.md, Conventions).
 *
 * `&` becomes "and", which is why DESIGN.md §6's group slugs read `-and-`.
 * `strict` removes what the charmap cannot transliterate rather than passing it
 * through: `Cat's Claw` → `cats-claw`, `Legal Matters (Civil)` →
 * `legal-matters-civil`.
 *
 * Returns `''` for a name with nothing slugifiable in it — `'&&&'` is `and`,
 * but `'...'` is empty. That is the caller's to handle.
 */
export function slugify(name: string): string {
  return baseSlugify(name, { lower: true, strict: true, trim: true });
}
