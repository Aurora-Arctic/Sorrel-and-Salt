import 'server-only';
import { type SimilarityScore, findSimilarIngredients } from '../../../db/repository';
import type { IngredientRow } from '../types';
import type { Session } from '../../../lib/session';
import { readersOf } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../../lib/types';

/**
 * "Did you mean": one page of the compendium entries and this workspace's own
 * whose display name, formal name or a folk name is close to `name`, best first,
 * each with its score and `canonicalName`, which tells five Cat's Claws apart. A
 * warning, never a refusal. Without a workspace, the compendium's alone. Asks only
 * `ingredient: ['read']` (claude-docs/db/fuzzy-matching.md).
 *
 * @throws {Forbidden} a workspace is named and the caller may not read its ingredients.
 */
export async function findPossibleDuplicates(
  session: Session,
  workspaceId: string | null | undefined,
  name: string,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, SimilarityScore>[]> {
  const memberships = await readersOf(session, workspaceId, { ingredient: ['read'] });

  const trimmed = name.trim();
  if (!trimmed) return [];

  return findSimilarIngredients(memberships, trimmed, page);
}
