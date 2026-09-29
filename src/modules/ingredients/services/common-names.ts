import 'server-only';
import { type CommonNameSuggestion, findCommonNameSuggestions } from '../../../db/repository';
import type { PageEntry, PageRequest } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { assertMembership } from '@/modules/coven';

export type { CommonNameSuggestion };

/**
 * What the common-name field offers as `query` is typed: display names and
 * folk names already in use in the compendium or this workspace, each naming
 * the ingredients that answer to it. Picking one links nothing — the string is
 * written into the ingredient's own folk-name row. A blank query offers all.
 *
 * Asks only `ingredient: ['read']`: every name it can return is one a reader
 * of this workspace could already list.
 *
 * @throws {Forbidden} the caller may not read this workspace's ingredients.
 */
export async function suggestCommonNames(
  session: Session,
  workspaceId: string,
  query: string,
  page: PageRequest,
): Promise<PageEntry<CommonNameSuggestion>[]> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  return findCommonNameSuggestions(membership, query.trim(), page);
}
