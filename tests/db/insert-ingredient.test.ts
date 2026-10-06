import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B } from '../support/as-user';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures';

// The setup inserter every ingredient-family test seeds through. It writes
// outside `withAudit` as the seed does, so what it has to match is the seed:
// the author's stamps on every row, the GUC published inside the one
// transaction, and a category name the database does not hold live refused by
// name (claude-docs/testing/fixture-factories.md, "Fixture factories").

let sql: ReturnType<typeof postgres>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  // `ingredients` has no column defaulted from the GUC, so a trigger records
  // what the inserting transaction published — the probe tables' trick
  // (tests/support/db/probe-tables.ts), attached to the real table for this file.
  await sql`create table insert_ingredient_probe (ingredient_id uuid not null, acting_user text)`;
  await sql`
    create function insert_ingredient_probe_record() returns trigger language plpgsql as $$
    begin
      insert into insert_ingredient_probe
      values (new.id, current_setting('app.current_user_id', true));
      return new;
    end $$`;
  await sql`
    create trigger insert_ingredient_probe after insert on ingredients
    for each row execute function insert_ingredient_probe_record()`;
});

afterAll(async () => {
  await sql`drop trigger if exists insert_ingredient_probe on ingredients`;
  await sql`drop function if exists insert_ingredient_probe_record`;
  await sql`drop table if exists insert_ingredient_probe`;
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`truncate insert_ingredient_probe`;
});

const countOf = async (
  table: 'ingredients' | 'ingredient_folk_names' | 'ingredient_categories',
) => {
  const [row] = await sql`select count(*)::int as count from ${sql(table)}`;
  return row.count as number;
};

describe('insertIngredient', () => {
  it('writes a compendium entry with its folk names, deities and categories, every row stamped by the author', async () => {
    const id = await insertIngredient(
      sql,
      makeIngredient({
        folkNames: ['Fixture Bane', 'Testroot'],
        categories: ['Protection', 'Cleansing'],
        deities: ['Fixtura', 'Testara'],
      }),
      A.id,
    );

    const [row] = await sql`
      select workspace_id, name, canonical_name, nomenclature, form, form_id,
        created_by, updated_by, deleted_at
      from ingredients where id = ${id}`;
    expect(row).toEqual({
      workspace_id: null,
      name: 'Testwort',
      canonical_name: 'Fixtura testalis',
      nomenclature: 'botanical',
      form: 'herb',
      form_id: null,
      created_by: A.id,
      updated_by: A.id,
      deleted_at: null,
    });

    const folkNames = await sql`
      select name, created_by, updated_by, deleted_at
      from ingredient_folk_names where ingredient_id = ${id} order by name`;
    expect(folkNames).toEqual([
      { name: 'Fixture Bane', created_by: A.id, updated_by: A.id, deleted_at: null },
      { name: 'Testroot', created_by: A.id, updated_by: A.id, deleted_at: null },
    ]);

    // Typed names, in the order given (MB.167).
    const deities = await sql`
      select deity_id, name, position, created_by, updated_by, deleted_at
      from ingredient_deities where ingredient_id = ${id} order by position`;
    expect(deities).toEqual([
      {
        deity_id: null,
        name: 'Fixtura',
        position: 0,
        created_by: A.id,
        updated_by: A.id,
        deleted_at: null,
      },
      {
        deity_id: null,
        name: 'Testara',
        position: 1,
        created_by: A.id,
        updated_by: A.id,
        deleted_at: null,
      },
    ]);

    const categories = await sql`
      select c.name, l.created_by, l.updated_by
      from ingredient_categories l join categories c on c.id = l.category_id
      where l.ingredient_id = ${id} order by c.name`;
    expect(categories).toEqual([
      { name: 'Cleansing', created_by: A.id, updated_by: A.id },
      { name: 'Protection', created_by: A.id, updated_by: A.id },
    ]);
  });

  it('writes a workspace entry in the workspace the fixture names', async () => {
    const id = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Testbane', nomenclature: 'none' }),
      B.id,
    );

    const [row] = await sql`
      select workspace_id, name, canonical_name, nomenclature, created_by, updated_by
      from ingredients where id = ${id}`;
    expect(row).toEqual({
      workspace_id: WORKSPACE_W_ID,
      name: 'Testbane',
      canonical_name: null,
      nomenclature: 'none',
      created_by: B.id,
      updated_by: B.id,
    });
    expect(await countOf('ingredient_folk_names')).toBe(0);
    expect(await countOf('ingredient_categories')).toBe(0);
  });

  it('publishes the author as app.current_user_id inside its transaction', async () => {
    // Why the trigger could have recorded the author anyway: a value left at
    // session level. A plain insert on the same client records none.
    const [plain] = await sql`
      insert into ingredients (name, slug, nomenclature, created_by, updated_by)
      values ('Plainwort', 'plainwort', 'none', ${A.id}, ${A.id}) returning id`;
    const [unpublished] = await sql`
      select acting_user from insert_ingredient_probe where ingredient_id = ${plain.id}`;
    expect(unpublished.acting_user ?? '').toBe('');

    const id = await insertIngredient(sql, makeIngredient(), B.id);

    expect(
      await sql`select acting_user from insert_ingredient_probe where ingredient_id = ${id}`,
    ).toEqual([{ acting_user: B.id }]);
  });

  describe('a category name the database does not hold live', () => {
    const fixture = makeIngredient({
      folkNames: ['Fixture Bane'],
      categories: ['Protection', 'Fixture Sorcery'],
    });

    it('is refused by name, and nothing of the fixture is written', async () => {
      // Why it could have gone through silently: the other name resolves.
      const [protection] = await sql`
        select count(*)::int as count from categories where name = 'Protection' and deleted_at is null`;
      expect(protection.count).toBe(1);

      await expect(insertIngredient(sql, fixture, A.id)).rejects.toThrow('"Fixture Sorcery"');

      expect(await countOf('ingredients')).toBe(0);
      expect(await countOf('ingredient_folk_names')).toBe(0);
      expect(await countOf('ingredient_categories')).toBe(0);
    });

    it('includes a retired category, since a soft-deleted row is not one the fixture can be filed under', async () => {
      await sql`update categories set deleted_at = now(), deleted_by = ${A.id} where name = 'Protection'`;
      try {
        await expect(
          insertIngredient(sql, makeIngredient({ categories: ['Protection'] }), A.id),
        ).rejects.toThrow('"Protection"');
        expect(await countOf('ingredients')).toBe(0);
      } finally {
        await sql`update categories set deleted_at = null, deleted_by = null where name = 'Protection'`;
      }
    });
  });
});
