import { NotFound } from './errors';
import { linkTo } from './help-pages';
import type { HelpAddressed } from './help-paths';
import { slugify } from './slugify';

/** The articles the help front page links beside its search box, by their shipped titles, which its skeleton draws; each is read at its slug, and the finder answers the title and address shown. */
export const HELP_QUICK_LINKS: readonly string[] = [
  'Accept an Invitation',
  'Steward, Practitioner and Observer',
  'Track Stock',
  'Build a Spell',
  'I Cannot Sign In',
];

type QuickLinkRow = HelpAddressed & { title: string; summary: string | null };

/** The link to each title's slug the reader answers as a public article, in order; a slug it no longer holds drops out. */
export async function quickLinks(
  titles: readonly string[],
  read: (slug: string) => Promise<QuickLinkRow>,
) {
  const rows = await Promise.all(
    titles.map((title) =>
      read(slugify(title)).catch((error: unknown) => {
        if (error instanceof NotFound) return null;
        throw error;
      }),
    ),
  );
  return rows
    .filter((row): row is QuickLinkRow => row?.kind === 'article' && row.audience === 'public')
    .map(linkTo);
}
