import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { seed } from '@/db/seed/index';

// What running the `demo` scenario, `standard` inside it, leaves between an
// entry and its forms (MB.216): every seeded entry with a form holds exactly
// one live variant of it, so every seeded layer can name one. What the
// scenarios hold is the seed docs' to review; the shape every seed shares is
// index.test.ts's (MB.183).

let sql: ReturnType<typeof postgres>;

/** Each seeded entry's live variants, and whether it carries a form to have one of. */
async function variantsPerEntry() {
  return sql<{ has_form: boolean; variants: number }[]>`
    select i.form is not null as has_form,
           count(v.id) filter (where v.deleted_at is null)::int as variants
    from ingredients i left join ingredient_variants v on v.ingredient_id = i.id
    group by i.id
  `;
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  await truncateAllTables(sql);
  await seed(drizzle(sql), { scenario: 'demo' });
});

afterAll(async () => {
  await sql.end();
});

describe('seed(db, { scenario: "demo" })', () => {
  it('gives every seeded entry with a form one live variant, and an entry without one none', async () => {
    const entries = await variantsPerEntry();

    // Precondition: both tiers' entries were written, so the rule had rows to hold.
    const [{ tiers }] = await sql`
      select count(distinct coalesce(workspace_id::text, ''))::int as tiers from ingredients
    `;
    expect(tiers).toBe(2);
    expect(entries.filter((entry) => entry.variants !== (entry.has_form ? 1 : 0))).toEqual([]);
  });

  it('writes no second variant on a second run', async () => {
    const [{ before }] = await sql`select count(*)::int as before from ingredient_variants`;
    // Precondition: the first run wrote variants for the second to leave alone.
    expect(before).toBeGreaterThan(0);

    await seed(drizzle(sql), { scenario: 'demo' });

    const [{ after }] = await sql`select count(*)::int as after from ingredient_variants`;
    expect(after).toBe(before);
  });

  // MB.220: a slug carries no form, and no SQL rewrites one, so the seed is
  // the backfill for its own entries, as it was when slugs arrived (0025).
  it("moves a seeded entry's older slug on the next run, retiring a compendium one and no coven's", async () => {
    const pick = (tier: string) => sql`
      select id, slug from ingredients
      where ${sql.unsafe(tier)} and form is not null and deleted_at is null
      order by name limit 1`;
    const [compendium] = await pick('workspace_id is null');
    const [coven] = await pick('workspace_id is not null');
    // As a database seeded before MB.220 holds them: the form in the address.
    await sql`
      update ingredients set slug = slug || '-' || lower(form)
      where id in ${sql([compendium.id, coven.id])}`;
    await sql`delete from retired_ingredient_slugs`;

    await seed(drizzle(sql), { scenario: 'demo' });

    const moved = await sql`
      select id, slug from ingredients where id in ${sql([compendium.id, coven.id])}`;
    expect(new Map(moved.map((row) => [row.id, row.slug]))).toEqual(
      new Map([
        [compendium.id, compendium.slug],
        [coven.id, coven.slug],
      ]),
    );
    const retired =
      await sql`select ingredient_id, workspace_id, slug from retired_ingredient_slugs`;
    expect(retired).toEqual([
      {
        ingredient_id: compendium.id,
        workspace_id: null,
        slug: expect.stringMatching(new RegExp(`^${compendium.slug}-`)),
      },
    ]);
  });
});
