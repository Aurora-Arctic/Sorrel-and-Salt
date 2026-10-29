import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { curates } from '../../../lib/site-roles';
import { parseInput } from '../../../lib/validation';
import { CompendiumFilter, type CompendiumFilterInput } from '../validation/compendium-filter';
import { assertCurator } from '@/modules/identity';

// The compendium list's filter as its three reads (page, count, facets) take it. Each refuses the Reviewed setting to anyone but a curator.
// Not exported from the module: the reads are its API.

/** What a curator who never set it is refused with. */
const REVIEW_REFUSAL = 'Only a curator may filter the compendium by its review mark';

/**
 * `filter` parsed, refused when it sets Reviewed and `viewer` is not a
 * curator or an admin, a signed-out visitor included.
 *
 * @throws {Forbidden} Reviewed is set and `viewer` does not curate.
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
  return parsed;
}

/** Whether `viewer` may see the review mark's counts: a curator or an admin. */
export function seesReview(viewer: Session | null): boolean {
  return viewer !== null && curates(viewer.role);
}
