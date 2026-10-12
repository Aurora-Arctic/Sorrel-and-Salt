import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { revalidateTag } from 'next/cache';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { COMPENDIUM_TAG } from '@/lib/compendium-cache';
import type { PageRequest } from '@/lib/types';
import { countCompendium, listCompendium } from '@/modules/ingredients';
import { A } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { clearDataCache } from '../../../support/next-data-cache';

// M8.6: the compendium's page and MB.105's count held in the data cache under
// the `compendium` tag, each keyed by its arguments (DESIGN.md §7). A data
// cache that holds, as Next's does (tests/support/next-data-cache.ts), so a
// row written underneath a read shows whether the repeat read reached
// Postgres (claude-docs/db/compendium-cache.md).
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  clearDataCache();
});

const seed = (name: string, workspaceId: string | null = null) =>
  insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', workspaceId }), A.id);

const PAGE: PageRequest = { limit: 26, inverted: false };
const names = async (filter = {}) =>
  (await listCompendium(filter, PAGE)).map((entry) => entry.node.name);

describe('M8.6: the compendium read is cached under the compendium tag', () => {
  it('answers a repeat read of the page and its count from the cache', async () => {
    await seed('Fixture Alpha');
    expect(await names()).toEqual(['Fixture Alpha']);
    expect(await countCompendium({}, undefined)).toEqual({ totalCount: 1, countBefore: null });

    await seed('Fixture Beta');

    // Postgres holds two entries now; the cache still answers the one.
    expect(await names()).toEqual(['Fixture Alpha']);
    expect(await countCompendium({}, undefined)).toEqual({ totalCount: 1, countBefore: null });
  });

  it('reads Postgres again once the tag expires', async () => {
    await seed('Fixture Alpha');
    await names();
    await countCompendium({}, undefined);
    await seed('Fixture Beta');

    revalidateTag(COMPENDIUM_TAG, { expire: 0 });

    expect(await names()).toEqual(['Fixture Alpha', 'Fixture Beta']);
    expect(await countCompendium({}, undefined)).toEqual({ totalCount: 2, countBefore: null });
  });

  it('keys the page and the count by their arguments, each an entry of its own', async () => {
    await seed('Fixture Alpha');
    await names();
    await countCompendium({}, undefined);
    await seed('Fixture Beta');

    // Arguments not read before are a miss, so they read what Postgres holds,
    // while the ones read before still answer from the cache.
    expect(await names({ query: 'Fixture' })).toEqual(['Fixture Alpha', 'Fixture Beta']);
    expect(await countCompendium({ query: 'Fixture' }, undefined)).toEqual({
      totalCount: 2,
      countBefore: null,
    });
    expect(await names()).toEqual(['Fixture Alpha']);
    expect(await countCompendium({}, undefined)).toEqual({ totalCount: 1, countBefore: null });
  });

  it('gives back the rows as the repository returned them, dates as dates', async () => {
    await seed('Fixture Alpha');
    const [miss] = await listCompendium({}, PAGE);
    const [hit] = await listCompendium({}, PAGE);

    expect(hit).toEqual(miss);
    expect(hit.node.createdAt).toBeInstanceOf(Date);
  });

  it('caches nothing of a coven: a coven entry is in no cached read', async () => {
    await seed('Fixture Coven Entry', WORKSPACE_W_ID);
    await seed('Fixture Alpha');

    expect(await names()).toEqual(['Fixture Alpha']);
  });
});
