import 'server-only';
import { findSimilarIngredients } from '../../../db/repository';
import type { ingredients } from '../schema/ingredients';
import type { PageEntry, PageRequest } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { assertMembership } from '@/modules/coven';

/**
 * Story 16's "did you mean": one page of the compendium entries and this
 * workspace's own whose display name, formal name or a folk name is close to
 * `name`, best first. Each row carries `canonicalName`, which is what tells
 * five Cat's Claws apart. A warning, never a refusal — nothing here blocks a
 * create.
 *
 * Asks only `ingredient: ['read']`: every row it can return is one a reader of
 * this workspace could already list.
 *
 * @throws {Forbidden} the caller may not read this workspace's ingredients.
 */
export async function findPossibleDuplicates(
  session: Session,
  workspaceId: string,
  name: string,
  page: PageRequest,
): Promise<PageEntry<typeof ingredients.$inferSelect>[]> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });

  const term = name.trim();
  if (!term) return [];

  return findSimilarIngredients(membership, term, page);
}
