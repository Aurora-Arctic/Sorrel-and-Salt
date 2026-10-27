import {
  and,
  arrayOverlaps,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  not,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import { type AnyPgColumn, type PgTable, alias } from 'drizzle-orm/pg-core';
import { ingredientCategories } from '../../modules/ingredients/schema/ingredient-categories';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredientSubstitutes } from '../../modules/ingredients/schema/ingredient-substitutes';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { identityKeyOf, ingredients } from '../../modules/ingredients/schema/ingredients';
import type {
  CategoryMode,
  IngredientElement,
} from '../../modules/ingredients/schema/ingredient-enums';
import { inventoryItems } from '../../modules/ingredients/schema/inventory-items';
import { workspaceCompendiumEntries } from '../../modules/ingredients/schema/workspace-compendium-entries';
import { categories } from '../../modules/vocabulary/schema/categories';
import { deities } from '../../modules/vocabulary/schema/deities';
import {
  ingredientFormGroups,
  ingredientForms,
} from '../../modules/vocabulary/schema/ingredient-forms';
import type { Membership } from '@/modules/coven';
import type { Curator } from '@/modules/identity';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import {
  findPageCountInScopeIncludingSoftDeleted,
  findPageCountInTiers,
  findPageInScopeIncludingSoftDeleted,
  findPageInTiers,
} from './finders';
import { inUseIngredientParent, inUseVariantParent } from './ingredient-parent';
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
import { curated, inLiveGroup } from './vocabularies';
import type {
  CompendiumReviewRow,
  CompendiumScore,
  CupboardEntryRow,
  IngredientFilter,
  IngredientIdentity,
  IngredientRow,
  ReadRow,
  IngredientScoped,
  JoinedRow,
  ListColumns,
  ListOrder,
  NotSpellScoped,
  SimilarityScore,
  SortPart,
  SuggestionGroup,
  SuggestionGroupTag,
  Unscoped,
  VariantScoped,
  WorkspaceListEdge,
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
 * the fetch (rule 7). With `heldBy`, a retired compendium entry that coven's
 * cupboard names is read too (`inUseIngredientParent`, M12.24).
 */
export function findManyOfIngredients<
  TTable extends PgTable & IngredientScoped & Unscoped & NotSpellScoped,
>(
  memberships: readonly Membership[],
  table: TTable,
  ingredientIds: readonly string[],
  heldBy?: Membership,
): Promise<ReadRow<TTable>[]> {
  if (ingredientIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    table,
    and(
      notSoftDeleted(table),
      ownedByIngredient(table),
      inArray(table.ingredientId, [...ingredientIds]),
      inUseIngredientParent(memberships, table.ingredientId, heldBy),
    ),
  );
}

/**
 * The live variant with this id, while its ingredient is live and in the
 * compendium or a coven one of `memberships` proves: the form a jar may name
 * (M9.3), so another coven's form is no form at all here. With `heldBy`, also
 * a live form of a retired compendium entry whose cupboard row in `heldBy`'s
 * coven is live (`inUseVariantParent`, M12.24), so that coven may start a new
 * jar of an entry it still holds (the owner's decision, 2026-10-19). No
 * `heldBy` reads the live tiers alone, as every other caller needs.
 */
export function findReadableVariant(
  memberships: readonly Membership[],
  id: string,
  heldBy?: Membership,
): Promise<typeof ingredientVariants.$inferSelect | undefined> {
  return selectOne(
    ingredientVariants,
    and(
      notSoftDeleted(ingredientVariants),
      eq(ingredientVariants.id, id),
      inUseIngredientParent(memberships, ingredientVariants.ingredientId, heldBy),
    ),
  );
}

/**
 * The live rows these variants own — one form's categories, say — readable
 * exactly when the variant and its ingredient are: the variant live, and its
 * ingredient live and in the compendium or a coven one of `memberships`
 * proves (`readableVariantParent`, MB.218). Never by a bare id: a variant has
 * no `workspace_id`, so its ingredient's tier is the only scope it has.
 * With `heldBy`, as `findManyOfIngredients` reads with it.
 */
export function findManyOfVariants<
  TTable extends PgTable & VariantScoped & IngredientScoped & Unscoped & NotSpellScoped,
>(
  memberships: readonly Membership[],
  table: TTable,
  variantIds: readonly string[],
  heldBy?: Membership,
): Promise<ReadRow<TTable>[]> {
  if (variantIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    table,
    and(
      notSoftDeleted(table),
      inArray(table.variantId, [...variantIds]),
      inUseVariantParent(memberships, table.variantId, heldBy),
    ),
  );
}

/**
 * The live deities of these ingredients (MB.167), each beside the curated
 * deity it links while that deity is curated — live, under a live tradition —
 * and null for a typed name or a deity since retired, which reads as the name
 * the row holds. Not an escape hatch: the retired deity is filtered, as
 * any finder filters it, and the row kept. Readable exactly when the parent
 * is, as `findManyOfIngredients` reads it, `heldBy` included. Unordered; a
 * caller sorts by `position`.
 */
export function findDeitiesOfIngredients(
  memberships: readonly Membership[],
  ingredientIds: readonly string[],
  heldBy?: Membership,
): Promise<JoinedRow<typeof ingredientDeities.$inferSelect, typeof deities.$inferSelect>[]> {
  if (ingredientIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    ingredientDeities,
    and(
      notSoftDeleted(ingredientDeities),
      inArray(ingredientDeities.ingredientId, [...ingredientIds]),
      inUseIngredientParent(memberships, ingredientDeities.ingredientId, heldBy),
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
 * `ingredients` itself. With `heldBy`, a retired compendium entry's, as
 * `findManyOfIngredients` reads with it.
 */
export function findSubstitutesIncludingSoftDeleted(
  memberships: readonly Membership[],
  of: 'ingredient' | 'variant',
  ids: readonly string[],
  heldBy?: Membership,
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
            inUseIngredientParent(
              memberships,
              ingredientSubstitutes.ingredientId,
              heldBy,
              linkReadable,
            ),
          ]
        : [
            inArray(ingredientSubstitutes.variantId, [...ids]),
            inUseVariantParent(memberships, ingredientSubstitutes.variantId, heldBy, linkReadable),
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
 * One page of a coven's ingredients under `filter` (M9.4, M12.18): its own
 * live entries, and every compendium entry its live cupboard rows name, a
 * retired one included (M12.32). Matched,
 * ordered and keyed as the compendium is, by the same arms, but under the
 * proof, over the coven's overrides, and with each entry's cupboard row beside
 * it, null for the coven's own (claude-docs/db/stock.md, "The workspace
 * ingredient list").
 */
export async function findWorkspaceIngredientPage(
  membership: Membership,
  filter: IngredientFilter,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, WorkspaceListEdge>[]> {
  const list = compendiumList(filter, membership);
  // The order's left join carries the cupboard row onto each entry as
  // `joined`; the finder's type knows the carried score alone.
  const entries = (await findPageInScopeIncludingSoftDeleted(
    ingredients,
    workspaceListScopeIncludingSoftDeleted(membership, filter),
    list.order,
    page,
    list.arms,
  )) as PageEntry<IngredientRow, CompendiumScore & { joined: CupboardEntryRow | null }>[];
  return entries.map(({ joined, ...entry }) => ({ ...entry, cupboardEntry: joined }));
}

/**
 * How many rows a coven's ingredient list holds under `filter`, and how many
 * of them come before `start` in its pages' order: the twin of
 * `findCompendiumCount` over the same arms and the coven's scope, so the
 * count and the page cannot disagree (M9.6).
 */
export function findWorkspaceIngredientCount(
  membership: Membership,
  filter: IngredientFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const list = compendiumList(filter, membership);
  return findPageCountInScopeIncludingSoftDeleted(
    ingredients,
    workspaceListScopeIncludingSoftDeleted(membership, filter),
    list.order,
    start,
    list.arms,
  );
}

/**
 * Which rows a coven's ingredient list holds (M9.4, M12.18): its own live
 * entries, and the compendium entries a live cupboard row of its names, one
 * keyed `EXISTS` on the row's `(workspace_id, ingredient_id)` unique. The
 * second arm admits a compendium entry a curator has retired (soft-deleted):
 * the coven still holds it, so it stays listed until the coven removes it
 * (M12.32, by M12.24's rule; claude-docs/db/workspace-compendium-entries.md,
 * "When the compendium retires the entry"). Hence the hatch's name: the scope
 * carries the tombstone filters itself — the own entry's here, the cupboard
 * row's in `existsIn` — so its readers page it without one, and
 * `inCompendium` keeps a coven's own deleted entry off the second arm. A jar does
 * not decide it, and an own entry sharing a compendium entry's name leaves
 * both listed: the coven chose both. The page and the facets (M12.3) both read
 * it, so they hold the same rows. The coven-only `source`, `inStock` and
 * `lowStockOnly` settings (M9.7, M9.8) are read here, not in `compendiumList`, which the
 * compendium's page and count share and where a coven's jars mean nothing.
 */
export function workspaceListScopeIncludingSoftDeleted(
  membership: Membership,
  filter: Pick<IngredientFilter, 'source' | 'inStock' | 'lowStockOnly'> = {},
): SQL {
  return and(
    or(
      and(scopedTo(membership, ingredients), notSoftDeleted(ingredients)),
      and(
        inCompendium(ingredients),
        existsIn(
          workspaceCompendiumEntries,
          and(
            eq(workspaceCompendiumEntries.ingredientId, ingredients.id),
            scopedTo(membership, workspaceCompendiumEntries),
          ),
        ),
      ),
    ),
    filter.source === 'local' ? scopedTo(membership, ingredients) : undefined,
    filter.source === 'compendium' ? inCompendium(ingredients) : undefined,
    filter.inStock ? holdsJarInStock(membership) : undefined,
    filter.lowStockOnly ? holdsJarLowOrOut(membership) : undefined,
  ) as SQL;
}

/**
 * The `inStock` filter (M9.7): the coven holds a live jar of the row, of a
 * live form, and the jar is not at 0. The row is already the readable
 * ingredient, so a plain live-variant `EXISTS` rather than
 * `readableVariantParent`'s tier check, as `categoryArms` reads it. A jar
 * with no quantity is held unweighed, so it is an `OR` with null rather than
 * `<> 0` alone, which SQL reads as unknown for null and would drop it.
 */
function holdsJarInStock(membership: Membership): SQL {
  return existsIn(
    inventoryItems,
    and(
      eq(inventoryItems.ingredientId, ingredients.id),
      scopedTo(membership, inventoryItems),
      or(isNull(inventoryItems.quantityOnHand), ne(inventoryItems.quantityOnHand, '0')),
      existsIn(ingredientVariants, eq(ingredientVariants.id, inventoryItems.variantId)),
    ),
  );
}

/**
 * The `lowStockOnly` filter (M9.8): the coven holds a live jar of the row, of
 * a live form, badged Out of Stock (at 0, whatever its threshold) or Low Stock
 * (above 0 and at or below a threshold above 0). A jar with no quantity is held
 * unweighed and never matches, as SQL comparisons against null already read.
 * The same rule as `stockState` in `src/components/StockBadge/stock-state.ts`;
 * `tests/support/jar-states.ts` is the shared list both are tested against.
 */
function holdsJarLowOrOut(membership: Membership): SQL {
  return existsIn(
    inventoryItems,
    and(
      eq(inventoryItems.ingredientId, ingredients.id),
      scopedTo(membership, inventoryItems),
      or(
        eq(inventoryItems.quantityOnHand, '0'),
        and(
          gt(inventoryItems.lowStockThreshold, '0'),
          gt(inventoryItems.quantityOnHand, '0'),
          lte(inventoryItems.quantityOnHand, inventoryItems.lowStockThreshold),
        ),
      ),
      existsIn(ingredientVariants, eq(ingredientVariants.id, inventoryItems.variantId)),
    ),
  );
}

/** How many entries each group of the substitute picker offers (M12.19): an estimate, tuned in the e2e test. */
const SUGGESTION_GROUP_LIMIT = 8;

/**
 * The substitute picker's rows (MB.138, M12.19), in two groups. `yours` is the
 * coven's cupboard: its own live entries, and each compendium entry it holds a
 * live cupboard row for, found by the label it gave the entry as well as the
 * compendium's name. `compendium` is every other live compendium entry, those
 * with no row here, through a keyed `NOT EXISTS` on that row. An entry is in
 * one group, and an own entry and a compendium entry sharing a name are both
 * offered. A retired (soft-deleted) compendium entry is in
 * neither, as the tombstone filter drops it first. Each group is matched and
 * ordered as the compendium search is, best match first, and cut at
 * `SUGGESTION_GROUP_LIMIT`; the result lists `yours` first and pages by
 * cursor over those rows, each carrying its `group`. A blank `query` lists
 * both by name (claude-docs/db/compendium-read.md, "The ingredient picker's
 * search").
 */
export async function findIngredientSuggestions(
  membership: Membership,
  query: string,
  page: PageRequest,
  form?: string,
): Promise<PageEntry<IngredientRow, CompendiumScore & SuggestionGroupTag>[]> {
  const list = compendiumList({ query }, membership);
  const ranked = formRank(form);
  const sort = ranked ? [ranked, ...list.order.sort] : list.order.sort;
  const order = { ...list.order, sort };
  // The coven holds a live cupboard row for the compendium entry.
  const held = existsIn(
    workspaceCompendiumEntries,
    and(
      scopedTo(membership, workspaceCompendiumEntries),
      eq(workspaceCompendiumEntries.ingredientId, ingredients.id),
    ),
  );
  const yours = or(scopedTo(membership, ingredients), held) as SQL;
  const top = async (scope: SQL) =>
    (
      await findPageInTiers(
        [membership],
        ingredients,
        order,
        { limit: SUGGESTION_GROUP_LIMIT, inverted: false },
        and(list.arms, scope),
      )
    ).map(({ node }) => node.id);
  const ids = (
    await Promise.all([top(yours), top(and(inCompendium(ingredients), not(held)) as SQL)])
  ).flat();
  if (ids.length === 0) return [];
  return findPageInTiers(
    [membership],
    ingredients,
    {
      ...order,
      sort: [{ expression: sql`case when ${yours} then 0 else 1 end`, type: 'integer' }, ...sort],
      carry: {
        score: list.order.carry?.score as SQL<number | null>,
        group: sql<SuggestionGroup>`case when ${yours} then 'yours' else 'compendium' end`,
      },
    },
    page,
    inArray(ingredients.id, ids),
  );
}

/**
 * Where an entry stands for the form a picker was asked about: 0 holding that
 * form, 1 holding another form of the same curated group, 2 otherwise. None
 * for a blank form, which leaves the order alone.
 */
function formRank(form: string | undefined): SortPart | undefined {
  const wanted = form?.trim();
  if (!wanted) return undefined;
  const named = alias(ingredientForms, 'named');
  const holdsForm = existsIn(
    ingredientVariants,
    and(
      eq(ingredientVariants.ingredientId, ingredients.id),
      eq(fold(ingredientVariants.form), fold(wanted)),
    ),
  );
  const holdsGroupMate = existsIn(
    ingredientVariants,
    and(
      eq(ingredientVariants.ingredientId, ingredients.id),
      existsIn(
        ingredientForms,
        and(
          curated(ingredientForms),
          or(
            eq(ingredientForms.id, ingredientVariants.formId),
            eq(fold(ingredientForms.name), fold(ingredientVariants.form)),
          ),
          existsIn(
            named,
            and(
              eq(fold(named.name), fold(wanted)),
              eq(named.groupId, ingredientForms.groupId),
              existsIn(ingredientFormGroups, eq(ingredientFormGroups.id, named.groupId)),
            ),
          ),
        ),
      ),
    ),
  );
  return {
    expression: sql`case when ${holdsForm} then 0 when ${holdsGroupMate} then 1 else 2 end`,
    type: 'integer',
  };
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
 * A live compendium entry's review mark, for a curator (M14.8): when it was
 * last marked reviewed, `null` once cleared; `undefined` when `id` names no
 * live compendium entry, a coven's own included. The one read of the mark,
 * which every other finder leaves off the row (`unread-columns.ts`). The time
 * is read as epoch milliseconds: a column inside an aggregate loses Drizzle's
 * date mapping, and a Date holds no finer than that anyway.
 */
export async function findCompendiumReview(
  _curator: Curator,
  id: string,
): Promise<CompendiumReviewRow | undefined> {
  const [row] = await selectFrom(
    ingredients,
    and(inCompendium(ingredients), notSoftDeleted(ingredients), eq(ingredients.id, id)),
    {
      aggregate: {
        reviewedAt: sql<
          number | null
        >`(extract(epoch from ${ingredients.curatorReviewedAt}) * 1000)::float8`,
      },
      over: {},
    },
  );
  if (!row) return undefined;
  return { reviewedAt: row.reviewedAt === null ? null : new Date(Number(row.reviewedAt)) };
}

/**
 * The live ingredients among these ids, in the compendium or in a coven one of
 * `memberships` proves, in no particular order — a loader's batch read, as
 * `findOneIngredient` is the single one. An id in a coven with no proof, or
 * soft-deleted, is absent. No proofs reads the compendium alone.
 */
export function findManyIngredients(
  memberships: readonly Membership[],
  ids: readonly string[],
): Promise<IngredientRow[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return selectFrom(
    ingredients,
    and(readableInTiers(memberships, ingredients), inArray(ingredients.id, [...ids])),
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
export function compendiumList(
  filter: IngredientFilter,
  cupboardOf?: Membership,
): {
  arms: SQL | undefined;
  order: ListOrder<CompendiumScore>;
} {
  const columns = listColumns(cupboardOf);
  const match = searchMatch(filter.query, cupboardOf);
  const leftJoined = columns.leftJoined && { leftJoined: columns.leftJoined };
  return {
    arms: and(
      ...categoryArms(filter.categoryIds ?? [], filter.categoryMode),
      formArm(filter.forms),
      pickedFormArm(filter.formId),
      listArm(columns.celestialBodies, filter.celestialBodies),
      listArm(columns.zodiacSigns, filter.zodiacSigns),
      elementArm(filter.elements, columns.elements),
      deityArm(filter.deityIds),
      toxicArm(filter.toxic),
      filter.withoutReferences ? citesNowhere() : undefined,
      filter.withoutForms ? hasNoForm() : undefined,
      filter.nomenclature ? eq(ingredients.nomenclature, filter.nomenclature) : undefined,
      reviewArm(filter.reviewed),
      filter.heldIn?.length ? heldInAnyOf(filter.heldIn) : undefined,
      filter.notHeldIn?.length ? heldInNoneOf(filter.notHeldIn) : undefined,
    ),
    order: match
      ? {
          sort: [
            { expression: sql`-${match.score}`, type: 'real' },
            { expression: match.position, type: 'integer' },
            columns.name,
          ],
          wordMatch: true,
          join: match.join,
          ...leftJoined,
          carry: { score: match.score },
        }
      : {
          sort: [columns.name],
          ...leftJoined,
          carry: { score: sql<number | null>`null` },
        },
  };
}

/**
 * The In My Covens filter (M12.55): a compendium entry some live cupboard row
 * of one of the proofs' covens names. `existsIn` ANDs the cupboard row's
 * tombstone filter, so a removed entry is not held; a coven's own entries
 * never match, as the compendium lists none.
 */
function heldInAnyOf(memberships: readonly Membership[]): SQL {
  return and(inCompendium(ingredients), heldBy(memberships)) as SQL;
}

/**
 * Its Not In (M12.55): a compendium entry no live cupboard row of the proofs'
 * covens names. A removed row does not hold the entry, so it stays listed.
 */
function heldInNoneOf(memberships: readonly Membership[]): SQL {
  return and(inCompendium(ingredients), not(heldBy(memberships))) as SQL;
}

/** Some live cupboard row of one of the proofs' covens names the entry. */
function heldBy(memberships: readonly Membership[]): SQL {
  return existsIn(
    workspaceCompendiumEntries,
    and(
      eq(workspaceCompendiumEntries.ingredientId, ingredients.id),
      or(...memberships.map((membership) => scopedTo(membership, workspaceCompendiumEntries))),
    ),
  );
}

/**
 * A coven's cupboard row for the entry, left-joined beside it in the coven's
 * list. Aliased, since the list's scope reads the table itself in an `EXISTS`.
 */
const cupboard = alias(workspaceCompendiumEntries, 'cupboard');

/**
 * The name, elements, celestial bodies and zodiac signs a list reads (M12.18).
 * Under a coven's proof each is `coalesce(cupboard row's, entry's)`, so an
 * override sorts, filters and counts where the coven put it, and an empty
 * list it cleared matches nothing: `coalesce` takes `[]` as a value, as
 * `applyCupboardEntry`'s `??` does. The join matches the proof's live row
 * for a live compendium entry, so a coven's own entry reads its own columns.
 * Without a proof, the compendium's own list, each is the entry's column.
 * Raw, since `coalesce` has no builder.
 */
export function listColumns(membership?: Membership): ListColumns {
  if (!membership) {
    return {
      name: ingredients.name,
      elements: ingredients.elements,
      celestialBodies: ingredients.celestialBodies,
      zodiacSigns: ingredients.zodiacSigns,
    };
  }
  const over = (own: AnyPgColumn, entry: AnyPgColumn) => sql`coalesce(${own}, ${entry})`;
  return {
    name: { expression: over(cupboard.label, ingredients.name), type: 'text' },
    elements: over(cupboard.elements, ingredients.elements),
    celestialBodies: over(cupboard.celestialBodies, ingredients.celestialBodies),
    zodiacSigns: over(cupboard.zodiacSigns, ingredients.zodiacSigns),
    leftJoined: {
      leftJoin: cupboard,
      on: and(
        eq(cupboard.ingredientId, ingredients.id),
        scopedTo(membership, cupboard),
        notSoftDeleted(cupboard),
        inCompendium(ingredients),
      ) as SQL,
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
  cupboardOf?: Membership,
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
  // With a coven's proof, a sixth arm: the label that coven gave a compendium
  // entry it holds, ranked as a label is (M12.19). That coven's live rows only.
  const cupboardArm = cupboardOf
    ? sql`
      union all
      ${arm(
        workspaceCompendiumEntries.ingredientId,
        workspaceCompendiumEntries.label,
        SEARCH_WEIGHTS.name,
        workspaceCompendiumEntries,
        and(
          scopedTo(cupboardOf, workspaceCompendiumEntries),
          notSoftDeleted(workspaceCompendiumEntries),
        ),
      )}`
    : sql``;
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
      ${arm(ingredientVariants.ingredientId, ingredientVariants.description, SEARCH_WEIGHTS.description, ingredientVariants, notSoftDeleted(ingredientVariants))}${cupboardArm}
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
export function citesNowhere(): SQL | undefined {
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
 * The entry has no live form: the admin's to-do list of entries nobody can
 * stock or put in a spell yet (MB.215, M12.30). A soft-deleted variant is none,
 * through `existsIn`.
 */
export function hasNoForm(): SQL {
  return not(existsIn(ingredientVariants, eq(ingredientVariants.ingredientId, ingredients.id)));
}

/**
 * The category filter. Under `all` it is one correlated `EXISTS` per id, so
 * an entry must carry every one of them; under `any` it is a single
 * `EXISTS` over the whole list, which also keeps an entry holding two of
 * them from being found twice. Either way the category may be filed on the
 * entry or on a live form: a variant's pair names the ingredient too
 * (MB.217), so the union comes for free, but the table is hard-deleted and
 * its pairs outlive a soft-deleted variant, so the variant's liveness is read
 * here. Inside the compendium's own list the parent is already the row, so a
 * plain live-variant `EXISTS` rather than `readableVariantParent`'s tier check.
 * The category itself must be live too, through `pointsLive`.
 */
function categoryArms(categoryIds: readonly string[], mode: CategoryMode = 'all'): SQL[] {
  if (categoryIds.length === 0) return [];
  const carries = (category: SQL | undefined) =>
    existsIn(
      ingredientCategories,
      and(
        eq(ingredientCategories.ingredientId, ingredients.id),
        category,
        pairIsLive(ingredientCategories),
        pointsLive(categories, ingredientCategories.categoryId),
      ),
    );
  return mode === 'any'
    ? [carries(inArray(ingredientCategories.categoryId, [...categoryIds]))]
    : categoryIds.map((categoryId) => carries(eq(ingredientCategories.categoryId, categoryId)));
}

/**
 * A category pair counts: it is the entry's own, or its variant is live. The
 * table is hard-deleted, so a pair outlives the soft-deleted variant it
 * belongs to, and only this says it no longer counts. Takes the pair's
 * column, so an aliased read of the table can ask too (M12.3).
 */
export function pairIsLive(pair: { variantId: AnyPgColumn }): SQL | undefined {
  return or(
    isNull(pair.variantId),
    existsIn(ingredientVariants, eq(ingredientVariants.id, pair.variantId)),
  );
}

/**
 * The values of a list filter that say something, blank ones dropped, so
 * `['', 'Mars']` filters by Mars and `[' ']` by nothing (M11.22). They are
 * not folded here: the fold stays in SQL, beside the column's own.
 */
export function stated(values: readonly string[] | undefined): string[] {
  return (values ?? []).filter((value) => value.trim() !== '');
}

/**
 * `list` holds an entry folding to any of `values`, both sides trimmed and
 * lower-cased as the suggestions fold one (MB.162). One `IN` per value, ORed,
 * rather than an array overlap (`&&`): the list's side has to be folded entry
 * by entry, which `listFolds` does, and an overlap would compare the raw
 * spellings. Blank values are skipped, and none means no filter.
 */
function listArm(list: SQLWrapper, values: readonly string[] | undefined): SQL | undefined {
  const wanted = stated(values);
  if (wanted.length === 0) return undefined;
  return or(...wanted.map((value) => listHolds(list, value)));
}

/**
 * `list` holds an entry folding as `value` does: one value of `listArm`, and
 * how a facet matches a curated row's name to the list (M12.3).
 */
export function listHolds(list: SQLWrapper, value: SQLWrapper | string): SQL {
  return inArray(fold(value), listFolds(list));
}

/**
 * The entry's own `elements` list, or a live variant's, holds any of
 * `elements` (M8.13, MB.215): an array overlap on each side, the variant's a
 * correlated `EXISTS` that skips a soft-deleted form, so an entry is one row
 * however many of them it holds and a retired form's element counts for
 * nothing. The toxic filter's reading. Elements are a closed set, so there is
 * nothing to fold. Empty means no filter.
 */
export function elementArm(
  elements: readonly IngredientElement[] | undefined,
  own: SQLWrapper = ingredients.elements,
): SQL | undefined {
  if (!elements?.length) return undefined;
  const wanted = [...elements];
  return or(
    // Bound as one array through the column's encoder: an expression has none,
    // and Drizzle would otherwise spread the values into a row.
    arrayOverlaps(own, sql`${sql.param(wanted, ingredients.elements)}`),
    existsIn(
      ingredientVariants,
      and(
        eq(ingredientVariants.ingredientId, ingredients.id),
        arrayOverlaps(ingredientVariants.elements, wanted),
      ),
    ),
  );
}

/**
 * The entry holds a live variant whose form is any of `forms`, both sides
 * trimmed and lower-cased (MB.222, M11.22). A correlated `EXISTS` rather than
 * a join, so an entry is one row however many of its forms match, and the
 * count reads the rows the page does. Blank values are skipped, and none
 * means no filter.
 */
function formArm(forms: readonly string[] | undefined): SQL | undefined {
  const wanted = stated(forms);
  if (wanted.length === 0) return undefined;
  return existsIn(
    ingredientVariants,
    and(
      eq(ingredientVariants.ingredientId, ingredients.id),
      inArray(fold(ingredientVariants.form), wanted.map(fold)),
    ),
  );
}

/**
 * The entry holds a live link to any of the live curated deities `deityIds`
 * (MB.167, M11.22): a correlated `EXISTS`, so an entry linking two of them is
 * one row, answered by `ingredient_deities_deity_id_idx`. Empty means no
 * filter.
 */
function deityArm(deityIds: readonly string[] | undefined): SQL | undefined {
  if (!deityIds?.length) return undefined;
  return existsIn(
    ingredientDeities,
    and(
      eq(ingredientDeities.ingredientId, ingredients.id),
      inArray(ingredientDeities.deityId, deityIds),
      pointsLive(deities, ingredientDeities.deityId),
    ),
  );
}

/**
 * The curated row a link's `column` names is live, and so is its group:
 * what the facets' join to the same row reads, so a value the facets count
 * at nothing lists nothing. A curator cannot delete a row a compendium entry
 * links, but a coven's own entry keeps its link through the delete.
 */
export function pointsLive(
  vocabulary: typeof categories | typeof deities,
  column: AnyPgColumn,
): SQL {
  return existsIn(vocabulary, and(eq(vocabulary.id, column), inLiveGroup(vocabulary)));
}

/**
 * M11.21's two flags read together (M11.22): an entry is toxic when its own
 * flag is on or a live variant's is, and not toxic when neither is. The
 * variant's side is an `existsIn`, which skips a soft-deleted variant, so a
 * retired form's flag counts for nothing either way. Not toxic is the
 * negation of the same predicate rather than a second one, so the two
 * settings always split the list between them. Absent means any.
 */
export function toxicArm(toxic: IngredientFilter['toxic']): SQL | undefined {
  if (!toxic) return undefined;
  const flagged = or(
    eq(ingredients.toxic, true),
    existsIn(
      ingredientVariants,
      and(eq(ingredientVariants.ingredientId, ingredients.id), eq(ingredientVariants.toxic, true)),
    ),
  ) as SQL;
  return toxic === 'toxic' ? flagged : not(flagged);
}

/**
 * A curator's review mark (M14.8): true keeps the entries holding one, false
 * the ones without. Read off `curator_reviewed_at`, which a CHECK keeps set
 * exactly when `curator_reviewed_by` is. Absent means any.
 */
export function reviewArm(reviewed: IngredientFilter['reviewed']): SQL | undefined {
  if (reviewed === undefined) return undefined;
  return reviewed
    ? isNotNull(ingredients.curatorReviewedAt)
    : isNull(ingredients.curatorReviewedAt);
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
