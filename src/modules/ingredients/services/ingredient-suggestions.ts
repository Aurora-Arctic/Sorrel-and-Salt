import 'server-only';
import { type CompendiumScore, findIngredientSuggestions } from '../../../db/repository';
import type { ingredients } from '../schema/ingredients';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { assertMembership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { CompendiumFilter } from '../validation/compendium-filter';

/**
 * What the substitute picker offers as `query` is typed (MB.138): the
 * ingredients a substitute in this workspace may link — the compendium's and
 * its own, never another workspace's — best match first, each carrying the
 * formal name and tier that tell same-labelled entries apart. Unlike
 * `suggestCommonNames`, it answers with ingredients, since picking one writes
 * a link. A blank query offers all, and so does one under the compendium's
 * `MIN_QUERY_LENGTH`, since it matches as the compendium search does.
 *
 * A `form` ranks the entries holding that form first, then those holding another
 * form of its curated group (M8.3). A coven's own ingredient hides the
 * compendium entry it names (claude-docs/db/compendium-read.md).
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
): Promise<PageEntry<typeof ingredients.$inferSelect, CompendiumScore>[]> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  const filter = parseInput(CompendiumFilter, { query });
  return findIngredientSuggestions(membership, filter.query ?? '', page, form);
}
