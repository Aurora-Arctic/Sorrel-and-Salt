import { and, eq, inArray, isNotNull, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { spellCategories } from '../../modules/grimoire/schema/spell-categories';
import { spells } from '../../modules/grimoire/schema/spells';
import { categories } from '../../modules/vocabulary/schema/categories';
import type { Membership } from '@/modules/coven';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { findPageCountInReadableSpells, findPageInReadableSpells } from './finders';
import { pointsLive } from './ingredients';
import { notSoftDeleted, scopedTo } from './predicates';
import { existsIn, selectFrom } from './select';
import { readableSpells, visibilityIn, visibilityText } from './spells';
import type {
  FacetCount,
  GrimoireFacetCounts,
  GrimoireQuery,
  ListOrder,
  SortPart,
  WeightedSearch,
} from './types';
import { inLiveGroup } from './vocabularies';
import { weightedSearch } from './weighted-search';

// The grimoire list's read, with its search and category filter.
// In a file of its own rather than in `spells.ts`, because
// `finders.ts` imports `readableSpells` from there and this pages through
// `finders.ts`: the two in one file would import each other.

/** An instant, newest first: a page's key is ascending, so it is negated. */
const newestFirst = (column: typeof spells.updatedAt | typeof spells.createdAt): SortPart => ({
  // `numeric` keeps the microseconds a `Date` would drop from a cursor.
  expression: sql`-extract(epoch from ${column})`,
  type: 'numeric',
});

/**
 * The grimoire's orders, each a cursor key the page's id follows. Every part is NOT NULL, as the cursor compares the key as one
 * row value, so `TITLE_ASC` sorts on "untitled" first (a draft may have no title), then the title read as empty if null.
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
 * How much a match in each field counts towards a search's rank, as `SEARCH_WEIGHTS` does for an ingredient: a title
 * match ranks above an equally close intent match.
 */
const GRIMOIRE_SEARCH_WEIGHTS = { title: 1, intent: 0.5 } as const;

/**
 * Title or intent holds the search as a word or part of one, accents and case set aside, ranked as the ingredient search
 * is (`weightedSearch`): one arm per field over this coven's spells. A null field matches nothing; blank means no search.
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
 * The order a query reads under: the asked-for one, or with a search best match first (`[-rank, position]`) with the
 * asked-for order breaking ties, so a page and its count read the same rows. A search holds a `<%` match, so its read is
 * flagged `wordMatch` and runs under its own threshold (`select.ts`).
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
 * The spell is assigned the chosen categories: all of them for `all`, one for `any`. The link table is hard-deleted but a
 * category is soft-deleted, so the category and its group must be live, as the ingredient filter asks through `pointsLive`.
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

type TextColumn = typeof spells.moonPhase | typeof spells.dayOfWeek;

/** A free-text column as the facets compare it: trimmed, case set aside. */
const folded = (column: TextColumn) => sql<string>`lower(btrim(${column}))`;

/** The spell's text column is any of `values`, compared `folded`; a blank value matches nothing. */
function textArm(column: TextColumn, values: readonly string[] | undefined): SQL[] {
  if (!values || values.length === 0) return [];
  return [
    inArray(
      folded(column),
      values.map((value) => value.trim().toLowerCase()),
    ),
  ];
}

/**
 * Everything a query narrows by besides the search, ANDed in SQL (rule 7); the picks within a facet are alternatives.
 * The search narrows through its join.
 */
function whereOf(query: GrimoireQuery): SQL | undefined {
  return and(
    query.status === undefined ? undefined : eq(spells.status, query.status),
    ...categoryArms(query),
    ...textArm(spells.moonPhase, query.moonPhases),
    ...textArm(spells.dayOfWeek, query.daysOfWeek),
    query.visibilities?.length ? visibilityIn(query.visibilities) : undefined,
    query.makerIds?.length ? inArray(spells.createdBy, [...query.makerIds]) : undefined,
  );
}

/**
 * One page of the coven's grimoire this member may read (shared spells and their own private ones) in the asked-for
 * order, through the cursor helper (rule 8), narrowed by status, search and categories.
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

/**
 * How many spells `findGrimoirePage` lists in each live category, in one grouped read under the same visibility rule, so
 * another member's private spell never counts. Under `all` the chosen categories stay in the query; under `any` they leave
 * it. A category no spell carries is absent, not zero.
 */
export function findGrimoireCategoryCounts(
  membership: Membership,
  query: GrimoireQuery,
): Promise<FacetCount[]> {
  const rest = query.categoryMode === 'any' ? { ...query, categoryIds: undefined } : query;
  const match = searchMatch(membership, rest.query);
  const pair = alias(spellCategories, 'facet_pair');
  return selectFrom(
    spells,
    and(readableSpells(membership), notSoftDeleted(spells), whereOf(rest)),
    {
      aggregate: {
        value: sql<string>`${categories.id}`,
        count: sql<number>`count(distinct ${spells.id})::int`,
      },
      over: { join: match?.join, wordMatch: match !== undefined },
      joins: [
        { type: 'inner', table: pair, on: eq(pair.spellId, spells.id) },
        {
          type: 'inner',
          table: categories,
          on: and(eq(categories.id, pair.categoryId), inLiveGroup(categories)),
        },
      ],
      groupBy: [categories.id],
    },
  );
}

/**
 * The counts behind the four grimoire facets, under the list's visibility rule, so
 * another member's private spell is never counted. Each facet leaves its own picks
 * out of its query; a value no readable spell carries is absent, not zero. (claude-docs/db/write-path.md, "Repository comments in full")
 */
export async function findGrimoireFacetCounts(
  membership: Membership,
  query: GrimoireQuery,
): Promise<GrimoireFacetCounts> {
  const read = (
    drop: keyof GrimoireQuery,
    value: SQL<string>,
    groupBy: SQL,
    present?: SQL,
  ): Promise<FacetCount[]> => {
    const rest: GrimoireQuery = { ...query, [drop]: undefined };
    const match = searchMatch(membership, rest.query);
    return selectFrom(
      spells,
      and(readableSpells(membership), notSoftDeleted(spells), whereOf(rest), present),
      {
        aggregate: { value, count: sql<number>`count(distinct ${spells.id})::int` },
        over: { join: match?.join, wordMatch: match !== undefined },
        groupBy: [groupBy],
      },
    );
  };
  const text = (column: TextColumn) =>
    [
      sql<string>`mode() within group (order by btrim(${column}))`,
      folded(column),
      and(isNotNull(column), sql`btrim(${column}) <> ''`),
    ] as const;
  const [moonPhases, daysOfWeek, visibilities, makers] = await Promise.all([
    read('moonPhases', ...text(spells.moonPhase)),
    read('daysOfWeek', ...text(spells.dayOfWeek)),
    read('visibilities', visibilityText, visibilityText),
    read('makerIds', sql<string>`${spells.createdBy}::text`, sql`${spells.createdBy}`),
  ]);
  return {
    moonPhases,
    daysOfWeek,
    visibilities: visibilities as GrimoireFacetCounts['visibilities'],
    makers,
  };
}
