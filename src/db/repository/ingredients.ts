import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { type PgTable, alias } from 'drizzle-orm/pg-core';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { Membership } from '@/modules/coven';
import { existsIn, selectFrom } from './select';
import {
  type IngredientScoped,
  type Unscoped,
  inCompendium,
  notSoftDeleted,
  scopedTo,
} from './shapes';

/**
 * The rows of `ingredient_folk_names` or `ingredient_categories` belonging to
 * these ingredients — readable exactly when the parent is: live, and in the
 * compendium or in a coven one of `memberships` proves. No proofs reads the
 * compendium alone. Neither table carries a `workspace_id`, so the correlated
 * `EXISTS` over the parent is where the tier comes from, and a caller naming
 * another coven's ingredient gets no rows rather than a filter applied after
 * the fetch (rule 7).
 */
export function findManyOfIngredients<TTable extends PgTable & IngredientScoped & Unscoped>(
  memberships: readonly Membership[],
  table: TTable,
  ingredientIds: readonly string[],
): Promise<TTable['$inferSelect'][]> {
  if (ingredientIds.length === 0) return Promise.resolve([]);
  const readableParent = and(
    eq(ingredients.id, table.ingredientId),
    or(
      inCompendium(ingredients),
      ...memberships.map((membership) => scopedTo(membership, ingredients)),
    ),
  );
  return selectFrom(
    table,
    and(
      notSoftDeleted(table),
      inArray(table.ingredientId, [...ingredientIds]),
      existsIn(ingredients, readableParent),
    ),
  );
}

/**
 * The live ingredients, in the compendium or the proof's workspace, whose
 * display name, formal name or a live folk name is trigram-similar to `term`
 * — best match first, at most `limit`. Reads both tiers in one statement.
 *
 * The three matches are a `UNION ALL` under `id IN (…)`, not an `OR` beside
 * the scope: Postgres cannot turn a subquery inside an `OR` into a join, so
 * that form walks `ingredients` whole, and `UNION`'s de-duplication (which
 * `IN` already does) walks `ingredients_pkey` whole (claude-docs/db.md,
 * "Fuzzy matching").
 */
export function findSimilarIngredients(
  membership: Membership,
  term: string,
  limit: number,
): Promise<(typeof ingredients.$inferSelect)[]> {
  const candidate = alias(ingredients, 'candidate');
  const matched = sql`(
    select ${candidate.id} from ${ingredients} as ${candidate}
    where ${candidate.name} % ${term} or ${candidate.canonicalName} % ${term}
    union all
    select ${ingredientFolkNames.ingredientId} from ${ingredientFolkNames}
    where ${ingredientFolkNames.name} % ${term} and ${notSoftDeleted(ingredientFolkNames)})`;

  // `greatest` skips nulls, so an entry with no formal name or no folk names
  // ranks on what it has.
  const score = sql`greatest(
    similarity(${ingredients.name}, ${term}),
    similarity(${ingredients.canonicalName}, ${term}),
    (select max(similarity(${ingredientFolkNames.name}, ${term})) from ${ingredientFolkNames}
     where ${ingredientFolkNames.ingredientId} = ${ingredients.id}
       and ${notSoftDeleted(ingredientFolkNames)})
  )`;

  return selectFrom(
    ingredients,
    and(
      or(inCompendium(ingredients), scopedTo(membership, ingredients)),
      notSoftDeleted(ingredients),
      inArray(ingredients.id, matched),
    ),
    { orderBy: [desc(score), asc(ingredients.name), asc(ingredients.id)], limit },
  );
}
