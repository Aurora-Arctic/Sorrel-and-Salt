import 'server-only';
import { type CompendiumScore, findWorkspaceIngredientPage } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { parseInput } from '../../../lib/validation';
import {
  WorkspaceIngredientFilter,
  type WorkspaceIngredientFilterInput,
} from '../validation/compendium-filter';
import type { IngredientRow } from '../types';
import { assertMembership } from '@/modules/coven';

/**
 * One page of a coven's ingredients (story 14, M9.4): its own entries, and
 * every compendium entry it holds a live jar of, filtered by search, category
 * and form as the compendium is. A local entry hides the compendium entry it
 * matches, jar and all: the jar stays in the table, reaching no read until
 * the local entry no longer matches (claude-docs/db/stock.md, "The workspace
 * ingredient list"). Each entry's jars are `Ingredient.stock`'s, read apart.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 * @throws {ValidationError} the filter names a category by an id that is not one.
 */
export async function listWorkspaceIngredients(
  session: Session,
  workspaceId: string,
  filter: WorkspaceIngredientFilterInput,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  return findWorkspaceIngredientPage(
    membership,
    parseInput(WorkspaceIngredientFilter, filter),
    page,
  );
}
