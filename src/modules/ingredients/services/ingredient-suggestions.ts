import 'server-only';
import {
  type CompendiumScore,
  type SuggestionGroupTag,
  findIngredientSuggestions,
} from '../../../db/repository';
import type { IngredientRow } from '../types';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { assertMembership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { CompendiumFilter } from '../validation/compendium-filter';

/**
 * What the substitute picker offers as `query` is typed: the
 * ingredients a substitute in this workspace may link — the compendium's and
 * its own, never another workspace's — in two groups: the coven's
 * cupboard, then the rest of the compendium, each best match first and cut at a
 * limit, each carrying the formal name and tier that tell same-labelled entries
 * apart. Unlike
 * `suggestCommonNames`, it answers with ingredients, since picking one writes
 * a link. A blank query offers all, and so does one under the compendium's
 * `MIN_QUERY_LENGTH`, since it matches as the compendium search does.
 *
 * `categoryIds` keeps only entries carrying any of them (the spell builder
 * narrows its Add to Jar picker by the spell's own categories); none, or an
 * empty list, is no filter.
 *
 * A `form` ranks the entries holding that form first, then those holding another
 * form of its curated group, within each group. A coven's own
 * ingredient and a compendium entry sharing its name are both listed, in their
 * own groups (claude-docs/db/compendium-read.md).
 *
 * Asks only `ingredient: ['read']`: every row it can return is one a reader of
 * this workspace could already list.
 *
 * @throws {Forbidden} the caller may not read this workspace's ingredients.
 */
export async function suggestIngredients(
  session: Session,
  workspaceId: string,
  query: string,
  page: PageRequest,
  form?: string,
  categoryIds?: readonly string[],
): Promise<PageEntry<IngredientRow, CompendiumScore & SuggestionGroupTag>[]> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  const filter = parseInput(CompendiumFilter, {
    query,
    categoryIds: categoryIds ? [...categoryIds] : undefined,
  });
  return findIngredientSuggestions(membership, filter.query ?? '', page, form, filter.categoryIds);
}
