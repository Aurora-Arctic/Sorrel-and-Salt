import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../support/db/database';
import {
  AUDITED_TABLES,
  AUDIT_COLUMNS,
  DELETE_COLUMNS,
  STAMP_COLUMNS,
  UNAUDITED_TABLES,
} from '../support/db/table-metadata';
import type { Reference } from './types';

// One catalogue sweep rather than a copy in every schema test: a table added
// without `...auditColumns` fails here, where a per-file copy would simply not
// exist. The catalogue, because it is the side a schema test cannot see — a
// spread removed from a schema file leaves the migrated database's columns
// standing, while each module schema test pins its table's exact column set on
// the code side (claude-docs/testing/db-harness.md, "The db test harness").

/** Hard-deleted, so four stamps and no tombstone (MB.34). */
const STAMPED = ['ingredient_categories', 'spell_categories'];
const AUDITED = AUDITED_TABLES.filter((table) => !STAMPED.includes(table));

const AUDIT_IDS = ['created_by', 'updated_by', 'deleted_by'];
const STAMP_IDS = ['created_by', 'updated_by'];

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

/** Whether each of `table`'s columns is nullable, as the catalogue reports it. */
async function nullability(table: string): Promise<Record<string, boolean>> {
  const rows = await sql<{ column_name: string; is_nullable: 'YES' | 'NO' }[]>`
    select column_name, is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = ${table}
  `;
  return Object.fromEntries(rows.map((row) => [row.column_name, row.is_nullable === 'YES']));
}

let allReferences: Promise<Record<string, Record<string, Reference>>> | undefined;

/**
 * Every `*_by` foreign key `table` declares, keyed by column, as the catalogue
 * reports it. Read once for every table, from `pg_constraint` rather than
 * `information_schema`, whose constraint views cost some fifty milliseconds a
 * table.
 */
async function byReferencesOf(table: string): Promise<Record<string, Reference>> {
  allReferences ??= sql<(Reference & { table_name: string })[]>`
    select t.relname as table_name,
           a.attname as column_name,
           ft.relname as foreign_table,
           fa.attname as foreign_column
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_class ft on ft.oid = c.confrelid
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute fa on fa.attrelid = c.confrelid and fa.attnum = c.confkey[1]
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and right(a.attname, 3) = '_by'
  `.then((rows) => {
    const byTable: Record<string, Record<string, Reference>> = {};
    for (const { table_name, ...reference } of rows) {
      (byTable[table_name] ??= {})[reference.column_name] = reference;
    }
    return byTable;
  });
  return (await allReferences)[table] ?? {};
}

const USERS_ID = { foreign_table: 'users', foreign_column: 'id' };

describe('the audited tables', () => {
  it('are the twenty-seven the updated_at sweep names: twenty-five audited, two stamped', () => {
    expect(AUDITED).toHaveLength(25);
    expect(AUDITED_TABLES).toEqual(expect.arrayContaining(STAMPED));
  });

  // Moved from updated-at-trigger.test.ts: the transcribed list is the
  // catalogue's, so a table spreading the stamps without being named fails too.
  it('are every table the catalogue finds carrying the four stamps', async () => {
    const rows = await sql<{ table_name: string }[]>`
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name in ${sql(STAMP_COLUMNS as string[])}
      group by table_name having count(*) = ${STAMP_COLUMNS.length}
    `;

    expect(rows.map((row) => row.table_name).sort()).toEqual(AUDITED_TABLES);
  });
});

describe.each(AUDITED)('%s', (name) => {
  it('carries the six audit columns, the four stamps required and the delete pair nullable', async () => {
    const nullable = await nullability(name);

    // Precondition: the table exists, and is more than its audit columns.
    expect(Object.keys(nullable).length).toBeGreaterThan(AUDIT_COLUMNS.length);
    expect(Object.keys(nullable)).toEqual(expect.arrayContaining([...AUDIT_COLUMNS]));
    for (const column of STAMP_COLUMNS) {
      expect(nullable[column], column).toBe(false);
    }
    for (const column of DELETE_COLUMNS) {
      expect(nullable[column], column).toBe(true);
    }
  });

  it('references users(id) from every audit id (MB.5)', async () => {
    const references = await byReferencesOf(name);

    for (const column of AUDIT_IDS) {
      expect(references[column]).toMatchObject(USERS_ID);
    }
  });
});

describe.each(STAMPED)('%s', (name) => {
  it('carries the four stamp columns, each required, and neither delete column', async () => {
    const nullable = await nullability(name);

    expect(Object.keys(nullable).length).toBeGreaterThan(STAMP_COLUMNS.length);
    for (const column of STAMP_COLUMNS) {
      expect(nullable[column], column).toBe(false);
    }
    for (const column of DELETE_COLUMNS) {
      expect(nullable).not.toHaveProperty(column);
    }
  });

  it('references users(id) from both stamp ids, and nothing from a deleted_by (MB.5)', async () => {
    const references = await byReferencesOf(name);

    for (const column of STAMP_IDS) {
      expect(references[column]).toMatchObject(USERS_ID);
    }
    expect(references.deleted_by).toBeUndefined();
  });
});

// Why the sweep could pass wrongly: it reads whatever the migrations built, so
// its discriminator is proved on real tables that carry no audit id. By name
// rather than every `*_by`: `sessions.impersonated_by` is the `admin` plugin's
// column (MB.53), and no audit id. Each carries the `updated_at` a careless
// sweep — this one, or the trigger's — would have matched on.
describe.each(UNAUDITED_TABLES)('%s, unaudited', (name) => {
  it('exists with an updated_at, and carries no audit id and no such reference', async () => {
    const columns = await catalogue.columnNames(name);

    expect(columns).toContain('updated_at');
    expect(columns.filter((column) => AUDIT_IDS.includes(column))).toEqual([]);
    const references = await byReferencesOf(name);
    expect(AUDIT_IDS.filter((column) => column in references)).toEqual([]);
  });
});
