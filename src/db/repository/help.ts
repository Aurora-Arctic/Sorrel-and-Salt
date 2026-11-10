import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  helpArticleKind,
  helpArticles,
  helpAudience,
} from '../../modules/help/schema/help-articles';
type HelpAudience = (typeof helpAudience.enumValues)[number];
type HelpReach = HelpAudience;
type HelpArticleKind = (typeof helpArticleKind.enumValues)[number];
import type { PageEntry, PageRequest } from '../../lib/types';
import type { HelpKeeperFilter } from '@/modules/help';
import { findPage } from './finders';
import { containsText, foldedWordMatch, notSoftDeleted } from './predicates';
import { selectFrom, selectOne, whenIds } from './select';
import type { ListOrder, SortPart } from './types';

export type HelpArticleRow = typeof helpArticles.$inferSelect;

// The audiences a reader of each reach is admitted to. Help is the one table whose rows are scoped by audience, not by workspace.
const ADMITTED: Record<HelpReach, HelpAudience[]> = {
  public: ['public'],
  staff: ['public', 'staff'],
  keeper: ['public', 'staff', 'keeper'],
};

// A guide and an article are both pages under /help/<slug>: one address space, one top-level list.
const PAGE_KINDS: HelpArticleKind[] = ['article', 'guide'];
const isPage = (): SQL => inArray(helpArticles.kind, PAGE_KINDS);

const admits = (reach: HelpReach, column: AnyPgColumn = helpArticles.audience): SQL =>
  inArray(column, ADMITTED[reach]);

// The columns the reader scope reads, so it applies to the table or to an alias of it.
type HelpTable = Record<'audience' | 'shown' | 'parentId', AnyPgColumn>;
const parentRow = alias(helpArticles, 'help_parent');

/**
 * What a reader of `reach` may see of `table`: a row its audience admits that is shown and, for a child, whose live parent is
 * shown too. A hidden parent hides its children without changing their own flags. Every reader finder holds it; the keeper's
 * list and the writes do not, since a keeper edits hidden rows.
 */
const readable = (reach: HelpReach, table: HelpTable = helpArticles): SQL =>
  sql`${admits(reach, table.audience)} and ${table.shown} and (${table.parentId} is null or exists (
    select 1 from ${helpArticles} as ${parentRow}
    where ${parentRow.id} = ${table.parentId} and ${isNull(parentRow.deletedAt)} and ${parentRow.shown}))`;

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

// Position order in memory, a null position last, ties by title: BY_POSITION for the rows already read.
function inPositionOrder(rows: HelpArticleRow[]): HelpArticleRow[] {
  const rank = (row: HelpArticleRow) => row.position ?? LAST;
  return rows.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

// The rows a keeper orders as one list: the top-level guides and articles, or the FAQ entries.
const orderedList = (list: 'guides' | 'faq'): SQL | undefined =>
  list === 'guides' ? and(isPage(), isNull(helpArticles.parentId)) : eq(helpArticles.kind, 'faq');

/** One page of the public FAQ entries, in position order. */
export function findHelpFaqPage(page: PageRequest): Promise<PageEntry<HelpArticleRow>[]> {
  return findPage(
    helpArticles,
    BY_POSITION,
    page,
    and(eq(helpArticles.kind, 'faq'), readable('public')),
  );
}

/** One page of the public top-level pages, guides and articles together, in position order. */
export function findHelpArticleIndexPage(page: PageRequest): Promise<PageEntry<HelpArticleRow>[]> {
  return findPage(
    helpArticles,
    BY_POSITION,
    page,
    and(isPage(), isNull(helpArticles.parentId), readable('public')),
  );
}

/** One page of the public glossary terms, A to Z; with `hidden`, the hidden ones too, as a write checks a body's marks against them. */
export function findHelpGlossaryPage(
  page: PageRequest,
  { hidden = false }: { hidden?: boolean } = {},
): Promise<PageEntry<HelpArticleRow>[]> {
  return findPage(
    helpArticles,
    A_TO_Z,
    page,
    and(eq(helpArticles.kind, 'term'), hidden ? admits('public') : readable('public')),
  );
}

/** One page of every kind of live row a reader of `reach` sees, A to Z: the staff help index. */
export function findHelpArticleStaffPage(
  reach: HelpReach,
  page: PageRequest,
): Promise<PageEntry<HelpArticleRow>[]> {
  return findPage(helpArticles, A_TO_Z, page, readable(reach));
}

/** One page of the live rows of every kind and audience, shown and hidden, that `filter` admits, A to Z or in position order: the keeper's list. */
export function findHelpArticleKeeperPage(
  filter: HelpKeeperFilter,
  page: PageRequest,
): Promise<PageEntry<HelpArticleRow>[]> {
  const listing = filter.listing ?? 'all';
  const query = filter.query?.trim() ?? '';
  return findPage(
    helpArticles,
    filter.order === 'position' ? BY_POSITION : A_TO_Z,
    page,
    and(
      listing === 'all' ? undefined : eq(helpArticles.shown, listing === 'shown'),
      filter.kind ? eq(helpArticles.kind, filter.kind) : undefined,
      filter.kinds ? inArray(helpArticles.kind, [...filter.kinds]) : undefined,
      filter.audience ? eq(helpArticles.audience, filter.audience) : undefined,
      filter.topLevel ? isNull(helpArticles.parentId) : undefined,
      query === ''
        ? undefined
        : or(containsText(helpArticles.title, query), containsText(helpArticles.body, query)),
    ),
  );
}

/** Every live row of any kind, audience or flag whose body contains `text`, in any case, A to Z: what a rename would leave pointing at an old address. */
export async function findHelpArticlesWhoseBodyHolds(text: string): Promise<HelpArticleRow[]> {
  const rows = await selectFrom(
    helpArticles,
    and(notSoftDeleted(helpArticles), containsText(helpArticles.body, text)),
  );
  return rows.sort((a, b) => a.title.localeCompare(b.title));
}

/** The live guide or article under `slug` among the audiences `reach` admits, or `undefined`. */
export function findHelpArticleBySlug(
  slug: string,
  reach: HelpReach,
): Promise<HelpArticleRow | undefined> {
  return selectOne(
    helpArticles,
    and(notSoftDeleted(helpArticles), isPage(), eq(helpArticles.slug, slug), readable(reach)),
  );
}

/** The children a reader of `reach` sees beneath these parents, in position order. */
export async function findHelpArticleChildren(
  reach: HelpReach,
  parentIds: readonly string[],
): Promise<HelpArticleRow[]> {
  const rows = await whenIds(parentIds, () =>
    selectFrom(
      helpArticles,
      and(
        notSoftDeleted(helpArticles),
        inArray(helpArticles.parentId, [...parentIds]),
        readable(reach),
      ),
    ),
  );
  return inPositionOrder(rows);
}

/** The slug of each live row among these ids that `reach` admits, keyed by id: how a child names its parent. */
export async function findHelpArticleSlugsByIds(
  reach: HelpReach,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const rows = await whenIds(ids, () =>
    selectFrom(
      helpArticles,
      and(notSoftDeleted(helpArticles), inArray(helpArticles.id, [...ids]), admits(reach)),
    ),
  );
  return new Map(rows.map((row) => [row.id, row.slug]));
}

/** One page of the public guides and articles of any depth a reader sees, A to Z: what the sitemap lists. */
export function findHelpArticlePathPage(page: PageRequest): Promise<PageEntry<HelpArticleRow>[]> {
  return findPage(helpArticles, A_TO_Z, page, and(isPage(), readable('public')));
}

/** Every live child of one parent, whatever its audience or flag, in position order: how a write checks the structure rules and a keeper edits. */
export async function findAllHelpArticleChildren(parentId: string): Promise<HelpArticleRow[]> {
  const rows = await selectFrom(
    helpArticles,
    and(notSoftDeleted(helpArticles), eq(helpArticles.parentId, parentId)),
  );
  return inPositionOrder(rows);
}

/** The highest position among the live rows of one ordered list (top-level guides and articles, or FAQ entries), shown or hidden, or 0 when none has one: where a new or released row goes after. */
export async function findLastHelpPosition(list: 'guides' | 'faq'): Promise<number> {
  const rows = await selectFrom(helpArticles, and(notSoftDeleted(helpArticles), orderedList(list)));
  return Math.max(0, ...rows.map((row) => row.position ?? 0));
}

/** Every live row a keeper orders as one list, whatever its audience or flag, in position order: the top-level guides, or the FAQ entries. */
export async function findAllHelpOrdered(list: 'guides' | 'faq'): Promise<HelpArticleRow[]> {
  const rows = await selectFrom(helpArticles, and(notSoftDeleted(helpArticles), orderedList(list)));
  return inPositionOrder(rows);
}

/** The live row of `kind` holding `slug`, whatever its audience, or `undefined`: how a write finds a duplicate. A guide and an article share one address space. */
export function findHelpArticleHoldingSlug(
  kind: HelpArticleKind,
  slug: string,
): Promise<HelpArticleRow | undefined> {
  return selectOne(
    helpArticles,
    and(
      notSoftDeleted(helpArticles),
      PAGE_KINDS.includes(kind) ? isPage() : eq(helpArticles.kind, kind),
      eq(helpArticles.slug, slug),
    ),
  );
}

export interface HelpScore {
  score: number;
}

// The share of a question's words a row's body alone must hold to be kept: a third keeps a row among three words and drops it among four.
const MIN_COVERAGE = 0.3;

// The most plain words of a question the search reads; the rest add cost and no meaning.
const MOST_WORDS = 20;

/**
 * A question split into the words that find a row by any one of them, and the quoted phrases and `-word` exclusions, which
 * keep `websearch_to_tsquery`'s meaning and must all hold.
 */
function readQuestion(query: string): { words: string[]; strict: string } {
  const words = new Set<string>();
  const strict: string[] = [];
  for (const token of query.match(/-?"[^"]*"?|\S+/g) ?? []) {
    if (token.startsWith('"') || token.startsWith('-"') || /^-\p{L}/u.test(token))
      strict.push(token);
    else words.add(token.replace(/"/g, ''));
  }
  return { words: [...words].filter(Boolean).slice(0, MOST_WORDS), strict: strict.join(' ') };
}

/**
 * How a question matches the rows holding `vector`, a `search_vector` column of the table or of an alias of it: `pass` keeps a row, and `score` orders the kept ones.
 * A row matches when its `search_vector` holds any word of the question and every phrase. It is kept when it holds every word,
 * or a third of them, or any word in its title, summary or search terms; a word in a body alone, among many words, is too weak.
 * The score puts the rows holding every word first, then those holding more of the words, then `ts_rank_cd`.
 */
function questionMatch(vector: AnyPgColumn, query: string): { pass: SQL; score: SQL<number> } {
  const { words, strict } = readQuestion(query);
  const perWord = words.map((word) => sql`plainto_tsquery('english', ${word})`);
  const phrases = strict === '' ? undefined : sql`websearch_to_tsquery('english', ${strict})`;
  const anyWord = perWord.length > 0 ? sql`(${sql.join(perWord, sql` || `)})` : undefined;
  const tsquery =
    anyWord && phrases ? sql`(${anyWord} && ${phrases})` : (anyWord ?? phrases ?? sql`''::tsquery`);

  const sum = (parts: SQL[]): SQL =>
    parts.length > 0 ? sql`(${sql.join(parts, sql` + `)})` : sql`0`;
  const held = sum(perWord.map((word) => sql`(${vector} @@ ${word})::int`));
  const asked = sum(perWord.map((word) => sql`(numnode(${word}) > 0)::int`));
  const coverage = sql`(${held})::real / greatest(${asked}, 1)`;
  const holdsAll = sql`${held} >= ${asked}`;

  return {
    pass: sql`(${vector} @@ ${tsquery} and (${holdsAll} or ${coverage} >= ${MIN_COVERAGE}
      or ts_filter(${vector}, '{a,b}') @@ ${tsquery}))`,
    score: sql<number>`(case when ${holdsAll} then 2 else 0 end + ${coverage}
      + ts_rank_cd(${vector}, ${tsquery}, 32))::real`,
  };
}

/**
 * One page of the live rows `reach` admits that `query` finds, best first, each carrying its score. A full-text match
 * (any word of the question over the weighted `search_vector`; see {@link questionMatch}) answers when any row passes; when none
 * does, a word-similarity match on the title answers instead, so a typo still finds its page. Both arms hold the same reader scope,
 * so a hidden row's words neither answer nor stop the fallback.
 */
export function findHelpArticleSearchPage(
  reach: HelpReach,
  query: string,
  page: PageRequest,
): Promise<PageEntry<HelpArticleRow, HelpScore>[]> {
  const found = questionMatch(helpArticles.searchVector, query);
  const other = alias(helpArticles, 'full_text_match');
  const anyFullText = sql`exists (select 1 from ${helpArticles} as ${other}
    where ${isNull(other.deletedAt)} and ${readable(reach, other)}
      and ${questionMatch(other.searchVector, query).pass})`;
  const word = foldedWordMatch(query);

  const score = sql<number>`case when ${found.pass} then ${found.score}
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
      readable(reach),
      sql`(${found.pass} or (not ${anyFullText} and ${word.matches(helpArticles.title)}))`,
    ),
  );
}
