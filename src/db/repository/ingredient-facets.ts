import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { Membership } from '@/modules/coven';
import { ingredientCategories } from '../../modules/ingredients/schema/ingredient-categories';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { INGREDIENT_ELEMENTS } from '../../modules/ingredients/schema/ingredient-enums';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { celestialBodies, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import { categories, categoryGroups } from '../../modules/vocabulary/schema/categories';
import { deities, deityTraditions } from '../../modules/vocabulary/schema/deities';
import { ingredientForms } from '../../modules/vocabulary/schema/ingredient-forms';
import {
  citesNowhere,
  compendiumList,
  elementArm,
  hasNoForm,
  listColumns,
  listHolds,
  pairIsLive,
  stated,
  reviewArm,
  toxicArm,
  workspaceListScopeIncludingSoftDeleted,
} from './ingredients';
import { fold, naturally, readableInTiers } from './predicates';
import { selectFrom } from './select';
import { curated, inLiveGroup } from './vocabularies';
import type {
  Aggregate,
  CompendiumFacets,
  FacetCount,
  IngredientFacets,
  IngredientFilter,
  ListColumns,
  ReviewFacetValue,
  WorkspaceIngredientFacets,
} from './types';

// How many entries each value of each filter kind would list. A kind
// is counted under the list's own filter minus that kind's own choice, read
// through the list's own arms, so a facet cannot match differently from the
// list it narrows. One grouped read per kind, the seven run side by side,
// and for the compendium an eighth, its two switch counts (No Refs and No Form)
// (claude-docs/db/compendium-read.md).

/**
 * How many compendium entries each filter value would list under the rest of
 * `filter` — the public list, so no proof. A value's count is what
 * `findCompendiumCount` reads with that value as its kind's only choice; a
 * category under `all` is counted with the chosen ones beside it.
 *
 * Zodiac signs and celestial bodies list every live curated row, by position
 * (nulls last) then name, and elements and toxic every setting, zeros
 * included, in the vocabulary's own order. Forms, deities and categories list
 * the values some entry carries, and every chosen one, at zero if none does,
 * alphabetically in natural-language order and never by count: a category by
 * group then name, a deity by tradition then name. A form is spelled
 * as the live curated form folding the same, else as its counted variants most
 * often spell it, ties alphabetically.
 *
 * `withoutReferences` is how many entries cite no live reference, on
 * themselves or a live form, under the rest of the filter: the filter's own
 * `withoutReferences` is set to true for it, so the count is the same whether
 * the switch is on or off. `withoutForms` is the same for the No Form switch:
 * how many entries have no live form. Both come from one read.
 *
 * `withReview` is whether to read the Reviewed counts, a curator's
 * alone: false sends no statement for them and answers `reviewed: null`.
 */
export async function findCompendiumFacets(
  filter: IngredientFilter,
  withReview = true,
): Promise<CompendiumFacets> {
  const scope = readableInTiers([], ingredients);
  const [facets, switches, reviewed] = await Promise.all([
    readFacets(filter, scope),
    switchCounts(filter, scope),
    withReview ? reviewFacet(filter, scope) : Promise.resolve(null),
  ]);
  return { ...facets, ...switches, reviewed };
}

/**
 * How many of a coven's ingredients each filter value would list: the
 * rows `findWorkspaceIngredientPage` reads, a retired compendium entry the
 * coven still holds included, counted as `findCompendiumFacets`
 * counts the compendium's, over the coven's overrides: an entry's
 * elements, celestial bodies and zodiac signs are counted as its cupboard row
 * states them, an empty list under none. Categories have no override, so
 * they stay the compendium's.
 */
export async function findWorkspaceIngredientFacets(
  membership: Membership,
  filter: IngredientFilter,
): Promise<WorkspaceIngredientFacets> {
  // The seven kinds and the switch count under the filter's own source and
  // jars; the source strip under its jars only, and the switch under its source.
  const [facets, source, inStock, lowStockOnly] = await Promise.all([
    readFacets(filter, workspaceListScopeIncludingSoftDeleted(membership, filter), membership),
    sourceFacet(filter, membership, (value) =>
      workspaceListScopeIncludingSoftDeleted(membership, { ...filter, source: value }),
    ),
    totalUnder(
      filter,
      workspaceListScopeIncludingSoftDeleted(membership, { ...filter, inStock: true }),
      membership,
    ),
    totalUnder(
      filter,
      workspaceListScopeIncludingSoftDeleted(membership, { ...filter, lowStockOnly: true }),
      membership,
    ),
  ]);
  return { ...facets, source, inStock, lowStockOnly };
}

/**
 * Local, then compendium, each counted as the list totals with that source
 * the only one chosen. Both always read, at zero if need be, so the strip
 * never loses a segment.
 */
async function sourceFacet(
  filter: IngredientFilter,
  membership: Membership,
  scopeOf: (value: 'local' | 'compendium') => SQL | undefined,
): Promise<WorkspaceIngredientFacets['source']> {
  const values = ['local', 'compendium'] as const;
  const counts = await Promise.all(
    values.map((value) => totalUnder(filter, scopeOf(value), membership)),
  );
  return values.map((value, index) => ({ value, count: counts[index] }));
}

/** How many entries `filter`'s search arms hold within `scope`. */
async function totalUnder(
  filter: IngredientFilter,
  scope: SQL | undefined,
  membership?: Membership,
): Promise<number> {
  const { where, over } = listed(filter, scope, membership);
  const [row] = await selectFrom(ingredients, where, {
    aggregate: { count: sql<number>`count(*)::int` },
    over,
  });
  return row.count;
}

/**
 * Every kind's counts over the rows `scope` holds, the seven reads at once,
 * under `membership`'s overrides where there is one.
 */
async function readFacets(
  filter: IngredientFilter,
  scope: SQL | undefined,
  membership?: Membership,
): Promise<IngredientFacets> {
  const columns = listColumns(membership);
  const read = { scope, membership };
  const [forms, deityCounts, categoryCounts, signs, bodies, elements, { toxic, orders }] =
    await Promise.all([
      formFacet(filter, read),
      deityFacet(filter, read),
      categoryFacet(filter, read),
      listFacet(zodiacSigns, columns.zodiacSigns, { ...filter, zodiacSigns: undefined }, read),
      listFacet(
        celestialBodies,
        columns.celestialBodies,
        { ...filter, celestialBodies: undefined },
        read,
      ),
      elementFacet(filter, read, columns),
      toxicFacet(filter, read),
    ]);
  return {
    forms,
    deities: withZeros(deityCounts, orders.deities),
    categories: withZeros(categoryCounts, orders.categories),
    zodiacSigns: signs,
    celestialBodies: bodies,
    elements,
    toxic,
  };
}

/** The rows a facet counts: the list's scope, and the proof whose overrides it reads, if any. */
interface FacetRead {
  scope: SQL | undefined;
  membership?: Membership;
}

/**
 * The list's `where` under `filter` within `scope`, and its search join, its
 * cupboard join under a proof, and its threshold.
 */
function listed(
  filter: IngredientFilter,
  scope: SQL | undefined,
  membership?: Membership,
): { where: SQL | undefined; over: Aggregate<never>['over'] } {
  const list = compendiumList(filter, membership);
  return { where: and(scope, list.arms), over: list.order };
}

/** How many distinct entries a group holds, however many of its rows each joins. */
const entries = sql<number>`count(distinct ${ingredients.id})::int`;

/**
 * Forms, grouped by the fold `formArm` matches on, over each entry's live
 * variants. Each group reads the live curated form folding the same, the
 * spellings its variants use, and which chosen forms fold to it, so a chosen
 * form is matched to its group by Postgres's fold rather than JavaScript's.
 * The chosen forms are compared with the fold of the group's `min` form,
 * which every form in it shares: Postgres takes no grouped expression inside
 * a subquery, but takes an aggregate of the outer read's columns.
 */
async function formFacet(
  filter: IngredientFilter,
  { scope, membership }: FacetRead,
): Promise<FacetCount[]> {
  const chosen = stated(filter.forms);
  const { where, over } = listed({ ...filter, forms: undefined }, scope, membership);
  const variant = alias(ingredientVariants, 'facet_variant');
  const key = fold(variant.form);
  const choice = sql.identifier('choice');
  const groups = await selectFrom(ingredients, where, {
    aggregate: {
      count: entries,
      curated: sql<string | null>`min(${ingredientForms.name})`,
      spellings: sql<string[]>`array_agg(btrim(${variant.form}))`,
      chosen:
        chosen.length > 0
          ? sql<string[]>`array(select ${choice} from unnest(array[${sql.join(
              chosen.map((form) => sql`${form}`),
              sql`, `,
            )}]::text[]) as ${choice} where ${fold(choice)} = ${fold(sql`min(${variant.form})`)})`
          : sql<string[]>`array[]::text[]`,
    },
    over,
    joins: [
      { type: 'inner', table: variant, on: eq(variant.ingredientId, ingredients.id) },
      {
        type: 'left',
        table: ingredientForms,
        on: and(eq(fold(ingredientForms.name), key), inLiveGroup(ingredientForms)),
      },
    ],
    groupBy: [key],
  });
  const matched = new Set(groups.flatMap((group) => group.chosen));
  const counted = groups.map((group) => ({
    value: group.curated ?? mostUsed(group.spellings),
    count: group.count,
  }));
  return alphabetical([
    ...counted,
    ...[...new Set(chosen.filter((form) => !matched.has(form)))].map((value) => ({
      value,
      count: 0,
    })),
  ]);
}

/** Deities, by the curated row each live link names; a link to a deleted deity counts for none. */
async function deityFacet(
  filter: IngredientFilter,
  { scope, membership }: FacetRead,
): Promise<Counted> {
  const { where, over } = listed({ ...filter, deityIds: undefined }, scope, membership);
  const link = alias(ingredientDeities, 'facet_link');
  const counted = await selectFrom(ingredients, where, {
    aggregate: { value: sql<string>`${deities.id}`, count: entries },
    over,
    joins: [
      { type: 'inner', table: link, on: eq(link.ingredientId, ingredients.id) },
      {
        type: 'inner',
        table: deities,
        on: and(eq(deities.id, link.deityId), inLiveGroup(deities)),
      },
      { type: 'inner', table: deityTraditions, on: eq(deityTraditions.id, deities.traditionId) },
    ],
    groupBy: [deities.id, deityTraditions.id],
    orderBy: [naturally(deityTraditions.name), naturally(deities.name), deities.id],
  });
  return { counted, zeros: unmatched(filter.deityIds, counted) };
}

/**
 * Categories, by the live category each counting pair names, on the entry or
 * a live form. Under `all` the chosen categories stay in the filter, so each
 * count is the chosen ones and that one together; under `any` they leave it.
 */
async function categoryFacet(
  filter: IngredientFilter,
  { scope, membership }: FacetRead,
): Promise<Counted> {
  const rest = filter.categoryMode === 'any' ? { ...filter, categoryIds: undefined } : filter;
  const { where, over } = listed(rest, scope, membership);
  const pair = alias(ingredientCategories, 'facet_pair');
  const counted = await selectFrom(ingredients, where, {
    aggregate: { value: sql<string>`${categories.id}`, count: entries },
    over,
    joins: [
      {
        type: 'inner',
        table: pair,
        on: and(eq(pair.ingredientId, ingredients.id), pairIsLive(pair)),
      },
      {
        type: 'inner',
        table: categories,
        on: and(eq(categories.id, pair.categoryId), inLiveGroup(categories)),
      },
      { type: 'inner', table: categoryGroups, on: eq(categoryGroups.id, categories.groupId) },
    ],
    groupBy: [categories.id, categoryGroups.id],
    orderBy: [naturally(categoryGroups.name), naturally(categories.name), categories.id],
  });
  return { counted, zeros: unmatched(filter.categoryIds, counted) };
}

/**
 * A flat vocabulary's every live row, each with how many entries' `list`
 * holds its name under the fold `listArm` matches by. A right join, so a row
 * no entry holds still reads, at zero: the entries' scope and arms sit in its
 * `on` rather than the `where`, which would drop those rows, and the `where`
 * holds the vocabulary's own filter.
 */
function listFacet(
  vocabulary: typeof zodiacSigns | typeof celestialBodies,
  list: ListColumns['zodiacSigns'],
  filter: IngredientFilter,
  { scope, membership }: FacetRead,
): Promise<FacetCount[]> {
  const { where, over } = listed(filter, scope, membership);
  return selectFrom(ingredients, curated(vocabulary), {
    aggregate: {
      value: sql<string>`${vocabulary.name}`,
      count: sql<number>`count(${ingredients.id})::int`,
    },
    over,
    joins: [{ type: 'right', table: vocabulary, on: and(listHolds(list, vocabulary.name), where) }],
    groupBy: [vocabulary.id, vocabulary.name],
    orderBy: [
      sql`${vocabulary.position} asc nulls last`,
      naturally(vocabulary.name),
      vocabulary.id,
    ],
  });
}

/** Each element, in `INGREDIENT_ELEMENTS`' order, counted by `elementArm` in one pass. */
async function elementFacet(
  filter: IngredientFilter,
  { scope, membership }: FacetRead,
  columns: ListColumns,
): Promise<IngredientFacets['elements']> {
  const { where, over } = listed({ ...filter, elements: undefined }, scope, membership);
  const [row] = await selectFrom(ingredients, where, {
    aggregate: Object.fromEntries(
      INGREDIENT_ELEMENTS.map((element) => [
        element,
        countWhere(elementArm([element], columns.elements)),
      ]),
    ) as Record<(typeof INGREDIENT_ELEMENTS)[number], SQL<number>>,
    over,
  });
  return INGREDIENT_ELEMENTS.map((value) => ({ value, count: row[value] }));
}

/** Toxic, then not toxic, each counted by `toxicArm` in one pass. */
async function toxicFacet(
  filter: IngredientFilter,
  { scope, membership }: FacetRead,
): Promise<{ toxic: IngredientFacets['toxic']; orders: Orders }> {
  const { where, over } = listed({ ...filter, toxic: undefined }, scope, membership);
  const [row] = await selectFrom(ingredients, where, {
    aggregate: {
      // Carried here because this read always returns its one row, which a
      // grouped read of no entries does not (see `Orders`).
      deities: rankOf(deities, deityTraditions, deities.traditionId, filter.deityIds),
      categories: rankOf(categories, categoryGroups, categories.groupId, filter.categoryIds),
      toxic: countWhere(toxicArm('toxic')),
      notToxic: countWhere(toxicArm('not_toxic')),
    },
    over,
  });
  return {
    toxic: [
      { value: 'toxic', count: row.toxic },
      { value: 'not_toxic', count: row.notToxic },
    ],
    orders: { deities: row.deities, categories: row.categories },
  };
}

/**
 * How many entries the list holds with the No Refs switch on, and with the No
 * Form switch on, each under the rest of the filter, in one pass. The pass
 * reads the list with both switches off and counts each arm beside the other
 * switch's own setting, so a switch the filter has on narrows the other's
 * count as it narrows the list.
 */
async function switchCounts(
  filter: IngredientFilter,
  scope: SQL | undefined,
): Promise<Pick<CompendiumFacets, 'withoutReferences' | 'withoutForms'>> {
  const { where, over } = listed(
    { ...filter, withoutReferences: false, withoutForms: false },
    scope,
  );
  const [row] = await selectFrom(ingredients, where, {
    aggregate: {
      withoutReferences: countWhere(
        and(citesNowhere(), filter.withoutForms ? hasNoForm() : undefined),
      ),
      withoutForms: countWhere(
        and(hasNoForm(), filter.withoutReferences ? citesNowhere() : undefined),
      ),
    },
    over,
  });
  return row;
}

/**
 * How many entries are reviewed and how many need review, in one pass
 * under the rest of the filter, the Reviewed setting left out as each strip's
 * own is.
 */
async function reviewFacet(
  filter: IngredientFilter,
  scope: SQL | undefined,
): Promise<FacetCount<ReviewFacetValue>[]> {
  const { where, over } = listed({ ...filter, reviewed: undefined }, scope);
  const [row] = await selectFrom(ingredients, where, {
    aggregate: {
      reviewed: countWhere(reviewArm(true)),
      needsReview: countWhere(reviewArm(false)),
    },
    over,
  });
  return [
    { value: 'reviewed', count: row.reviewed },
    { value: 'needs_review', count: row.needsReview },
  ];
}

/** How many of the read's rows `arm` holds. `filter` has no builder. */
function countWhere(arm: SQL | undefined): SQL<number> {
  return sql<number>`(count(*) filter (where ${arm}))::int`;
}

/** The chosen ids no counted value is, compared case-blind as a uuid compares. */
function unmatched(chosen: readonly string[] | undefined, counted: FacetCount[]): string[] {
  const found = new Set(counted.map(({ value }) => value.toLowerCase()));
  return (chosen ?? []).filter((id) => !found.has(id.toLowerCase()));
}

/** A grouped kind's counted values, in SQL order, and the chosen ones counting nothing. */
interface Counted {
  counted: FacetCount[];
  zeros: string[];
}

/**
 * Every live id of a grouped kind in listing order, as `rankOf` reads it; empty
 * where nothing is chosen, since only a chosen value can count zero.
 */
interface Orders {
  deities: string[];
  categories: string[];
}

/**
 * The counted values, already in SQL order, and the unmatched chosen ones at
 * zero in their own place in it, not last: `order` lists every live id as the
 * facet sorts them, and the lot is sorted by position in it. With no zero the
 * SQL order stands.
 */
function withZeros({ counted, zeros }: Counted, order: readonly string[]): FacetCount[] {
  if (zeros.length === 0) return counted;
  const all = [...counted, ...[...new Set(zeros)].map((value) => ({ value, count: 0 }))];
  const at = new Map(order.map((id, index) => [id, index]));
  // A chosen id no live row holds sorts last, by code unit.
  const place = (value: string) => at.get(value) ?? order.length;
  return all.sort((a, b) => place(a.value) - place(b.value) || byCodeUnit(a.value, b.value));
}

/**
 * Every live id of `items` as a subquery lists them: group or tradition name,
 * then name, both naturally, then id. Read only when `chosen` holds something;
 * it sits in a read that always returns a row, because the zero-count place of
 * a chosen value must come without a read of its own (the facet reads have a
 * fixed query budget).
 */
function rankOf(
  items: typeof categories | typeof deities,
  groups: typeof categoryGroups | typeof deityTraditions,
  groupId: AnyPgColumn,
  chosen: readonly string[] | undefined,
): SQL<string[]> {
  if (!chosen || chosen.length === 0) return sql<string[]>`array[]::text[]`;
  return sql<
    string[]
  >`array(select ${items.id}::text from ${items} inner join ${groups} on ${groups.id} = ${groupId} where ${isNull(items.deletedAt)} order by ${naturally(groups.name)}, ${naturally(items.name)}, ${items.id})`;
}

/**
 * `facets` sorted by value in natural-language order, ties by code unit. The
 * forms list is sorted here rather than in SQL because its values are settled
 * in code: a form chosen in the filter that no entry in the current results
 * uses joins the list here with a count of zero, and a group's label is
 * picked by `mostUsed`. ICU's English collation (`Intl.Collator`) gives the
 * order `NATURAL_COLLATION` gives the other kinds.
 */
function alphabetical(facets: FacetCount[]): FacetCount[] {
  const collator = new Intl.Collator('en-US');
  return facets.sort((a, b) => collator.compare(a.value, b.value) || byCodeUnit(a.value, b.value));
}

/** The spelling used most often, ties going to the one that sorts first. */
function mostUsed(spellings: readonly string[]): string {
  const uses = new Map<string, number>();
  for (const spelling of spellings) uses.set(spelling, (uses.get(spelling) ?? 0) + 1);
  const [[spelling]] = [...uses].sort(([a, m], [b, n]) => n - m || byCodeUnit(a, b));
  return spelling;
}

/** Code-unit order, the same on every server whatever its locale. */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
