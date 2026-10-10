import {
  type SQL,
  type SQLWrapper,
  and,
  eq,
  getTableName,
  inArray,
  ne,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { planets, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import { categories, categoryGroups } from '../../modules/vocabulary/schema/categories';
import { deities, deityTraditions } from '../../modules/vocabulary/schema/deities';
import {
  ingredientFormGroups,
  ingredientForms,
} from '../../modules/vocabulary/schema/ingredient-forms';
import type { Membership } from '@/modules/coven';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { findPage, findPageCount } from './finders';
import { containsText, fold, notSoftDeleted, readableInTiers, trigramMatch } from './predicates';
import { existsIn, selectFrom } from './select';
import { claimantList, readSuggestionPage } from './suggestion-page';
import type {
  AstrologyValueFilter,
  AstrologyVocabulary,
  CategoryFilter,
  DeityFilter,
  DeitySuggestion,
  FormSuggestion,
  IngredientFormValueFilter,
  InUseSource,
  ListedVocabulary,
  ListOrder,
  SortColumn,
  SuggestingVocabulary,
  VocabularySuggestion,
} from './types';

/**
 * One page of the curated form vocabulary under `filter` in `(name, id)`
 * order, for `ingredientFormValues` and the admin list: the live forms whose
 * group is live too, which is what "curated" means to
 * `findVocabularySuggestions` as well, with the group's `deleted_at` read by
 * the builder's correlated `EXISTS`. Public reference data, so no proof
 * (claude-docs/db/compendium-read.md, "The compendium read").
 */
export function findIngredientFormValues(
  filter: IngredientFormValueFilter,
  page: PageRequest,
): Promise<PageEntry<typeof ingredientForms.$inferSelect>[]> {
  return findPage(
    ingredientForms,
    [ingredientForms.name],
    page,
    vocabularyArms(ingredientForms, filter),
  );
}

/**
 * How many forms `findIngredientFormValues` pages under `filter`, and how
 * many come before `start` in its order — "Page X of Y" on the admin page
 * (M5.6a) and `ingredientFormValues`' `totalCount`, as `findCategoryCount`
 * counts the categories: one statement, over the page's own filter and key.
 */
export function findIngredientFormValueCount(
  filter: IngredientFormValueFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(
    ingredientForms,
    [ingredientForms.name],
    start,
    vocabularyArms(ingredientForms, filter),
  );
}

/**
 * One page of a curated astrology vocabulary under `filter` in `(name, id)`
 * order, for `planets`, `zodiacSigns` and their admin lists (MB.95): its
 * live rows, since a flat vocabulary has no group to be curated under.
 * Public reference data, so no proof.
 */
export function findAstrologyValues<TVocabulary extends AstrologyVocabulary>(
  vocabulary: TVocabulary,
  filter: AstrologyValueFilter,
  page: PageRequest,
): Promise<PageEntry<TVocabulary['$inferSelect']>[]> {
  return findPage(vocabulary, [vocabulary.name], page, vocabularyArms(vocabulary, filter));
}

/**
 * How many rows `findAstrologyValues` pages under `filter`, and how many come
 * before `start` in its order: "Page X of Y", as `findIngredientFormValueCount`
 * counts the forms.
 */
export function findAstrologyValueCount(
  vocabulary: AstrologyVocabulary,
  filter: AstrologyValueFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(vocabulary, [vocabulary.name], start, vocabularyArms(vocabulary, filter));
}

/**
 * One page of the category vocabulary under `filter`, by its group's name,
 * then its own, then id, for `categories` and the admin list: the live
 * categories whose group is live too, read as `findIngredientFormValues`
 * reads the forms. Public reference data, so no proof.
 */
export function findCategoryPage(
  filter: CategoryFilter,
  page: PageRequest,
): Promise<PageEntry<typeof categories.$inferSelect>[]> {
  return findPage(categories, CATEGORY_ORDER, page, vocabularyArms(categories, filter));
}

/**
 * How many categories `findCategoryPage` pages under `filter`, and how many
 * come before `start` in its order — the position of the page whose first row
 * `start` is, null with none: "Page X of Y" on the admin page and
 * `categories`' `totalCount`. One statement, over the page's own filter and key.
 */
export function findCategoryCount(
  filter: CategoryFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(categories, CATEGORY_ORDER, start, vocabularyArms(categories, filter));
}

/**
 * One page of the deity vocabulary under `filter`, by its tradition's name,
 * then its own, then id, for the admin's deities page (MB.132): the live
 * deities whose tradition is live too, read as `findCategoryPage` reads the
 * categories, so a page lists each deity under its tradition. Public
 * reference data, so no proof.
 */
export function findDeityPage(
  filter: DeityFilter,
  page: PageRequest,
): Promise<PageEntry<typeof deities.$inferSelect>[]> {
  return findPage(deities, DEITY_ORDER, page, deityArms(filter));
}

/**
 * How many deities `findDeityPage` pages under `filter`, and how many come
 * before `start` in its order: "Page X of Y", as `findCategoryCount` counts
 * the categories, over the page's own filter and key.
 */
export function findDeityCount(filter: DeityFilter, start: Cursor | undefined): Promise<PageCount> {
  return findPageCount(deities, DEITY_ORDER, start, deityArms(filter));
}

/**
 * What a vocabulary's admin page and its count both read beside the row's own
 * filter: its group or tradition live, by the builder's correlated `EXISTS`,
 * and the filter's arms — a name fragment, and the group a row is filed
 * under — each absent when its part is. A flat vocabulary has no group.
 */
function vocabularyArms(
  vocabulary: ListedVocabulary,
  { query, groupId }: { query?: string; groupId?: string },
): SQL | undefined {
  const grouping = groupingOf(vocabulary);
  return and(
    inLiveGroup(vocabulary),
    query ? containsText(vocabulary.name, query) : undefined,
    grouping && groupId ? eq(grouping.key, groupId) : undefined,
  );
}

/** A deity filter's arms: its tradition is the group it is filed under. */
function deityArms({ query, traditionId }: DeityFilter): SQL | undefined {
  return vocabularyArms(deities, { query, groupId: traditionId });
}

/**
 * The key of a vocabulary filed under groups: by its group's name, then its
 * own, then id, the owner's call during MB.126, so a page reads as the picker
 * lists it and two groups' namesakes sit apart. A page and its count share
 * it, with the join that reads the group's name — for its name alone, since
 * the row's own filter already holds the group live.
 */
function groupedOrder(
  name: SortColumn,
  groups: typeof categoryGroups | typeof deityTraditions,
  key: AnyPgColumn,
): ListOrder {
  const grouped = sql.identifier('grouped');
  return {
    sort: [{ expression: sql`${grouped}.name`, type: 'text' }, name],
    join: {
      source: sql`(select ${groups.id}, ${groups.name} from ${groups}) as ${grouped}`,
      on: eq(sql`${grouped}.id`, key),
    },
  };
}

/** The categories by group, then name; the deities by tradition, then name. */
const CATEGORY_ORDER = groupedOrder(categories.name, categoryGroups, categories.groupId);
const DEITY_ORDER = groupedOrder(deities.name, deityTraditions, deities.traditionId);

/**
 * The live rows of `vocabulary` whose lower-cased name is one of `folds` —
 * values trimmed and lower-cased as the suggestions fold one — which is how
 * the compendium is held to the curated spellings (MB.162). A form or a deity
 * counts only while its group or tradition is live, as in
 * `findVocabularySuggestions`. Global reference data, so no proof. Two live
 * rows may share a name, a form's "Wax" under two groups, and both come back.
 */
export function findCuratedRowsByName(
  vocabulary: SuggestingVocabulary,
  folds: readonly string[],
): Promise<Pick<typeof ingredientForms.$inferSelect, 'id' | 'name'>[]> {
  return selectFrom(
    vocabulary,
    and(curated(vocabulary), inArray(sql`lower(${vocabulary.name})`, [...folds])),
  );
}

/**
 * The curated rows of a two-tier vocabulary among `ids`: live, under a live
 * group or tradition, as `findCuratedRowsByName` reads them. How a pick is
 * checked before it is written, and how `formChoice` reads one back, so a
 * pick whose row or group is retired reads as no pick (MB.167). Global
 * reference data, so no proof.
 */
export function findCuratedRowsByIds<TVocabulary extends typeof ingredientForms | typeof deities>(
  vocabulary: TVocabulary,
  ids: readonly string[],
): Promise<TVocabulary['$inferSelect'][]> {
  if (ids.length === 0) return Promise.resolve([]);
  return selectFrom(vocabulary, and(curated(vocabulary), inArray(vocabulary.id, [...ids])));
}

/**
 * A curated row: live, and filed under a live group or tradition where its
 * vocabulary files rows — what a member's pick, the compendium's spellings
 * and an ingredient's deity link are each held to (MB.162, MB.167).
 */
export function curated(vocabulary: SuggestingVocabulary): SQL | undefined {
  return and(notSoftDeleted(vocabulary), inLiveGroup(vocabulary));
}

/**
 * The half of "curated" a two-tier row adds to its own `deleted_at`: a form's
 * group or a deity's tradition live too, read by the builder's correlated
 * `EXISTS`. None for a flat vocabulary. Every reader of a curated row ANDs it
 * beside the row's own filter.
 */
export function inLiveGroup(vocabulary: ListedVocabulary): SQL | undefined {
  const grouping = groupingOf(vocabulary);
  return grouping && existsIn(grouping.groups, eq(grouping.groups.id, grouping.key));
}

/**
 * Where each vocabulary's in-use values are written, keyed by table name: a
 * vocabulary added to `SuggestingVocabulary` fails to compile until it names
 * its column, and a caller passes a table alone, so it cannot pair one with
 * the other's column. A list is read entry by entry (MB.136); the deities are
 * their own table's rows (MB.167).
 */
const IN_USE = {
  planets: { list: ingredients.planets },
  zodiac_signs: { list: ingredients.zodiacSigns },
  ingredient_forms: { column: ingredients.form },
  deities: { child: ingredientDeities },
} satisfies Record<SuggestingVocabulary['_']['name'], InUseSource>;

const ENTRY = sql.identifier('entry');

/**
 * The rows an in-use scan reads, and the value each holds: the ingredients
 * themselves for a column; one row per entry for a list, unnested before
 * anything trims or folds it — so an entry counts as a column's value would,
 * and a value held by several lists, or twice by one, is grouped as one; or a
 * child table's live rows beside their ingredient, for the deities.
 */
function inUseRows(source: InUseSource): { rows: SQLWrapper; value: SQLWrapper } {
  if ('column' in source) return { rows: ingredients, value: source.column };
  if ('child' in source) {
    const { child } = source;
    return {
      rows: sql`${ingredients} inner join ${child} on ${and(
        eq(child.ingredientId, ingredients.id),
        notSoftDeleted(child),
      )}`,
      value: child.name,
    };
  }
  return {
    rows: sql`${ingredients} cross join lateral unnest(${source.list}) as ${ENTRY}(${sql.identifier('value')})`,
    value: sql`${ENTRY}.${sql.identifier('value')}`,
  };
}

/**
 * The table a two-tier vocabulary's rows are filed under, and the key that
 * files them: a form or a category under its group, a deity under its
 * tradition. A flat vocabulary has none.
 */
function groupingOf(vocabulary: ListedVocabulary):
  | {
      groups: typeof ingredientFormGroups | typeof categoryGroups | typeof deityTraditions;
      key: AnyPgColumn;
    }
  | undefined {
  if (vocabulary === ingredientForms) {
    return { groups: ingredientFormGroups, key: ingredientForms.groupId };
  }
  if (vocabulary === categories) return { groups: categoryGroups, key: categories.groupId };
  if (vocabulary === deities) return { groups: deityTraditions, key: deities.traditionId };
  return undefined;
}

/**
 * One page of what a member's autofill offers for `vocabulary`'s column:
 * the live curated rows matching `query`, name matches before description
 * matches, then the values written on live ingredients in the compendium or
 * a coven one of `memberships` proves that match it and fold to no live
 * row's name. No proofs reads the compendium alone, which is the admin's
 * compendium form (M5.5). Each tier is alphabetical, case-folded. A blank
 * `query` matches everything.
 *
 * A name or value matches by `%` or `<%` and a description by `<%` alone, so
 * a query finds a word inside a description and completes a typed prefix
 * (claude-docs/db/member-autofill.md, "The member's autofill").
 *
 * A form suggestion also carries its group and the in-scope ingredients whose
 * form folds to it, and a deity suggestion its tradition. A form or a deity
 * is curated only while its group or tradition is live too.
 */
export function findVocabularySuggestions(
  memberships: readonly Membership[],
  vocabulary: typeof ingredientForms,
  query: string,
  page: PageRequest,
): Promise<PageEntry<FormSuggestion>[]>;
export function findVocabularySuggestions(
  memberships: readonly Membership[],
  vocabulary: typeof deities,
  query: string,
  page: PageRequest,
): Promise<PageEntry<DeitySuggestion>[]>;
export function findVocabularySuggestions(
  memberships: readonly Membership[],
  vocabulary: typeof planets | typeof zodiacSigns,
  query: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion>[]>;
export async function findVocabularySuggestions(
  memberships: readonly Membership[],
  vocabulary: SuggestingVocabulary,
  query: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion | FormSuggestion | DeitySuggestion>[]> {
  const { rows: inUseFrom, value: inUse } = inUseRows(IN_USE[getTableName(vocabulary)]);
  const byName = trigramMatch(vocabulary.name, query);
  const inUseFold = fold(inUse);
  const inScope = and(readableInTiers(memberships, ingredients), ne(sql`btrim(${inUse})`, ''));

  const grouping = groupingOf(vocabulary);
  // Only a form names its claimants: a form is half an ingredient's identity.
  const claimed = vocabulary === ingredientForms;
  const curatedRows = grouping
    ? sql`${vocabulary} inner join ${grouping.groups} on ${grouping.groups.id} = ${grouping.key}`
    : vocabulary;
  const live = and(notSoftDeleted(vocabulary), grouping && notSoftDeleted(grouping.groups));
  // Two same-named rows tie on the fold, so the group orders the pair.
  const tiebreak = grouping
    ? sql`lower(${grouping.groups.name}) || ' ' || ${vocabulary.id}::text`
    : sql`${vocabulary.id}::text`;

  // Tier literals are written into the text: a bound 0 and 1 would type the
  // `case` as text, and the union would refuse to stack it on the integer 2.
  const curatedTier = sql`
    select ${query ? sql`case when ${byName} then 0 else 1 end` : sql`0`} as tier,
      ${vocabulary.id}::text as id, ${vocabulary.name} as value,
      ${vocabulary.description} as description,
      ${grouping ? grouping.groups.name : sql`null`} as group_name,
      lower(${vocabulary.name}) as fold, ${tiebreak} as tiebreak
    from ${curatedRows}
    where ${and(live, query ? or(byName, sql`${query} <% ${vocabulary.description}`) : undefined)}`;

  // The spelling most entries use stands for the group; `mode()` breaks a tie
  // by the order it is given, so the choice is stable.
  const uncurated = sql`
    select 2 as tier, null as id, mode() within group (order by btrim(${inUse})) as value,
      null as description, null as group_name, ${inUseFold} as fold, ${inUseFold} as tiebreak
    from ${inUseFrom}
    where ${and(
      inScope,
      query ? trigramMatch(inUse, query) : undefined,
      notInArray(
        inUseFold,
        sql`(select lower(${vocabulary.name}) from ${curatedRows} where ${live})`,
      ),
    )}
    group by ${inUseFold}`;

  const suggestions = sql`(${curatedTier} union all ${uncurated}) as ${sql.identifier('suggestion')}`;
  // Every in-scope claim, not only the matching ones: a form found by its
  // description is claimed under its name.
  const source = claimed
    ? sql`${suggestions} left join (
        select ${inUseFold} as claimed,
          ${claimantList(ingredients.name, ingredients.canonicalName, ingredients.id)} as claimants
        from ${inUseFrom} where ${inScope} group by ${inUseFold}
      ) as ${sql.identifier('claim')} on ${sql.identifier('claimed')} = ${sql.identifier('suggestion')}.${sql.identifier('fold')}`
    : suggestions;

  const rows = await readSuggestionPage(source, page, { claimed });
  return rows.map(({ cursor, node: { tier, id, value, description, group, claimants } }) => {
    const suggestion = { value, description, curated: tier !== 2 };
    // A form and a deity record the row a member picks, so theirs carry its id.
    if (claimed) return { cursor, node: { ...suggestion, id, group, claimants } };
    if (grouping) return { cursor, node: { ...suggestion, id, tradition: group } };
    return { cursor, node: suggestion };
  });
}
