import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { seed } from '@/db/seed/index';
import { WORKSPACE_W_INGREDIENTS } from '@/db/seed/demo';
import { COMPENDIUM_INGREDIENTS, identityOf } from '@/db/seed/standard';
import { COMPENDIUM } from '@/db/seed/compendium/index';

// What running the `demo` scenario, `standard` inside it, leaves between an
// entry and its forms (MB.216, MB.222): every seeded entry holds exactly the
// live variants its literal names, so every seeded layer can name one, and the
// two the scenarios hold on purpose are there — Rosemary with two forms, and
// W's Ginger with a form no admin has curated. What else the scenarios hold is
// the seed docs' to review; the shape every seed shares is index.test.ts's
// (MB.183).

let sql: ReturnType<typeof postgres>;

/**
 * Each seeded entry's live forms, in form order, keyed by tier and identity:
 * a label alone repeats (the three Cat's Claws).
 */
async function formsPerEntry(): Promise<Map<string, string[]>> {
  const rows = await sql<{ entry: string; forms: string[] }[]>`
    select (case when i.workspace_id is null then 'compendium' else 'W' end) || '|' || i.identity_key
             as entry,
           coalesce(
             array_agg(v.form order by lower(v.form)) filter (where v.id is not null),
             '{}'
           ) as forms
    from ingredients i
    left join ingredient_variants v on v.ingredient_id = i.id and v.deleted_at is null
    group by i.id
  `;
  return new Map(rows.map((row) => [row.entry, row.forms]));
}

/** What the literals name, keyed as `formsPerEntry` keys the rows. */
function formsOfLiterals(
  tier: string,
  entries: readonly {
    name: string;
    canonicalName?: string | null;
    variants: readonly { form: string }[];
  }[],
): [string, string[]][] {
  return entries.map((entry) => [
    `${tier}|${identityOf(entry)}`,
    entry.variants
      .map((variant) => variant.form)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
  ]);
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
  it("writes each seeded entry's forms as its live variants: Rosemary's two, and W's uncurated rhizome", async () => {
    const forms = await formsPerEntry();

    // The curated compendium sits beside these rows (its own test below), so
    // narrow to the entries these literals name.
    const literals = new Map([
      ...formsOfLiterals('compendium', COMPENDIUM_INGREDIENTS),
      ...formsOfLiterals('W', WORKSPACE_W_INGREDIENTS),
    ]);
    expect(new Map([...forms].filter(([entry]) => literals.has(entry)))).toEqual(literals);
    expect(forms.get('compendium|salvia rosmarinus')).toEqual(['Herb', 'Oil']);
    expect(forms.get('W|zingiber officinale')).toEqual(['rhizome']);
    const [ginger] = await sql`
      select v.form_id from ingredient_variants v join ingredients i on i.id = v.ingredient_id
      where i.workspace_id is not null and i.name = 'Ginger'`;
    expect(ginger.form_id).toBeNull();
  });

  it('holds the curated compendium beside the fixtures, and a second run writes no further ingredient', async () => {
    const curated = COMPENDIUM.flatMap((shard) => shard.entries);
    const rows = await sql<{ identity_key: string }[]>`
      select identity_key from ingredients where workspace_id is null and deleted_at is null`;
    const held = new Set(rows.map((row) => row.identity_key));
    // Precondition: the curated list reaches past the fixtures, so this proves more than standard does.
    expect(curated.length).toBeGreaterThan(COMPENDIUM_INGREDIENTS.length);
    expect(curated.filter((entry) => !held.has(identityOf(entry)))).toEqual([]);
    const [{ before }] = await sql`select count(*)::int as before from ingredients`;

    await seed(drizzle(sql), { scenario: 'demo' });

    const [{ after }] = await sql`select count(*)::int as after from ingredients`;
    expect(after).toBe(before);
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
      where ${sql.unsafe(tier)} and deleted_at is null
      order by name limit 1`;
    const [compendium] = await pick('workspace_id is null');
    const [coven] = await pick('workspace_id is not null');
    // As a database seeded before MB.220 holds them: the form in the address.
    await sql`
      update ingredients set slug = slug || '-fixture-form'
      where id in ${sql([compendium.id, coven.id])}`;
    // Cleared so only this run's retirements count; `standard` writes its two
    // fixtures again beside the moved slug (retired-slugs.test.ts).
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
    const retired = await sql`
      select ingredient_id, workspace_id, slug from retired_ingredient_slugs
      where ingredient_id = ${compendium.id}`;
    expect(retired).toEqual([
      {
        ingredient_id: compendium.id,
        workspace_id: null,
        slug: expect.stringMatching(new RegExp(`^${compendium.slug}-`)),
      },
    ]);
    const all = await sql`select id from retired_ingredient_slugs`;
    // The moved slug beside the two `standard` seeds as fixtures.
    expect(all).toHaveLength(3);
  });
});
