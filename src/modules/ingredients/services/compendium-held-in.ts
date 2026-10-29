import 'server-only';
import {
  type CompendiumFacets,
  type CompendiumScore,
  findCompendiumCount,
  findCompendiumFacets,
  findCompendiumPage,
  type IngredientFilter,
} from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import type { CompendiumFilterInput } from '../validation/compendium-filter';
import { compendiumFilterFor, seesReview } from './compendium-filter';
import { countCompendium, listCompendium } from './compendium';
import { compendiumFacets } from './ingredient-facets';
import type { CovenPick, IngredientRow } from '../types';
import { assertMembership, type Membership, membershipsOf } from '@/modules/coven';

// M12.55: the compendium narrowed to the entries the viewer's covens hold, its
// In My Covens filter. Each picked coven earns a proof or is dropped, so an
// id for a coven the viewer is not in filters nothing rather than refusing
// the page; with no proof left the read is the cached public one, unchanged.
// With one, the read is the viewer's and never cached (CLAUDE.md rule 6),
// and the coven filter is an arm of the list's own SQL (rule 7).
//
// Not In (the owner's extension) keeps the entries the proved covens do not
// hold. With no coven in the address it proves every coven the viewer is in;
// with ids in the address that were all dropped it applies nothing, so a
// foreign id never changes the result.

/** The most covens one read takes; past it the rest are dropped, as a foreign one is. */
const MAX_PICKED_COVENS = 20;

/**
 * A proof for each coven the viewer may read the ingredients of, viewers
 * included. A coven they are not in, or an id that is not one, is dropped:
 * the address is the viewer's own to edit, and a refusal would say which ids
 * name a coven.
 */
async function proofsOf(session: Session, covenIds: readonly string[]): Promise<Membership[]> {
  const proofs = await Promise.all(
    covenIds.map((id) =>
      assertMembership(session, id, { ingredient: ['read'] }).catch((error: unknown) => {
        if (error instanceof Forbidden) return null;
        throw error;
      }),
    ),
  );
  return proofs.filter((proof): proof is Membership => proof !== null);
}

/** The address's picked covens, proved, up to `MAX_PICKED_COVENS` of them. */
const pickedProofs = (session: Session, covenIds: readonly string[]) =>
  proofsOf(session, [...new Set(covenIds)].slice(0, MAX_PICKED_COVENS));

/**
 * Every coven the viewer is in, proved, viewers included: Not In's "none of my
 * covens". Not capped, as the list is the viewer's own and not the address's.
 */
async function everyCovenProof(session: Session): Promise<Membership[]> {
  const [memberships] = await membershipsOf(session, [session.userId]);
  if (!memberships || memberships instanceof Error) return [];
  return proofsOf(
    session,
    memberships.map(({ workspaceId }) => workspaceId),
  );
}

/**
 * The coven arm of the filter, or `undefined` for none, when the read is the
 * cached public one.
 */
async function covenScope(
  session: Session | null,
  { covenIds, covensNot }: CovenPick,
): Promise<Pick<IngredientFilter, 'heldIn' | 'notHeldIn'> | undefined> {
  if (!session) return undefined;
  if (covensNot) {
    const proofs =
      covenIds.length > 0 ? await pickedProofs(session, covenIds) : await everyCovenProof(session);
    return proofs.length > 0 ? { notHeldIn: proofs } : undefined;
  }
  const proofs = await pickedProofs(session, covenIds);
  return proofs.length > 0 ? { heldIn: proofs } : undefined;
}

/**
 * One page of the compendium under `filter`, kept to the entries a live
 * cupboard row of any picked coven names, or, under Not In, to the entries
 * none names. With no coven filter in effect, the cached `listCompendium`.
 *
 * @throws {Forbidden} Reviewed is set and `session` does not curate.
 * @throws {ValidationError} as `listCompendium` does.
 */
export async function listCompendiumHeldIn(
  session: Session | null,
  covens: CovenPick,
  filter: CompendiumFilterInput,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  const scope = await covenScope(session, covens);
  if (!scope) return listCompendium(filter, page, session);
  return findCompendiumPage({ ...compendiumFilterFor(filter, session), ...scope }, page);
}

/**
 * How many entries `listCompendiumHeldIn` lists under the same arguments, and
 * how many come before `start`.
 *
 * @throws {ValidationError} as `countCompendium` does.
 */
export async function countCompendiumHeldIn(
  session: Session | null,
  covens: CovenPick,
  filter: CompendiumFilterInput,
  start: Cursor | undefined,
): Promise<PageCount> {
  const scope = await covenScope(session, covens);
  if (!scope) return countCompendium(filter, start, session);
  return findCompendiumCount({ ...compendiumFilterFor(filter, session), ...scope }, start);
}

/**
 * The facet counts beside `listCompendiumHeldIn`: each counts only the entries
 * the list holds. With no coven filter in effect, the cached `compendiumFacets`.
 *
 * @throws {ValidationError} as `compendiumFacets` does.
 */
export async function compendiumFacetsHeldIn(
  session: Session | null,
  covens: CovenPick,
  filter: CompendiumFilterInput,
): Promise<CompendiumFacets> {
  const scope = await covenScope(session, covens);
  if (!scope) return compendiumFacets(filter, session);
  // The Reviewed filter and counts stay a curator's on this read as on the cached one.
  return findCompendiumFacets(
    { ...compendiumFilterFor(filter, session), ...scope },
    seesReview(session),
  );
}
