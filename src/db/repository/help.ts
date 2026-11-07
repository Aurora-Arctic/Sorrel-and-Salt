import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { helpArticles, helpAudience } from '../../modules/help/schema/help-articles';
type HelpAudience = (typeof helpAudience.enumValues)[number];
type HelpReach = HelpAudience;
import type { PageEntry, PageRequest } from '../../lib/types';
import { findPage } from './finders';
import { foldedWordMatch, notSoftDeleted } from './predicates';
import { selectFrom, selectOne } from './select';
import type { ListOrder, SortPart } from './types';

export type HelpArticleRow = typeof helpArticles.$inferSelect;

// The audiences a reader of each reach is admitted to. Help is the one table whose rows are scoped by audience, not by workspace.
const ADMITTED: Record<HelpReach, HelpAudience[]> = {
  public: ['public'],
  staff: ['public', 'staff'],
  keeper: ['public', 'staff', 'keeper'],
};

const admits = (reach: HelpReach, column: AnyPgColumn = helpArticles.audience): SQL =>
  inArray(column, ADMITTED[reach]);

// A null position sorts last: the largest `integer`, since a null sort part drops the row from every page.
const LAST = 2147483647;
const BY_POSITION: readonly SortPart[] = [
  {
    expression: sql`coalesce(${helpArticles.position}, ${sql.raw(String(LAST))})`,
    type: 'integer',
  },
  helpArticles.title,
];
const A_TO_Z: readonly SortPart[] = [
  { expression: sql`lower(${helpArticles.title})`, type: 'text' },
];

/** One page of the public FAQ entries, in position order. */
export function findHelpFaqPage(page: PageRequest): Promise<PageEntry<HelpArticleRow>[]> {
  return findPage(
    helpArticles,
    BY_POSITION,
    page,
    and(eq(helpArticles.kind, 'faq'), admits('public')),
  );
}

/** One page of the public top-level articles, in position order. */
export function findHelpArticleIndexPage(page: PageRequest): Promise<PageEntry<HelpArticleRow>[]> {
  return findPage(
    helpArticles,
    BY_POSITION,
    page,
    and(eq(helpArticles.kind, 'article'), isNull(helpArticles.parentId), admits('public')),
  );
}

/** One page of the public glossary terms, A to Z. */
export function findHelpGlossaryPage(page: PageRequest): Promise<PageEntry<HelpArticleRow>[]> {
  return findPage(helpArticles, A_TO_Z, page, and(eq(helpArticles.kind, 'term'), admits('public')));
}

/** One page of every kind of live row `reach` admits, A to Z: the staff list. */
export function findHelpArticleStaffPage(
  reach: HelpReach,
  page: PageRequest,
): Promise<PageEntry<HelpArticleRow>[]> {
  return findPage(helpArticles, A_TO_Z, page, admits(reach));
}

/** The live row under `slug` among the audiences `reach` admits, or `undefined`. */
export function findHelpArticleBySlug(
  slug: string,
  reach: HelpReach,
): Promise<HelpArticleRow | undefined> {
  return selectOne(
    helpArticles,
    and(notSoftDeleted(helpArticles), eq(helpArticles.slug, slug), admits(reach)),
  );
}

/** The live children of these parents among the audiences `reach` admits, in position order. */
export async function findHelpArticleChildren(
  reach: HelpReach,
  parentIds: readonly string[],
): Promise<HelpArticleRow[]> {
  if (parentIds.length === 0) return [];
  const rows = await selectFrom(
    helpArticles,
    and(
      notSoftDeleted(helpArticles),
      inArray(helpArticles.parentId, [...parentIds]),
      admits(reach),
    ),
  );
  const rank = (row: HelpArticleRow) => row.position ?? LAST;
  return rows.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

/** Every live child of one parent, whatever its audience: how a write checks the structure rules. */
export function findAllHelpArticleChildren(parentId: string): Promise<HelpArticleRow[]> {
  return selectFrom(
    helpArticles,
    and(notSoftDeleted(helpArticles), eq(helpArticles.parentId, parentId)),
  );
}

/** The live row holding `slug`, whatever its audience, or `undefined`: how a write finds a duplicate. */
export function findHelpArticleHoldingSlug(slug: string): Promise<HelpArticleRow | undefined> {
  return selectOne(helpArticles, and(notSoftDeleted(helpArticles), eq(helpArticles.slug, slug)));
}

export interface HelpScore {
  score: number;
}

/**
 * One page of the live rows `reach` admits that `query` finds, best first, each carrying its score. A full-text match
 * (`websearch_to_tsquery`, ranked by `ts_rank` over the weighted `search_vector`) answers when any row matches; when none
 * does, a word-similarity match on the title answers instead, so a typo still finds its page. Both arms hold the same audience scope.
 */
export function findHelpArticleSearchPage(
  reach: HelpReach,
  query: string,
  page: PageRequest,
): Promise<PageEntry<HelpArticleRow, HelpScore>[]> {
  const tsquery = sql`websearch_to_tsquery('english', ${query})`;
  const fullText = sql`${helpArticles.searchVector} @@ ${tsquery}`;
  const other = alias(helpArticles, 'full_text_match');
  const anyFullText = sql`exists (select 1 from ${helpArticles} as ${other}
    where ${isNull(other.deletedAt)} and ${admits(reach, other.audience)}
      and ${other.searchVector} @@ ${tsquery})`;
  const word = foldedWordMatch(query);

  const score = sql<number>`case when ${fullText} then ts_rank(${helpArticles.searchVector}, ${tsquery})
    else ${word.similarity(helpArticles.title)} end`;
  const order: ListOrder<HelpScore> = {
    sort: [{ expression: sql`-${score}`, type: 'real' }],
    wordMatch: true,
    carry: { score },
  };
  return findPage(
    helpArticles,
    order,
    page,
    and(
      admits(reach),
      sql`(${fullText} or (not ${anyFullText} and ${word.matches(helpArticles.title)}))`,
    ),
  );
}
