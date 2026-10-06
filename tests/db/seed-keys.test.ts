import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../support/db/database';
import { statementsOfMigrationContaining } from '../support/db/migrations';
import { tableFacts } from '../support/db/table-metadata';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { categories, categoryGroups } from '@/modules/vocabulary/schema/categories';
import {
  ingredientFormGroups,
  ingredientForms,
} from '@/modules/vocabulary/schema/ingredient-forms';
import { planets, zodiacSigns } from '@/modules/vocabulary/schema/astrology';
import { deities, deityTraditions } from '@/modules/vocabulary/schema/deities';
import { references } from '@/modules/ingredients/schema/references';
import type { SeededTable } from './types';

// MB.171: every table `migrate.yml` seeds records the identity the seed gave a
// row, so a reseed recognises the row whatever an admin has since renamed or
// edited (claude-docs/db/seed-module.md, "The seed module"). Nothing reads the
// column until MB.172 and MB.156.

const AUTHOR = FIXTURE_USERS.A.id;

// Invented values throughout, so no row here meets one the seeds write.
const ROW = {
  name: 'Testwort Kind',
  description: 'A row kept only by fixtures.',
  created_by: AUTHOR,
  updated_by: AUTHOR,
};

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

/** A group row's id, for the tables an item is filed under. */
async function groupIn(table: string, extra: Record<string, string> = {}): Promise<string> {
  const slug = `fixture-group-${crypto.randomUUID()}`;
  const [{ id }] = await sql<{ id: string }[]>`
    insert into ${sql(table)} ${sql({ ...ROW, name: slug, slug, ...extra })} returning id
  `;
  return id;
}

const COLOURS = { color_dark: '#c9a66b', color_light: '#7a5a1f' };

// The nine, each with the least a row of it needs beside its key.
const SEEDED: SeededTable[] = [
  { table: categoryGroups, name: 'category_groups', row: async () => ({ ...ROW, ...COLOURS }) },
  {
    table: categories,
    name: 'categories',
    row: async () => ({ ...ROW, group_id: await groupIn('category_groups', COLOURS) }),
  },
  { table: ingredientFormGroups, name: 'ingredient_form_groups', row: async () => ROW },
  {
    table: ingredientForms,
    name: 'ingredient_forms',
    row: async () => ({ ...ROW, group_id: await groupIn('ingredient_form_groups') }),
  },
  { table: planets, name: 'planets', row: async () => ROW },
  { table: zodiacSigns, name: 'zodiac_signs', row: async () => ROW },
  { table: deityTraditions, name: 'deity_traditions', row: async () => ROW },
  {
    table: deities,
    name: 'deities',
    row: async () => ({ ...ROW, tradition_id: await groupIn('deity_traditions') }),
  },
  {
    table: references,
    name: 'references',
    row: async () => ({
      kind: 'book',
      title: 'A Herbal of Fixture Covens',
      published: '1988',
      created_by: AUTHOR,
      updated_by: AUTHOR,
    }),
  },
];

const VOCABULARIES = SEEDED.filter(({ name }) => name !== 'references');

/** One row of `seeded`, slugged fresh unless it is a reference, which has no slug. */
async function insertRow(
  seeded: SeededTable,
  values: Record<string, string | null>,
): Promise<string> {
  const base = await seeded.row();
  const slug = `fixture-${crypto.randomUUID()}`;
  const row = seeded.name === 'references' ? base : { ...base, slug };
  const [{ id }] = await sql<{ id: string }[]>`
    insert into ${sql(seeded.name)} ${sql({ ...row, ...values })} returning id
  `;
  return id;
}

describe.each(SEEDED.map((seeded) => [seeded.name, seeded] as const))(
  '%s.seed_key',
  (_name, seeded) => {
    const { byName, byIndexName } = tableFacts(seeded.table);
    const indexName = `${seeded.name}_seed_key_unique`;

    it('is nullable text, since a row an admin or a member writes holds none', () => {
      expect(byName.seed_key?.getSQLType()).toBe('text');
      expect(byName.seed_key?.notNull).toBe(false);
    });

    it('is unique among live keyed rows, partial on deleted_at IS NULL (rule 4)', () => {
      const index = byIndexName[indexName];

      expect(index?.config.unique).toBe(true);
      expect(index?.config.where).toBeDefined();
    });

    it('refuses a second live row with one key', async () => {
      const key = `fixture-key-${crypto.randomUUID()}`;
      await insertRow(seeded, { seed_key: key });

      const error = await failureOf(insertRow(seeded, { seed_key: key }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(indexName);
    });

    it('admits a row beside a soft-deleted one with its key, and any number with none', async () => {
      const key = `fixture-key-${crypto.randomUUID()}`;
      const first = await insertRow(seeded, { seed_key: key });
      await sql`update ${sql(seeded.name)} set deleted_at = now() where id = ${first}`;

      await expect(insertRow(seeded, { seed_key: key })).resolves.toBeTypeOf('string');
      await insertRow(seeded, { seed_key: null });
      await expect(insertRow(seeded, { seed_key: null })).resolves.toBeTypeOf('string');
    });
  },
);

// The backfill is exact because no rename writer had shipped: every row the
// bootstrap user created still carries the slug the seed gave it. Re-run from
// the migration's own text, so a migration edited to key by something else
// fails here.
describe('the backfill', () => {
  let backfill: string[];

  beforeAll(() => {
    backfill = statementsOfMigrationContaining('SET "seed_key" = "slug"').filter((statement) =>
      /^update\b/i.test(statement),
    );
  });

  it('keys each of the eight vocabularies, and not references, which holds no seeded row', () => {
    const tables = backfill.map((statement) => /^UPDATE "([a-z_]+)"/.exec(statement)?.[1]);

    expect(tables.sort()).toEqual(VOCABULARIES.map(({ name }) => name).sort());
  });

  it.each(VOCABULARIES)(
    'keys a bootstrap-made $name row by its slug and leaves another author’s null',
    async (seeded) => {
      const seededId = await insertRow(seeded, {
        created_by: BOOTSTRAP_USER_ID,
        updated_by: BOOTSTRAP_USER_ID,
      });
      const adminId = await insertRow(seeded, {});

      const statement = backfill.find((text) => text.startsWith(`UPDATE "${seeded.name}"`));
      expect(statement, `no backfill for ${seeded.name}`).toBeDefined();
      await sql.unsafe(statement as string);

      const rows = await sql<{ id: string; slug: string; seed_key: string | null }[]>`
        select id, slug, seed_key from ${sql(seeded.name)} where id in ${sql([seededId, adminId])}
      `;
      const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

      // Precondition: both rows were unkeyed, so the author alone decided.
      expect(byId[seededId].seed_key).toBe(byId[seededId].slug);
      expect(byId[adminId].seed_key).toBeNull();
    },
  );
});
