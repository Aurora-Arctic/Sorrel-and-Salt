import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { revalidateTag } from 'next/cache';
import { COMPENDIUM_TAG } from '@/lib/compendium-cache';
import { NotFound } from '@/lib/errors';
import type { PageRequest } from '@/lib/types';
import {
  compendiumFacets,
  countCompendium,
  deleteCompendiumEntry,
  listCompendium,
  readCompendiumEntry,
} from '@/modules/ingredients';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { clearDataCache, declared } from '../../../support/next-data-cache';

// The compendium's page and its count held in the data cache under the `compendium` tag, each keyed by its arguments (DESIGN.md §7).
// The data cache holds as Next's does (tests/support/next-data-cache.ts), so a row written underneath a read shows whether the repeat read reached Postgres (claude-docs/db/compendium-cache.md).
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

describe('the compendium read is cached under the compendium tag', () => {
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
});

describe('the compendium facets are cached under the compendium tag', () => {
  const forms = async () => (await compendiumFacets({})).forms;

  it('answers a repeat read from the cache, and reads Postgres again after an admin delete', async () => {
    const deleting = await seed('Fixture Alpha');
    expect(await forms()).toEqual([{ value: 'Testform', count: 1 }]);

    await seed('Fixture Beta');
    await seed('Fixture Gamma');

    // Postgres holds three entries of the form now; the cache still answers one.
    expect(await forms()).toEqual([{ value: 'Testform', count: 1 }]);

    await deleteCompendiumEntry(asUser(E), deleting);

    expect(await forms()).toEqual([{ value: 'Testform', count: 2 }]);
  });
});

describe('the public entry read is cached under the compendium tag', () => {
  const nameAt = async (slug: string) => {
    const page = await readCompendiumEntry(slug);
    if (page.kind !== 'entry') throw new Error('Expected an entry');
    return page.detail.entry.name;
  };

  it('declares the read under the tag, answers a repeat from the cache, and reads Postgres again after expiry', async () => {
    expect(declared).toContainEqual(
      expect.objectContaining({ keyParts: ['compendium-entry'], tags: [COMPENDIUM_TAG] }),
    );
    const id = await seed('Fixture Alpha');
    const [{ slug }] = await sql`select slug from ingredients where id = ${id}`;
    expect(await nameAt(slug)).toBe('Fixture Alpha');

    // Renamed underneath the read, its slug left where it was.
    await sql`update ingredients set name = 'Fixture Renamed' where id = ${id}`;
    expect(await nameAt(slug)).toBe('Fixture Alpha');

    revalidateTag(COMPENDIUM_TAG, { expire: 0 });

    expect(await nameAt(slug)).toBe('Fixture Renamed');
  });

  it('caches no refusal: a slug that named nothing answers once an entry is there', async () => {
    await expect(readCompendiumEntry('fixture-late')).rejects.toThrow(NotFound);
    await sql`update ingredients set slug = 'fixture-late' where id = ${await seed('Fixture Late')}`;

    expect(await nameAt('fixture-late')).toBe('Fixture Late');
  });
});
