import type postgres from 'postgres';

type HelpArticleKind = 'faq' | 'article' | 'guide' | 'term';
type HelpAudience = 'public' | 'staff' | 'keeper';

export interface HelpArticleSeed {
  id?: string;
  kind?: HelpArticleKind;
  audience?: HelpAudience;
  title?: string;
  slug?: string;
  summary?: string | null;
  search_terms?: string | null;
  body?: string;
  position?: number | null;
  seed_key?: string | null;
  parent_id?: string | null;
  shown?: boolean;
  deleted_at?: Date | null;
}

const token = () => crypto.randomUUID().slice(0, 8);

/** The row as it would go in; `audience` is left out unless named, so the column default applies. */
export function helpArticleRow(seed: HelpArticleSeed, author: string) {
  const t = token();
  const { deleted_at = null, ...rest } = seed;
  return {
    kind: 'article' as HelpArticleKind,
    title: `Testwort Guide ${t}`,
    slug: `testwort-guide-${t}`,
    summary: null,
    body: 'How the Testwort guide reads.',
    position: null,
    seed_key: null,
    parent_id: null,
    shown: true,
    ...rest,
    deleted_at,
    deleted_by: deleted_at ? author : null,
    created_by: author,
    updated_by: author,
  };
}

export async function insertHelpArticle(
  sql: postgres.Sql,
  seed: HelpArticleSeed,
  author: string,
): Promise<string> {
  const [row] = await sql`
    insert into help_articles ${sql(helpArticleRow(seed, author) as never)}
    returning id`;
  return row.id as string;
}
