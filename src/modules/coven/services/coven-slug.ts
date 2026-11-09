import 'server-only';
import { isReservedCovenSlug } from '../../../lib/coven-path';
import { slugify } from '../../../lib/slugify';
import { slugHeldByAnotherCoven } from './workspace-by-slug';

const FALLBACK_SLUG = 'coven';

/**
 * The first free address for a name: the slug, then `-2`, `-3` and so on. A segment the router already answers (`new`) and another
 * live coven's current address count as taken; an old address does not, and the coven's own (`exceptWorkspaceId`) does not. Free as
 * of this read; the unique index decides a race.
 */
export async function freeCovenSlug(name: string, exceptWorkspaceId?: string): Promise<string> {
  const base = slugify(name) || FALLBACK_SLUG;
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (isReservedCovenSlug(candidate)) continue;
    if (!(await slugHeldByAnotherCoven(candidate, exceptWorkspaceId))) return candidate;
  }
}
