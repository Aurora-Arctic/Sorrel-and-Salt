import 'server-only';
import { unstable_cache } from 'next/cache';
import superjson from 'superjson';

// The compendium's data cache (CLAUDE.md rule 6; DESIGN.md §7): the curated
// reads every viewer sees alike, held across requests under one tag, which an
// admin write expires. Every use of `next/cache` is in this file, so the tag
// has one spelling (tests/guards/compendium-cache.test.ts). `unstable_cache`
// rather than `use cache`, deliberately: DESIGN.md §7, "Caching — three
// layers in v1" (claude-docs/db/compendium-cache.md).

/**
 * The one tag every compendium cache entry carries — the curated reads' and,
 * through them, the public compendium pages' ISR entries (MB.80).
 */
export const COMPENDIUM_TAG = 'compendium';

/** An hour: an entry no admin write expired is read again at most this stale. */
export const COMPENDIUM_REVALIDATE_SECONDS = 3600;

/**
 * `read`, held in the data cache under `COMPENDIUM_TAG` and keyed by `key` and
 * its arguments, so each argument list is an entry of its own. Only a read
 * every viewer sees alike may be wrapped: its arguments are the whole key, so
 * a session among them would be a cache per viewer, and one left out of them
 * a leak (tests/guards/compendium-cache.test.ts lists the reads).
 *
 * The value is stored as superjson rather than left to Next's `JSON.stringify`,
 * which would answer a hit's `Date` columns as strings while a miss answered
 * them as dates.
 */
export function cachedCompendiumRead<A extends unknown[], R>(
  key: string,
  read: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  const cached = unstable_cache(
    async (...args: A) => superjson.stringify(await read(...args)),
    [key],
    { tags: [COMPENDIUM_TAG], revalidate: COMPENDIUM_REVALIDATE_SECONDS },
  );
  return async (...args) => superjson.parse<R>(await cached(...args));
}
