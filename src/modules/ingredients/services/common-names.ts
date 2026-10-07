import 'server-only';
import { type CommonNameSuggestion, findCommonNameSuggestions } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { type Membership, assertMembership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../../lib/types';

export type { CommonNameSuggestion };

/**
 * What the common-name field offers as `query` is typed: display names and
 * folk names already in use in the compendium or this workspace, each naming
 * the ingredients that answer to it. Picking one links nothing — the string is
 * written into the ingredient's own folk-name row. A blank query offers all.
 * Without a workspace, the names in use in the compendium alone.
 *
 * Asks only `ingredient: ['read']`: every name it can return is one a reader
 * of this workspace could already list.
 *
 * @throws {Forbidden} a workspace is named and the caller may not read its
 * ingredients.
 */
export async function suggestCommonNames(
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
): Promise<PageEntry<CommonNameSuggestion>[]> {
  const memberships: Membership[] = [];
  if (workspaceId != null) {
    memberships.push(await assertMembership(session, workspaceId, { ingredient: ['read'] }));
  }
  return findCommonNameSuggestions(memberships, query.trim(), page);
}
