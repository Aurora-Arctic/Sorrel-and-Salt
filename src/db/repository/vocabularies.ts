import { type SQLWrapper, and, eq, getTableName, ne, notInArray, or, sql } from 'drizzle-orm';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { planets, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import {
  ingredientFormGroups,
  ingredientForms,
} from '../../modules/vocabulary/schema/ingredient-forms';
import type { Membership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
import { inCompendium, notSoftDeleted, scopedTo } from './predicates';
import { existsIn, pageBounds, selectFrom } from './select';
import { claimantList, readSuggestionPage } from './suggestion-page';
import type {
  FormSuggestion,
  InUseSource,
  SuggestingVocabulary,
  VocabularySuggestion,
} from './types';

/**
 * One page of the curated form vocabulary in `(name, id)` order, for
 * `ingredientFormValues`: the live forms whose group is live too, which is
 * what "curated" means to `findVocabularySuggestions` as well, with the
 * group's `deleted_at` read by the builder's correlated `EXISTS`. Public
 * reference data, so no proof (claude-docs/db/compendium-read.md, "The compendium read").
 */
export function findIngredientFormValues(
  page: PageRequest,
): Promise<PageEntry<typeof ingredientForms.$inferSelect>[]> {
  const keyset = { sort: [ingredientForms.name], id: ingredientForms.id, request: page };
  return selectFrom(
    ingredientForms,
    and(
      notSoftDeleted(ingredientForms),
      existsIn(ingredientFormGroups, eq(ingredientFormGroups.id, ingredientForms.groupId)),
      pageBounds(keyset),
    ),
    keyset,
  );
}

/**
 * Where each vocabulary's in-use values are written, keyed by table name: a
 * vocabulary added to `SuggestingVocabulary` fails to compile until it names
 * its column, and a caller passes a table alone, so it cannot pair one with
 * the other's column. A list is read entry by entry (MB.136).
 */
const IN_USE = {
  planets: { list: ingredients.planets },
  zodiac_signs: { list: ingredients.zodiacSigns },
  ingredient_forms: { column: ingredients.form },
} satisfies Record<SuggestingVocabulary['_']['name'], InUseSource>;

const ENTRY = sql.identifier('entry');

/**
 * The rows an in-use scan reads, and the value each holds: the ingredients
 * themselves for a column, or one row per entry for a list, unnested before
 * anything trims or folds it — so an entry counts as a column's value would,
 * and a value held by several lists, or twice by one, is grouped as one.
 */
function inUseRows(source: InUseSource): { rows: SQLWrapper; value: SQLWrapper } {
  if ('column' in source) return { rows: ingredients, value: source.column };
  return {
    rows: sql`${ingredients} cross join lateral unnest(${source.list}) as ${ENTRY}(${sql.identifier('value')})`,
    value: sql`${ENTRY}.${sql.identifier('value')}`,
  };
}

/**
 * One page of what a member's autofill offers for `vocabulary`'s column:
 * the live curated rows matching `query`, name matches before description
 * matches, then the values written on live ingredients in the compendium or
 * the proof's workspace that match it and fold to no live row's name. Each
 * tier is alphabetical, case-folded. A blank `query` matches everything.
 *
 * A name or value matches by `%` or `<%` and a description by `<%` alone, so
 * a query finds a word inside a description and completes a typed prefix
 * (claude-docs/db/member-autofill.md, "The member's autofill").
 *
 * A form suggestion also carries its group and the in-scope ingredients whose
 * form folds to it. A form is curated only while its group is live too.
 */
export function findVocabularySuggestions(
  membership: Membership,
  vocabulary: typeof ingredientForms,
  query: string,
  page: PageRequest,
): Promise<PageEntry<FormSuggestion>[]>;
export function findVocabularySuggestions(
  membership: Membership,
  vocabulary: typeof planets | typeof zodiacSigns,
  query: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion>[]>;
export async function findVocabularySuggestions(
  membership: Membership,
  vocabulary: SuggestingVocabulary,
  query: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion | FormSuggestion>[]> {
  const { rows: inUseFrom, value: inUse } = inUseRows(IN_USE[getTableName(vocabulary)]);
  const matches = (text: SQLWrapper) => sql`(${text} % ${query} or ${query} <% ${text})`;
  const byName = matches(vocabulary.name);
  const fold = sql`lower(btrim(${inUse}))`;
  const inScope = and(
    or(inCompendium(ingredients), scopedTo(membership, ingredients)),
    notSoftDeleted(ingredients),
    ne(sql`btrim(${inUse})`, ''),
  );

  const grouped = 'groupId' in vocabulary ? vocabulary : undefined;
  const curatedRows = grouped
    ? sql`${grouped} inner join ${ingredientFormGroups} on ${ingredientFormGroups.id} = ${grouped.groupId}`
    : vocabulary;
  const live = and(notSoftDeleted(vocabulary), grouped && notSoftDeleted(ingredientFormGroups));
  // Two same-named forms tie on the fold, so the group orders the pair.
  const tiebreak = grouped
    ? sql`lower(${ingredientFormGroups.name}) || ' ' || ${grouped.id}::text`
    : sql`${vocabulary.id}::text`;

  // Tier literals are written into the text: a bound 0 and 1 would type the
  // `case` as text, and the union would refuse to stack it on the integer 2.
  const curated = sql`
    select ${query ? sql`case when ${byName} then 0 else 1 end` : sql`0`} as tier,
      ${vocabulary.name} as value, ${vocabulary.description} as description,
      ${grouped ? ingredientFormGroups.name : sql`null`} as group_name,
      lower(${vocabulary.name}) as fold, ${tiebreak} as tiebreak
    from ${curatedRows}
    where ${and(live, query ? or(byName, sql`${query} <% ${vocabulary.description}`) : undefined)}`;

  // The spelling most entries use stands for the group; `mode()` breaks a tie
  // by the order it is given, so the choice is stable.
  const uncurated = sql`
    select 2 as tier, mode() within group (order by btrim(${inUse})) as value,
      null as description, null as group_name, ${fold} as fold, ${fold} as tiebreak
    from ${inUseFrom}
    where ${and(
      inScope,
      query ? matches(inUse) : undefined,
      notInArray(fold, sql`(select lower(${vocabulary.name}) from ${curatedRows} where ${live})`),
    )}
    group by ${fold}`;

  const suggestions = sql`(${curated} union all ${uncurated}) as ${sql.identifier('suggestion')}`;
  // Every in-scope claim, not only the matching ones: a form found by its
  // description is claimed under its name.
  const source = grouped
    ? sql`${suggestions} left join (
        select ${fold} as claimed,
          ${claimantList(ingredients.name, ingredients.canonicalName, ingredients.id)} as claimants
        from ${inUseFrom} where ${inScope} group by ${fold}
      ) as ${sql.identifier('claim')} on ${sql.identifier('claimed')} = ${sql.identifier('suggestion')}.${sql.identifier('fold')}`
    : suggestions;

  const rows = await readSuggestionPage(source, page, { claimed: Boolean(grouped) });
  return rows.map(({ cursor, node: { tier, value, description, group, claimants } }) => {
    const suggestion = { value, description, curated: tier !== 2 };
    return { cursor, node: grouped ? { ...suggestion, group, claimants } : suggestion };
  });
}
