/** The one address of a help row, read from its kind, audience and parent's slug (claude-docs/design/help.md, "Addresses"). */
export interface HelpAddressed {
  kind: string;
  audience: string;
  slug: string;
  parentSlug: string | null;
}

export const STAFF_HELP = '/help/staff';

/** The address of a top-level public guide, for a screen that points at one by its slug. */
export const publicGuidePath = (slug: string): string =>
  helpPath({ kind: 'article', audience: 'public', slug, parentSlug: null });

/** A help row's edit page under Keepers › Help. */
export const keeperHelpEditPath = (id: string): string => `/keepers/help/${id}`;

export function helpPath({ kind, audience, slug, parentSlug }: HelpAddressed): string {
  if (kind === 'term') return `/help/glossary#${slug}`;
  const base = audience === 'public' ? '/help' : STAFF_HELP;
  if (kind === 'faq') return `${base}#${slug}`;
  return parentSlug ? `${base}/${parentSlug}/${slug}` : `${base}/${slug}`;
}
