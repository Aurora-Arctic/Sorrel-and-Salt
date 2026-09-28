import { and, or, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { Membership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/pagination';
import { inCompendium, notSoftDeleted, scopedTo } from './shapes';
import { type Claimant, claimantList, readSuggestionPage } from './suggestion-page';

/** A common name already in use, and who answers to it. */
export interface CommonNameSuggestion {
  value: string;
  claimants: Claimant[];
}

/**
 * One page of what a member's common-name field offers: the display names
 * and live folk names of live ingredients in the compendium or the proof's
 * workspace that match `term`, folded to `lower(btrim(name))` and offered
 * once each, alphabetically. Each names the in-scope ingredients answering to
 * it, formal names first. A formal name is not a common name and is not read.
 * A blank `term` matches everything.
 *
 * Each arm matches its own column by `%` or `<%`, so each can reach its own
 * trigram index; the fold happens after (claude-docs/db.md, "The member's autofill").
 */
export async function findCommonNameSuggestions(
  membership: Membership,
  term: string,
  page: PageRequest,
): Promise<PageEntry<CommonNameSuggestion>[]> {
  const matches = (text: AnyPgColumn) =>
    term ? sql`(${text} % ${term} or ${term} <% ${text})` : undefined;
  const inScope = and(
    or(inCompendium(ingredients), scopedTo(membership, ingredients)),
    notSoftDeleted(ingredients),
  );
  const claim = (spelling: AnyPgColumn) => sql`
    select btrim(${spelling}) as spelling, ${ingredients.id} as id,
      ${ingredients.name} as name, ${ingredients.canonicalName} as canonical_name`;

  const named = sql`
    ${claim(ingredients.name)} from ${ingredients}
    where ${and(inScope, matches(ingredients.name))}
    union all
    ${claim(ingredientFolkNames.name)} from ${ingredientFolkNames}
    inner join ${ingredients} on ${ingredients.id} = ${ingredientFolkNames.ingredientId}
    where ${and(inScope, notSoftDeleted(ingredientFolkNames), matches(ingredientFolkNames.name))}`;

  const [spelling, id, name, canonicalName, fold, first] = [
    'spelling',
    'id',
    'name',
    'canonical_name',
    'fold',
    'first_claim',
  ].map((column) => sql.identifier(column));

  // An ingredient whose label and a folk name fold alike claims the name once.
  const source = sql`(
    select 2 as tier, mode() within group (order by ${spelling}) as value,
      null as description, null as group_name, ${fold}, ${fold} as tiebreak,
      ${claimantList(name, canonicalName, id)} filter (where ${first}) as claimants
    from (
      select *, lower(${spelling}) as ${fold},
        row_number() over (partition by lower(${spelling}), ${id}) = 1 as ${first}
      from (${named}) as ${sql.identifier('named')}
      where ${spelling} <> ''
    ) as ${sql.identifier('claim')}
    group by ${fold}
  ) as ${sql.identifier('suggestion')}`;

  const rows = await readSuggestionPage(source, page, { claimed: true });
  return rows.map(({ cursor, node: { value, claimants } }) => ({
    cursor,
    node: { value, claimants },
  }));
}
