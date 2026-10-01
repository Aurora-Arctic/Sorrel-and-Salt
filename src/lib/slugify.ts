import baseSlugify from 'slugify';

// `strict` drops underscores, welding `grief_work` into `griefwork`; map them to
// a hyphen first. The charmap is global, so this applies once.
baseSlugify.extend({ _: '-' });

/**
 * The only slug rule in the project (CLAUDE.md, Conventions). `&` becomes
 * "and", which is why §6's group slugs read `-and-`; `strict` drops what it
 * cannot transliterate (`Cat's Claw` → `cats-claw`). Returns `''` for a name
 * with nothing slugifiable — `'&&&'` is `and`, `'...'` is empty.
 */
export function slugify(name: string): string {
  return baseSlugify(name, { lower: true, strict: true, trim: true });
}

/**
 * An ingredient's slug: the label, the form, then the formal name where one is
 * declared, so two entries sharing a label and a form are told apart by the
 * name that is their identity rather than by which was added first
 * (`Cat's Claw` / `bark` / `Uncaria tomentosa` → `cats-claw-bark-uncaria-tomentosa`;
 * no formal name, `graveyard-dirt-earth`).
 */
export function ingredientSlug(
  name: string,
  form: string | null | undefined,
  canonicalName: string | null | undefined,
): string {
  return slugify([name, form, canonicalName].filter(Boolean).join(' '));
}
