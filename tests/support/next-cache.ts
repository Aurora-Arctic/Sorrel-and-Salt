import { vi } from 'vitest';

// `next/cache` under Vitest, aliased in by vitest.config.mts. Next's own throws outside a request, so the
// data cache is a pass-through and every read reaches Postgres. `revalidateTag` records its calls, so a test
// can assert a write expired its tag (claude-docs/db/compendium-cache.md, "In tests"). A test needing the cache holds mocks next-data-cache.ts.

export const unstable_cache = <A extends unknown[], R>(
  read: (...args: A) => Promise<R>,
): ((...args: A) => Promise<R>) => read;

export const revalidateTag = vi.fn((_tag: string, _profile: string | { expire?: number }) => {});
