import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seedForms } from '@/db/seed/forms';
import type { FormRow } from './types';

// What a re-run of the form seed leaves of an admin's edits. The shape every
// seed shares is index.test.ts's (MB.183), and the vocabulary's content is the
// seed doc's to review — claude-docs/db/form-vocabulary-seed.md, "The form vocabulary seed".

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allForms(): Promise<FormRow[]> {
  return sql<FormRow[]>`select * from ingredient_forms order by slug`;
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

describe('seedForms(db) over a database an admin has edited', () => {
  beforeEach(async () => {
    await truncateAllTables(sql);
    // Precondition: the truncated clone really starts empty, so the rows edited are this run's.
    expect(await allForms()).toEqual([]);
  });

  // The vocabulary is the admin's (MB.35), and a description is the part of a
  // curated row most likely to be rewritten.
  it('does not overwrite a description an admin has since rewritten', async () => {
    await seedForms(db);
    await sql`
      update ingredient_forms set description = 'The bark of the root, not the stem.'
      where seed_key = 'bark'
    `;

    await seedForms(db);

    const [bark] = (await allForms()).filter((form) => form.seed_key === 'bark');
    expect(bark.description).toBe('The bark of the root, not the stem.');
  });

  // An admin's own row under a seed name and group holds the address the
  // seed's would, and the slug index would refuse a second.
  it('does not insert a form an admin wrote under its name and group', async () => {
    await seedForms(db);
    await sql`delete from ingredient_forms where seed_key = 'herb'`;
    const [botanical] =
      await sql`select id from ingredient_form_groups where seed_key = 'botanical'`;
    await sql`
      insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
      values ('Herb', 'herb-botanical', 'Written by an admin.', ${botanical.id},
        ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    `;

    await expect(seedForms(db)).resolves.toBeUndefined();

    const herbs = (await allForms()).filter((form) => form.name === 'Herb');
    expect(herbs).toHaveLength(1);
    expect(herbs[0]).toMatchObject({ seed_key: null, description: 'Written by an admin.' });
  });
});
