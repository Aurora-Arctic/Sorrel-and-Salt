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
 * What the substitute picker offers as `query` is typed: the ingredients a
 * substitute in this workspace may link, in two groups (the coven's cupboard,
 * then the rest of the compendium), each best match first and cut at a limit.
 * It answers with ingredients, unlike `suggestCommonNames`, since picking one
 * writes a link (claude-docs/db/compendium-read.md, "Ingredient suggestions").
 * Asks only `ingredient: ['read']` (claude-docs/db/fuzzy-matching.md).
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
