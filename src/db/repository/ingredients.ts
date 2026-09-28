import { and, asc, desc, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { Membership } from '@/modules/coven';
import { selectFrom } from './select';
import { notSoftDeleted, scopedTo } from './shapes';

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
  const matched = sql`
    select ${candidate.id} from ${ingredients} as ${candidate}
    where ${candidate.name} % ${term} or ${candidate.canonicalName} % ${term}
    union all
    select ${ingredientFolkNames.ingredientId} from ${ingredientFolkNames}
    where ${ingredientFolkNames.name} % ${term} and ${notSoftDeleted(ingredientFolkNames)}`;

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
      or(sql`${ingredients.workspaceId} is null`, scopedTo(membership, ingredients)),
      notSoftDeleted(ingredients),
      sql`${ingredients.id} in (${matched})`,
    ),
    { orderBy: [desc(score), asc(ingredients.name), asc(ingredients.id)], limit },
  );
}
