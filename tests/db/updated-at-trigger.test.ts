import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { makeWorkspace, workspaceColumns } from '../support/fixtures';
import { truncateAllTables } from '../support/seeded-database';
import { users } from '@/db/schema/users';
import { findOne, withAudit } from '@/db/repository';

// M1.18, DESIGN.md §5's second enforcement rule: `updated_at` is stamped by a
// database trigger, so a manual `psql` fix still stamps it and the audit trail
// cannot be quietly bypassed. One PL/pgSQL function, attached to every audited
// table — the sweep-task rule's database half, which is why it lands after the
// last table it covers rather than being re-asserted later.
const FUNCTION = 'set_updated_at';
// Same name on every table: a trigger name is scoped to its table rather than
// shared with indexes, so there is nothing for a table prefix to disambiguate.
const TRIGGER = 'set_updated_at';

// The tables carrying the audit stamps, transcribed. The coverage assertion
// below compares two catalogue queries, and two empty sets are equal — this
// list is what stops that passing vacuously.
const AUDITED_TABLES = [
  'categories',
  'category_groups',
  'ingredient_categories',
  'ingredient_folk_names',
  'ingredient_form_groups',
  'ingredient_forms',
  'ingredients',
  'inventory_items',
  'spell_categories',
  'spell_ingredients',
  'spells',
  'users',
  'workspace_invitations',
  'workspace_members',
  'workspaces',
].sort();

// Better Auth's three adapter tables (schema/auth.ts) carry an `updated_at` and
// no `*_by` columns at all: they are not part of the audit trail, nothing
// writes them through `withAudit`, and Better Auth's own `$onUpdate` stamps
// them. Named so "only the audited tables" is asserted against a real
// counter-example rather than against nothing.
const UNAUDITED_TABLES = ['accounts', 'sessions', 'verifications'].sort();

// *Which* tables the sweep reached is the thing under test, so every table has
// to be the real one — and it is: a clone carrying every migration and the
// `standard` seed, re-cloned before this file runs (tests/support/db-setup.ts).
// The function and its triggers are the schema's own.
let sql: ReturnType<typeof postgres>;

const AUTHOR = '11111111-1111-1111-1111-111111111111';
const WORKSPACE = '22222222-2222-2222-2222-222222222222';
const SPELL = '33333333-3333-3333-3333-333333333333';
const GROUP = '44444444-4444-4444-4444-444444444444';
const CATEGORY = '55555555-5555-5555-5555-555555555555';

const THE_MILLENNIUM = '2000-01-01 00:00:00';

/** The database's own clock, read as the column reads it — `timestamp`, not `timestamptz`. */
async function databaseNow(): Promise<Date> {
  const [{ now }] = await sql<{ now: Date }[]>`select now()::timestamp as now`;
  return now;
}

async function stampsOf(table: string, column: string, value: string) {
  const [row] = await sql<{ created_at: Date; updated_at: Date }[]>`
    select created_at, updated_at from ${sql(table)} where ${sql(column)} = ${value}
  `;
  return row;
}

async function insertUser(id = randomUUID(), overrides = ''): Promise<string> {
  await sql.unsafe(
    `insert into users (id, name, email, created_by, updated_by${overrides ? ', created_at, updated_at' : ''})
     values ($1, 'Author', $2, $3, $3${overrides ? `, '${overrides}', '${overrides}'` : ''})`,
    [id, `${id}@example.com`, id === AUTHOR ? id : AUTHOR],
  );
  return id;
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  // The rows below are this file's own, written against the empty schema the
  // file was written for. Emptied with one `truncate … cascade` rather than a
  // `delete from` list: the seeded scenario's rows point at each other and
  // every child foreign key is NO ACTION, so a delete would be refused — and
  // beforeEach's `delete from users where id <> AUTHOR` only works because
  // nothing seeded is left pointing at a user.
  await truncateAllTables(sql);

  await insertUser(AUTHOR);
  // M1.25 — the slug comes off the name through src/lib/slugify rather than
  // being written down beside it (CLAUDE.md's slug rule), so this fixture
  // cannot be the place the two spellings drift apart.
  await sql`
    insert into workspaces ${sql({
      id: WORKSPACE,
      ...workspaceColumns(makeWorkspace({ name: 'Hearth' })),
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
  `;
  await sql`
    insert into spells (id, workspace_id, title, created_by, updated_by)
    values (${SPELL}, ${WORKSPACE}, 'Hearth Guard', ${AUTHOR}, ${AUTHOR})
  `;
  await sql`
    insert into category_groups (id, name, slug, color_dark, color_light, description, created_by, updated_by)
    values (${GROUP}, 'Intent', 'intent', '#8b5cf6', '#5b21b6', 'What a spell is for', ${AUTHOR}, ${AUTHOR})
  `;
  await sql`
    insert into categories (id, name, slug, description, group_id, created_by, updated_by)
    values (${CATEGORY}, 'Protection', 'protection', 'Wards', ${GROUP}, ${AUTHOR}, ${AUTHOR})
  `;
});

beforeEach(async () => {
  await sql`delete from spell_categories`;
  await sql`delete from users where id <> ${AUTHOR}`;
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await sql.end();
});

describe('the updated_at trigger', () => {
  // The catalogue-introspection half the sweep-task rule requires: a table
  // added later that forgets its trigger line reddens here, without this file
  // being edited, because both sides of the comparison are queries.
  describe('coverage', () => {
    async function auditedTables(): Promise<string[]> {
      const rows = await sql<{ table_name: string }[]>`
        select table_name from information_schema.columns
        where table_schema = 'public'
          and column_name in ('created_at', 'created_by', 'updated_at', 'updated_by')
        group by table_name having count(*) = 4
        order by table_name
      `;
      return rows.map((row) => row.table_name);
    }

    async function triggeredTables(): Promise<string[]> {
      const rows = await sql<{ relname: string }[]>`
        select c.relname from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_proc p on p.oid = t.tgfoid
        where not t.tgisinternal and p.proname = ${FUNCTION} and t.tgname = ${TRIGGER}
        order by c.relname
      `;
      return rows.map((row) => row.relname);
    }

    // Why the equality below could hold without the trigger existing: if no
    // table carried the audit stamps, both queries would come back empty. This
    // is the precondition that says they don't.
    it('finds the audited tables DESIGN.md §5 specifies', async () => {
      expect(await auditedTables()).toEqual(AUDITED_TABLES);
    });

    it('attaches to every audited table', async () => {
      expect(await triggeredTables()).toEqual(AUDITED_TABLES);
    });

    it('leaves Better Auth’s adapter tables alone', async () => {
      const triggered = await triggeredTables();

      for (const table of UNAUDITED_TABLES) {
        expect(triggered).not.toContain(table);
      }
      // Why they could have been skipped for the wrong reason: they exist, and
      // they carry the `updated_at` a careless sweep would have matched on.
      const withUpdatedAt = await sql<{ table_name: string }[]>`
        select table_name from information_schema.columns
        where table_schema = 'public' and column_name = 'updated_at'
          and table_name in ${sql(UNAUDITED_TABLES)}
        order by table_name
      `;
      expect(withUpdatedAt.map((row) => row.table_name)).toEqual(UNAUDITED_TABLES);
    });

    it('fires before each updated row, and on nothing else', async () => {
      const rows = await sql<{ relname: string; timing: string; level: string; events: string }[]>`
        select c.relname,
               case when (t.tgtype & 2) <> 0 then 'before' else 'after' end as timing,
               case when (t.tgtype & 1) <> 0 then 'row' else 'statement' end as level,
               concat_ws(
                 ',',
                 case when (t.tgtype & 4) <> 0 then 'insert' end,
                 case when (t.tgtype & 8) <> 0 then 'delete' end,
                 case when (t.tgtype & 16) <> 0 then 'update' end
               ) as events
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_proc p on p.oid = t.tgfoid
        where not t.tgisinternal and p.proname = ${FUNCTION}
      `;

      expect(rows).toHaveLength(AUDITED_TABLES.length);
      for (const row of rows) {
        expect({ timing: row.timing, level: row.level, events: row.events }).toEqual({
          timing: 'before',
          level: 'row',
          events: 'update',
        });
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

  // The user story: a manual database fix cannot leave `updated_at` stale.
  describe('a raw SQL update', () => {
    it('stamps updated_at although the statement never mentions it', async () => {
      const id = await insertUser(randomUUID(), THE_MILLENNIUM);
      const before = await databaseNow();

      await sql`update users set name = 'Fixed by hand' where id = ${id}`;

      const row = await stampsOf('users', 'id', id);
      expect(row.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(row.updated_at.getTime()).toBeLessThanOrEqual((await databaseNow()).getTime());
    });

    it('overrides an updated_at the statement sets by hand', async () => {
      const id = await insertUser();
      const before = await databaseNow();

      await sql`
        update users set name = 'Backdated', updated_at = ${THE_MILLENNIUM} where id = ${id}
      `;

      const row = await stampsOf('users', 'id', id);
      expect(row.updated_at.getFullYear()).not.toBe(2000);
      expect(row.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('leaves created_at where it was', async () => {
      const id = await insertUser(randomUUID(), THE_MILLENNIUM);

      await sql`update users set name = 'Renamed' where id = ${id}`;

      const row = await stampsOf('users', 'id', id);
      expect(row.created_at.getFullYear()).toBe(2000);
    });

    // The trigger is BEFORE UPDATE only, which is what makes the test above
    // meaningful: an insert's own stamps survive, so a 2000 timestamp in the
    // column is a value the trigger declined to touch rather than one it never
    // had the chance to.
    it('does not fire on insert', async () => {
      const id = await insertUser(randomUUID(), THE_MILLENNIUM);

      const row = await stampsOf('users', 'id', id);
      expect(row.created_at.getFullYear()).toBe(2000);
      expect(row.updated_at.getFullYear()).toBe(2000);
    });
  });

  // The other half of "not double-stamped inconsistently": `applyAudit` still
  // puts an `updated_at` in the SET list, and the database overwrites it every
  // time, so there is exactly one clock in the column no matter which path
  // wrote the row.
  describe('an application update through withAudit', () => {
    const session = { userId: AUTHOR };

    it('stores the database clock, not the application’s', async () => {
      const id = await insertUser();
      // Only `Date` is faked — the driver's own timers stay real. This is what
      // makes the two clocks distinguishable at all: `applyAudit` sends the
      // year 2000, and what lands in the column is this year.
      vi.useFakeTimers({ toFake: ['Date'], now: new Date(`${THE_MILLENNIUM}Z`) });

      const [returned] = await withAudit(session, (write) =>
        write.update(users, { name: 'Renamed' }, eq(users.id, id)),
      );

      vi.useRealTimers();
      expect(returned.updatedAt.getFullYear()).toBe((await databaseNow()).getFullYear());
      // RETURNING reads the row the trigger already rewrote, so what the caller
      // is handed and what is stored cannot disagree.
      const stored = await findOne(users, eq(users.id, id));
      expect(stored?.updatedAt).toEqual(returned.updatedAt);
    });

    it('still takes updated_by from the session', async () => {
      const id = await insertUser();

      const [returned] = await withAudit(session, (write) =>
        write.update(users, { name: 'Renamed' }, eq(users.id, id)),
      );

      // The database owns *when*; the session still owns *who* (CLAUDE.md
      // rule 3) — the trigger touches one column and not the other.
      expect(returned.updatedBy).toBe(AUTHOR);
    });

    it('stamps updated_at on a soft delete too', async () => {
      const id = await insertUser(randomUUID(), THE_MILLENNIUM);

      const [returned] = await withAudit(session, (write) =>
        write.softDelete(users, eq(users.id, id)),
      );

      // `applyAudit('delete')` sets `deleted_at`/`deleted_by` and nothing else,
      // so this column moved because the row was touched, not because the
      // payload carried it.
      expect(returned.updatedAt.getFullYear()).not.toBe(2000);
      expect(returned.deletedBy).toBe(AUTHOR);
    });
  });

  // MB.34's three join tables carry the four stamps and no `deleted_at`, so the
  // function has to reach a row it can never soft-delete.
  describe('a join table carrying only the four stamps', () => {
    it('stamps a spell_categories row the same way', async () => {
      await sql`
        insert into spell_categories (spell_id, category_id, created_by, updated_by, created_at, updated_at)
        values (${SPELL}, ${CATEGORY}, ${AUTHOR}, ${AUTHOR}, ${THE_MILLENNIUM}, ${THE_MILLENNIUM})
      `;
      const before = await databaseNow();

      await sql`
        update spell_categories set updated_by = ${AUTHOR}
        where spell_id = ${SPELL} and category_id = ${CATEGORY}
      `;

      const row = await stampsOf('spell_categories', 'spell_id', SPELL);
      expect(row.created_at.getFullYear()).toBe(2000);
      expect(row.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
