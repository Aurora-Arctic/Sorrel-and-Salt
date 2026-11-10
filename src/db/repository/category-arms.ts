import { type SQL, and, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { categories } from '../../modules/vocabulary/schema/categories';
import type { deities } from '../../modules/vocabulary/schema/deities';
import { existsIn } from './select';
import type { AggregateJoin } from './types';
import { inLiveGroup } from './vocabularies';

/**
 * The curated row a link's `column` names is live, and so is its group: what the facets' join to the same row reads, so a value the facets count at nothing lists nothing.
 * A curator cannot delete a row a compendium entry links, but a coven's own entry keeps its link through the delete.
 */
export function pointsLive(
  vocabulary: typeof categories | typeof deities,
  column: AnyPgColumn,
): SQL {
  return existsIn(vocabulary, and(eq(vocabulary.id, column), inLiveGroup(vocabulary)));
}

type CategoryLink = {
  table: PgTable;
  owner: AnyPgColumn;
  category: AnyPgColumn;
  /** The id the link's owner column must equal: the outer row's. */
  outer: AnyPgColumn;
  /** A further term every carrying link must meet. */
  also?: SQL | undefined;
};

/**
 * The category filter, shared by the ingredient and spell lists: under `all` one correlated `EXISTS` per id, so a row carries every one; under `any` a single `EXISTS` over the list.
 * Each link's category must be live, through `pointsLive`.
 */
export function categoryArms(
  link: CategoryLink,
  categoryIds: readonly string[],
  mode: 'any' | 'all' = 'all',
): SQL[] {
  if (categoryIds.length === 0) return [];
  const carries = (chosen: SQL) =>
    existsIn(
      link.table,
      and(eq(link.owner, link.outer), chosen, link.also, pointsLive(categories, link.category)),
    );
  return mode === 'any'
    ? [carries(inArray(link.category, [...categoryIds]))]
    : categoryIds.map((categoryId) => carries(eq(link.category, categoryId)));
}

/**
 * The query a category facet counts under: `any` lets the chosen categories go, so each count is a category on its own; `all` keeps them, so each count is the chosen ones and that one together.
 */
export function withoutChosenIfAny<
  Query extends { categoryMode?: 'any' | 'all'; categoryIds?: readonly string[] },
>(query: Query): Query {
  return query.categoryMode === 'any' ? { ...query, categoryIds: undefined } : query;
}

/**
 * The joins a category facet counts through: an alias of the link table (`link.table`) matched to the outer row, and the live categories it names, so the count reads the same
 * rows the list's `categoryArms` do. Group by `categories.id`.
 */
export function categoryFacetJoins(link: CategoryLink): AggregateJoin[] {
  return [
    { type: 'inner', table: link.table, on: and(eq(link.owner, link.outer), link.also) },
    {
      type: 'inner',
      table: categories,
      on: and(eq(categories.id, link.category), inLiveGroup(categories)),
    },
  ];
}
