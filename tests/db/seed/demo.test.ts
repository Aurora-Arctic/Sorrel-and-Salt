import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { seed } from '@/db/seed/index';
import { DEMO_STOCK, WORKSPACE_W_CUPBOARD, WORKSPACE_W_INGREDIENTS } from '@/db/seed/demo';
import { COMPENDIUM_INGREDIENTS, WORKSPACE_W_ID, identityOf } from '@/db/seed/standard';
import { loadCompendium } from '@/db/seed/compendium/load';

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
  it("writes each seeded entry's forms as its live variants, Rosemary's two among them", async () => {
    const forms = await formsPerEntry();

    // The curated compendium sits beside these rows (its own test below), so
    // narrow to the entries these literals name.
    const literals = new Map([
      ...formsOfLiterals('compendium', COMPENDIUM_INGREDIENTS),
      ...formsOfLiterals('W', WORKSPACE_W_INGREDIENTS),
    ]);
    expect(new Map([...forms].filter(([entry]) => literals.has(entry)))).toEqual(literals);
    expect(forms.get('compendium|salvia rosmarinus')).toEqual(['Herb', 'Oil']);
  });

  it('holds Garden Rosemary, House Chamomile and Ginger as cupboard rows with exactly their overrides, and no own row beside them', async () => {
    const rows = await sql`
      select i.identity_key, c.label, c.description, c.safety_notes, c.elements,
             c.celestial_bodies, c.zodiac_signs, c.colors
      from workspace_compendium_entries c join ingredients i on i.id = c.ingredient_id
      where c.workspace_id = ${WORKSPACE_W_ID} and c.deleted_at is null
      order by i.identity_key`;
    const none = { safety_notes: null, elements: null, celestial_bodies: null, zodiac_signs: null };

    expect(rows).toEqual([
      {
        ...none,
        identity_key: 'matricaria chamomilla',
        label: 'House Chamomile',
        description: null,
        colors: ['white', 'yellow'],
      },
      {
        ...none,
        identity_key: 'salvia rosmarinus',
        label: 'Garden Rosemary',
        description: 'Cut from the bush by the back door, dried in bunches over the stove.',
        colors: null,
      },
      {
        ...none,
        identity_key: 'zingiber officinale',
        label: null,
        description: null,
        colors: null,
      },
    ]);
    const own = await sql`
      select identity_key from ingredients
      where workspace_id = ${WORKSPACE_W_ID} and deleted_at is null`;
    expect(own.map((row) => row.identity_key).sort()).toEqual(["cat's claw", 'hearth ash']);
  });

  it('lays the compendium variants where a jar once named an own row, and leaves no jar on an entry the cupboard lacks', async () => {
    const layers = await sql`
      select i.identity_key, v.form
      from spell_ingredients l
      join ingredients i on i.id = l.ingredient_id and i.workspace_id is null
      join ingredient_variants v on v.id = l.variant_id
      where i.identity_key in ('salvia rosmarinus', 'matricaria chamomilla')`;
    expect(layers).toHaveLength(2);
    const unheld = await sql`
      select s.id from inventory_items s
      join ingredients i on i.id = s.ingredient_id and i.workspace_id is null
      where s.deleted_at is null and not exists (
        select 1 from workspace_compendium_entries c
        where c.workspace_id = s.workspace_id and c.ingredient_id = s.ingredient_id
          and c.deleted_at is null)`;
    expect(unheld).toEqual([]);
  });

  it("keeps W's Cat's Claw an own stub with no formal name, and none of the five compendium Cat's Claws in the cupboard", async () => {
    const [local] = await sql`
      select id, canonical_name from ingredients
      where workspace_id = ${WORKSPACE_W_ID} and name = 'Cat''s Claw' and deleted_at is null`;
    const five = await sql`
      select c.id from workspace_compendium_entries c join ingredients i on i.id = c.ingredient_id
      where i.name = 'Cat''s Claw' and i.workspace_id is null`;
    const [{ total }] = await sql`
      select count(*)::int as total from ingredients
      where name = 'Cat''s Claw' and workspace_id is null and deleted_at is null`;

    expect(local.canonical_name).toBeNull();
    expect(total).toBe(5);
    expect(five).toEqual([]);
  });

  it('holds the curated compendium beside the fixtures, and a second run writes no further ingredient', async () => {
    const curated = loadCompendium()
      .files.filter((file) => file.status === 'approved')
      .map((file) => file.entry);
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
  // The Edit Stock button and the jar lines show only on a card with stock, and
  // no other scenario writes any (M9.9).
  describe("W's stock", () => {
    const stockRows = () => sql`
      select s.id, s.quantity_on_hand, s.unit, s.unit_dimension, s.low_stock_threshold,
             i.identity_key, i.workspace_id is null as compendium, v.form
      from inventory_items s
      join ingredients i on i.id = s.ingredient_id
      join ingredient_variants v on v.id = s.variant_id
      where s.workspace_id = ${WORKSPACE_W_ID} and s.deleted_at is null`;

    it('holds every jar the scenario names, among them one unmeasured, one low and one with two forms beside it', async () => {
      const rows = await stockRows();

      expect(rows.map((row) => row.id).sort()).toEqual(DEMO_STOCK.map((jar) => jar.id).sort());
      const unmeasured = rows.filter((row) => row.quantity_on_hand === null);
      expect(unmeasured.map((row) => [row.unit, row.low_stock_threshold])).toEqual([[null, null]]);
      // Below its threshold, the default one where the jar sets none.
      expect(
        rows.filter(
          (row) =>
            row.quantity_on_hand !== null &&
            Number(row.quantity_on_hand) <= Number(row.low_stock_threshold),
        ).length,
      ).toBeGreaterThan(0);
      expect(new Set(rows.map((row) => row.unit_dimension))).toEqual(
        new Set(['weight', 'volume', 'count', null]),
      );
      const formsOfRosemary = rows.filter((row) => row.identity_key === 'salvia rosmarinus');
      expect(formsOfRosemary.map((row) => row.form).sort()).toEqual(['Herb', 'Oil']);
    });

    it('holds every compendium entry it stocks in the cupboard', async () => {
      const names = new Set(WORKSPACE_W_CUPBOARD.map((held) => identityOf(held.entry)));
      const stocked = (await stockRows()).filter((row) => row.compendium);

      // Precondition: a compendium jar exists, so the check below tests something.
      expect(stocked.length).toBeGreaterThan(0);
      expect(stocked.filter((row) => !names.has(row.identity_key))).toEqual([]);
    });
  });
});
