import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { listCompendiumSlugs } from '@/modules/ingredients';
import { A } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { clearDataCache } from '../../../support/next-data-cache';

// The sitemap's read of every current slug, held in the data cache like
// the list (claude-docs/db/compendium-cache.md).
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  clearDataCache();
});

const seed = (
  name: string,
  extra: { workspaceId?: string | null; formal?: boolean; description?: string } = {},
) =>
  insertIngredient(
    sql,
    makeIngredient(
      extra.formal
        ? { name, workspaceId: extra.workspaceId, description: extra.description }
        : {
            name,
            nomenclature: 'none',
            workspaceId: extra.workspaceId,
            description: extra.description,
          },
    ),
    A.id,
  );

describe('MB.84: listCompendiumSlugs', () => {
  it('lists every live compendium entry by name, with its formal name, description and last change', async () => {
    await seed('Fixture Beta', { description: 'A fixture herb.' });
    await seed('Fixture Alpha', { formal: true });

    const entries = await listCompendiumSlugs();

    expect(entries.map((entry) => entry.name)).toEqual(['Fixture Alpha', 'Fixture Beta']);
    expect(entries[0]).toEqual({
      slug: expect.any(String),
      name: 'Fixture Alpha',
      canonicalName: expect.any(String),
      description: null,
      lastModified: expect.any(Date),
    });
    expect(entries[1]).toMatchObject({ canonicalName: null, description: 'A fixture herb.' });
  });

  it('leaves out a soft-deleted entry and a coven ingredient, both of which exist', async () => {
    const removed = await seed('Fixture Removed');
    await seed('Fixture Coven Own', { workspaceId: WORKSPACE_W_ID });
    await seed('Fixture Kept');
    await sql`update ingredients set deleted_at = now() where id = ${removed}`;

    const rows = await sql`select name from ingredients order by name`;
    expect(rows.map((row) => row.name)).toEqual([
      'Fixture Coven Own',
      'Fixture Kept',
      'Fixture Removed',
    ]);
    expect((await listCompendiumSlugs()).map((entry) => entry.name)).toEqual(['Fixture Kept']);
  });

  it("reports the row's updated_at, which only a real change moves", async () => {
    const id = await seed('Fixture Alpha');
    const [{ updated_at: stamped }] =
      await sql`select updated_at from ingredients where id = ${id}`;

    const [entry] = await listCompendiumSlugs();
    expect(entry.lastModified).toEqual(stamped);
  });

  it('answers a repeat read from the cache, and takes no session', async () => {
    await seed('Fixture Alpha');
    expect(listCompendiumSlugs).toHaveLength(0);
    await listCompendiumSlugs();
    await seed('Fixture Beta');

    expect((await listCompendiumSlugs()).map((entry) => entry.name)).toEqual(['Fixture Alpha']);
  });
});
