import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import superjson from 'superjson';

// The compendium's data cache (CLAUDE.md rule 6): the curated reads every viewer sees alike, held across requests under one tag that an admin write
// expires through `expireCompendium`. The only file using `next/cache`, so the tag has one spelling. `unstable_cache`, not `use cache` (claude-docs/db/compendium-cache.md).

/**
 * The one tag every compendium cache entry carries — the curated reads' and,
 * through them, the public compendium pages' ISR entries.
 */
export const COMPENDIUM_TAG = 'compendium';

/** An hour: an entry no admin write expired is read again at most this stale. */
export const COMPENDIUM_REVALIDATE_SECONDS = 3600;

/**
 * The deployment's own key part, so a new deployment reads fresh keys: the seed cannot expire the tag and Vercel keeps the data
 * cache across deployments. None where neither variable is set (local, tests) (claude-docs/db/compendium-cache.md, "The deployment key part").
 */
function deploymentKeyPart(): string[] {
  const id = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA;
  return id ? [id] : [];
}

/**
 * `read`, held in the data cache under `COMPENDIUM_TAG` and keyed by `key` and its
 * arguments, so only a read every viewer sees alike may be wrapped. Stored as superjson,
 * since Next's `JSON.stringify` would turn a hit's `Date` columns into strings. (claude-docs/modules.md, "Caching a compendium read")
 */
export function cachedCompendiumRead<A extends unknown[], R>(
  key: string,
  read: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  const cached = unstable_cache(
    async (...args: A) => superjson.stringify(await read(...args)),
    [key, ...deploymentKeyPart()],
    { tags: [COMPENDIUM_TAG], revalidate: COMPENDIUM_REVALIDATE_SECONDS },
  );
  return async (...args) => superjson.parse<R>(await cached(...args));
}

/**
 * Expires every entry under `COMPENDIUM_TAG`, called after an admin's write commits. `{ expire: 0 }`, not `'max'`, so the next read is a
 * miss and not a stale answer; `updateTag` throws outside a Server Action, and every write arrives through `/api/graphql`.
 */
export function expireCompendium(): void {
  revalidateTag(COMPENDIUM_TAG, { expire: 0 });
}
