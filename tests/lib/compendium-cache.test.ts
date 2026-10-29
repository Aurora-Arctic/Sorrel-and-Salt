import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COMPENDIUM_REVALIDATE_SECONDS,
  COMPENDIUM_TAG,
  cachedCompendiumRead,
} from '@/lib/compendium-cache';
import { clearDataCache, declared } from '../support/next-data-cache';

// The wrapper over `unstable_cache`, against a data cache that holds as Next's does
// (tests/support/next-data-cache.ts): what each read is declared with, and what a hit gives back
// (claude-docs/db/compendium-cache.md).
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

  // A seed runs outside Next and cannot expire the tag, and Vercel keeps the
  // data cache across deployments: each deployment must read under keys of its own.
  describe('the deployment key part', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('reads Postgres again under a different deployment id, and from the cache under the same one', async () => {
      clearDataCache();
      let calls = 0;
      const read = async () => ++calls;

      vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_one');
      const first = cachedCompendiumRead('fixture-deploy', read);
      await first();
      await first();
      expect(calls).toBe(1);

      vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_two');
      const second = cachedCompendiumRead('fixture-deploy', read);
      expect(await second()).toBe(2);
      expect(declared[declared.length - 1].keyParts).toEqual(['fixture-deploy', 'dpl_two']);
    });

    it('falls back to the commit hash, then to no part at all', () => {
      vi.stubEnv('VERCEL_DEPLOYMENT_ID', '');
      vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'abc123');
      cachedCompendiumRead('fixture-sha', async () => 1);
      expect(declared[declared.length - 1].keyParts).toEqual(['fixture-sha', 'abc123']);

      vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
      cachedCompendiumRead('fixture-none', async () => 1);
      expect(declared[declared.length - 1].keyParts).toEqual(['fixture-none']);
    });
  });
});
