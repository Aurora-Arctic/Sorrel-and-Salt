import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B } from '../support/as-user';
import { useTestDatabase } from '../support/db/database';
import { insertSpell } from '../support/db/insert-spell';
import { makeSpell } from '../support/fixtures';

// M13.15: `revision` is a counter the database adds one to on every UPDATE,
// so a save can name the revision it read and be refused if the row has moved
// since (claude-docs/db/grimoire.md, "Revision (M13.15)"). One function,
// `bump_revision()`, and each table carrying the column adds its own trigger
// line in its own migration, as `set_updated_at` does.

const FUNCTION = 'bump_revision';
const TRIGGER = 'bump_revision';

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

const spell = () => insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_W_ID }), A.id);

async function revisionOf(id: string): Promise<number> {
  const [row] = await sql<{ revision: number }[]>`select revision from spells where id = ${id}`;
  return row.revision;
}

describe('the catalogue', () => {
  // Read from the catalogue on both sides, so a later table that takes the
  // column and forgets its trigger line reddens without this file being edited.
  it('attaches bump_revision to every table carrying a revision, and spells carries one', async () => {
    // Tables alone: a view has no trigger of its own to carry.
    const carrying = await sql<{ table_name: string }[]>`
      select c.table_name from information_schema.columns c
      join information_schema.tables t using (table_schema, table_name)
      where c.table_schema = 'public' and c.column_name = 'revision' and t.table_type = 'BASE TABLE'
      order by c.table_name
    `;
    const triggered = await sql<{ relname: string }[]>`
      select c.relname from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_proc p on p.oid = t.tgfoid
      where not t.tgisinternal and p.proname = ${FUNCTION} and t.tgname = ${TRIGGER}
      order by c.relname
    `;

    // Why the comparison is not two empty lists agreeing: spells is in it.
    expect(carrying.map((row) => row.table_name)).toContain('spells');
    expect(triggered.map((row) => row.relname)).toEqual(carrying.map((row) => row.table_name));
  });

  it('runs the trigger before each row is updated, and on nothing else', async () => {
    const [row] = await sql<{ definition: string }[]>`
      select pg_get_triggerdef(t.oid) as definition from pg_trigger t
      where t.tgrelid = 'spells'::regclass and t.tgname = ${TRIGGER}
    `;

    expect(row.definition).toBe(
      'CREATE TRIGGER bump_revision BEFORE UPDATE ON public.spells FOR EACH ROW EXECUTE FUNCTION bump_revision()',
    );
  });

  it('requires a title of a complete spell, and of no draft', async () => {
    const [check] = await sql<{ definition: string }[]>`
      select pg_get_constraintdef(oid) as definition from pg_constraint
      where conrelid = 'spells'::regclass and contype = 'c' and conname = 'spells_complete_has_title'
    `;
    const [title] = await sql<{ is_nullable: string }[]>`
      select is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'spells' and column_name = 'title'
    `;

    expect(check.definition).toBe(
      "CHECK (((status <> 'complete'::spell_status) OR (title IS NOT NULL)))",
    );
    expect(title.is_nullable).toBe('YES');
  });
});

describe('a spell’s revision', () => {
  it('starts at 1', async () => {
    expect(await revisionOf(await spell())).toBe(1);
  });

  // One column of each kind the row holds: free text, the two enums, and the
  // soft delete, which is an UPDATE too.
  it.each([
    ['title', (sql) => sql`title = 'Testwort Ward'`],
    ['intent', (sql) => sql`intent = 'Keep the hearth'`],
    ['note', (sql) => sql`note = 'By the gate.'`],
    ['status', (sql) => sql`status = 'complete'`],
    ['visibility', (sql) => sql`visibility = 'private'`],
    ['deleted_at', (sql) => sql`deleted_at = now(), deleted_by = ${A.id}`],
  ] as [string, (sql: postgres.Sql) => postgres.PendingQuery<postgres.Row[]>][])(
    'rises by exactly one when %s changes',
    async (_column, set) => {
      const id = await spell();

      await sql`update spells set ${set(sql)} where id = ${id}`;

      expect(await revisionOf(id)).toBe(2);
    },
  );

  it('rises by one on each of several updates', async () => {
    const id = await spell();

    await sql`update spells set intent = 'One' where id = ${id}`;
    await sql`update spells set intent = 'Two' where id = ${id}`;
    await sql`update spells set intent = 'Three' where id = ${id}`;

    expect(await revisionOf(id)).toBe(4);
  });

  // The counter detects a write, not a change: a save that changed nothing
  // still moved past whatever another editor read.
  it('rises when the update sets a column to the value it already held', async () => {
    const id = await spell();

    await sql`update spells set title = title where id = ${id}`;

    expect(await revisionOf(id)).toBe(2);
  });

  it('is the database’s: a revision the statement sets is overridden', async () => {
    const id = await spell();

    await sql`update spells set revision = 100, intent = 'Changed' where id = ${id}`;

    expect(await revisionOf(id)).toBe(2);
  });

  it('moves alone on an update that changes nothing, leaving updated_at and updated_by where they were', async () => {
    // Stamped in 2000 at insert: an UPDATE of the stamp alone is itself a no-op (MB.106).
    const [{ id }] = await sql`
      insert into spells (workspace_id, title, created_by, updated_by, created_at, updated_at)
      values (${WORKSPACE_W_ID}, 'Testwort Ward', ${A.id}, ${A.id}, '2000-01-01', '2000-01-01')
      returning id
    `;
    const [before] = await sql`select updated_at, updated_by from spells where id = ${id}`;
    // Why the stamps could have moved: B is not the row's last editor.
    expect(before.updated_by).toBe(A.id);
    expect(before.updated_at.getFullYear()).toBe(2000);

    await sql`update spells set title = title, updated_by = ${B.id} where id = ${id}`;

    const [after] = await sql`select updated_at, updated_by, revision from spells where id = ${id}`;
    expect(after).toEqual({ ...before, revision: 2 });
  });
});
