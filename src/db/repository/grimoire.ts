import { and, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { spellCategories } from '../../modules/grimoire/schema/spell-categories';
import { spells } from '../../modules/grimoire/schema/spells';
import { categories } from '../../modules/vocabulary/schema/categories';
import type { Membership } from '@/modules/coven';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { findPageCountInReadableSpells, findPageInReadableSpells } from './finders';
import { pointsLive } from './ingredients';
import { scopedTo } from './predicates';
import { existsIn } from './select';
import type { GrimoireQuery, ListOrder, SortPart, WeightedSearch } from './types';
import { weightedSearch } from './weighted-search';

// The grimoire list's read (M10.9), with its search and category filter
// (M10.11). In a file of its own rather than in `spells.ts`, because
// `finders.ts` imports `readableSpells` from there and this pages through
// `finders.ts`: the two in one file would import each other.

/** An instant, newest first: a page's key is ascending, so it is negated. */
const newestFirst = (column: typeof spells.updatedAt | typeof spells.createdAt): SortPart => ({
  // `numeric` keeps the microseconds a `Date` would drop from a cursor.
  expression: sql`-extract(epoch from ${column})`,
  type: 'numeric',
});

/**
 * The grimoire's orders, each a cursor key that the page's id follows, so
 * spells tied on every part still page once each. Every part must be NOT
 * NULL, because the cursor compares the key as one row value. A draft may
 * have no title (M13.15), so `TITLE_ASC` sorts on "is it untitled" first —
 * untitled spells last — then on the title with a null read as empty, rather
 * than on the bare column.
 */
const GRIMOIRE_ORDER: Record<GrimoireQuery['order'], readonly SortPart[]> = {
  UPDATED_DESC: [newestFirst(spells.updatedAt)],
  CREATED_DESC: [newestFirst(spells.createdAt)],
  TITLE_ASC: [
    { expression: sql`(${spells.title} is null)`, type: 'boolean' },
    { expression: sql`coalesce(${spells.title}, '')`, type: 'text' },
  ],
};

/**
 * How much a match in each field counts towards a search's rank, as
 * `SEARCH_WEIGHTS` does for an ingredient: a title is what a spell is
 * called, and an intent is a sentence about it, so a title match ranks above
 * an equally close intent match.
 */
const GRIMOIRE_SEARCH_WEIGHTS = { title: 1, intent: 0.5 } as const;

/**
 * Title or intent holds the search as a word or part of one, accents and
 * case set aside, ranked as the ingredient search ranks (`weightedSearch`):
 * one arm per field, over this coven's spells, each scoring its field. A null
 * title or intent matches nothing. Blank means no search.
 */
function searchMatch(membership: Membership, text: string | undefined): WeightedSearch | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  const candidate = alias(spells, 'candidate');
  const from = sql`${spells} as ${candidate}`;
  const live = scopedTo(membership, candidate);
  return weightedSearch(
    trimmed,
    [
      {
        id: candidate.id,
        text: candidate.title,
        weight: GRIMOIRE_SEARCH_WEIGHTS.title,
        from,
        live,
      },
      {
        id: candidate.id,
        text: candidate.intent,
        weight: GRIMOIRE_SEARCH_WEIGHTS.intent,
        from,
        live,
      },
    ],
    spells.id,
  );
}

/**
 * The order a query reads under. Without a search, the one asked for. With
 * one, best match first — `[-rank, position]`, as the ingredient search keys
 * it — and the asked-for order breaks a tie, so a page and its count read the
 * same rows in the same order. A search holds a `<%` word match, which only
 * finds a fragment of a longer word under the search's own threshold, so its
 * read is flagged `wordMatch` and runs in a transaction that sets it
 * (`select.ts`).
 */
function orderOf(query: GrimoireQuery, match: WeightedSearch | undefined): ListOrder {
  if (!match) return { sort: GRIMOIRE_ORDER[query.order] };
  return {
    sort: [
      { expression: sql`-${match.score}`, type: 'real' },
      { expression: match.position, type: 'integer' },
      ...GRIMOIRE_ORDER[query.order],
    ],
    wordMatch: true,
    join: match.join,
  };
}

/**
 * The spell is assigned the chosen categories: each of them for `all`, one
 * of them for `any`. The link table is hard-deleted, but a category is soft
 * deleted, so the category (and its group) must be live, as the ingredient
 * filter asks through `pointsLive`.
 */
function categoryArms({ categoryIds = [], categoryMode = 'all' }: GrimoireQuery): SQL[] {
  if (categoryIds.length === 0) return [];
  const carries = (category: SQL) =>
    existsIn(
      spellCategories,
      and(
        eq(spellCategories.spellId, spells.id),
        category,
        pointsLive(categories, spellCategories.categoryId),
      ),
    );
  return categoryMode === 'any'
    ? [carries(inArray(spellCategories.categoryId, [...categoryIds]))]
    : categoryIds.map((categoryId) => carries(eq(spellCategories.categoryId, categoryId)));
}

/**
 * Everything a query narrows by besides the search, ANDed: status and
 * categories each filter in SQL (rule 7). The search narrows through its
 * join, which holds only the spells that match.
 */
function whereOf(query: GrimoireQuery): SQL | undefined {
  return and(
    query.status === undefined ? undefined : eq(spells.status, query.status),
    ...categoryArms(query),
  );
}

/**
 * One page of the coven's grimoire this member may read — its shared spells
 * and the reader's own private ones — in the asked-for order, through the
 * cursor helper (rule 8), narrowed by the query's status, search and
 * categories.
 */
export function findGrimoirePage(
  membership: Membership,
  page: PageRequest,
  query: GrimoireQuery,
): Promise<PageEntry<typeof spells.$inferSelect>[]> {
  const order = orderOf(query, searchMatch(membership, query.query));
  return findPageInReadableSpells(membership, spells, order, page, whereOf(query));
}

/**
 * How many spells `findGrimoirePage` would list under the same query, and
 * how many sit before `start`: the numbered pager's count, under the same
 * visibility rule, so a private spell never counts for another member.
 */
export function findGrimoireCount(
  membership: Membership,
  query: GrimoireQuery,
  start: Cursor | undefined,
): Promise<PageCount> {
  const order = orderOf(query, searchMatch(membership, query.query));
  return findPageCountInReadableSpells(membership, spells, order, start, whereOf(query));
}
