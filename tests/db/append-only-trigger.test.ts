import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../support/db/database';
import { APPEND_ONLY_TABLES } from '../support/db/table-metadata';

// One function attached to every ledger the database keeps append-only
// (MB.194): an update or a delete is refused from any client, `psql` and the
// seed included, rather than merely absent from the writer's types
// (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md).
const FUNCTION = 'forbid_rewrite';
// Same name on every table, as `set_updated_at`'s: a trigger name is scoped to its table.
const TRIGGER = 'forbid_rewrite';

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

// A catalogue query against the transcribed list, the sweep-over-database-objects
// pattern `updated-at-trigger.test.ts` set: a table added to the list without
// its trigger line reddens, and so does a trigger on a table the list omits.
describe('the forbid_rewrite trigger', () => {
  it('attaches to every append-only table, and to no other', async () => {
    const rows = await sql<{ relname: string }[]>`
      select c.relname from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_proc p on p.oid = t.tgfoid
      where not t.tgisinternal and p.proname = ${FUNCTION} and t.tgname = ${TRIGGER}
      order by c.relname
    `;

    expect(APPEND_ONLY_TABLES.length).toBeGreaterThan(0);
    expect(rows.map((row) => row.relname)).toEqual([...APPEND_ONLY_TABLES].sort());
  });

  // Before, so the row is never touched; per row, so an update matching
  // nothing is no error; update and delete, so the insert stays open.
  it('fires before each updated or deleted row, and on nothing else', async () => {
    const rows = await sql<{ timing: string; level: string; events: string }[]>`
      select case when (t.tgtype & 2) <> 0 then 'before' else 'after' end as timing,
             case when (t.tgtype & 1) <> 0 then 'row' else 'statement' end as level,
             concat_ws(
               ',',
               case when (t.tgtype & 4) <> 0 then 'insert' end,
               case when (t.tgtype & 8) <> 0 then 'delete' end,
               case when (t.tgtype & 16) <> 0 then 'update' end,
               case when (t.tgtype & 32) <> 0 then 'truncate' end
             ) as events
      from pg_trigger t
      join pg_proc p on p.oid = t.tgfoid
      where not t.tgisinternal and p.proname = ${FUNCTION}
    `;

    expect(rows).toHaveLength(APPEND_ONLY_TABLES.length);
    for (const row of rows) {
      expect(row).toEqual({ timing: 'before', level: 'row', events: 'delete,update' });
    }
  });

  it('shares one function rather than one per table', async () => {
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = ${FUNCTION}
    `;
    expect(count).toBe(1);
  });
});

// MB.195: what fills the ledger. Two triggers on `users`, one function: an
// insert trigger's WHEN may not name OLD, so the insert and the update each
// carry their own, and each fires after its row, so the ledger's foreign key
// finds the user.
describe('the record_privilege_change trigger', () => {
  it('attaches to users alone, after each inserted row and each update of a privilege column', async () => {
    const rows = await sql<
      {
        relname: string;
        tgname: string;
        timing: string;
        level: string;
        events: string;
        columns: string[];
      }[]
    >`
      select c.relname, t.tgname,
             case when (t.tgtype & 2) <> 0 then 'before' else 'after' end as timing,
             case when (t.tgtype & 1) <> 0 then 'row' else 'statement' end as level,
             concat_ws(
               ',',
               case when (t.tgtype & 4) <> 0 then 'insert' end,
               case when (t.tgtype & 8) <> 0 then 'delete' end,
               case when (t.tgtype & 16) <> 0 then 'update' end
             ) as events,
             array(
               select a.attname::text from unnest(t.tgattr::int2[]) as k(attnum)
               join pg_attribute a on a.attrelid = t.tgrelid and a.attnum = k.attnum
               order by a.attname
             ) as columns
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_proc p on p.oid = t.tgfoid
      where not t.tgisinternal and p.proname = 'record_privilege_change'
      order by t.tgname
    `;

    expect(rows).toEqual([
      {
        relname: 'users',
        tgname: 'record_privilege_change_on_insert',
        timing: 'after',
        level: 'row',
        events: 'insert',
        columns: [],
      },
      {
        relname: 'users',
        tgname: 'record_privilege_change_on_update',
        timing: 'after',
        level: 'row',
        events: 'update',
        columns: ['can_create_workspace', 'role'],
      },
    ]);
  });
});
