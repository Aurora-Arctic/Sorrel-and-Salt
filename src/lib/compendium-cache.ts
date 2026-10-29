import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import superjson from 'superjson';

// The compendium's data cache (CLAUDE.md rule 6; DESIGN.md §7): the curated
// reads every viewer sees alike, held across requests under one tag, which an
// admin write expires through `expireCompendium`. Every use of `next/cache` is in this file, so the tag
// has one spelling (a `no-restricted-imports` path in .oxlintrc.json). `unstable_cache`
// rather than `use cache`, deliberately: DESIGN.md §7, "Caching — three
// layers in v1" (claude-docs/db/compendium-cache.md).

/**
 * The one tag every compendium cache entry carries — the curated reads' and,
 * through them, the public compendium pages' ISR entries.
 */
export const COMPENDIUM_TAG = 'compendium';

/** An hour: an entry no admin write expired is read again at most this stale. */
export const COMPENDIUM_REVALIDATE_SECONDS = 3600;

/**
 * The deployment's own key part, so a new deployment reads under fresh keys.
 * The seed runs outside Next and cannot expire the tag, and Vercel keeps the
 * data cache from one deployment to the next, so without it a seeded change
 * stays hidden for up to an hour. Vercel sets both variables at build and at
 * runtime; with neither (local, tests) there is no part, so the keys are
 * stable (claude-docs/db/compendium-cache.md, "The deployment key part").
 */
function deploymentKeyPart(): string[] {
  const id = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA;
  return id ? [id] : [];
}

/**
 * `read`, held in the data cache under `COMPENDIUM_TAG` and keyed by `key` and its
 * arguments, so only a read every viewer sees alike may be wrapped. Stored as superjson,
 * since Next's `JSON.stringify` would turn a hit's `Date` columns into strings. (claude-docs/modules.md, "Library comments in full")
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
 * Expires every entry under `COMPENDIUM_TAG`, called by an admin's write to
 * anything the cache holds once the write has committed. `{ expire: 0 }`
 * rather than the recommended `'max'`, so the admin's next read is a miss
 * and not the stale answer `'max'` serves while it revalidates; `updateTag`,
 * which would do the same, throws outside a Server Action, and every write
 * here arrives through `/api/graphql` (DESIGN.md §7).
 */
export function expireCompendium(): void {
  revalidateTag(COMPENDIUM_TAG, { expire: 0 });
}
