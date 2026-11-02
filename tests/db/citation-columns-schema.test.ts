import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../support/db/database';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../support/db/insert-reference';
import { makeIngredient } from '../support/fixtures/ingredient';
import { fromRoot } from '../support/paths';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { NAME_BASES } from '@/modules/ingredients/schema/ingredient-enums';

// The citation columns: `reference_links.name_basis` and `supports`, `references.scholarly`. Nothing reads or writes them yet; this file proves the catalogue holds them.

const AUTHOR = FIXTURE_USERS.A.id;
const MIGRATION = fromRoot('src/db/migrations/0115_citation-columns.sql');

let sql: postgres.Sql;
useTestDatabase((client) => (sql = client));

let linkId: string;
let referenceId: string;

beforeAll(async () => {
  const testwort = await insertIngredient(
    sql,
    makeIngredient({ name: 'Testwort', canonicalName: 'Fixtura citatica' }),
    AUTHOR,
  );
  referenceId = await insertReference(sql, {}, AUTHOR);
  linkId = await insertReferenceLink(sql, testwort, referenceId, AUTHOR);
});

const column = async (table: string, name: string) => {
  const [row] = await sql`
    select data_type, udt_name, is_nullable, column_default from information_schema.columns
    where table_name = ${table} and column_name = ${name}`;
  return row;
};

describe('the citation columns', () => {
  it('makes name_basis a nullable name_basis enum with the four values', async () => {
    expect(await column('reference_links', 'name_basis')).toMatchObject({
      udt_name: 'name_basis',
      is_nullable: 'YES',
      column_default: null,
    });
    const values = await sql`
      select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typname = 'name_basis' order by e.enumsortorder`;
    expect(values.map((row) => row.enumlabel)).toEqual([
      'stated',
      'resolved',
      'unresolved',
      'unaudited',
    ]);
    expect([...NAME_BASES]).toEqual(['stated', 'resolved', 'unresolved', 'unaudited']);
  });

  it('makes supports a nullable text array', async () => {
    expect(await column('reference_links', 'supports')).toMatchObject({
      data_type: 'ARRAY',
      udt_name: '_text',
      is_nullable: 'YES',
      column_default: null,
    });
  });

  it('makes scholarly a boolean, not null, defaulting to false', async () => {
    expect(await column('references', 'scholarly')).toMatchObject({
      data_type: 'boolean',
      is_nullable: 'NO',
      column_default: 'false',
    });
  });

  it('reads null, null and false on rows written without naming them', async () => {
    const [link] = await sql`select name_basis, supports from reference_links where id = ${linkId}`;
    const [reference] = await sql`select scholarly from "references" where id = ${referenceId}`;
    expect(link).toEqual({ name_basis: null, supports: null });
    expect(reference.scholarly).toBe(false);
  });

  // Last, since it drops the columns: the file's database is its own clone.
  it('leaves rows already there null, null and false when the migration runs over them', async () => {
    await sql.unsafe('alter table reference_links drop column name_basis, drop column supports');
    await sql.unsafe('alter table "references" drop column scholarly');
    await sql.unsafe('drop type name_basis');

    for (const statement of readFileSync(MIGRATION, 'utf8').split('--> statement-breakpoint')) {
      if (statement.trim()) await sql.unsafe(statement);
    }

    const [links] = await sql`
      select count(*)::int as total,
        count(*) filter (where name_basis is null and supports is null)::int as empty
      from reference_links`;
    const [references] = await sql`
      select count(*)::int as total, count(*) filter (where not scholarly)::int as unmarked
      from "references"`;
    expect(links.total).toBeGreaterThan(0);
    expect(links.empty).toBe(links.total);
    expect(references.total).toBeGreaterThan(0);
    expect(references.unmarked).toBe(references.total);
  });
});
