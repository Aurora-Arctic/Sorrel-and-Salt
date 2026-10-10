import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { revalidateTag } from 'next/cache';
import { COMPENDIUM_TAG } from '@/lib/compendium-cache';
import type { PageRequest } from '@/lib/types';
import {
  countAstrologyValues,
  countCategories,
  countDeities,
  countIngredientFormValues,
  listAstrologyValues,
  listCategories,
  listDeities,
  listIngredientFormValues,
} from '@/modules/vocabulary';
import { useTestDatabase } from '../../../support/db/database';
import { clearDataCache } from '../../../support/next-data-cache';
import type { CachedVocabulary } from './types';

// M8.6: the curated vocabularies' reads held in the data cache under the
// `compendium` tag (DESIGN.md §7). A data cache that holds, as Next's does
// (tests/support/next-data-cache.ts), so a row changed underneath a read
// shows whether the repeat read reached Postgres: it did not if the change is
// invisible, until the tag expires (claude-docs/db/compendium-cache.md).
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(() => clearDataCache());

const PAGE: PageRequest = { limit: 26, inverted: false };

// Each vocabulary's table, and its list and count as the admin page and
// GraphQL read them, unfiltered.
const VOCABULARIES: [string, CachedVocabulary][] = [
  [
    'categories',
    {
      table: 'categories',
      list: () => listCategories({}, PAGE),
      count: () => countCategories({}, undefined),
    },
  ],
  [
    'ingredient forms',
    {
      table: 'ingredient_forms',
      list: () => listIngredientFormValues({}, PAGE),
      count: () => countIngredientFormValues({}, undefined),
    },
  ],
  [
    'planets',
    {
      table: 'planets',
      list: () => listAstrologyValues('planets', {}, PAGE),
      count: () => countAstrologyValues('planets', {}, undefined),
    },
  ],
  [
    'zodiac signs',
    {
      table: 'zodiac_signs',
      list: () => listAstrologyValues('zodiacSigns', {}, PAGE),
      count: () => countAstrologyValues('zodiacSigns', {}, undefined),
    },
  ],
  [
    'deities',
    {
      table: 'deities',
      list: () => listDeities({}, PAGE),
      count: () => countDeities({}, undefined),
    },
  ],
];

describe.each(VOCABULARIES)('M8.6: the %s read is cached under the compendium tag', (_, v) => {
  it('answers a repeat read from the cache, and Postgres again once the tag expires', async () => {
    const first = await v.list();
    const before = await v.count();
    // Two rows to change underneath: one renamed, one deleted.
    expect(first.length).toBeGreaterThanOrEqual(2);
    const [renamed, deleted] = first.map((entry) => entry.node);

    await sql`update ${sql(v.table)} set name = 'Fixture Renamed' where id = ${renamed.id}`;
    await sql`update ${sql(v.table)} set deleted_at = now() where id = ${deleted.id}`;

    // The database has changed; the cache has not, so neither read reached it.
    expect((await v.list()).map((entry) => entry.node.name)).toEqual(
      first.map((entry) => entry.node.name),
    );
    expect(await v.count()).toEqual(before);

    revalidateTag(COMPENDIUM_TAG, { expire: 0 });

    const after = (await v.list()).map((entry) => entry.node);
    expect(after.find((row) => row.id === renamed.id)?.name).toBe('Fixture Renamed');
    expect(after.some((row) => row.id === deleted.id)).toBe(false);
    expect((await v.count()).totalCount).toBe(before.totalCount - 1);
  });
});
