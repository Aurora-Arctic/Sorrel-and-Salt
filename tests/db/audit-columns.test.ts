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

// A catalogue sweep: a table added without `...auditColumns` fails here, where a per-file copy would not exist, and a spread removed from a schema file leaves the migrated columns standing.
// Each module schema test pins its table's exact column set on the code side (claude-docs/testing/db-harness.md, "The db test harness").

/** Hard-deleted, so four stamps and no tombstone. */
const STAMPED = [
  'ingredient_categories',
  'spell_categories',
  'spell_working_deductions',
  'spell_working_participants',
];

const AUDIT_IDS = ['created_by', 'updated_by', 'deleted_by'];
const USERS_ID = 'users.id';

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

describe('the audit columns', () => {
  it('sit on every audited table and no other, required but for the tombstone, each id referencing users', async () => {
    const columns = await sql<{ table_name: string; column_name: string; is_nullable: string }[]>`
      select table_name, column_name, is_nullable from information_schema.columns
      where table_schema = 'public'
        -- Tables alone: a view lists its columns here too (MB.252's, until MB.254 dropped it).
        and table_name in (
          select table_name from information_schema.tables
          where table_schema = 'public' and table_type = 'BASE TABLE'
        )
    `;
    // From `pg_constraint` rather than `information_schema`, whose constraint
    // views cost some fifty milliseconds a table.
    const references = await sql<{ table_name: string; column_name: string; target: string }[]>`
      select t.relname as table_name, a.attname as column_name,
             ft.relname || '.' || fa.attname as target
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_class ft on ft.oid = c.confrelid
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      join pg_attribute fa on fa.attrelid = c.confrelid and fa.attnum = c.confkey[1]
      where c.contype = 'f' and c.connamespace = 'public'::regnamespace
        and right(a.attname, 3) = '_by'
    `;

    const audit = (table: string) => ({
      columns: Object.fromEntries(
        columns
          .filter((row) => row.table_name === table && AUDIT_COLUMNS.includes(row.column_name))
          .map((row) => [row.column_name, row.is_nullable === 'YES' ? 'nullable' : 'required']),
      ),
      references: Object.fromEntries(
        references
          .filter((row) => row.table_name === table && AUDIT_IDS.includes(row.column_name))
          .map((row) => [row.column_name, row.target]),
      ),
    });
    const stamps = Object.fromEntries(STAMP_COLUMNS.map((column) => [column, 'required']));
    const expected = (table: string) =>
      STAMPED.includes(table)
        ? { columns: stamps, references: { created_by: USERS_ID, updated_by: USERS_ID } }
        : {
            columns: {
              ...stamps,
              ...Object.fromEntries(DELETE_COLUMNS.map((column) => [column, 'nullable'])),
            },
            references: Object.fromEntries(AUDIT_IDS.map((column) => [column, USERS_ID])),
          };

    // The transcribed list is the catalogue's: a table spreading the stamps
    // without being named fails, and so does a named one that lost them.
    const stamped = [
      ...new Set(
        columns
          .filter((row) => STAMP_COLUMNS.includes(row.column_name))
          .map((row) => row.table_name),
      ),
    ].filter((table) => STAMP_COLUMNS.every((column) => audit(table).columns[column]));
    expect(AUDITED_TABLES).toHaveLength(37);
    expect(stamped.sort()).toEqual(AUDITED_TABLES);

    expect(Object.fromEntries(AUDITED_TABLES.map((table) => [table, audit(table)]))).toEqual(
      Object.fromEntries(AUDITED_TABLES.map((table) => [table, expected(table)])),
    );

    // Why the sweep could pass wrongly: it reads whatever the migrations built, so its discriminator is proved on real tables carrying the `updated_at` a careless sweep would match on, and no audit id.
    // By name rather than every `*_by`: `sessions.impersonated_by` is the `admin` plugin's column, not an audit id.
    for (const table of UNAUDITED_TABLES) {
      const { columns: found, references: linked } = audit(table);
      expect(found, table).toHaveProperty('updated_at');
      expect(
        Object.keys(found).filter((column) => AUDIT_IDS.includes(column)),
        table,
      ).toEqual([]);
      expect(linked, table).toEqual({});
    }
  });
});
