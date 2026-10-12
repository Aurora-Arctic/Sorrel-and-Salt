import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { insertReference } from '../../support/db/insert-reference';
import { makeIngredient } from '../../support/fixtures';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// a migration data test, retired with the `planets` view and the old columns
// in MB.254. It re-runs `0067`'s own fill against rows written here to the old
// columns alone, as the deploy before MB.252 writes them, and asserts what the deploy before
// MB.252 meets: the renamed table behind a view under the old name, and a
// one-row CHECK that admits a link naming the old column, the new, or both
// (claude-docs/db/expand-contract.md, "Renaming a table").

/** `0067`'s statements, comment lines stripped, as the migrator splits them. */
const STATEMENTS = readFileSync(
  fromRoot('src/db/migrations/0067_celestial-bodies-expand.sql'),
  'utf8',
)
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

const FILLS = ['ingredients', 'ingredient_variants', 'reference_links'].map((table) => {
  const found = STATEMENTS.find((statement) => statement.startsWith(`UPDATE "${table}"`));
  if (!found) throw new Error(`0067 has no fill of ${table}`);
  return found;
});

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const token = () => crypto.randomUUID().slice(0, 8);

/** A celestial body written through the `planets` view, as the deploy before writes one. */
async function bodyThroughView(): Promise<string> {
  const t = token();
  const [row] = await sql`
    insert into planets ${sql({
      name: `Testara ${t}`,
      slug: `testara-${t}`,
      description: 'A body kept only by fixtures.',
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id`;
  return row.id as string;
}

/** A compendium ingredient whose old list, and its one variant's, name bodies. */
async function ingredientNaming(own: string[] | null, variant: string[] | null): Promise<string> {
  const t = token();
  const id = await insertIngredient(
    sql,
    makeIngredient({ name: `Testwort ${t}`, canonicalName: `Fixtura testalis ${t}` }),
    AUTHOR,
  );
  await sql`update ingredients set planets = ${own} where id = ${id}`;
  await sql`update ingredient_variants set planets = ${variant} where ingredient_id = ${id}`;
  return id;
}

/** A link from `body` by its old column alone, as the deploy before writes one. */
async function linkByPlanetId(body: string): Promise<string> {
  const reference = await insertReference(sql, {}, AUTHOR);
  const [row] = await sql`
    insert into reference_links ${sql({
      reference_id: reference,
      planet_id: body,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id`;
  return row.id as string;
}

describe('0067: the table and its view', () => {
  it('keeps the rows in celestial_bodies, and planets is a view over it', async () => {
    const kinds = await sql`
      select relname, relkind from pg_class
      where relnamespace = 'public'::regnamespace and relname in ('planets', 'celestial_bodies')
      order by relname`;

    expect(kinds.map((row) => [row.relname, row.relkind])).toEqual([
      ['celestial_bodies', 'r'],
      ['planets', 'v'],
    ]);
  });

  it('lands a write through the view in the table, and an edit through it too', async () => {
    const id = await bodyThroughView();
    await sql`update planets set description = 'Rewritten through the view.' where id = ${id}`;

    const [row] = await sql`select description from celestial_bodies where id = ${id}`;
    expect(row.description).toBe('Rewritten through the view.');
  });
});

describe('0067: the fill', () => {
  it('copies each list and link into its new column, and leaves an empty one empty', async () => {
    const body = await bodyThroughView();
    const listed = await ingredientNaming(['Testara', 'Fixturia'], ['Testara']);
    const bare = await ingredientNaming(null, null);
    const link = await linkByPlanetId(body);

    const lists = async () =>
      (
        await sql`
          select i.id, i.planets as own, i.celestial_bodies as own_new,
                 v.planets as variant, v.celestial_bodies as variant_new
          from ingredients i join ingredient_variants v on v.ingredient_id = i.id
          where i.id in ${sql([listed, bare])} order by i.id = ${listed} desc`
      ).map((row) => [row.own, row.own_new, row.variant, row.variant_new]);
    const linked = async () =>
      (await sql`select planet_id, celestial_body_id from reference_links where id = ${link}`)[0];

    // Precondition: nothing but the fill writes the new columns.
    expect(await lists()).toEqual([
      [['Testara', 'Fixturia'], null, ['Testara'], null],
      [null, null, null, null],
    ]);
    expect(await linked()).toEqual({ planet_id: body, celestial_body_id: null });

    for (const fill of FILLS) await sql.unsafe(fill);

    expect(await lists()).toEqual([
      [['Testara', 'Fixturia'], ['Testara', 'Fixturia'], ['Testara'], ['Testara']],
      [null, null, null, null],
    ]);
    expect(await linked()).toEqual({ planet_id: body, celestial_body_id: body });
  });
});

describe('0067: the one-row CHECK counts either column', () => {
  it('admits a link by planet_id alone, and the same link filled to hold both', async () => {
    const link = await linkByPlanetId(await bodyThroughView());

    await sql`update reference_links set celestial_body_id = planet_id where id = ${link}`;

    const [row] = await sql`select num_nonnulls(planet_id, celestial_body_id) as held
      from reference_links where id = ${link}`;
    expect(row.held).toBe(2);
  });

  it('still refuses a link naming a second sourced row beside the body', async () => {
    const body = await bodyThroughView();
    const ingredient = await ingredientNaming(null, null);
    const reference = await insertReference(sql, {}, AUTHOR);
    const link = (extra: Record<string, string>) =>
      sql`insert into reference_links ${sql({
        reference_id: reference,
        ...extra,
        created_by: AUTHOR,
        updated_by: AUTHOR,
      })}`;

    // Precondition: each half alone is a link the CHECK admits.
    await link({ celestial_body_id: body });
    await link({ ingredient_id: ingredient });

    for (const column of ['planet_id', 'celestial_body_id']) {
      const error = await failureOf(link({ [column]: body, ingredient_id: ingredient }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('reference_links_one_row');
    }
  });
});
