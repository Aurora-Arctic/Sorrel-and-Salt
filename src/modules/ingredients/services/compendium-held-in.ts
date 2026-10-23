import 'server-only';
import {
  type CompendiumFacets,
  type CompendiumScore,
  findCompendiumCount,
  findCompendiumFacets,
  findCompendiumPage,
} from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { parseInput } from '../../../lib/validation';
import { CompendiumFilter, type CompendiumFilterInput } from '../validation/compendium-filter';
import { countCompendium, listCompendium } from './compendium';
import { compendiumFacets } from './ingredient-facets';
import type { IngredientRow } from '../types';
import { assertMembership, type Membership } from '@/modules/coven';

// M12.55: the compendium narrowed to the entries the viewer's covens hold, its
// In My Covens filter. Each picked coven earns a proof or is dropped, so an
// id for a coven the viewer is not in filters nothing rather than refusing
// the page; with no proof left the read is the cached public one, unchanged.
// With one, the read is the viewer's and never cached (CLAUDE.md rule 6),
// and the coven filter is an arm of the list's own SQL (rule 7).

/** The most covens one read takes; past it the rest are dropped, as a foreign one is. */
const MAX_PICKED_COVENS = 20;

/**
 * A proof for each picked coven the viewer may read the ingredients of, viewers
 * included. A coven they are not in, or an id that is not one, is dropped:
 * the address is the viewer's own to edit, and a refusal would say which ids
 * name a coven.
 */
async function heldInProofs(
  session: Session | null,
  covenIds: readonly string[],
): Promise<Membership[]> {
  if (!session) return [];
  const picked = [...new Set(covenIds)].slice(0, MAX_PICKED_COVENS);
  const proofs = await Promise.all(
    picked.map((id) =>
      assertMembership(session, id, { ingredient: ['read'] }).catch((error: unknown) => {
        if (error instanceof Forbidden) return null;
        throw error;
      }),
    ),
  );
  return proofs.filter((proof): proof is Membership => proof !== null);
}

/**
 * One page of the compendium under `filter`, kept to the entries a live
 * cupboard row of any picked coven names. With no coven proved, the cached
 * `listCompendium`.
 *
 * @throws {ValidationError} as `listCompendium` does.
 */
export async function listCompendiumHeldIn(
  session: Session | null,
  covenIds: readonly string[],
  filter: CompendiumFilterInput,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  const heldIn = await heldInProofs(session, covenIds);
  if (heldIn.length === 0) return listCompendium(filter, page);
  return findCompendiumPage({ ...parseInput(CompendiumFilter, filter), heldIn }, page);
}

/**
 * How many entries `listCompendiumHeldIn` lists under the same arguments, and
 * how many come before `start`.
 *
 * @throws {ValidationError} as `countCompendium` does.
 */
export async function countCompendiumHeldIn(
  session: Session | null,
  covenIds: readonly string[],
  filter: CompendiumFilterInput,
  start: Cursor | undefined,
): Promise<PageCount> {
  const heldIn = await heldInProofs(session, covenIds);
  if (heldIn.length === 0) return countCompendium(filter, start);
  return findCompendiumCount({ ...parseInput(CompendiumFilter, filter), heldIn }, start);
}

/**
 * The facet counts beside `listCompendiumHeldIn`: each counts only the entries
 * the picked covens hold. With no coven proved, the cached `compendiumFacets`.
 *
 * @throws {ValidationError} as `compendiumFacets` does.
 */
export async function compendiumFacetsHeldIn(
  session: Session | null,
  covenIds: readonly string[],
  filter: CompendiumFilterInput,
): Promise<CompendiumFacets> {
  const heldIn = await heldInProofs(session, covenIds);
  if (heldIn.length === 0) return compendiumFacets(filter);
  return findCompendiumFacets({ ...parseInput(CompendiumFilter, filter), heldIn });
}
