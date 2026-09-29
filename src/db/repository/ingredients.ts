import { and, asc, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { type AnyPgColumn, type PgTable, alias } from 'drizzle-orm/pg-core';
import { ingredientCategories } from '../../modules/ingredients/schema/ingredient-categories';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { Membership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/pagination';
import { existsIn, pageBounds, selectFrom } from './select';
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

/** What a list of ingredients is narrowed by. Each part is optional, and absent means no filter. */
export interface IngredientFilter {
  /** Word-similar (`<%`, at 0.5) to the label, the formal name or a live folk name, case- and accent-folded. */
  search?: string;
  /** Every one of these, not any: an entry must carry each id listed. */
  categoryIds?: readonly string[];
  /** The form, folded as `canonical_key` folds it. */
  form?: string;
}

/**
 * One page of the compendium in `(name, id)` order, under `filter` — the
 * public list, so no proof (claude-docs/db.md, "The compendium read").
 */
export function findCompendiumPage(
  filter: IngredientFilter,
  page: PageRequest,
): Promise<PageEntry<typeof ingredients.$inferSelect>[]> {
  const search = searchArm(filter.search);
  const keyset = {
    sort: ingredients.name,
    id: ingredients.id,
    request: page,
    wordMatch: search !== undefined,
  };
  return selectFrom(
    ingredients,
    and(
      inCompendium(ingredients),
      notSoftDeleted(ingredients),
      search,
      ...categoryArms(filter.categoryIds ?? []),
      formArm(filter.form),
      pageBounds(keyset),
    ),
    keyset,
  );
}

/**
 * One live ingredient by id, in the compendium or in a coven one of
 * `memberships` proves — `undefined` otherwise, which is also the answer for
 * a coven's row asked for without its proof: a caller holding an id it saw
 * elsewhere learns nothing from the difference. No proofs reads the
 * compendium alone, which is how a signed-out request reads it.
 */
export async function findOneIngredient(
  memberships: readonly Membership[],
  id: string,
): Promise<typeof ingredients.$inferSelect | undefined> {
  const [row] = await selectFrom(
    ingredients,
    and(
      or(
        inCompendium(ingredients),
        ...memberships.map((membership) => scopedTo(membership, ingredients)),
      ),
      notSoftDeleted(ingredients),
      eq(ingredients.id, id),
    ),
  );
  return row;
}

/**
 * `id IN (…)` over the three places a name lives: the term word-similar
 * (`<%`) to the label, the formal name or a live folk name, each side folded
 * through `unaccent_immutable` so the expression indexes of migration 0027
 * answer the match. The threshold is the keyset read's (`wordMatch`). A
 * `UNION ALL` under `IN` rather than an `OR` beside the scope, for
 * `findSimilarIngredients`'s reason. Blank means no filter.
 */
function searchArm(search: string | undefined): SQL | undefined {
  const term = search?.trim();
  if (!term) return undefined;
  const folded = sql`unaccent_immutable(${term})`;
  const matches = (text: AnyPgColumn) => sql`${folded} <% unaccent_immutable(${text})`;
  const candidate = alias(ingredients, 'candidate');
  const byName = or(matches(candidate.name), matches(candidate.canonicalName));
  const byFolkName = and(matches(ingredientFolkNames.name), notSoftDeleted(ingredientFolkNames));
  return inArray(
    ingredients.id,
    sql`(
      select ${candidate.id} from ${ingredients} as ${candidate} where ${byName}
      union all
      select ${ingredientFolkNames.ingredientId} from ${ingredientFolkNames} where ${byFolkName})`,
  );
}

/** One correlated `EXISTS` per id, so an entry must carry every one of them. */
function categoryArms(categoryIds: readonly string[]): SQL[] {
  return categoryIds.map((categoryId) =>
    existsIn(
      ingredientCategories,
      and(
        eq(ingredientCategories.ingredientId, ingredients.id),
        eq(ingredientCategories.categoryId, categoryId),
      ),
    ),
  );
}

/** The form compared under the fold `canonical_key` uses, on both sides. Blank means no filter. */
function formArm(form: string | undefined): SQL | undefined {
  if (!form?.trim()) return undefined;
  return eq(sql`lower(btrim(${ingredients.form}))`, sql`lower(btrim(${form}))`);
}
