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

// How many entries each filter value would list, beside the list it
// narrows. The compendium's is public and held in the data cache under the
// `compendium` tag, keyed by the parsed filter, as its page and count are; a
// coven's is never cached (CLAUDE.md rule 6; claude-docs/db/compendium-cache.md).
const cachedFacets = cachedCompendiumRead('compendium-facets', findCompendiumFacets);

/**
 * How many compendium entries each filter value would list under the rest of
 * `filter`: every form, deity and category some entry carries, and every
 * chosen one, most entries first and then by value; every live zodiac sign
 * and celestial body by name, every element and both toxic settings, zeros
 * included; and how many entries cite no live reference, the No Refs
 * switch's count, the same with the switch on or off. Needs no session: the compendium is the public surface.
 * Parsed as `listCompendium` parses, so it counts the rows that list holds.
 * The Reviewed counts are a curator's alone: `viewer` must curate to
 * set the filter, and for anyone else the counts are not read at all and the
 * answer is null.
 *
 * @throws {Forbidden} the filter sets Reviewed and `viewer` is not a curator.
 * @throws {ValidationError} a category or deity id is not a uuid, or the
 * toxic setting is not one of `TOXIC_FILTERS`.
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
 * How many of a coven's ingredients each filter value would list, counted as
 * `compendiumFacets` counts, over the rows `listWorkspaceIngredients` reads:
 * the coven's own entries and the compendium entries it holds. Never cached,
 * since what it counts is the coven's. Beside the seven kinds it counts the
 * Source strip's two values and the In Stock switch, each under
 * the rest of the filter, its own setting left out.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 * @throws {ValidationError} the filter names a category or deity by an id that
 * is not one, or a toxic setting that is not one of `TOXIC_FILTERS`.
 */
export async function workspaceIngredientFacets(
  session: Session,
  workspaceId: string,
  filter: WorkspaceIngredientFilterInput,
): Promise<WorkspaceIngredientFacets> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  return findWorkspaceIngredientFacets(membership, parseInput(WorkspaceIngredientFilter, filter));
}
