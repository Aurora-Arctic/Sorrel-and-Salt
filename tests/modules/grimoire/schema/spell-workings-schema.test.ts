import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { findWorkingsInSpell } from '@/db/repository';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { spellWorkingDeductions } from '@/modules/grimoire/schema/spell-working-deductions';
import { spellWorkingParticipants } from '@/modules/grimoire/schema/spell-working-participants';
import { spellWorkings } from '@/modules/grimoire/schema/spell-workings';
import { A, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { insertSpell } from '../../../support/db/insert-spell';
import {
  AUDIT_COLUMNS,
  DELETE_COLUMNS,
  STAMP_COLUMNS,
  tableFacts,
} from '../../../support/db/table-metadata';
import { makeSpell } from '../../../support/fixtures';

// DESIGN.md §5: a spell is the recipe and a working is the record of making it once.
const WORKING_COLUMNS = [
  'id',
  'spell_id',
  'status',
  'worked_on',
  'completed_at',
  'note',
  'visibility',
];
const PARTICIPANT_COLUMNS = ['id', 'working_id', 'user_id', 'name', 'position'];
const DEDUCTION_COLUMNS = [
  'id',
  'working_id',
  'spell_step_id',
  'inventory_item_id',
  'quantity',
  'unit',
  'shortfall',
];

const columnsOf = (table: Parameters<typeof tableFacts>[0]) =>
  Object.keys(tableFacts(table).byName).sort();

describe('the workings tables, in code', () => {
  it('spell_workings spreads the six audit columns', () => {
    expect(columnsOf(spellWorkings)).toEqual([...WORKING_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  // A working is a record a person can delete; the other two are replaced
  // wholesale or written once, so a tombstone would hold nothing.
  it.each([
    ['spell_working_participants', spellWorkingParticipants, PARTICIPANT_COLUMNS],
    ['spell_working_deductions', spellWorkingDeductions, DEDUCTION_COLUMNS],
  ])('%s spreads the four stamps and no tombstone', (_name, table, own) => {
    const columns = columnsOf(table);
    expect(columns).toEqual([...own, ...STAMP_COLUMNS].sort());
    for (const column of DELETE_COLUMNS) expect(columns).not.toContain(column);
  });

  it('indexes the workings of a spell newest first, over live rows', () => {
    const index = getTableConfig(spellWorkings).indexes.find(
      (candidate) => candidate.config.name === 'spell_workings_spell_id_worked_on_idx',
    );
    expect(index?.config.where).toBeDefined();
    expect(index?.config.columns).toHaveLength(2);
  });
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const AUTHOR = FIXTURE_USERS.A.id;
const OTHER = FIXTURE_USERS.B.id;

let spellId: string;

beforeEach(async () => {
  await sql`truncate spells cascade`;
  spellId = await insertSpell(sql, makeSpell({ categories: [] }), AUTHOR);
});

async function working(
  overrides: { status?: string; completedAt?: string | null; note?: string | null } = {},
): Promise<string> {
  const { status = 'draft', completedAt = null, note = null } = overrides;
  const [row] = await sql`
    insert into spell_workings (spell_id, status, worked_on, completed_at, note, created_by, updated_by)
    values (${spellId}, ${status}::working_status, '2026-10-01', ${completedAt}, ${note}, ${AUTHOR}, ${AUTHOR})
    returning id`;
  return row.id as string;
}

async function participant(
  workingId: string,
  who: { userId?: string | null; name?: string | null },
  position = 1,
): Promise<void> {
  await sql`
    insert into spell_working_participants (working_id, user_id, name, position, created_by, updated_by)
    values (${workingId}, ${who.userId ?? null}, ${who.name ?? null}, ${position}, ${AUTHOR}, ${AUTHOR})`;
}

describe('spell_workings', () => {
  it('defaults to a workspace-visible draft', async () => {
    const id = await working();
    const [row] =
      await sql`select status::text, visibility::text, completed_at from spell_workings where id = ${id}`;
    expect(row).toMatchObject({ status: 'draft', visibility: 'workspace', completed_at: null });
  });

  // Why the refusals below could have succeeded: the pair is admitted here.
  it('admits a complete working with a completion moment', async () => {
    await expect(
      working({ status: 'complete', completedAt: '2026-10-01T12:00:00Z' }),
    ).resolves.toBeTruthy();
  });

  it('refuses a draft with a completion moment and a complete working without one', async () => {
    const draft = await failureOf(working({ completedAt: '2026-10-01T12:00:00Z' }));
    const complete = await failureOf(working({ status: 'complete' }));
    expect(draft.constraint_name).toBe('spell_workings_completed_at_with_status');
    expect(complete.constraint_name).toBe('spell_workings_completed_at_with_status');
  });

  it('refuses a blank note', async () => {
    const error = await failureOf(working({ note: '   ' }));
    expect(error.constraint_name).toBe('spell_workings_note_not_blank');
  });

  // The spell's own filter hides a working, not a cascade: the working row
  // is still there, live, when the spell is deleted.
  it('is unreachable through findWorkingsInSpell once its spell is deleted', async () => {
    const id = await working();
    const membership = await assertMembership(asUser(A), WORKSPACE_W_ID, { spell: ['read'] });
    expect((await findWorkingsInSpell(membership, spellId)).map((row) => row.id)).toEqual([id]);

    await sql`update spells set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${spellId}`;

    expect(await findWorkingsInSpell(membership, spellId)).toEqual([]);
    const [still] = await sql`select deleted_at from spell_workings where id = ${id}`;
    expect(still.deleted_at).toBeNull();
  });
});

describe('spell_working_participants', () => {
  it('admits a member and a typed name', async () => {
    const id = await working();
    await participant(id, { userId: AUTHOR }, 1);
    await participant(id, { name: 'Testwort' }, 2);
    const rows =
      await sql`select position from spell_working_participants where working_id = ${id} order by position`;
    expect(rows.map((row) => row.position)).toEqual([1, 2]);
  });

  it('refuses a row with both a member and a name, or neither', async () => {
    const id = await working();
    const both = await failureOf(participant(id, { userId: AUTHOR, name: 'Testwort' }));
    const neither = await failureOf(participant(id, {}));
    expect(both.constraint_name).toBe('spell_working_participants_one_identity');
    expect(neither.constraint_name).toBe('spell_working_participants_one_identity');
  });

  it('refuses a blank name', async () => {
    const error = await failureOf(participant(await working(), { name: ' ' }));
    expect(error.constraint_name).toBe('spell_working_participants_name_not_blank');
  });

  it('refuses a repeated member or a repeated name on one working, but not across workings', async () => {
    const id = await working();
    const other = await working();
    await participant(id, { userId: AUTHOR }, 1);
    await participant(id, { name: 'Testwort' }, 2);

    const member = await failureOf(participant(id, { userId: AUTHOR }, 3));
    const name = await failureOf(participant(id, { name: 'TESTWORT' }, 3));
    expect(member.constraint_name).toBe('spell_working_participants_working_id_user_id_unique');
    expect(name.constraint_name).toBe('spell_working_participants_working_id_name_unique');

    // Why the refusals are the index's: the same two are fine on another working.
    await participant(other, { userId: AUTHOR }, 1);
    await participant(other, { name: 'Testwort' }, 2);
    // Two different members, and two typed names, coexist.
    await participant(id, { userId: OTHER }, 3);
    await participant(id, { name: 'Moonwort' }, 4);
  });
});

describe('spell_working_deductions', () => {
  it('records a deduction against a step and a stock row, with a shortfall of 0 by default', async () => {
    const id = await working({ status: 'complete', completedAt: '2026-10-01T12:00:00Z' });
    const [step] = await sql`select id from spell_steps where spell_id = ${spellId} limit 1`;
    const [item] =
      await sql`select id, unit::text from inventory_items where workspace_id = ${WORKSPACE_W_ID} limit 1`;
    expect(step, 'the fixture spell has a step').toBeDefined();
    expect(item, 'the seed has a stock row').toBeDefined();

    await sql`
      insert into spell_working_deductions (working_id, spell_step_id, inventory_item_id, quantity, unit, created_by, updated_by)
      values (${id}, ${step.id}, ${item.id}, '1.500', ${item.unit}::inventory_unit, ${AUTHOR}, ${AUTHOR})`;

    const [row] =
      await sql`select quantity, shortfall from spell_working_deductions where working_id = ${id}`;
    expect(row).toMatchObject({ quantity: '1.500', shortfall: '0.000' });
  });
});
