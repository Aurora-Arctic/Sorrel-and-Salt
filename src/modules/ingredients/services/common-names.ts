import 'server-only';
import { type CommonNameSuggestion, findCommonNameSuggestions } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { readersOf } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../../lib/types';

export type { CommonNameSuggestion };

/**
 * Common-name suggestions for `query`: display and folk names in use in the
 * compendium or this workspace (the compendium alone without one), each naming
 * the ingredients that answer to it. Picking one links nothing; the string is
 * written into the ingredient's own folk-name row. Asks only `ingredient: ['read']`
 * (claude-docs/db/fuzzy-matching.md).
 *
 * @throws {Forbidden} a workspace is named and the caller may not read its ingredients.
 */
export async function suggestCommonNames(
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
): Promise<PageEntry<CommonNameSuggestion>[]> {
  const memberships = await readersOf(session, workspaceId, { ingredient: ['read'] });
  return findCommonNameSuggestions(memberships, query.trim(), page);
}
