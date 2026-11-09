import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seedForms } from '@/db/seed/forms';
import type { FormRow } from './types';
import { useTestDatabase } from '../../support/db/database';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

let db: ReturnType<typeof drizzle>;

async function glyphs(): Promise<Record<string, string | null>> {
  const rows = await sql`select seed_key, icon from ingredient_form_groups`;
  return Object.fromEntries(rows.map((row) => [row.seed_key, row.icon]));
}

async function allForms(): Promise<FormRow[]> {
  return sql<FormRow[]>`select * from ingredient_forms order by slug`;
}

beforeAll(() => {
  db = drizzle(sql);
});

describe('seedForms(db) over a database a keeper has edited', () => {
  beforeEach(async () => {
    await truncateAllTables(sql);
    // Precondition: the truncated clone really starts empty, so the rows edited are this run's.
    expect(await allForms()).toEqual([]);
  });

  // The vocabulary is the keeper's, and a description is the part of a
  // curated row most likely to be rewritten.
  it('does not overwrite a description a keeper has since rewritten', async () => {
    await seedForms(db);
    await sql`
      update ingredient_forms set description = 'The bark of the root, not the stem.'
      where seed_key = 'bark'
    `;

    await seedForms(db);

    const [bark] = (await allForms()).filter((form) => form.seed_key === 'bark');
    expect(bark.description).toBe('The bark of the root, not the stem.');
  });

  // A keeper's own row under a seed name and group holds the address the
  // seed's would, and the slug index would refuse a second.
  it('does not insert a form a keeper wrote under its name and group', async () => {
    await seedForms(db);
    await sql`delete from ingredient_forms where seed_key = 'herb'`;
    const [botanical] =
      await sql`select id from ingredient_form_groups where seed_key = 'botanical'`;
    await sql`
      insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
      values ('Herb', 'herb-botanical', 'Written by a keeper.', ${botanical.id},
        ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    `;

    await expect(seedForms(db)).resolves.toBeUndefined();

    const herbs = (await allForms()).filter((form) => form.name === 'Herb');
    expect(herbs).toHaveLength(1);
    expect(herbs[0]).toMatchObject({ seed_key: null, description: 'Written by a keeper.' });
  });

  // A cleared icon is the keeper's answer, the generic, and not a gap to fill.
  it('leaves an icon a keeper changed, and one a keeper cleared, as they are', async () => {
    await seedForms(db);
    await sql`update ingredient_form_groups set icon = 'curio' where seed_key = 'mineral'`;
    await sql`update ingredient_form_groups set icon = null where seed_key = 'fluid'`;

    await seedForms(db);

    expect(await glyphs()).toMatchObject({ mineral: 'curio', fluid: null, animal: 'animal' });
  });
});
