import 'server-only';
import type { HelpArticleRow } from '@/db/repository';
import type { HelpArticle } from '../types';

/** The fields the help surface answers; the audit columns and the search vector stay in the table. */
export function toHelpArticle(row: HelpArticleRow): HelpArticle {
  return {
    id: row.id,
    kind: row.kind,
    audience: row.audience,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    body: row.body,
    position: row.position,
    parentId: row.parentId,
  };
}
