import 'server-only';
import {
  type WorkspaceListEdge,
  findWorkspaceIngredientCount,
  findWorkspaceIngredientPage,
} from '../../../db/repository';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { parseInput } from '../../../lib/validation';
import {
  WorkspaceIngredientFilter,
  type WorkspaceIngredientFilterInput,
} from '../validation/compendium-filter';
import type { IngredientRow } from '../types';
import { assertMembership } from '@/modules/coven';

/**
 * One page of a coven's ingredients (story 14, M9.4, M12.18): its own entries,
 * and every compendium entry its cupboard holds, filtered by search, category
 * and the five facets as the compendium is, over the coven's
 * overrides. Each entry carries its cupboard row, null for the coven's own
 * (claude-docs/db/stock.md, "The workspace ingredient list"). Each entry's
 * jars are `Ingredient.stock`'s, read apart.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 * @throws {ValidationError} the filter names a category or deity by an id that
 * is not one, or a toxic setting that is not one of `TOXIC_FILTERS`.
 */
export async function listWorkspaceIngredients(
  session: Session,
  workspaceId: string,
  filter: WorkspaceIngredientFilterInput,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, WorkspaceListEdge>[]> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  return findWorkspaceIngredientPage(
    membership,
    parseInput(WorkspaceIngredientFilter, filter),
    page,
  );
}

/**
 * How many entries a coven's ingredient list holds under `filter`, and how
 * many come before `start`, the page's first row: the "Page X of Y" of the
 * page `listWorkspaceIngredients` serves. Not cached: the data is the
 * coven's (CLAUDE.md rule 6).
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 * @throws {ValidationError} as `listWorkspaceIngredients`.
 */
export async function countWorkspaceIngredients(
  session: Session,
  workspaceId: string,
  filter: WorkspaceIngredientFilterInput,
  start: Cursor | undefined,
): Promise<PageCount> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  return findWorkspaceIngredientCount(
    membership,
    parseInput(WorkspaceIngredientFilter, filter),
    start,
  );
}
