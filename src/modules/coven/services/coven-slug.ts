import 'server-only';
import { z } from 'zod';
import { isReservedCovenSlug } from '../../../lib/coven-path';
import { slugify } from '../../../lib/slugify';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { requiredText } from '../../../lib/validation';
import { slugHeldByAnotherCoven } from './workspace-by-slug';

const FALLBACK_SLUG = 'coven';

const NAME_LIMIT = 80;

/** The name a coven is created or renamed with. */
export const CovenNameInput = z.object({
  name: requiredText('Give the coven a name').max(NAME_LIMIT, {
    error: `Keep the name to ${NAME_LIMIT} characters`,
  }),
});

/** Each retry of a slug race sees the winner and takes the next number. */
const SLUG_ATTEMPTS = 5;

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

/**
 * Runs `write` with the first free address for `name`, and again with the next one when another coven takes it between the read
 * and the write (the unique indexes on `workspaces.slug` and `workspace_slugs.slug` decide), up to `SLUG_ATTEMPTS` times.
 */
export async function withFreeCovenSlug<T>(
  name: string,
  exceptWorkspaceId: string | undefined,
  write: (slug: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const slug = await freeCovenSlug(name, exceptWorkspaceId);
    try {
      return await write(slug);
    } catch (error) {
      const index = violatedUniqueIndex(error);
      const raced = index === 'workspaces_slug_unique' || index === 'workspace_slugs_slug_unique';
      if (!raced || attempt >= SLUG_ATTEMPTS) throw error;
    }
  }
}
