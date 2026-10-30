import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B } from '../support/as-user';
import { useTestDatabase } from '../support/db/database';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertSpell } from '../support/db/insert-spell';
import { makeSpell } from '../support/fixtures';
import { makeIngredient } from '../support/fixtures/ingredient';

// `revision` is a counter the database adds one to on every UPDATE, so a save can name the revision it read and be refused if the row moved
// (claude-docs/db/grimoire.md, "Revision"). Each table carrying the column adds its own trigger line to `bump_revision()`, as `set_updated_at` does.

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
  it('attaches bump_revision to every table carrying a revision, and spells, ingredients and cupboard entries carry one', async () => {
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
    expect(carrying.map((row) => row.table_name)).toEqual(
      expect.arrayContaining(['spells', 'ingredients', 'workspace_compendium_entries']),
    );
    expect(triggered.map((row) => row.relname)).toEqual(carrying.map((row) => row.table_name));
  });
});

describe('a spell’s revision', () => {
  it('starts at 1', async () => {
    expect(await revisionOf(await spell())).toBe(1);
  });

  // The trigger reads no column, so one is enough: the soft delete,
  // the update a reader might doubt is an UPDATE at all.
  it('rises by exactly one when the spell is soft-deleted', async () => {
    const id = await spell();

    await sql`update spells set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

    expect(await revisionOf(id)).toBe(2);
  });

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
    // Stamped in 2000 at insert: an UPDATE of the stamp alone is itself a no-op.
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

// `ingredients` holds a coven's own entries and the compendium's alike, so one column guards both forms (M13.23).
describe('an ingredient’s revision', () => {
  const ingredient = (workspaceId: string | null) =>
    insertIngredient(sql, makeIngredient({ workspaceId, nomenclature: 'none' }), A.id);

  beforeEach(async () => {
    await sql`truncate ingredients cascade`;
  });

  async function ingredientRevision(id: string): Promise<number> {
    const [row] = await sql<
      { revision: number }[]
    >`select revision from ingredients where id = ${id}`;
    return row.revision;
  }

  it.each([
    ['a coven’s own entry', WORKSPACE_W_ID],
    ['a compendium entry', null],
  ])('starts at 1 and rises by one on each update of %s', async (_label, workspaceId) => {
    const id = await ingredient(workspaceId);
    expect(await ingredientRevision(id)).toBe(1);

    await sql`update ingredients set description = 'One' where id = ${id}`;
    await sql`update ingredients set revision = 100, description = 'Two' where id = ${id}`;

    expect(await ingredientRevision(id)).toBe(3);
  });

  it('moves alone on an update that changes nothing, leaving updated_by where it was', async () => {
    const id = await ingredient(WORKSPACE_W_ID);
    await sql`update ingredients set created_at = '2000-01-01', updated_at = '2000-01-01' where id = ${id}`;
    const [before] = await sql`select updated_at, updated_by from ingredients where id = ${id}`;
    expect(before.updated_by).toBe(A.id);

    await sql`update ingredients set name = name, updated_by = ${B.id} where id = ${id}`;

    const [after] =
      await sql`select updated_at, updated_by, revision from ingredients where id = ${id}`;
    expect(after).toEqual({ ...before, revision: 3 });
  });
});

// A coven's annotation of a compendium entry autosaves, so it counts saves as an ingredient does (M13.24).
describe('a cupboard entry’s revision', () => {
  beforeEach(async () => {
    await sql`truncate ingredients cascade`;
  });

  it('starts at 1 and rises by one on each update', async () => {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: null, nomenclature: 'none' }),
      A.id,
    );
    const id = await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId }, A.id);
    const read = async () => {
      const [row] = await sql<
        { revision: number }[]
      >`select revision from workspace_compendium_entries where id = ${id}`;
      return row.revision;
    };
    expect(await read()).toBe(1);

    await sql`update workspace_compendium_entries set description = 'One' where id = ${id}`;
    await sql`update workspace_compendium_entries set revision = 100, description = 'Two' where id = ${id}`;

    expect(await read()).toBe(3);
  });
});
