import 'server-only';
import {
  type CompendiumFacets,
  type WorkspaceIngredientFacets,
  findCompendiumFacets,
  findWorkspaceIngredientFacets,
} from '../../../db/repository';
import { cachedCompendiumRead } from '../../../lib/compendium-cache';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { compendiumFilterFor, seesReview } from './compendium-filter';
import {
  type CompendiumFilterInput,
  WorkspaceIngredientFilter,
  type WorkspaceIngredientFilterInput,
} from '../validation/compendium-filter';
import { assertMembership } from '@/modules/coven';

// How many entries each filter value would list, beside the list it narrows.
// The compendium's is public and cached under the `compendium` tag, keyed by
// the parsed filter; a coven's never is (CLAUDE.md rule 6; claude-docs/db/compendium-cache.md).
const cachedFacets = cachedCompendiumRead('compendium-facets', findCompendiumFacets);

/**
 * Needs no session: the compendium is the public surface. The Reviewed counts are a curator's alone; for anyone else they are not read and the answer is null
 * (claude-docs/db/compendium-read.md, "Facet counts").
 *
 * @throws {Forbidden} the filter sets Reviewed and `viewer` is not a curator.
 * @throws {ValidationError} a category or deity id is not a uuid, or the toxic setting is not in `TOXIC_FILTERS`.
 */
export async function compendiumFacets(
  filter: CompendiumFilterInput,
  viewer: Session | null = null,
): Promise<CompendiumFacets> {
  // The Reviewed counts are read only for a viewer who sees them; the
  // flag is part of the cache key, so the two answers are held apart.
  return cachedFacets(compendiumFilterFor(filter, viewer), seesReview(viewer));
}

/**
 * Never cached: what it counts is the coven's. Adds the Source strip's two values and the In Stock switch, each under the rest of the filter.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 * @throws {ValidationError} a category or deity id is not a uuid, or the toxic setting is not in `TOXIC_FILTERS`.
 */
export async function workspaceIngredientFacets(
  session: Session,
  workspaceId: string,
  filter: WorkspaceIngredientFilterInput,
): Promise<WorkspaceIngredientFacets> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  return findWorkspaceIngredientFacets(membership, parseInput(WorkspaceIngredientFilter, filter));
}
