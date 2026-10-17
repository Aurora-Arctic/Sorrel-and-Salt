import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { seed } from '@/db/seed/index';
import { ingredientSlug } from '@/lib/slugify';

// The two retirements `standard` seeds (MB.82): a live example of each
// redirect the public entry page answers, so a fresh `db:reset` shows both.

let sql: ReturnType<typeof postgres>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  await truncateAllTables(sql);
  await seed(drizzle(sql), { scenario: 'standard' });
});

afterAll(async () => {
  await sql.end();
});

async function liveEntry(canonicalName: string) {
  const [row] = await sql<{ id: string; slug: string }[]>`
    select id, slug from ingredients
    where workspace_id is null and deleted_at is null and canonical_name = ${canonicalName}`;
  return row;
}

async function retirementsOf(ingredientId: string) {
  return sql<{ slug: string; workspace_id: string | null }[]>`
    select slug, workspace_id from retired_ingredient_slugs where ingredient_id = ${ingredientId}`;
}

describe('the standard scenario retired slugs', () => {
  it('retires the slug Rosemary had under its older name, which no live entry holds', async () => {
    const rosemary = await liveEntry('Salvia rosmarinus');
    const retired = ingredientSlug('Rosemary', 'Rosmarinus officinalis');

    expect(await retirementsOf(rosemary.id)).toEqual([{ slug: retired, workspace_id: null }]);
    expect(retired).not.toBe(rosemary.slug);
    const holders = await sql`
      select id from ingredients
      where workspace_id is null and slug = ${retired} and deleted_at is null`;
    expect(holders).toHaveLength(0);
  });

  it("retires Hidcote Lavender's claim on the slug the species entry now holds", async () => {
    const hidcote = await liveEntry("Lavandula angustifolia 'Hidcote'");
    const species = await liveEntry('Lavandula angustifolia');
    const retired = ingredientSlug('Lavender', 'Lavandula angustifolia');

    expect(await retirementsOf(hidcote.id)).toEqual([{ slug: retired, workspace_id: null }]);
    // The precondition that makes it the notice case: a live entry holds it.
    expect(species.slug).toBe(retired);
    expect(hidcote.slug).not.toBe(retired);
  });

  it('writes nothing on a second run', async () => {
    const before = await sql`select id from retired_ingredient_slugs order by id`;
    await seed(drizzle(sql), { scenario: 'standard' });
    const after = await sql`select id from retired_ingredient_slugs order by id`;
    expect(after).toEqual(before);
    expect(after).toHaveLength(2);
  });
});
