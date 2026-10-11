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
  // Under the tag an admin write expires, keyed by its name; that a write
  // expires it is tests/e2e/compendium-cache.spec.ts's.
  it('declares the read under the compendium tag, and gives a hit back as the miss gave it, dates as dates', async () => {
    clearDataCache();
    const row = { name: 'Testwort', createdAt: new Date('2026-01-02T03:04:05Z'), deletedAt: null };
    const cached = cachedCompendiumRead('fixture-row', async () => [row]);

    expect(declared[declared.length - 1]).toEqual({
      keyParts: ['fixture-row'],
      tags: [COMPENDIUM_TAG],
      revalidate: COMPENDIUM_REVALIDATE_SECONDS,
    });

    const miss = await cached();
    const hit = await cached();

    expect(miss).toEqual([row]);
    expect(hit).toEqual([row]);
    expect(hit[0].createdAt).toBeInstanceOf(Date);
  });
});
