import { vi } from 'vitest';

// `next/cache` under Vitest, aliased in by vitest.config.mts and
// vitest.stories.config.mts. Next's own throws outside a request — it finds no
// incremental cache to read, and no work store to queue a revalidation on — and
// a test is never inside one. So the data cache is a pass-through, and every
// read reaches Postgres as it would with the cache empty: a test sees what the
// database holds, never what an earlier test left cached.
// `revalidateTag` records its calls, so a test can assert that a write
// expired the tag it changes (claude-docs/db/compendium-cache.md, "In tests").
// A test that needs the cache to hold mocks this module with
// tests/support/next-data-cache.ts instead.

export const unstable_cache = <A extends unknown[], R>(
  read: (...args: A) => Promise<R>,
): ((...args: A) => Promise<R>) => read;

export const revalidateTag = vi.fn((_tag: string, _profile: string | { expire?: number }) => {});
