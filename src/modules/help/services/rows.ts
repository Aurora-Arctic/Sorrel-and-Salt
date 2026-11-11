import 'server-only';
import { findHelpArticleSlugsByIds } from '@/db/repository';
import type { HelpArticleRow } from '@/db/repository';
import type { HelpArticle, HelpReach } from '../types';

/** Wide enough for every article and glossary term the help centre will hold; the sitemap and the glossary read no more. */
export const HELP_LIST_LIMIT = 2001;

export const NO_HELP_ARTICLE = 'Help article not found';

/** The fields the help surface answers; the audit columns and the search vector stay in the table. */
function toHelpArticle(row: HelpArticleRow, parentSlug: string | null): HelpArticle {
  return {
    id: row.id,
    kind: row.kind,
    audience: row.audience,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    searchTerms: row.searchTerms,
    body: row.body,
    position: row.position,
    parentId: row.parentId,
    shown: row.shown,
    parentSlug,
  };
}

/** Rows as answers, each naming its parent's slug, from one query for all of them. */
export async function toHelpArticles(
  rows: readonly HelpArticleRow[],
  reach: HelpReach,
): Promise<HelpArticle[]> {
  const parentIds = [...new Set(rows.flatMap((row) => (row.parentId ? [row.parentId] : [])))];
  const slugs = await findHelpArticleSlugsByIds(reach, parentIds);
  return rows.map((row) =>
    toHelpArticle(row, row.parentId ? (slugs.get(row.parentId) ?? null) : null),
  );
}
