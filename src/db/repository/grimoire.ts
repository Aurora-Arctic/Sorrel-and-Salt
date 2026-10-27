import { and, eq, inArray, or, type SQL, sql } from 'drizzle-orm';
import { spellCategories } from '../../modules/grimoire/schema/spell-categories';
import { spells } from '../../modules/grimoire/schema/spells';
import { categories } from '../../modules/vocabulary/schema/categories';
import type { Membership } from '@/modules/coven';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { findPageCountInReadableSpells, findPageInReadableSpells } from './finders';
import { pointsLive } from './ingredients';
import { foldedWordMatch } from './predicates';
import { existsIn } from './select';
import type { GrimoireQuery, ListOrder, SortPart } from './types';

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
 * The order a query reads under. A search holds a `<%` word match, which
 * only finds a fragment of a longer word under the search's own threshold,
 * so its read is flagged `wordMatch` and runs in a transaction that sets it
 * (`select.ts`). The order itself stays the one asked for: the search
 * narrows the list rather than ranking it.
 */
function orderOf(query: GrimoireQuery): ListOrder {
  return { sort: GRIMOIRE_ORDER[query.order], wordMatch: Boolean(query.query?.trim()) };
}

/**
 * Title or intent holds the search as a word or part of one, accents and
 * case set aside, as the ingredient search matches a name: `<%` for a near
 * word, and the plain substring for an exact one the trigrams score low.
 * A null title or intent matches nothing.
 */
function searchArm(text: string | undefined): SQL | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  const { matches, contains } = foldedWordMatch(trimmed);
  const fields = [spells.title, spells.intent];
  return or(...fields.flatMap((field) => [matches(field), contains(field)]));
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

/** Everything a query narrows by, ANDed: status, search and categories each filter in SQL (rule 7). */
function whereOf(query: GrimoireQuery): SQL | undefined {
  return and(
    query.status === undefined ? undefined : eq(spells.status, query.status),
    searchArm(query.query),
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
  return findPageInReadableSpells(membership, spells, orderOf(query), page, whereOf(query));
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
  return findPageCountInReadableSpells(membership, spells, orderOf(query), start, whereOf(query));
}
