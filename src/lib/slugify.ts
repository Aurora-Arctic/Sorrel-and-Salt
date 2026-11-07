import baseSlugify from 'slugify';

// `strict` drops underscores, welding `grief_work` into `griefwork`; map them to
// a hyphen first. The charmap is global, so this applies once.
baseSlugify.extend({ _: '-' });

/** The only slug rule in the project (CLAUDE.md, Conventions). `strict` drops what it cannot transliterate. */
export function slugify(name: string): string {
  return baseSlugify(name, { lower: true, strict: true, trim: true });
}

/** The label, then the formal name where declared, so entries sharing a label are told apart. A form is no part of the address. */
export function ingredientSlug(name: string, canonicalName: string | null | undefined): string {
  return slugify([name, canonicalName].filter(Boolean).join(' '));
}

/** Name then group, so two forms of one name under two groups hold two addresses. It follows a change to either. */
export function formSlug(name: string, groupName: string): string {
  return slugify(`${name} ${groupName}`);
}

/** Name then tradition, as a form's is. It follows a change to either. */
export function deitySlug(name: string, traditionName: string): string {
  return slugify(`${name} ${traditionName}`);
}
