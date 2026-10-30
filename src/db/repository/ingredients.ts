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
import { weightedSearch } from './weighted-search';
import type {
  SearchField,
  WeightedSearch,
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
 * The rows of an ingredient's child table (folk names, categories, variants and the rest) that belong to these ingredients themselves, not to one of their forms,
 * readable exactly when the parent is: live, and in the compendium or a coven one of `memberships` proves. No proofs reads the compendium alone.
 * With `heldBy`, a retired compendium entry that coven's cupboard names is read too (claude-docs/db/compendium-read.md, "Tier-scoped reads").
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
 * The live variant with this id, while its ingredient is live and in the compendium or a coven one of `memberships` proves: the form a jar may name.
 * With `heldBy`, also a live form of a retired compendium entry that coven still holds a live cupboard row for; no `heldBy` reads the live tiers alone (claude-docs/db/compendium-read.md, "Tier-scoped reads").
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
 * `findReadableVariant` for many ids in one statement, live tiers only: the forms a spell's new steps may lay.
 * An id that is not such a form is absent from the answer, so the caller compares lengths.
 */
export function findReadableVariants(
  memberships: readonly Membership[],
  ids: readonly string[],
): Promise<(typeof ingredientVariants.$inferSelect)[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return selectFrom(
    ingredientVariants,
    and(
      notSoftDeleted(ingredientVariants),
      inArray(ingredientVariants.id, [...ids]),
      inUseIngredientParent(memberships, ingredientVariants.ingredientId, undefined),
    ),
  );
}

/**
 * The live rows these variants own (one form's categories, say), readable exactly when the variant and its ingredient are.
 * Never by a bare id: a variant has no `workspace_id`, so its ingredient's tier is its only scope. With `heldBy`, as `findManyOfIngredients` reads with it (claude-docs/db/compendium-read.md, "Tier-scoped reads").
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
 * The live deities of these ingredients, each beside the curated deity it links while that deity is live under a live tradition, and null for a typed name
 * or a deity since retired. Readable exactly when the parent is, `heldBy` included. Unordered; a caller sorts by `position` (claude-docs/db/compendium-read.md, "Tier-scoped reads").
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
 * The live substitutes of these ingredients, or of these variants (`of` says which the ids name), each beside the ingredient it links, soft-deleted or not,
 * or null for a typed name. The escape hatch that skips the linked ingredient's filter and no other, so a link to a deleted ingredient reads as its last name
 * (claude-docs/db/soft-delete.md, "Soft-delete filtering"); the parent must be live and readable, and the link must point where its readers may look (claude-docs/db/compendium-read.md, "Tier-scoped reads").
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
 * One page of the live ingredients, in the compendium or a coven one of `memberships` proves, whose display name, formal name or a live folk name is trigram-similar
 * to `name`, best match first, keyed `[-score, name]`, each carrying its score. No proofs reads the compendium alone. The three matches are a `UNION ALL` under
 * `id IN (...)`, not an `OR` beside the scope, which Postgres cannot plan as a join (claude-docs/db/compendium-read.md, "Ingredient suggestions").
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
 * One page of the compendium under `filter`: the public list, so no proof (claude-docs/db/compendium-read.md, "The compendium read").
 * A search pages `(score DESC, position, name, id)` and carries each row's score; a list without one pages `(name, id)` with a null score.
 */
export function findCompendiumPage(
  filter: IngredientFilter,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  const list = compendiumList(filter);
  return findPageInTiers([], ingredients, list.order, page, list.arms);
}

/**
 * How many rows the compendium holds under `filter`, and how many come before `start` in its pages' order, null with no `start`.
 * One statement over the page's own filter, key and search join (claude-docs/db/compendium-read.md, "The compendium read").
 */
export function findCompendiumCount(
  filter: IngredientFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const list = compendiumList(filter);
  return findPageCountInTiers([], ingredients, list.order, start, list.arms);
}

/**
 * One page of a coven's ingredients under `filter`: its own live entries, and every compendium entry its live cupboard rows name, a retired one included.
 * Matched, ordered and keyed as the compendium is, but under the proof, over the coven's overrides, and with each entry's cupboard row beside it,
 * null for the coven's own (claude-docs/db/stock.md, "The workspace ingredient list").
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
 * How many rows a coven's ingredient list holds under `filter`, and how many come before `start` in its pages' order: the twin of `findCompendiumCount`
 * over the same arms and the coven's scope, so the count and the page cannot disagree.
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
 * Which rows a coven's ingredient list holds: its own live entries, and the compendium entries a live cupboard row of its names, including a retired one the coven still holds.
 * The scope carries the tombstone filters itself, so its readers page it without one, and the page and the facets both read it (claude-docs/db/compendium-read.md, "The coven list scope").
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
 * The `inStock` filter: the coven holds a live jar of the row, of a live form, and the jar is not at 0. A jar with no quantity is held unweighed,
 * so it is an `OR` with null rather than `<> 0` alone, which SQL reads as unknown for null (claude-docs/db/compendium-read.md, "The coven list scope").
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
 * The `lowStockOnly` filter: the coven holds a live jar of the row, of a live form, badged Out of Stock (at 0) or Low Stock (above 0, at or below a threshold above 0).
 * A jar with no quantity never matches. The same rule as `stockState` in `src/components/StockBadge/stock-state.ts`; `tests/support/jar-states.ts` is the list both are tested against.
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

/** How many entries each group of the substitute picker offers: an estimate, tuned in the e2e test. */
const SUGGESTION_GROUP_LIMIT = 8;

/**
 * The substitute picker's rows, in two groups: `yours` (the coven's own live entries and the compendium entries it holds, found by its label as well as the compendium's name)
 * and `compendium` (every other live compendium entry). An entry is in one group and a retired one in neither; each group is matched and ordered as the compendium search is,
 * cut at `SUGGESTION_GROUP_LIMIT`, `yours` first, each row carrying its `group` (claude-docs/db/compendium-read.md, "Ingredient suggestions").
 */
export async function findIngredientSuggestions(
  membership: Membership,
  query: string,
  page: PageRequest,
  form?: string,
  categoryIds?: readonly string[],
): Promise<PageEntry<IngredientRow, CompendiumScore & SuggestionGroupTag>[]> {
  const list = compendiumList({ query, categoryIds, categoryMode: 'any' }, membership);
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
 * One live ingredient by id, in the compendium or in a coven one of `memberships` proves, `undefined` otherwise: also the answer for a coven's row asked for without its proof,
 * so a caller holding an id it saw elsewhere learns nothing from the difference. No proofs reads the compendium alone, as a signed-out request does.
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
 * A live compendium entry's review mark, for a curator: when it was last marked reviewed, `null` once cleared; `undefined` when `id` names no live compendium entry.
 * The one read of the mark, which every other finder leaves off the row (`unread-columns.ts`). The time is epoch milliseconds, since a column inside an aggregate loses Drizzle's date mapping.
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
 * The live ingredients among these ids, in the compendium or in a coven one of `memberships` proves, in no particular order: a loader's batch read.
 * An id in a coven with no proof, or soft-deleted, is absent. No proofs reads the compendium alone.
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
 * The live compendium entry keyed as `identity` would be (the row a compendium write carrying it collides with), or `undefined`.
 * The key is the formal name, or the label without one, compared through the generated column's own expression so both sides fold alike.
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
 * What a compendium page and its count share: the filter's arms, and the key with the search's join, so the count reads the rows the pages hold in the order they hold them.
 * A search keys `[-rank, position, name]`; a browse keys `[name]` (claude-docs/db/compendium-read.md, "Search ranking").
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
 * The In My Covens filter: a compendium entry some live cupboard row of one of the proofs' covens names. A removed row does not hold the entry,
 * and a coven's own entries never match, as the compendium lists none.
 */
function heldInAnyOf(memberships: readonly Membership[]): SQL {
  return and(inCompendium(ingredients), heldBy(memberships)) as SQL;
}

/**
 * Its Not In: a compendium entry no live cupboard row of the proofs' covens names. A removed row does not hold the entry, so it stays listed.
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
 * The name, elements, celestial bodies and zodiac signs a list reads. Under a coven's proof each is `coalesce(cupboard row's, entry's)`, so an override sorts, filters and counts
 * where the coven put it, and a cleared empty list matches nothing; without a proof each is the entry's column. Raw SQL, since `coalesce` has no builder (claude-docs/db/compendium-read.md, "The coven list scope").
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
 * How much a match in each field counts towards a search's rank: the query's word similarity to the field, times the field's weight.
 * Each field has its own, so a boost on the label alone does not leave a formal name, a folk name, a form and a description tied (claude-docs/db/compendium-read.md, "The compendium read").
 */
const SEARCH_WEIGHTS = {
  name: 1,
  canonicalName: 0.9,
  folkName: 0.8,
  form: 0.6,
  description: 0.2,
} as const;

/**
 * The rows matching a search, as a relation to join, each row's rank, and where its best field holds the query. A row matches when the query is word-similar (`<%`)
 * to its label, formal name, a live folk name, or the form or description of a live variant, each side accent-folded so the expression indexes answer it; blank means no search.
 * One `UNION ALL` arm per field, ranked by the best arm (claude-docs/db/compendium-read.md, "Search ranking").
 */
function searchMatch(
  query: string | undefined,
  cupboardOf?: Membership,
): WeightedSearch | undefined {
  const trimmed = query?.trim();
  if (!trimmed) return undefined;
  const candidate = alias(ingredients, 'candidate');
  const entries = sql`${ingredients} as ${candidate}`;
  const fields: SearchField[] = [
    { id: candidate.id, text: candidate.name, weight: SEARCH_WEIGHTS.name, from: entries },
    {
      id: candidate.id,
      text: candidate.canonicalName,
      weight: SEARCH_WEIGHTS.canonicalName,
      from: entries,
    },
    {
      id: ingredientFolkNames.ingredientId,
      text: ingredientFolkNames.name,
      weight: SEARCH_WEIGHTS.folkName,
      from: ingredientFolkNames,
      live: notSoftDeleted(ingredientFolkNames),
    },
    {
      id: ingredientVariants.ingredientId,
      text: ingredientVariants.form,
      weight: SEARCH_WEIGHTS.form,
      from: ingredientVariants,
      live: notSoftDeleted(ingredientVariants),
    },
    {
      id: ingredientVariants.ingredientId,
      text: ingredientVariants.description,
      weight: SEARCH_WEIGHTS.description,
      from: ingredientVariants,
      live: notSoftDeleted(ingredientVariants),
    },
    // With a coven's proof, a sixth arm: the label that coven gave a compendium entry it holds,
    // ranked as a label is. That coven's live rows only.
    ...(cupboardOf
      ? [
          {
            id: workspaceCompendiumEntries.ingredientId,
            text: workspaceCompendiumEntries.label,
            weight: SEARCH_WEIGHTS.name,
            from: workspaceCompendiumEntries,
            live: and(
              scopedTo(cupboardOf, workspaceCompendiumEntries),
              notSoftDeleted(workspaceCompendiumEntries),
            ),
          },
        ]
      : []),
  ];
  return weightedSearch(trimmed, fields, ingredients.id);
}

/**
 * The entry shows no reference, on itself or on any of its live forms: the admin's to-do list. An entry whose only source is on its oil is sourced, so it is not on the list.
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
 * The entry has no live form: the admin's to-do list of entries nobody can stock or put in a spell yet. A soft-deleted variant is none, through `existsIn`.
 */
export function hasNoForm(): SQL {
  return not(existsIn(ingredientVariants, eq(ingredientVariants.ingredientId, ingredients.id)));
}

/**
 * The category filter: under `all` one correlated `EXISTS` per id, so an entry carries every one; under `any` a single `EXISTS` over the list.
 * The category may be filed on the entry or on a live form, and the variant's liveness is read here; the category itself must be live too, through `pointsLive` (claude-docs/db/compendium-read.md, "Filter arms").
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
 * A category pair counts: it is the entry's own, or its variant is live. The table is hard-deleted, so a pair outlives the soft-deleted variant it belongs to.
 * Takes the pair's column, so an aliased read of the table can ask too.
 */
export function pairIsLive(pair: { variantId: AnyPgColumn }): SQL | undefined {
  return or(
    isNull(pair.variantId),
    existsIn(ingredientVariants, eq(ingredientVariants.id, pair.variantId)),
  );
}

/**
 * The values of a list filter that say something, blank ones dropped, so `['', 'Mars']` filters by Mars and `[' ']` by nothing.
 * They are not folded here: the fold stays in SQL, beside the column's own.
 */
export function stated(values: readonly string[] | undefined): string[] {
  return (values ?? []).filter((value) => value.trim() !== '');
}

/**
 * `list` holds an entry folding to any of `values`, both sides trimmed and lower-cased as the suggestions fold one. One `IN` per value, ORed, rather than an array overlap,
 * since the list's side is folded entry by entry (`listFolds`). Blank values are skipped, and none means no filter.
 */
function listArm(list: SQLWrapper, values: readonly string[] | undefined): SQL | undefined {
  const wanted = stated(values);
  if (wanted.length === 0) return undefined;
  return or(...wanted.map((value) => listHolds(list, value)));
}

/**
 * `list` holds an entry folding as `value` does: one value of `listArm`, and how a facet matches a curated row's name to the list.
 */
export function listHolds(list: SQLWrapper, value: SQLWrapper | string): SQL {
  return inArray(fold(value), listFolds(list));
}

/**
 * The entry's own `elements` list, or a live variant's, holds any of `elements`: an array overlap on each side, the variant's a correlated `EXISTS` that skips a soft-deleted form.
 * Elements are a closed set, so there is nothing to fold. Empty means no filter.
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
 * The entry holds a live variant whose form is any of `forms`, both sides trimmed and lower-cased. A correlated `EXISTS` rather than a join, so an entry is one row
 * however many of its forms match. Blank values are skipped, and none means no filter.
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
 * The entry holds a live link to any of the live curated deities `deityIds`: a correlated `EXISTS`, so an entry linking two is one row, answered by
 * `ingredient_deities_deity_id_idx`. Empty means no filter.
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
 * The curated row a link's `column` names is live, and so is its group: what the facets' join to the same row reads, so a value the facets count at nothing lists nothing.
 * A curator cannot delete a row a compendium entry links, but a coven's own entry keeps its link through the delete.
 */
export function pointsLive(
  vocabulary: typeof categories | typeof deities,
  column: AnyPgColumn,
): SQL {
  return existsIn(vocabulary, and(eq(vocabulary.id, column), inLiveGroup(vocabulary)));
}

/**
 * The two toxic flags read together: an entry is toxic when its own flag is on or a live variant's is, and not toxic when neither is.
 * Not toxic is the negation of the same predicate, so the two settings always split the list between them. Absent means any.
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
 * A curator's review mark: true keeps the entries holding one, false the ones without. Read off `curator_reviewed_at`, which a CHECK keeps set exactly when
 * `curator_reviewed_by` is. Absent means any.
 */
export function reviewArm(reviewed: IngredientFilter['reviewed']): SQL | undefined {
  if (reviewed === undefined) return undefined;
  return reviewed
    ? isNotNull(ingredients.curatorReviewedAt)
    : isNull(ingredients.curatorReviewedAt);
}

/**
 * The entry holds a live variant that picked the curated form `formId`: any of its forms, so a form's delete is held by every entry carrying it.
 * A correlated `EXISTS`, answered by `ingredient_variants_form_id_idx`. Absent means no filter.
 */
function pickedFormArm(formId: string | undefined): SQL | undefined {
  if (!formId) return undefined;
  return existsIn(
    ingredientVariants,
    and(eq(ingredientVariants.ingredientId, ingredients.id), eq(ingredientVariants.formId, formId)),
  );
}
