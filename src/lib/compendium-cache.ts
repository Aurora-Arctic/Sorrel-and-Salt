import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import superjson from 'superjson';

// The compendium's data cache (CLAUDE.md rule 6): the curated reads every viewer sees alike, held across requests under one tag that a keeper write
// expires through `expireCompendium`. The only file using `next/cache`, so the tag has one spelling. `unstable_cache`, not `use cache` (claude-docs/db/compendium-cache.md).

export const COMPENDIUM_TAG = 'compendium';

export const COMPENDIUM_REVALIDATE_SECONDS = 3600;

/** So a new deployment reads fresh keys: the seed cannot expire the tag and Vercel keeps the data cache across deployments (claude-docs/db/compendium-cache.md, "The deployment key part"). */
function deploymentKeyPart(): string[] {
  const id = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA;
  return id ? [id] : [];
}

/** Only a read every viewer sees alike may be wrapped. Stored as superjson, since Next's `JSON.stringify` would turn a hit's `Date` columns into strings (claude-docs/modules.md, "Caching a compendium read"). */
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

/** `{ expire: 0 }`, not `'max'`, so the next read is a miss and not a stale answer; `updateTag` throws outside a Server Action, and every write arrives through `/api/graphql`. */
export function expireCompendium(): void {
  revalidateTag(COMPENDIUM_TAG, { expire: 0 });
}
