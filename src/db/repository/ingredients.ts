import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { type AnyPgColumn, type PgTable, alias } from 'drizzle-orm/pg-core';
import { ingredientCategories } from '../../modules/ingredients/schema/ingredient-categories';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { canonicalKeyOf, ingredients } from '../../modules/ingredients/schema/ingredients';
import type { Membership } from '@/modules/coven';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { inCompendium, notSoftDeleted, scopedTo } from './predicates';
import { existsIn, pageBounds, selectFrom } from './select';
import type {
  CompendiumScore,
  IngredientFilter,
  IngredientIdentity,
  IngredientScoped,
  Keyset,
  NotSpellScoped,
  SimilarityScore,
  Unscoped,
} from './types';

/**
 * The rows of `ingredient_folk_names` or `ingredient_categories` belonging to
 * these ingredients — readable exactly when the parent is: live, and in the
 * compendium or in a coven one of `memberships` proves. No proofs reads the
 * compendium alone. Neither table carries a `workspace_id`, so the correlated
 * `EXISTS` over the parent is where the tier comes from, and a caller naming
 * another coven's ingredient gets no rows rather than a filter applied after
 * the fetch (rule 7).
 */
export function findManyOfIngredients<
  TTable extends PgTable & IngredientScoped & Unscoped & NotSpellScoped,
>(
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
 * One page of the live ingredients, in the compendium or the proof's
 * workspace, whose display name, formal name or a live folk name is
 * trigram-similar to `name` — best match first, keyed `[-score, name]`, each
 * carrying its score. Reads both tiers in one statement.
 *
 * The three matches are a `UNION ALL` under `id IN (…)`, not an `OR` beside
 * the scope: Postgres cannot turn a subquery inside an `OR` into a join, so
 * that form walks `ingredients` whole, and `UNION`'s de-duplication (which
 * `IN` already does) walks `ingredients_pkey` whole (claude-docs/db/fuzzy-matching.md,
 * "Fuzzy matching").
 */
export function findSimilarIngredients(
  membership: Membership,
  name: string,
  page: PageRequest,
): Promise<PageEntry<typeof ingredients.$inferSelect, SimilarityScore>[]> {
  const candidate = alias(ingredients, 'candidate');
  const matched = sql`(
    select ${candidate.id} from ${ingredients} as ${candidate}
    where ${candidate.name} % ${name} or ${candidate.canonicalName} % ${name}
    union all
    select ${ingredientFolkNames.ingredientId} from ${ingredientFolkNames}
    where ${ingredientFolkNames.name} % ${name} and ${notSoftDeleted(ingredientFolkNames)})`;

  // `greatest` skips nulls, so an entry with no formal name or no folk names
  // ranks on what it has.
  const score = sql<number>`greatest(
    similarity(${ingredients.name}, ${name}),
    similarity(${ingredients.canonicalName}, ${name}),
    (select max(similarity(${ingredientFolkNames.name}, ${name})) from ${ingredientFolkNames}
     where ${ingredientFolkNames.ingredientId} = ${ingredients.id}
       and ${notSoftDeleted(ingredientFolkNames)})
  )`;

  const keyset: Keyset<SimilarityScore> = {
    sort: [{ expression: sql`-${score}`, type: 'real' }, ingredients.name],
    id: ingredients.id,
    similarityMatch: true,
    request: page,
    carry: { score },
  };
  return selectFrom(
    ingredients,
    and(
      or(inCompendium(ingredients), scopedTo(membership, ingredients)),
      notSoftDeleted(ingredients),
      inArray(ingredients.id, matched),
      pageBounds(keyset),
    ),
    keyset,
  );
}

/**
 * One page of the compendium under `filter` — the public list, so no proof
 * (claude-docs/db/compendium-read.md, "The compendium read"). A search pages best match first,
 * `(score DESC, name, id)`, and carries each row's score; a list without one
 * pages `(name, id)` with a null score.
 */
export function findCompendiumPage(
  filter: IngredientFilter,
  page: PageRequest,
): Promise<PageEntry<typeof ingredients.$inferSelect, CompendiumScore>[]> {
  const list = compendiumList(filter);
  const keyset = { ...list.order, request: page };
  return selectFrom(
    ingredients,
    and(inCompendium(ingredients), notSoftDeleted(ingredients), list.arms, pageBounds(keyset)),
    keyset,
  );
}

/**
 * How many rows the compendium holds under `filter`, and how many of them come
 * before `start` in its pages' order — the position of the page whose first
 * row `start` is, null with none. One statement, over the page's own filter,
 * key and search join (claude-docs/db/compendium-read.md, "The compendium read").
 */
export function findCompendiumCount(
  filter: IngredientFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const list = compendiumList(filter);
  const where = and(inCompendium(ingredients), notSoftDeleted(ingredients), list.arms);
  return selectFrom(ingredients, where, { count: list.order, start });
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
 * The live compendium entry keyed as `identity` would be — the row a
 * compendium write carrying it collides with — or `undefined`. The key is the
 * generated column's own expression over the values, so both sides fold alike.
 */
export async function findCompendiumEntryByIdentity(
  identity: IngredientIdentity,
): Promise<typeof ingredients.$inferSelect | undefined> {
  // A parameter's type is otherwise left to `coalesce` and `btrim` to infer.
  const text = (value: string | null | undefined) => sql`${value ?? null}::text`;
  const key = canonicalKeyOf(
    text(identity.name),
    text(identity.canonicalName),
    text(identity.form),
  );
  const [row] = await selectFrom(
    ingredients,
    and(inCompendium(ingredients), notSoftDeleted(ingredients), eq(ingredients.canonicalKey, key)),
  );
  return row;
}

/**
 * What a compendium page and its count share: the filter's arms, and the key
 * with the search's join — built in one place, so the count reads the rows
 * the pages hold in the order they hold them. A search keys `[-score, name]`,
 * negated so one ascending row comparison bounds it; a browse keys `[name]`.
 */
function compendiumList(filter: IngredientFilter): {
  arms: SQL | undefined;
  order: Omit<Keyset<CompendiumScore>, 'request'>;
} {
  const match = searchMatch(filter.query);
  return {
    arms: and(...categoryArms(filter.categoryIds ?? []), formArm(filter.form)),
    order: match
      ? {
          sort: [{ expression: sql`-${match.score}`, type: 'real' }, ingredients.name],
          id: ingredients.id,
          wordMatch: true,
          join: match.join,
          carry: { score: match.score },
        }
      : {
          sort: [ingredients.name],
          id: ingredients.id,
          carry: { score: sql<number | null>`null` },
        },
  };
}

/**
 * The rows matching a search, as a relation to join and each row's score. A
 * row matches when the query is word-similar (`<%`) to its label, its formal
 * name or a live folk name, each side folded through `unaccent_immutable` so
 * the expression indexes of migration 0027 answer the match; the threshold is
 * the keyset read's (`wordMatch`). The three matches are a `UNION ALL`, for
 * `findSimilarIngredients`'s reason, each arm scoring what it matched with
 * `word_similarity` — which the index's recheck has just computed — and the
 * score is the best of them, `max … group by id`. A plain column, so the
 * order and the page bound read it per matched row rather than a correlated
 * folk-name subquery per compendium row (claude-docs/db/compendium-read.md, "The compendium
 * read"). Blank means no search.
 */
function searchMatch(
  query: string | undefined,
): { join: { source: SQL; on: SQL }; score: SQL<number> } | undefined {
  const trimmed = query?.trim();
  if (!trimmed) return undefined;
  const folded = sql`unaccent_immutable(${trimmed})`;
  const matches = (text: AnyPgColumn) => sql`${folded} <% unaccent_immutable(${text})`;
  const similarity = (text: AnyPgColumn) =>
    sql`word_similarity(${folded}, unaccent_immutable(${text}))`;
  const candidate = alias(ingredients, 'candidate');
  const arms = sql.identifier('arms');
  const matched = sql.identifier('matched');
  // `greatest` skips nulls, so an entry with no formal name scores on its label.
  const source = sql`(
    select ${arms}.id, max(${arms}.score) as score from (
      select ${candidate.id},
        greatest(${similarity(candidate.name)}, ${similarity(candidate.canonicalName)}) as score
      from ${ingredients} as ${candidate}
      where ${or(matches(candidate.name), matches(candidate.canonicalName))}
      union all
      select ${ingredientFolkNames.ingredientId}, ${similarity(ingredientFolkNames.name)}
      from ${ingredientFolkNames}
      where ${and(matches(ingredientFolkNames.name), notSoftDeleted(ingredientFolkNames))}
    ) as ${arms}
    group by ${arms}.id) as ${matched}`;
  return {
    join: { source, on: eq(sql`${matched}.id`, ingredients.id) },
    score: sql<number>`${matched}.score`,
  };
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
