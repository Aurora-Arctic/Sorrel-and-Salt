import baseSlugify from 'slugify';

// `strict` drops underscores, welding `grief_work` into `griefwork`; map them to
// a hyphen first. The charmap is global, so this applies once.
baseSlugify.extend({ _: '-' });

/**
 * The only slug rule in the project (CLAUDE.md, Conventions). `&` becomes "and"; `strict` drops what it cannot
 * transliterate (`Cat's Claw` → `cats-claw`). Returns `''` for a name with nothing slugifiable (`'...'`).
 */
export function slugify(name: string): string {
  return baseSlugify(name, { lower: true, strict: true, trim: true });
}

/**
 * An ingredient's slug: the label, then the formal name where declared, so entries sharing a label are told apart by their
 * identity (`cats-claw-uncaria-tomentosa`; no formal name, `graveyard-dirt`). A form is no part of the address.
 */
export function ingredientSlug(name: string, canonicalName: string | null | undefined): string {
  return slugify([name, canonicalName].filter(Boolean).join(' '));
}

/**
 * A curated form's slug: its name, then its group's, so two forms of one name under two groups hold two addresses
 * (`wax-substance`, `wax-animal`). It follows a change to either.
 */
export function formSlug(name: string, groupName: string): string {
  return slugify(`${name} ${groupName}`);
}

/**
 * A curated deity's slug: its name, then its tradition's, as a form's is (`hecate-greek`, `hecate-roman`). It follows a
 * change to either.
 */
export function deitySlug(name: string, traditionName: string): string {
  return slugify(`${name} ${traditionName}`);
}
