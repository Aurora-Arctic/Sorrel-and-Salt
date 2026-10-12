import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { insertReference } from '../../support/db/insert-reference';
import { makeIngredient } from '../../support/fixtures';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// a migration data test, retired with the old columns in MB.254. `0068` runs
// before MB.253 promotes, so the deploy before it has written the old columns
// alone since `0067`'s fill: a new list, a changed one, a cleared one, a new
// link. This re-runs `0068`'s statements against rows left in each of those
// states, written to the old columns by raw SQL as that deploy writes them
// (claude-docs/db/expand-contract.md, "Renaming a table").

const FILE = fromRoot('src/db/migrations/0068_celestial-bodies-refill.sql');

/** `0068`'s statements, comment lines stripped, as the migrator splits them. */
const STATEMENTS = existsSync(FILE)
  ? readFileSync(FILE, 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
      .filter(Boolean)
  : [];

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const token = () => crypto.randomUUID().slice(0, 8);

/** Runs `0068` whole, in order. */
async function refill(): Promise<void> {
  expect(STATEMENTS.length).toBeGreaterThan(0);
  for (const statement of STATEMENTS) await sql.unsafe(statement);
}

/** An invented celestial body. */
async function body(): Promise<string> {
  const t = token();
  const [row] = await sql`
    insert into celestial_bodies ${sql({
      name: `Testara ${t}`,
      slug: `testara-${t}`,
      description: 'A body kept only by fixtures.',
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id`;
  return row.id as string;
}

type Lists = { old: string[] | null; current: string[] | null };

/** A compendium ingredient and its one variant, each list column set as given. */
async function ingredientHolding(own: Lists, variant: Lists): Promise<string> {
  const t = token();
  const id = await insertIngredient(
    sql,
    makeIngredient({ name: `Testwort ${t}`, canonicalName: `Fixtura testalis ${t}` }),
    AUTHOR,
  );
  await sql`update ingredients set planets = ${own.old}, celestial_bodies = ${own.current}
    where id = ${id}`;
  await sql`update ingredient_variants set planets = ${variant.old},
    celestial_bodies = ${variant.current} where ingredient_id = ${id}`;
  return id;
}

/** Each ingredient's lists and its variant's, old then current, with when each row last changed. */
async function listsOf(ids: string[]) {
  const rows = await sql`
    select i.id, i.planets as own_old, i.celestial_bodies as own, i.updated_at as own_at,
           v.planets as variant_old, v.celestial_bodies as variant, v.updated_at as variant_at
    from ingredients i join ingredient_variants v on v.ingredient_id = i.id
    where i.id in ${sql(ids)}`;
  return new Map(rows.map((row) => [row.id as string, row]));
}

/** A link to a new reference, each body column set as given. */
async function link(old: string | null, current: string | null): Promise<string> {
  const reference = await insertReference(sql, {}, AUTHOR);
  const [row] = await sql`
    insert into reference_links ${sql({
      reference_id: reference,
      planet_id: old,
      celestial_body_id: current,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id`;
  return row.id as string;
}

describe('0068: the lists', () => {
  it('rederives each new list from the old, writing only a row that disagrees', async () => {
    const filled = await ingredientHolding(
      { old: ['Testara'], current: ['Testara'] },
      { old: ['Fixturia'], current: ['Fixturia'] },
    );
    const added = await ingredientHolding(
      { old: ['Testara'], current: null },
      { old: ['Fixturia'], current: null },
    );
    const changed = await ingredientHolding(
      { old: ['Testara', 'Fixturia'], current: ['Testara'] },
      { old: ['Fixturia'], current: ['Testara'] },
    );
    const cleared = await ingredientHolding(
      { old: null, current: ['Testara'] },
      { old: null, current: ['Fixturia'] },
    );
    const ids = [filled, added, changed, cleared];
    const before = await listsOf(ids);

    // Precondition: three of the four disagree, and the fourth is 0067's fill.
    expect(ids.map((id) => [before.get(id)!.own, before.get(id)!.variant])).toEqual([
      [['Testara'], ['Fixturia']],
      [null, null],
      [['Testara'], ['Testara']],
      [['Testara'], ['Fixturia']],
    ]);

    await refill();
    const after = await listsOf(ids);

    expect(ids.map((id) => [after.get(id)!.own, after.get(id)!.variant])).toEqual([
      [['Testara'], ['Fixturia']],
      [['Testara'], ['Fixturia']],
      [['Testara', 'Fixturia'], ['Fixturia']],
      [null, null],
    ]);
    // A row that agreed is not written, so `set_updated_at` leaves it alone.
    expect(after.get(filled)!.own_at).toEqual(before.get(filled)!.own_at);
    expect(after.get(filled)!.variant_at).toEqual(before.get(filled)!.variant_at);
    expect(after.get(added)!.own_at).not.toEqual(before.get(added)!.own_at);
  });
});

describe('0068: the links', () => {
  it('fills a link written by its old column alone, and leaves any other alone', async () => {
    const id = await body();
    const added = await link(id, null);
    const filled = await link(id, id);
    // Only ever written by the new column, as the seed now writes one: an
    // empty old column clears nothing, since no code clears a link's body.
    const current = await link(null, id);
    const read = async (link: string) =>
      (
        await sql`select planet_id, celestial_body_id, updated_at from reference_links
          where id = ${link}`
      )[0];
    const before = [await read(filled), await read(current)];

    // Precondition: the old column alone names the body.
    expect(await read(added)).toMatchObject({ planet_id: id, celestial_body_id: null });

    await refill();

    expect(await read(added)).toMatchObject({ planet_id: id, celestial_body_id: id });
    expect([await read(filled), await read(current)]).toEqual(before);
  });
});
