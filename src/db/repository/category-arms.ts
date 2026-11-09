import { type SQL, and, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { categories } from '../../modules/vocabulary/schema/categories';
import type { deities } from '../../modules/vocabulary/schema/deities';
import { existsIn } from './select';
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
