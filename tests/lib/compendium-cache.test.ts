import { describe, expect, it, vi } from 'vitest';
import {
  COMPENDIUM_REVALIDATE_SECONDS,
  COMPENDIUM_TAG,
  cachedCompendiumRead,
} from '@/lib/compendium-cache';
import { clearDataCache, declared } from '../support/next-data-cache';

// M8.6's wrapper over `unstable_cache`, against a data cache that holds as
// Next's does (tests/support/next-data-cache.ts): what each read is declared
// with, and what a hit gives back (claude-docs/db/compendium-cache.md).
vi.mock('next/cache', () => import('../support/next-data-cache'));

describe('cachedCompendiumRead', () => {
  it('declares the read under the compendium tag, for an hour, keyed by its name', () => {
    cachedCompendiumRead('fixture-read', async () => 1);

    expect(declared[declared.length - 1]).toEqual({
      keyParts: ['fixture-read'],
      tags: [COMPENDIUM_TAG],
      revalidate: COMPENDIUM_REVALIDATE_SECONDS,
    });
    expect(COMPENDIUM_TAG).toBe('compendium');
    expect(COMPENDIUM_REVALIDATE_SECONDS).toBe(3600);
  });

  it('runs the read once per argument list', async () => {
    clearDataCache();
    const read = vi.fn(async (n: number) => n * 2);
    const cached = cachedCompendiumRead('fixture-double', read);

    expect(await cached(2)).toBe(4);
    expect(await cached(2)).toBe(4);
    expect(await cached(3)).toBe(6);
    expect(read.mock.calls).toEqual([[2], [3]]);
  });

  it('gives a hit back as the miss gave it, dates as dates', async () => {
    clearDataCache();
    const row = { name: 'Testwort', createdAt: new Date('2026-01-02T03:04:05Z'), deletedAt: null };
    const cached = cachedCompendiumRead('fixture-row', async () => [row]);

    const miss = await cached();
    const hit = await cached();

    expect(miss).toEqual([row]);
    expect(hit).toEqual([row]);
    expect(hit[0].createdAt).toBeInstanceOf(Date);
  });
});
