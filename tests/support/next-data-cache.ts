import { vi } from 'vitest';
import type { CachedDeclaration, CachedEntry } from './types';

// A data cache with Next's observable behaviour, for tests that need one to hold:
// `vi.mock('next/cache', () => import('…/next-data-cache'))`. Entries are keyed as `unstable_cache` keys them
// trip fails here too. `revalidateTag` drops every entry with the tag.

const entries = new Map<string, CachedEntry>();

/** Every `unstable_cache` declaration made since the module loaded, in order. */
export const declared: CachedDeclaration[] = [];

export const unstable_cache = <A extends unknown[], R>(
  read: (...args: A) => Promise<R>,
  keyParts: readonly string[] = [],
  options: { tags?: string[]; revalidate?: number | false } = {},
): ((...args: A) => Promise<R>) => {
  const tags = options.tags ?? [];
  declared.push({ keyParts, tags, revalidate: options.revalidate });
  return async (...args: A) => {
    const key = `${keyParts.join(',')}-${JSON.stringify(args)}`;
    const hit = entries.get(key);
    if (hit) return JSON.parse(hit.body) as R;
    const result = await read(...args);
    entries.set(key, { body: JSON.stringify(result), tags });
    return result;
  };
};

export const revalidateTag = vi.fn((tag: string, _profile: string | { expire?: number }) => {
  for (const [key, entry] of entries) if (entry.tags.includes(tag)) entries.delete(key);
});

/** Empties the cache, as a fresh server starts: call it beside a test's truncate. */
export function clearDataCache(): void {
  entries.clear();
}
