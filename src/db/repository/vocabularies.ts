import {
  type SQL,
  type SQLWrapper,
  and,
  eq,
  getTableName,
  inArray,
  isNull,
  ne,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { celestialBodies, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import { categories } from '../../modules/vocabulary/schema/categories';
import { deities } from '../../modules/vocabulary/schema/deities';
import { deityOtherNames } from '../../modules/vocabulary/schema/deity-other-names';
import {
  ingredientFormGroups,
  ingredientForms,
} from '../../modules/vocabulary/schema/ingredient-forms';
import { TWO_TIER, type GroupTable, type PickedTable, type TwoTierPair } from '../vocabularies';
import type { Membership } from '@/modules/coven';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { findPage, findPageCount } from './finders';
import {
  containsText,
  fold,
  inCompendium,
  naturally,
  notSoftDeleted,
  readableInTiers,
  trigramMatch,
} from './predicates';
import { existsIn, selectFrom } from './select';
import { claimantList, readSuggestionPage } from './suggestion-page';
import type {
  AstrologyValueFilter,
  AstrologyVocabulary,
  CategoryFilter,
  DeityFilter,
  DeitySuggestion,
  FormSuggestion,
  GroupFilter,
  IngredientFormValueFilter,
  IngredientRow,
  InUseSource,
  ListedVocabulary,
  ListOrder,
  SuggestingVocabulary,
  VocabularySuggestion,
} from './types';

/**
 * One page of the curated forms under `filter` in `(name, id)` order: live forms whose group is live too,
 * which is what "curated" means. Public reference data, so no proof. (claude-docs/db/compendium-read.md, "Vocabulary finders")
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
 * How many forms `findIngredientFormValues` pages under `filter`, and how many come before `start`,
 * for "Page X of Y"; one statement over the page's own filter and key.
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
 * One page of a flat astrology vocabulary under `filter` in `(name, id)` order: its live rows, as it has
 * no group to be curated under. Public reference data, so no proof.
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
 * One page of the categories under `filter`, by group name, then name, then id: live categories whose group
 * is live, read as the forms are. Public reference data, so no proof.
 */
export function findCategoryPage(
  filter: CategoryFilter,
  page: PageRequest,
): Promise<PageEntry<typeof categories.$inferSelect>[]> {
  return findPage(categories, CATEGORY_ORDER, page, vocabularyArms(categories, filter));
}

/**
 * How many categories `findCategoryPage` pages under `filter`, and how many come before `start`
 * (null with none), for "Page X of Y"; one statement over the page's own filter and key.
 */
export function findCategoryCount(
  filter: CategoryFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(categories, CATEGORY_ORDER, start, vocabularyArms(categories, filter));
}

/**
 * One page of the deities under `filter`, by tradition name, then name, then id: live deities whose
 * tradition is live, read as the categories are. Public reference data, so no proof.
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
 * One page of a group vocabulary (category groups, form groups or deity traditions), alphabetical,
 * narrowed by a name fragment. Public reference data, so no proof.
 */
export function findGroupPage<TTable extends GroupTable>(
  table: TTable,
  filter: GroupFilter,
  page: PageRequest,
): Promise<PageEntry<TTable['$inferSelect']>[]> {
  return findPage(table, [table.name], page, groupArms(table, filter));
}

/**
 * How many groups `findGroupPage` pages under `filter`, and how many come
 * before `start` in its order: "Page X of Y" on the group's admin page.
 */
export function findGroupCount(
  table: GroupTable,
  filter: GroupFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(table, [table.name], start, groupArms(table, filter));
}

/** A group filter's one arm, a name fragment; none with no query. */
function groupArms(table: GroupTable, { query }: GroupFilter): SQL | undefined {
  return query ? containsText(table.name, query) : undefined;
}

/**
 * The filter a vocabulary's admin page and its count share: the group or tradition live (a correlated
 * `EXISTS`) plus the name and group arms, each absent when unset. A flat vocabulary has no group.
 */
function vocabularyArms(
  vocabulary: ListedVocabulary,
  { query, groupId }: { query?: string; groupId?: string },
): SQL | undefined {
  const grouping = groupingOf(vocabulary);
  return and(
    inLiveGroup(vocabulary),
    query ? containsText(vocabulary.name, query) : undefined,
    grouping && groupId ? eq(grouping.column, groupId) : undefined,
  );
}

/**
 * A deity filter's arms: tradition, and a name fragment matching the deity's name or a live other name
 * ("Ganish" finds Ganesha). An `EXISTS` rather than a join, so two matching names are still one row.
 */
function deityArms({ query, traditionId }: DeityFilter): SQL | undefined {
  return and(
    vocabularyArms(deities, { groupId: traditionId }),
    query
      ? or(
          containsText(deities.name, query),
          existsIn(
            deityOtherNames,
            and(eq(deityOtherNames.deityId, deities.id), containsText(deityOtherNames.name, query)),
          ),
        )
      : undefined,
  );
}

/**
 * The key of a grouped vocabulary: group name, own name (natural collation), then id, so namesakes in
 * different groups sit apart. A page and its count share it.
 */
function groupedOrder({ items, groups, column }: TwoTierPair): ListOrder {
  const grouped = sql.identifier('grouped');
  return {
    sort: [
      { expression: naturally(sql`${grouped}.name`), type: 'text' },
      { expression: naturally(items.name), type: 'text' },
    ],
    join: {
      source: sql`(select ${groups.id}, ${groups.name} from ${groups}) as ${grouped}`,
      on: eq(sql`${grouped}.id`, column),
    },
  };
}

/** The categories by group, then name; the deities by tradition, then name. */
const CATEGORY_ORDER = groupedOrder(TWO_TIER.categories);
const DEITY_ORDER = groupedOrder(TWO_TIER.deities);

/**
 * The live rows of `vocabulary` whose lower-cased name is one of `folds`, which holds the compendium to
 * the curated spellings; a form or deity counts only while its group or tradition is live. Global
 * reference data, so no proof. Two live rows may share a name ("Wax" under two groups) and both come back.
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
 * The curated rows of a two-tier vocabulary among `ids`, live under a live group or tradition: how a pick
 * is checked before it is written and read back, so a retired row or group reads as no pick.
 */
export function findCuratedRowsByIds<TVocabulary extends PickedTable>(
  vocabulary: TVocabulary,
  ids: readonly string[],
): Promise<TVocabulary['$inferSelect'][]> {
  if (ids.length === 0) return Promise.resolve([]);
  return selectFrom(vocabulary, and(curated(vocabulary), inArray(vocabulary.id, [...ids])));
}

/**
 * The live other names of the deities among `deityIds`, in no
 * particular order — a loader's batch read. Global reference data, so no proof.
 */
export function findDeityOtherNames(
  deityIds: readonly string[],
): Promise<(typeof deityOtherNames.$inferSelect)[]> {
  if (deityIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    deityOtherNames,
    and(notSoftDeleted(deityOtherNames), inArray(deityOtherNames.deityId, [...deityIds])),
  );
}

/**
 * The live other names among `folds` that a live deity of `traditionId` holds, `exceptId` excepted:
 * what refuses one name on two deities of a tradition, which no index can (the tradition is the deity's column).
 */
export function findDeityOtherNameHolders(
  traditionId: string,
  folds: readonly string[],
  exceptId?: string,
): Promise<(typeof deityOtherNames.$inferSelect)[]> {
  if (folds.length === 0) return Promise.resolve([]);
  return selectFrom(
    deityOtherNames,
    and(
      notSoftDeleted(deityOtherNames),
      inArray(sql`lower(${deityOtherNames.name})`, [...folds]),
      existsIn(
        deities,
        and(
          eq(deities.id, deityOtherNames.deityId),
          eq(deities.traditionId, traditionId),
          exceptId === undefined ? undefined : ne(deities.id, exceptId),
        ),
      ),
    ),
  );
}

/**
 * A curated row: live, and filed under a live group or tradition where its
 * vocabulary files rows — what a member's pick, the compendium's spellings
 * and an ingredient's deity link are each held to.
 */
export function curated(vocabulary: SuggestingVocabulary): SQL | undefined {
  return and(notSoftDeleted(vocabulary), inLiveGroup(vocabulary));
}

/**
 * The half of "curated" a two-tier row adds to its own `deleted_at`: its group or tradition live too, by a
 * correlated `EXISTS`. None for a flat vocabulary. Every reader of a curated row ANDs it in.
 */
export function inLiveGroup(vocabulary: ListedVocabulary): SQL | undefined {
  const grouping = groupingOf(vocabulary);
  return grouping && existsIn(grouping.groups, eq(grouping.groups.id, grouping.column));
}

/**
 * The live compendium entries a curated form's rename to `name` would leave with two forms of one name: a
 * live variant that picked `formId` and another whose form already folds to `name`.
 * The rename is refused on them, before its write and again after the index refuses one. (claude-docs/db/compendium-read.md, "Vocabulary finders")
 */
export function findCompendiumFormRenameClashes(
  formId: string,
  name: string,
): Promise<IngredientRow[]> {
  const ofEntry = eq(ingredientVariants.ingredientId, ingredients.id);
  return selectFrom(
    ingredients,
    and(
      inCompendium(ingredients),
      notSoftDeleted(ingredients),
      existsIn(ingredientVariants, and(ofEntry, eq(ingredientVariants.formId, formId))),
      // Another variant: two of one entry cannot both pick the form, since a
      // pick's text folds to the form's name and the index holds the fold.
      existsIn(
        ingredientVariants,
        and(
          ofEntry,
          or(isNull(ingredientVariants.formId), ne(ingredientVariants.formId, formId)),
          eq(fold(ingredientVariants.form), fold(name)),
        ),
      ),
    ),
  );
}

/**
 * Where each vocabulary's in-use values are written, keyed by table, so a new `SuggestingVocabulary` fails
 * to compile until it names its column. A form is in use while any live variant holds it, not only the one
 * the ingredient row mirrors.
 */
const IN_USE = {
  celestial_bodies: { list: ingredients.celestialBodies },
  zodiac_signs: { list: ingredients.zodiacSigns },
  ingredient_forms: { child: ingredientVariants, value: ingredientVariants.form },
  deities: { child: ingredientDeities, value: ingredientDeities.name },
} satisfies Record<SuggestingVocabulary['_']['name'], InUseSource>;

const ENTRY = sql.identifier('entry');

/**
 * The rows an in-use scan reads: one row per entry for a list (unnested before trimming or folding, so a
 * value held twice is one), or a child table's live rows beside their ingredient.
 */
function inUseRows(source: InUseSource): { rows: SQLWrapper; value: SQLWrapper } {
  if ('child' in source) {
    const { child, value } = source;
    return {
      rows: sql`${ingredients} inner join ${child} on ${and(
        eq(child.ingredientId, ingredients.id),
        notSoftDeleted(child),
      )}`,
      value,
    };
  }
  return {
    rows: sql`${ingredients} cross join lateral unnest(${source.list}) as ${ENTRY}(${sql.identifier('value')})`,
    value: sql`${ENTRY}.${sql.identifier('value')}`,
  };
}

/**
 * The pair `vocabulary` is the items of in `TWO_TIER` — the table its rows are
 * filed under, and the column that files them — or none for a flat vocabulary.
 */
function groupingOf(vocabulary: ListedVocabulary): TwoTierPair | undefined {
  return Object.values(TWO_TIER).find((pair) => pair.items === vocabulary);
}

/**
 * One page of what a member's autofill offers for `vocabulary`'s column: live
 * curated rows matching `query`, then values written on live ingredients the
 * `memberships` prove. No proofs reads the compendium alone. (claude-docs/db/compendium-read.md, "Tier-scoped reads")
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
  vocabulary: typeof celestialBodies | typeof zodiacSigns,
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
  // Only a form names its claimants: the entries already holding it, one of
  // which a member adding a form may mean to add it to instead.
  const claimed = vocabulary === ingredientForms;
  const curatedRows = grouping
    ? sql`${vocabulary} inner join ${grouping.groups} on ${grouping.groups.id} = ${grouping.column}`
    : vocabulary;
  const live = and(notSoftDeleted(vocabulary), grouping && notSoftDeleted(grouping.groups));
  // Two same-named rows tie on the fold, so the group orders the pair.
  const tiebreak = grouping
    ? sql`lower(${grouping.groups.name}) || ' ' || ${vocabulary.id}::text`
    : sql`${vocabulary.id}::text`;

  // A deity also matches on its live other names, and carries the
  // nearest one that matched, so the picker can say why "Ashtoreth" found
  // Astarte; a deity its own name finds carries none.
  const matchedName =
    vocabulary === deities && query
      ? sql`(select ${deityOtherNames.name} from ${deityOtherNames}
          where ${and(
            eq(deityOtherNames.deityId, deities.id),
            notSoftDeleted(deityOtherNames),
            trigramMatch(deityOtherNames.name, query),
          )}
          order by word_similarity(${query}, ${deityOtherNames.name}) desc, ${deityOtherNames.name}
          limit 1)`
      : undefined;
  const byOtherName = matchedName && sql`${matchedName} is not null`;
  const byNameOrOther = byOtherName ? or(byName, byOtherName) : byName;

  // A form or a deity also matches on the group or tradition it is listed
  // under, by the substring the client's grouped dropdowns use, so typing
  // "irish" finds every Irish deity. The join already drops a retired group.
  const byGroup = grouping ? containsText(grouping.groups.name, query) : undefined;

  // Tier literals are written into the text: a bound 0 and 1 would type the
  // `case` as text, and the union would refuse to stack it on the integer 2.
  const curatedTier = sql`
    select ${query ? sql`case when ${byNameOrOther} then 0 else 1 end` : sql`0`} as tier,
      ${vocabulary.id}::text as id, ${vocabulary.name} as value,
      ${vocabulary.description} as description,
      ${grouping ? grouping.groups.name : sql`null`} as group_name,
      ${claimed ? sql`${ingredientFormGroups.icon}::text` : sql`null`} as group_icon,
      ${matchedName ? sql`case when ${byName} then null else ${matchedName} end` : sql`null`} as matched_name,
      lower(${vocabulary.name}) as fold, ${tiebreak} as tiebreak
    from ${curatedRows}
    where ${and(live, query ? or(byNameOrOther, sql`${query} <% ${vocabulary.description}`, byGroup) : undefined)}`;

  // The spelling most entries use stands for the group; `mode()` breaks a tie
  // by the order it is given, so the choice is stable.
  const uncurated = sql`
    select 2 as tier, null as id, mode() within group (order by btrim(${inUse})) as value,
      null as description, null as group_name, null as group_icon, null as matched_name, ${inUseFold} as fold, ${inUseFold} as tiebreak
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
  return rows.map(
    ({
      cursor,
      node: { tier, id, value, description, group, icon, matchedName: matched, claimants },
    }) => {
      const suggestion = { value, description, curated: tier !== 2 };
      // A form and a deity record the row a member picks, so theirs carry its id.
      if (claimed) return { cursor, node: { ...suggestion, id, group, icon, claimants } };
      if (grouping)
        return { cursor, node: { ...suggestion, id, tradition: group, matchedName: matched } };
      return { cursor, node: suggestion };
    },
  );
}
