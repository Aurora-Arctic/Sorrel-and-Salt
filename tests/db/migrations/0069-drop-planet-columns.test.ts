import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { insertReference } from '../../support/db/insert-reference';
import { makeIngredient } from '../../support/fixtures';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// a migration data test, retired once `0069` is in production's journal. The
// migrated database has no old column left for `0069` to read, so each case
// first puts back what `0068` left (the two lists, `planet_id` with its key,
// index and the `coalesce` CHECK, and the view), writes rows into it as the
// deploy before MB.253 and MB.253's own code each write them, then runs
// `0069` whole (claude-docs/db/expand-contract.md, "Renaming a table").

const FILE = fromRoot('src/db/migrations/0069_drop-planet-columns.sql');

/** `0069`'s statements, comment lines stripped, as the migrator splits them. */
const STATEMENTS = existsSync(FILE)
  ? readFileSync(FILE, 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
      .filter(Boolean)
  : [];

const AUTHOR = FIXTURE_USERS.A.id;
const EDITOR = FIXTURE_USERS.E.id;

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

const token = () => crypto.randomUUID().slice(0, 8);

// The database as `0069` meets it: `0068`'s, with the old columns undeclared
// but still there.
beforeEach(async () => {
  await sql.unsafe(`
    ALTER TABLE ingredients ADD COLUMN planets text[];
    ALTER TABLE ingredient_variants ADD COLUMN planets text[];
    ALTER TABLE reference_links ADD COLUMN planet_id uuid
      CONSTRAINT reference_links_planet_id_celestial_bodies_id_fk REFERENCES celestial_bodies (id);
    CREATE UNIQUE INDEX reference_links_planet_unique ON reference_links (planet_id, reference_id)
      WHERE planet_id IS NOT NULL AND deleted_at IS NULL;
    ALTER TABLE reference_links DROP CONSTRAINT reference_links_one_row;
    ALTER TABLE reference_links ADD CONSTRAINT reference_links_one_row CHECK (num_nonnulls(
      ingredient_id, deity_id, deity_tradition_id, coalesce(celestial_body_id, planet_id),
      zodiac_sign_id, ingredient_variant_id) = 1);
    CREATE VIEW planets AS SELECT * FROM celestial_bodies;
  `);
});

/** Runs `0069` whole, in order. */
async function contract(): Promise<void> {
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

type Link = { old: string | null; current: string | null; removed?: boolean; author?: string };

/** A link to `reference`, a new one unless given, each body column set as given. */
async function link(
  { old, current, removed = false, author = AUTHOR }: Link,
  reference?: string,
): Promise<string> {
  const [row] = await sql`
    insert into reference_links ${sql({
      reference_id: reference ?? (await insertReference(sql, {}, AUTHOR)),
      planet_id: old,
      celestial_body_id: current,
      created_by: author,
      updated_by: author,
      deleted_at: removed ? new Date() : null,
      deleted_by: removed ? author : null,
    })}
    returning id`;
  return row.id as string;
}

/** What a link holds after `0069`, with when it last changed. */
async function read(id: string) {
  const [row] = await sql`
    select celestial_body_id, updated_at, deleted_at, deleted_by from reference_links
    where id = ${id}`;
  return row;
}

describe('0069: the links', () => {
  it('copies planet_id into a link holding it alone, live or removed, and leaves any other alone', async () => {
    const id = await body();
    const live = await link({ old: id, current: null });
    const removed = await link({ old: id, current: null, removed: true });
    const filled = await link({ old: id, current: id });
    const current = await link({ old: null, current: id });
    const before = [await read(filled), await read(current)];

    // Precondition: the two the copy is for hold the old column alone.
    const [held] = await sql`select count(*)::int as n from reference_links
      where id in ${sql([live, removed])} and planet_id = ${id} and celestial_body_id is null`;
    expect(held.n).toBe(2);

    await contract();

    expect(await read(live)).toMatchObject({ celestial_body_id: id, deleted_at: null });
    expect(await read(removed)).toMatchObject({ celestial_body_id: id, deleted_by: AUTHOR });
    expect([await read(filled), await read(current)]).toEqual(before);
  });

  it('removes a live link the copy would make a second live link of one body and reference, and keeps the other', async () => {
    const id = await body();
    const reference = await insertReference(sql, {}, AUTHOR);
    const kept = await link({ old: null, current: id }, reference);
    const repeat = await link({ old: id, current: null, author: EDITOR }, reference);
    const keptBefore = await read(kept);

    // Precondition: both are live, so a plain copy would break the partial unique.
    expect([keptBefore.deleted_at, (await read(repeat)).deleted_at]).toEqual([null, null]);

    await contract();

    expect(await read(kept)).toEqual(keptBefore);
    // Removed as the app removes a link, stamped by the repeat's own last editor.
    const after = await read(repeat);
    expect(after).toMatchObject({ celestial_body_id: id, deleted_by: EDITOR });
    expect(after.deleted_at).not.toBeNull();
  });
});

describe('0069: the lists', () => {
  it('copies nothing: a NULL new list stays NULL beside an old one, and a set one is kept', async () => {
    const cleared = await ingredientHolding(
      { old: ['Testara'], current: null },
      { old: ['Fixturia'], current: null },
    );
    const kept = await ingredientHolding(
      { old: ['Testara'], current: ['Fixturia'] },
      { old: ['Testara'], current: ['Testara', 'Fixturia'] },
    );

    await contract();

    const rows = await sql`
      select i.id, i.celestial_bodies as own, v.celestial_bodies as variant
      from ingredients i join ingredient_variants v on v.ingredient_id = i.id
      where i.id in ${sql([cleared, kept])}`;
    const lists = new Map(rows.map((row) => [row.id as string, [row.own, row.variant]]));
    expect(lists.get(cleared)).toEqual([null, null]);
    expect(lists.get(kept)).toEqual([['Fixturia'], ['Testara', 'Fixturia']]);
  });
});

describe('0069: the drops', () => {
  it('drops the three old columns and the view', async () => {
    await contract();

    expect(await catalogue.columnNames('ingredients')).not.toContain('planets');
    expect(await catalogue.columnNames('ingredient_variants')).not.toContain('planets');
    expect(await catalogue.columnNames('reference_links')).not.toContain('planet_id');
    const [view] = await sql`select count(*)::int as n from pg_class
      where relnamespace = 'public'::regnamespace and relname = 'planets'`;
    expect(view.n).toBe(0);
  });

  it('re-adds the one-row CHECK, which refuses a link naming no sourced row', async () => {
    await contract();
    const reference = await insertReference(sql, {}, AUTHOR);

    const error = await failureOf(
      sql`insert into reference_links ${sql({
        reference_id: reference,
        created_by: AUTHOR,
        updated_by: AUTHOR,
      })}`,
    );

    expect(error.code).toBe('23514');
    expect(error.constraint_name).toBe('reference_links_one_row');
  });
});
