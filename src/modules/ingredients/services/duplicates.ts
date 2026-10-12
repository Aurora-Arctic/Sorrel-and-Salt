import 'server-only';
import { type SimilarityScore, findSimilarIngredients } from '../../../db/repository';
import type { ingredients } from '../schema/ingredients';
import type { Session } from '../../../lib/session';
import { readersOf } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../../lib/types';

/**
 * Story 16's "did you mean": one page of the compendium entries and this
 * workspace's own whose display name, formal name or a folk name is close to
 * `name`, best first, each with its score. Each row carries `canonicalName`,
 * which is what tells five Cat's Claws apart. A warning, never a refusal —
 * nothing here blocks a create. Without a workspace, the compendium's entries
 * alone, as the admin's compendium form warns (M5.5).
 *
 * Asks only `ingredient: ['read']`: every row it can return is one a reader of
 * this workspace could already list.
 *
 * @throws {Forbidden} a workspace is named and the caller may not read its
 * ingredients.
 */
export async function findPossibleDuplicates(
  session: Session,
  workspaceId: string | null | undefined,
  name: string,
  page: PageRequest,
): Promise<PageEntry<typeof ingredients.$inferSelect, SimilarityScore>[]> {
  const memberships = await readersOf(session, workspaceId, { ingredient: ['read'] });

  const trimmed = name.trim();
  if (!trimmed) return [];

  return findSimilarIngredients(memberships, trimmed, page);
}
