import { and, eq, inArray, isNull, not, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { type AnyPgColumn, type PgTable, alias } from 'drizzle-orm/pg-core';
import { ingredientCategories } from '../../modules/ingredients/schema/ingredient-categories';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredientSubstitutes } from '../../modules/ingredients/schema/ingredient-substitutes';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { identityKeyOf, ingredients } from '../../modules/ingredients/schema/ingredients';
import { deities } from '../../modules/vocabulary/schema/deities';
import type { Membership } from '@/modules/coven';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { findPageCountInTiers, findPageInTiers } from './finders';
import { readableIngredientParent, readableVariantParent } from './ingredient-parent';
import {
  fold,
  foldedWordMatch,
  inCompendium,
  listFolds,
  notSoftDeleted,
  ownedByIngredient,
  readableInTiers,
  scopedTo,
} from './predicates';
import { cites, citesNothing } from './references';
import { existsIn, selectFrom, selectOne } from './select';
import { curated } from './vocabularies';
import type {
  CompendiumScore,
  IngredientFilter,
  IngredientIdentity,
  IngredientRow,
  IngredientScoped,
  JoinedRow,
  ListOrder,
  NotSpellScoped,
  SimilarityScore,
  Unscoped,
  VariantScoped,
} from './types';

/**
 * The rows of an ingredient's child table — `ingredient_folk_names`,
 * `ingredient_categories`, `ingredient_variants` (MB.218) and the rest —
 * belonging to these ingredients themselves, not to one of their forms
 * (`ownedByIngredient`), readable exactly when the parent is: live, and in the
 * compendium or in a coven one of `memberships` proves. No proofs reads the
 * compendium alone. No such table carries a `workspace_id`, so the correlated
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
  return selectFrom(
    table,
    and(
      notSoftDeleted(table),
      ownedByIngredient(table),
      inArray(table.ingredientId, [...ingredientIds]),
      readableIngredientParent(memberships, table.ingredientId),
    ),
  );
}

/**
 * The live rows these variants own — one form's categories, say — readable
 * exactly when the variant and its ingredient are: the variant live, and its
 * ingredient live and in the compendium or a coven one of `memberships`
 * proves (`readableVariantParent`, MB.218). Never by a bare id: a variant has
 * no `workspace_id`, so its ingredient's tier is the only scope it has.
 */
export function findManyOfVariants<
  TTable extends PgTable & VariantScoped & IngredientScoped & Unscoped & NotSpellScoped,
>(
  memberships: readonly Membership[],
  table: TTable,
  variantIds: readonly string[],
): Promise<TTable['$inferSelect'][]> {
  if (variantIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    table,
    and(
      notSoftDeleted(table),
      inArray(table.variantId, [...variantIds]),
      readableVariantParent(memberships, table.variantId),
    ),
  );
}

/**
 * The live deities of these ingredients (MB.167), each beside the curated
 * deity it links while that deity is curated — live, under a live tradition —
 * and null for a typed name or a deity since retired, which reads as the name
 * the row holds. Not an escape hatch: the retired deity is filtered, as
 * any finder filters it, and the row kept. Readable exactly when the parent
 * is, as `findManyOfIngredients` reads it. Unordered; a caller sorts by
 * `position`.
 */
export function findDeitiesOfIngredients(
  memberships: readonly Membership[],
  ingredientIds: readonly string[],
): Promise<JoinedRow<typeof ingredientDeities.$inferSelect, typeof deities.$inferSelect>[]> {
  if (ingredientIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    ingredientDeities,
    and(
      notSoftDeleted(ingredientDeities),
      inArray(ingredientDeities.ingredientId, [...ingredientIds]),
      readableIngredientParent(memberships, ingredientDeities.ingredientId),
    ),
    {
      leftJoin: deities,
      on: and(eq(deities.id, ingredientDeities.deityId), curated(deities)) as SQL,
    },
  );
}

/**
 * The live substitutes of these ingredients, or of these variants — `of`
 * says which the ids name (MB.218) — each beside the ingredient it links,
 * soft-deleted or not, or null for a typed name. An ingredient's are its own
 * rows, not its forms' (`ownedByIngredient`); a variant's are the rows that
 * form owns. The third escape hatch (MB.138): a link to a deleted ingredient is
 * kept, and reads as that ingredient's last name (claude-docs/db/soft-delete.md,
 * "Soft-delete filtering"). It skips the linked ingredient's filter and no
 * other. The substitute's own tombstone filters; its parent — the ingredient,
 * or the variant and its ingredient — must be live and readable, as
 * `findManyOfIngredients` and `findManyOfVariants` read them; and the link
 * must point where the parent's readers may look — the compendium, or the
 * parent's own coven — so a row written past the service's tier rule shows
 * nothing. One statement for the whole batch: the linked ingredient is a left
 * join, under an alias, since the parent's correlated subquery reads
 * `ingredients` itself.
 */
export function findSubstitutesIncludingSoftDeleted(
  memberships: readonly Membership[],
  of: 'ingredient' | 'variant',
  ids: readonly string[],
): Promise<JoinedRow<typeof ingredientSubstitutes.$inferSelect, IngredientRow>[]> {
  if (ids.length === 0) return Promise.resolve([]);
  const linked = alias(ingredients, 'linked');
  const linkReadable = or(
    isNull(ingredientSubstitutes.substituteId),
    inCompendium(linked),
    eq(linked.workspaceId, ingredients.workspaceId),
  );
  return selectFrom(
    ingredientSubstitutes,
    and(
      notSoftDeleted(ingredientSubstitutes),
      ...(of === 'ingredient'
        ? [
            ownedByIngredient(ingredientSubstitutes),
            inArray(ingredientSubstitutes.ingredientId, [...ids]),
            readableIngredientParent(memberships, ingredientSubstitutes.ingredientId, linkReadable),
          ]
        : [
            inArray(ingredientSubstitutes.variantId, [...ids]),
            readableVariantParent(memberships, ingredientSubstitutes.variantId, linkReadable),
          ]),
    ),
    { leftJoin: linked, on: eq(linked.id, ingredientSubstitutes.substituteId) },
  );
}

/**
 * One page of the live ingredients, in the compendium or a coven one of
 * `memberships` proves, whose display name, formal name or a live folk name
 * is trigram-similar to `name` — best match first, keyed `[-score, name]`,
 * each carrying its score. Reads both tiers in one statement; no proofs reads
 * the compendium alone, which is the admin's compendium form (M5.5).
 *
 * The three matches are a `UNION ALL` under `id IN (…)`, not an `OR` beside
 * the scope: Postgres cannot turn a subquery inside an `OR` into a join, so
 * that form walks `ingredients` whole, and `UNION`'s de-duplication (which
 * `IN` already does) walks `ingredients_pkey` whole (claude-docs/db/fuzzy-matching.md,
 * "Fuzzy matching").
 */
export function findSimilarIngredients(
  memberships: readonly Membership[],
  name: string,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, SimilarityScore>[]> {
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

  const order: ListOrder<SimilarityScore> = {
    sort: [{ expression: sql`-${score}`, type: 'real' }, ingredients.name],
    similarityMatch: true,
    carry: { score },
  };
  return findPageInTiers(memberships, ingredients, order, page, inArray(ingredients.id, matched));
}

/**
 * One page of the compendium under `filter` — the public list, so no proof
 * (claude-docs/db/compendium-read.md, "The compendium read"). A search pages best match first,
 * `(score DESC, position, name, id)` — among equal scores, the entry whose
 * field holds the query earliest — and carries each row's score; a list
 * without one pages `(name, id)` with a null score.
 */
export function findCompendiumPage(
  filter: IngredientFilter,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  const list = compendiumList(filter);
  return findPageInTiers([], ingredients, list.order, page, list.arms);
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
  return findPageCountInTiers([], ingredients, list.order, start, list.arms);
}

/**
 * One page of the live ingredients a coven's substitute may link — the
 * compendium's and the proof's workspace's (MB.138) — matched and ordered as
 * the compendium search is, best match first, so a typed prefix finds its
 * entry where `findSimilarIngredients`' whole-string 0.4 would not. A blank
 * `query` lists both tiers by name (claude-docs/db/compendium-read.md,
 * "The ingredient picker's search").
 */
export function findIngredientSuggestions(
  membership: Membership,
  query: string,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  const list = compendiumList({ query });
  return findPageInTiers([membership], ingredients, list.order, page, list.arms);
}

/**
 * One live ingredient by id, in the compendium or in a coven one of
 * `memberships` proves — `undefined` otherwise, which is also the answer for
 * a coven's row asked for without its proof: a caller holding an id it saw
 * elsewhere learns nothing from the difference. No proofs reads the
 * compendium alone, which is how a signed-out request reads it.
 */
export function findOneIngredient(
  memberships: readonly Membership[],
  id: string,
): Promise<IngredientRow | undefined> {
  return selectOne(
    ingredients,
    and(readableInTiers(memberships, ingredients), eq(ingredients.id, id)),
  );
}

/**
 * The live compendium entry keyed as `identity` would be — the row a
 * compendium write carrying it collides with — or `undefined`. The key is the
 * formal name, or the label without one (MB.215), compared through the
 * generated column's own expression over the values, so both sides fold alike.
 */
export function findCompendiumEntryByIdentity(
  identity: IngredientIdentity,
): Promise<IngredientRow | undefined> {
  return selectOne(
    ingredients,
    and(inCompendium(ingredients), notSoftDeleted(ingredients), identityIs(identity)),
  );
}

/**
 * The live ingredient of the proof's coven keyed as `identity` would be —
 * the row a coven write carrying it collides with — or `undefined`, as
 * `findCompendiumEntryByIdentity` reads the compendium's.
 */
export function findWorkspaceIngredientByIdentity(
  membership: Membership,
  identity: IngredientIdentity,
): Promise<IngredientRow | undefined> {
  return selectOne(
    ingredients,
    and(scopedTo(membership, ingredients), notSoftDeleted(ingredients), identityIs(identity)),
  );
}

/** The row's `identity_key` is the one `identity` would key as. */
function identityIs({ name, canonicalName }: IngredientIdentity): SQL {
  // A parameter's type is otherwise left to `coalesce` to infer.
  const text = (value: string | null | undefined) => sql`${value ?? null}::text`;
  return eq(ingredients.identityKey, identityKeyOf(text(name), text(canonicalName)));
}

/**
 * What a compendium page and its count share: the filter's arms, and the key
 * with the search's join — built in one place, so the count reads the rows
 * the pages hold in the order they hold them, and the ingredient picker
 * matches as the compendium does. A search keys `[-rank, position, name]`,
 * the rank being `searchMatch`'s weighted score, negated so one ascending
 * row comparison bounds it, and the position where its best field holds the
 * query, so Wood Ash leads Sandalwood for `wood`; a browse keys `[name]`.
 */
function compendiumList(filter: IngredientFilter): {
  arms: SQL | undefined;
  order: ListOrder<CompendiumScore>;
} {
  const match = searchMatch(filter.query);
  return {
    arms: and(
      ...categoryArms(filter.categoryIds ?? []),
      formArm(filter.form),
      pickedFormArm(filter.formId),
      listArm(ingredients.celestialBodies, filter.celestialBody),
      listArm(ingredients.zodiacSigns, filter.zodiacSign),
      filter.deityId
        ? existsIn(
            ingredientDeities,
            and(
              eq(ingredientDeities.ingredientId, ingredients.id),
              eq(ingredientDeities.deityId, filter.deityId),
            ),
          )
        : undefined,
      filter.withoutReferences ? citesNowhere() : undefined,
      filter.nomenclature ? eq(ingredients.nomenclature, filter.nomenclature) : undefined,
    ),
    order: match
      ? {
          sort: [
            { expression: sql`-${match.score}`, type: 'real' },
            { expression: match.position, type: 'integer' },
            ingredients.name,
          ],
          wordMatch: true,
          join: match.join,
          carry: { score: match.score },
        }
      : {
          sort: [ingredients.name],
          carry: { score: sql<number | null>`null` },
        },
  };
}

/**
 * How much a match in each field counts towards a search's rank: the query's
 * word similarity to the field, times the field's weight. Every field, not
 * just the label, has its own, because a boost on the label alone would leave
 * a formal name, a folk name, a form and a description tied with each other —
 * a word in a variant's prose ranking with the entry's own formal name. Why
 * these five, in this order: claude-docs/db/compendium-read.md, "The
 * compendium read".
 */
const SEARCH_WEIGHTS = {
  name: 1,
  canonicalName: 0.9,
  folkName: 0.8,
  form: 0.6,
  description: 0.2,
} as const;

/**
 * The rows matching a search, as a relation to join, each row's rank, and
 * where its best field holds the query. A row matches when the query is
 * word-similar (`<%`) to its label, its formal name, a live folk name, or the
 * form or description of a live variant (MB.218), each side folded through
 * `unaccent_immutable` so the expression indexes of migration 0027 and
 * `ingredient_variants_unaccent_trgm` answer the match; the threshold is the
 * keyset read's (`wordMatch`). The five fields are five arms of a `UNION ALL`,
 * for `findSimilarIngredients`'s reason, one field each, so each arm's
 * `where` is that field's own indexed match and the position an arm reports
 * belongs to the field it scored. An arm scores its field's `word_similarity`
 * — which the index's recheck has just computed — or 1 where the field holds
 * the query verbatim, times that field's `SEARCH_WEIGHTS` entry, and reports
 * the character the query starts at (`position`). The rank is the best of an
 * entry's arms, `max … group by id`, so an entry two of whose forms match is
 * still one row, and its position is that best arm's, earliest first among
 * equal arms. A field only scores where it matched itself, so a weak hit in a
 * heavier field never outranks the field that matched. Plain columns, so the
 * order and the page bound read them per matched row rather than a
 * correlated folk-name subquery per compendium row
 * (claude-docs/db/compendium-read.md, "The compendium read"). Blank means no
 * search.
 */
function searchMatch(
  query: string | undefined,
): { join: { source: SQL; on: SQL }; score: SQL<number>; position: SQL<number> } | undefined {
  const trimmed = query?.trim();
  if (!trimmed) return undefined;
  const { matches, similarity, contains, position } = foldedWordMatch(trimmed);
  const candidate = alias(ingredients, 'candidate');
  const arms = sql.identifier('arms');
  const matched = sql.identifier('matched');
  // One field's arm: the entry it belongs to, the field's weighted score —
  // its word similarity, or 1 where it holds the query verbatim, since word
  // similarity scores a fragment inside a longer word by the trigrams it
  // shares — and where it holds the query. The arm's `where` is the field's
  // match, so every row it reads scored. The weight and the 1 are cast to
  // `real`: `real` times a bare number is `double precision`, and the rank
  // carried onto the edge is not cast as the keyset's sort is.
  const arm = (id: AnyPgColumn, text: AnyPgColumn, weight: number, from: SQLWrapper, live?: SQL) =>
    sql`select ${id} as id,
        greatest(${similarity(text)}, case when ${contains(text)} then 1::real end) * ${weight}::real as score,
        ${position(text)} as position
      from ${from}
      where ${and(matches(text), live)}`;
  const entries = sql`${ingredients} as ${candidate}`;
  // The position is the best-scoring arm's, not `min(position)`: a weaker
  // field holding the query earlier — a folk name starting with it, under a
  // label holding it mid-word — must not move the entry it did not rank.
  const source = sql`(
    select ${arms}.id, max(${arms}.score) as score,
      (array_agg(${arms}.position order by ${arms}.score desc, ${arms}.position))[1] as position
    from (
      ${arm(candidate.id, candidate.name, SEARCH_WEIGHTS.name, entries)}
      union all
      ${arm(candidate.id, candidate.canonicalName, SEARCH_WEIGHTS.canonicalName, entries)}
      union all
      ${arm(ingredientFolkNames.ingredientId, ingredientFolkNames.name, SEARCH_WEIGHTS.folkName, ingredientFolkNames, notSoftDeleted(ingredientFolkNames))}
      union all
      ${arm(ingredientVariants.ingredientId, ingredientVariants.form, SEARCH_WEIGHTS.form, ingredientVariants, notSoftDeleted(ingredientVariants))}
      union all
      ${arm(ingredientVariants.ingredientId, ingredientVariants.description, SEARCH_WEIGHTS.description, ingredientVariants, notSoftDeleted(ingredientVariants))}
    ) as ${arms}
    group by ${arms}.id) as ${matched}`;
  return {
    join: { source, on: eq(sql`${matched}.id`, ingredients.id) },
    score: sql<number>`${matched}.score`,
    position: sql<number>`${matched}.position`,
  };
}

/**
 * The entry shows no reference, on itself or on any of its live forms: the
 * admin's to-do list (M5.5). An entry whose only source is on its oil is
 * sourced, under the union rule (MB.215, MB.218), so it is not on the list.
 */
function citesNowhere(): SQL | undefined {
  return and(
    citesNothing('ingredientId'),
    not(
      existsIn(
        ingredientVariants,
        and(eq(ingredientVariants.ingredientId, ingredients.id), cites('ingredientVariantId')),
      ),
    ),
  );
}

/**
 * One correlated `EXISTS` per id, so an entry must carry every one of them,
 * on itself or on a live form: a variant's pair names the ingredient too
 * (MB.217), so the union comes for free, but the table is hard-deleted and
 * its pairs outlive a soft-deleted variant, so the variant's liveness is read
 * here. Inside the compendium's own list the parent is already the row, so a
 * plain live-variant `EXISTS` rather than `readableVariantParent`'s tier check.
 */
function categoryArms(categoryIds: readonly string[]): SQL[] {
  return categoryIds.map((categoryId) =>
    existsIn(
      ingredientCategories,
      and(
        eq(ingredientCategories.ingredientId, ingredients.id),
        eq(ingredientCategories.categoryId, categoryId),
        or(
          isNull(ingredientCategories.variantId),
          existsIn(ingredientVariants, eq(ingredientVariants.id, ingredientCategories.variantId)),
        ),
      ),
    ),
  );
}

/**
 * `list` holds an entry folding to `value`, both trimmed and lower-cased as
 * the suggestions fold one (MB.162). Blank means no filter.
 */
function listArm(list: AnyPgColumn, value: string | undefined): SQL | undefined {
  if (!value?.trim()) return undefined;
  return inArray(fold(value), listFolds(list));
}

/**
 * The entry holds a live variant whose form is `form`, both trimmed and
 * lower-cased (MB.222): any of its forms, so an entry with two is found under
 * either. A correlated `EXISTS` rather than a join, so an entry is one row
 * however many of its forms match, and the count reads the rows the page
 * does. Blank means no filter.
 */
function formArm(form: string | undefined): SQL | undefined {
  if (!form?.trim()) return undefined;
  return existsIn(
    ingredientVariants,
    and(
      eq(ingredientVariants.ingredientId, ingredients.id),
      eq(fold(ingredientVariants.form), fold(form)),
    ),
  );
}

/**
 * The entry holds a live variant that picked the curated form `formId`
 * (MB.220): any of its forms, so a form's delete is held by every entry
 * carrying it. A correlated `EXISTS`,
 * answered by `ingredient_variants_form_id_idx`. Absent means no filter.
 */
function pickedFormArm(formId: string | undefined): SQL | undefined {
  if (!formId) return undefined;
  return existsIn(
    ingredientVariants,
    and(eq(ingredientVariants.ingredientId, ingredients.id), eq(ingredientVariants.formId, formId)),
  );
}
