import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { curates } from '../../../lib/site-roles';
import { parseInput } from '../../../lib/validation';
import { CompendiumFilter, type CompendiumFilterInput } from '../validation/compendium-filter';
import { assertCurator } from '@/modules/identity';

// The compendium list's filter as its three reads (page, count, facets) take it. Each refuses the Reviewed setting, the hidden listing and the sourcing sort to anyone but a curator.
// Not exported from the module: the reads are its API.

/** What a curator who never set it is refused with. */
const REVIEW_REFUSAL = 'Only a curator may filter the compendium by its review mark';

/** What a visitor who asked for hidden entries is refused with. */
const LISTING_REFUSAL = 'Only a curator may read the hidden compendium entries';

/** What a visitor who asked for the sourcing score's order is refused with. */
const SORT_REFUSAL = 'Only a curator may sort the compendium by its sourcing score';

/**
 * `filter` parsed, refused when it sets Reviewed, reads hidden entries or sorts by sourcing score and `viewer` is not a
 * curator or an admin, a signed-out visitor included.
 *
 * @throws {Forbidden} Reviewed, a listing other than shown or a sort is set and `viewer` does not curate.
 * @throws {ValidationError} the filter does not parse.
 */
export function compendiumFilterFor(
  filter: CompendiumFilterInput,
  viewer: Session | null,
): CompendiumFilter {
  const parsed = parseInput(CompendiumFilter, filter);
  if (parsed.reviewed !== undefined) {
    if (!viewer) throw new Forbidden(REVIEW_REFUSAL);
    assertCurator(viewer, REVIEW_REFUSAL);
  }
  if (parsed.listing !== 'shown') {
    if (!viewer) throw new Forbidden(LISTING_REFUSAL);
    assertCurator(viewer, LISTING_REFUSAL);
  }
  if (parsed.sort !== undefined) {
    if (!viewer) throw new Forbidden(SORT_REFUSAL);
    assertCurator(viewer, SORT_REFUSAL);
  }
  return parsed;
}

/** Whether `viewer` may see the review mark's counts: a curator or an admin. */
export function seesReview(viewer: Session | null): boolean {
  return viewer !== null && curates(viewer.role);
}
