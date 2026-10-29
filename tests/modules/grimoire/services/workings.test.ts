import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { AuditWriter } from '@/db/repository';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import {
  completeWorking,
  deleteSpell,
  deleteWorking,
  getWorking,
  listWorkings,
  recordWorking,
  updateWorking,
} from '@/modules/grimoire';
import type { Unit } from '@/modules/ingredients/schema/units';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';

// Recording, completing, changing and deleting a working. Who may do each, what completing takes from the jars, and what a failure
// part-way leaves are asserted by the rows, read raw.

// `withAudit` as it is, with one seam: a test may wrap the writer so a failure between two writes of one transaction can be staged.
const seam = vi.hoisted(() => ({
  wrap: undefined as ((write: AuditWriter) => AuditWriter) | undefined,
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  return {
    ...actual,
    withAudit: (
      session: Parameters<typeof actual.withAudit>[0],
      fn: (write: AuditWriter) => Promise<unknown>,
    ) => actual.withAudit(session, (write) => fn(seam.wrap ? seam.wrap(write) : write)),
  };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  seam.wrap = undefined;
  await sql`truncate spells, ingredients cascade`;
});

const DAY = '2026-10-01';

/** A compendium ingredient with one form, and the coven W's jar of it. */
async function stocked(name: string, quantity: string | null, unit: Unit | null) {
  const ingredientId = await insertIngredient(
    sql,
    makeIngredient({ workspaceId: null, name, nomenclature: 'none', variants: [makeVariant()] }),
    E.id,
  );
  const variantId = await variantIdOf(sql, ingredientId, 'Testform');
  const jarId = await insertStock(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId, variantId, quantityOnHand: quantity, unit },
    A.id,
  );
  return { ingredientId, jarId };
}

const quantityOf = async (jarId: string) =>
  Number(
    (await sql`select quantity_on_hand from inventory_items where id = ${jarId}`)[0]
      .quantity_on_hand,
  );

/** A spell in W by `author`, complete and shared unless said otherwise. */
function spellBy(author: typeof A, extra: Parameters<typeof makeSpell>[0] = {}): Promise<string> {
  return insertSpell(
    sql,
    makeSpell({
      workspaceId: WORKSPACE_W_ID,
      status: 'complete',
      visibility: 'workspace',
      steps: [{ body: 'Stir.' }],
      ...extra,
    }),
    author.id,
  );
}

const record = (user: typeof A, spellId: string, input: object = {}) =>
  recordWorking(asUser(user), WORKSPACE_W_ID, spellId, { workedOn: DAY, ...input });

const workingRow = async (id: string) =>
  (
    await sql`select status, completed_at, visibility, note, worked_on::text as worked_on, deleted_at from spell_workings where id = ${id}`
  )[0];
const countRows = async (table: 'spell_workings' | 'spell_working_deductions') =>
  Number((await sql`select count(*) from ${sql(table)}`)[0].count);

const refusal = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => error,
  );

describe('recordWorking', () => {
  it('writes a draft working with the caller as its one participant, taking nothing', async () => {
    const jar = await stocked('Fixture Wort', '10', 'g');
    const spell = await spellBy(A, {
      steps: [{ ingredientId: jar.ingredientId, quantity: '2', unit: 'g' }],
    });

    const report = await record(B, spell, { note: 'Went well' });

    expect(report.working).toMatchObject({
      status: 'draft',
      completedAt: null,
      visibility: 'workspace',
    });
    expect(report.participants.map((p) => p.userId)).toEqual([B.id]);
    expect(report.deductions).toEqual([]);
    expect(await quantityOf(jar.jarId)).toBe(10);
  });

  it('writes the participants in the order given, naming a member by id and anyone else by name', async () => {
    const spell = await spellBy(A);

    const report = await record(A, spell, { participants: [{ name: 'Guest' }, { userId: B.id }] });

    expect(report.participants.map((p) => [p.position, p.userId, p.displayName])).toEqual([
      [0, null, 'Guest'],
      [1, B.id, expect.any(String)],
    ]);
  });

  it('refuses a participant who is not a member of this coven, writing nothing', async () => {
    const spell = await spellBy(A);

    const error = await refusal(record(A, spell, { participants: [{ userId: D.id }] }));

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues[0].path).toEqual(['participants', 0]);
    expect(await countRows('spell_workings')).toBe(0);
  });

  it('defaults to the spell’s visibility and refuses one wider than it', async () => {
    const spell = await spellBy(A, { visibility: 'private' });

    const report = await record(A, spell);
    const error = await refusal(record(A, spell, { visibility: 'workspace' }));

    expect(report.working.visibility).toBe('private');
    expect(error).toBeInstanceOf(Forbidden);
    expect(await countRows('spell_workings')).toBe(1);
  });

  it('names the steps completing would take nothing for, with their reasons, and not an instruction-only step', async () => {
    const measured = await stocked('Fixture Measured', '5', 'g');
    const drifted = await stocked('Fixture Drifted', '5', 'ml');
    const spell = await spellBy(A, {
      steps: [
        { body: 'Stir.' },
        { name: 'Folk Herb', quantity: '1', unit: 'g' },
        { ingredientId: measured.ingredientId, quantity: '1', unit: 'g' },
        { ingredientId: drifted.ingredientId, quantity: '1', unit: 'g' },
      ],
    });

    const { warnings } = await record(A, spell);

    expect(warnings.map((w) => [w.stepName, w.reason])).toEqual([
      ['Folk Herb', 'custom'],
      ['Fixture Drifted', 'units-differ'],
    ]);
  });

  describe('refusals, each with its precondition proved', () => {
    it('a viewer cannot record, though they can read the spell', async () => {
      const spell = await spellBy(A);
      expect(await listWorkings(asUser(C), WORKSPACE_W_ID, spell)).toEqual([]);

      expect(await refusal(record(C, spell))).toBeInstanceOf(Forbidden);
      expect(await countRows('spell_workings')).toBe(0);
    });

    it('a member of another coven cannot record by id, though the same call works for a member of W', async () => {
      const spell = await spellBy(A);
      await record(B, spell);

      expect(await refusal(record(D, spell))).toBeInstanceOf(Forbidden);
      expect(
        await refusal(recordWorking(asUser(D), WORKSPACE_X_ID, spell, { workedOn: DAY })),
      ).toBeInstanceOf(NotFound);
    });

    it('a private spell of another member is not found, though its author can record', async () => {
      const spell = await spellBy(A, { visibility: 'private' });
      await record(A, spell);

      expect(await refusal(record(B, spell))).toBeInstanceOf(NotFound);
    });

    it('a draft spell takes no working, with an error that says why, and an unknown spell is not found', async () => {
      const draft = await spellBy(A, { status: 'draft' });
      const complete = await spellBy(A);
      await record(A, complete);

      const error = await refusal(record(A, draft));

      expect(error).toBeInstanceOf(Forbidden);
      expect((error as Error).message).toMatch(/draft/);
      expect(await refusal(record(A, 'not-an-id'))).toBeInstanceOf(NotFound);
    });
  });
});

describe('completeWorking', () => {
  it('takes the converted amount of each stocked step, in the jar’s unit, in one write', async () => {
    const salt = await stocked('Fixture Salt', '100', 'g');
    const oil = await stocked('Fixture Oil', '10', 'l');
    const spell = await spellBy(A, {
      steps: [
        { body: 'Stir.' },
        { ingredientId: salt.ingredientId, quantity: '2', unit: 'kg' },
        { ingredientId: oil.ingredientId, quantity: '500', unit: 'ml' },
      ],
    });
    const { working } = await record(B, spell);
    // 2 kg is more than the 100 g held: the jar empties and the rest is the shortfall.
    const report = await completeWorking(asUser(B), WORKSPACE_W_ID, working.id);

    expect(report.working).toMatchObject({ status: 'complete' });
    expect(report.working.completedAt).not.toBeNull();
    expect(await quantityOf(salt.jarId)).toBe(0);
    expect(await quantityOf(oil.jarId)).toBe(9.5);
    const byJar = new Map(report.deductions.map((row) => [row.inventoryItemId, row]));
    expect(Number(byJar.get(salt.jarId)?.quantity)).toBe(100);
    expect(Number(byJar.get(salt.jarId)?.shortfall)).toBe(1900);
    expect(byJar.get(salt.jarId)?.unit).toBe('g');
    expect(Number(byJar.get(oil.jarId)?.shortfall)).toBe(0);
  });

  it('deducts a count step by identical unit, and reports a custom step without a deduction', async () => {
    const stones = await stocked('Fixture Stones', '5', 'piece');
    const spell = await spellBy(A, {
      steps: [
        { ingredientId: stones.ingredientId, quantity: '2', unit: 'piece' },
        { name: 'Folk Herb', quantity: '1', unit: 'g' },
      ],
    });
    const { working } = await record(A, spell);

    const report = await completeWorking(asUser(A), WORKSPACE_W_ID, working.id);

    expect(await quantityOf(stones.jarId)).toBe(3);
    expect(report.deductions).toHaveLength(1);
    expect(report.warnings.map((w) => w.reason)).toEqual(['custom']);
  });

  it('refuses completing twice, taking nothing the second time', async () => {
    const salt = await stocked('Fixture Salt', '10', 'g');
    const spell = await spellBy(A, {
      steps: [{ ingredientId: salt.ingredientId, quantity: '1', unit: 'g' }],
    });
    const { working } = await record(A, spell);
    await completeWorking(asUser(A), WORKSPACE_W_ID, working.id);

    expect(await refusal(completeWorking(asUser(A), WORKSPACE_W_ID, working.id))).toBeInstanceOf(
      Forbidden,
    );
    expect(await quantityOf(salt.jarId)).toBe(9);
    expect(await countRows('spell_working_deductions')).toBe(1);
  });

  it('leaves no completion and no deduction row when a deduction fails part-way', async () => {
    const salt = await stocked('Fixture Salt', '10', 'g');
    const oil = await stocked('Fixture Oil', '10', 'g');
    const spell = await spellBy(A, {
      steps: [
        { ingredientId: salt.ingredientId, quantity: '1', unit: 'g' },
        { ingredientId: oil.ingredientId, quantity: '1', unit: 'g' },
      ],
    });
    const { working } = await record(A, spell);
    let calls = 0;
    seam.wrap = (write) => ({
      ...write,
      decrementStock: async (...args) => {
        if (++calls === 2) throw new Error('staged failure');
        return write.decrementStock(...args);
      },
    });

    await expect(completeWorking(asUser(A), WORKSPACE_W_ID, working.id)).rejects.toThrow('staged');

    expect((await workingRow(working.id)).completed_at).toBeNull();
    expect((await workingRow(working.id)).status).toBe('draft');
    expect(await countRows('spell_working_deductions')).toBe(0);
    expect(await quantityOf(salt.jarId)).toBe(10);
  });

  it('is the recorder’s alone: another member who can read the working is refused', async () => {
    const spell = await spellBy(A);
    const { working } = await record(A, spell);
    expect((await getWorking(asUser(B), WORKSPACE_W_ID, working.id)).working.id).toBe(working.id);

    expect(await refusal(completeWorking(asUser(B), WORKSPACE_W_ID, working.id))).toBeInstanceOf(
      Forbidden,
    );
    expect(await refusal(completeWorking(asUser(C), WORKSPACE_W_ID, working.id))).toBeInstanceOf(
      Forbidden,
    );
    expect(await refusal(completeWorking(asUser(D), WORKSPACE_W_ID, working.id))).toBeInstanceOf(
      Forbidden,
    );
    expect((await workingRow(working.id)).status).toBe('draft');
  });

  it('is refused while its spell is a draft, and works again once it is complete', async () => {
    const spell = await spellBy(A);
    const { working } = await record(A, spell);
    await sql`update spells set status = 'draft' where id = ${spell}`;

    const error = await refusal(completeWorking(asUser(A), WORKSPACE_W_ID, working.id));
    expect(error).toBeInstanceOf(Forbidden);

    await sql`update spells set status = 'complete' where id = ${spell}`;
    const report = await completeWorking(asUser(A), WORKSPACE_W_ID, working.id);
    expect(report.working.status).toBe('complete');
  });
});

describe('reopening a spell', () => {
  it('keeps its workings and their deductions, and takes no new one', async () => {
    const salt = await stocked('Fixture Salt', '10', 'g');
    const spell = await spellBy(A, {
      steps: [{ ingredientId: salt.ingredientId, quantity: '1', unit: 'g' }],
    });
    const { working } = await record(A, spell);
    await completeWorking(asUser(A), WORKSPACE_W_ID, working.id);
    await sql`update spells set status = 'draft' where id = ${spell}`;

    const error = await refusal(record(A, spell));

    expect(error).toBeInstanceOf(Forbidden);
    const kept = await listWorkings(asUser(A), WORKSPACE_W_ID, spell);
    expect(kept.map((r) => r.working.id)).toEqual([working.id]);
    expect(kept[0].deductions).toHaveLength(1);
  });
});

describe('reading', () => {
  it('shows a private working to its recorder and the members named on it, and to no one else', async () => {
    const spell = await spellBy(A);
    const { working } = await record(A, spell, {
      visibility: 'private',
      participants: [{ userId: A.id }, { userId: B.id }],
    });
    // Why the others could have read it: the spell is shared with the whole coven.
    expect(await listWorkings(asUser(C), WORKSPACE_W_ID, spell)).toEqual([]);

    expect((await getWorking(asUser(A), WORKSPACE_W_ID, working.id)).working.id).toBe(working.id);
    expect((await getWorking(asUser(B), WORKSPACE_W_ID, working.id)).working.id).toBe(working.id);
    expect(await refusal(getWorking(asUser(C), WORKSPACE_W_ID, working.id))).toBeInstanceOf(
      NotFound,
    );
    expect(await refusal(getWorking(asUser(D), WORKSPACE_W_ID, working.id))).toBeInstanceOf(
      Forbidden,
    );
  });

  it('keeps a working at the visibility it had when its spell widens', async () => {
    const spell = await spellBy(A, { visibility: 'private' });
    const { working } = await record(A, spell);
    await sql`update spells set visibility = 'workspace' where id = ${spell}`;

    expect(await refusal(getWorking(asUser(B), WORKSPACE_W_ID, working.id))).toBeInstanceOf(
      NotFound,
    );
    expect((await workingRow(working.id)).visibility).toBe('private');
  });

  it('reads a removed member under the name their row last held', async () => {
    const spell = await spellBy(A);
    const { working } = await record(A, spell, {
      participants: [{ userId: A.id }, { userId: B.id }],
    });
    await sql`update workspace_members set deleted_at = now(), deleted_by = ${A.id}
              where user_id = ${B.id} and workspace_id = ${WORKSPACE_W_ID}`;
    try {
      const report = await getWorking(asUser(A), WORKSPACE_W_ID, working.id);

      const removed = report.participants.find((p) => p.userId === B.id);
      expect(removed?.displayName).toEqual(expect.any(String));
    } finally {
      await sql`update workspace_members set deleted_at = null, deleted_by = null where user_id = ${B.id} and workspace_id = ${WORKSPACE_W_ID}`;
    }
  });
});

describe('updateWorking', () => {
  it('changes the day, note and participants, leaving participants alone when none are named', async () => {
    const spell = await spellBy(A);
    const { working } = await record(A, spell, {
      participants: [{ userId: A.id }, { userId: B.id }],
    });

    const first = await updateWorking(asUser(A), WORKSPACE_W_ID, working.id, {
      workedOn: '2026-10-02',
      note: 'Later',
    });
    expect(first.working).toMatchObject({ workedOn: '2026-10-02', note: 'Later' });
    expect(first.participants).toHaveLength(2);

    const second = await updateWorking(asUser(A), WORKSPACE_W_ID, working.id, {
      workedOn: '2026-10-02',
      participants: [{ name: 'Guest' }],
    });
    expect(second.participants.map((p) => p.name)).toEqual(['Guest']);
  });

  it('refuses narrowing a complete working with the explaining error, and allows widening it', async () => {
    const spell = await spellBy(A);
    const { working } = await record(A, spell, { visibility: 'private' });
    await completeWorking(asUser(A), WORKSPACE_W_ID, working.id);

    const widened = await updateWorking(asUser(A), WORKSPACE_W_ID, working.id, {
      workedOn: DAY,
      visibility: 'workspace',
    });
    const error = await refusal(
      updateWorking(asUser(A), WORKSPACE_W_ID, working.id, {
        workedOn: DAY,
        visibility: 'private',
      }),
    );

    expect(widened.working.visibility).toBe('workspace');
    expect(error).toBeInstanceOf(Forbidden);
    expect((error as Error).message).toMatch(/working has been shared/);
    expect((await workingRow(working.id)).visibility).toBe('workspace');
  });

  it('lets a draft working move either way, within its spell’s visibility', async () => {
    const shared = await spellBy(A);
    const priv = await spellBy(A, { visibility: 'private' });
    const a = (await record(A, shared)).working;
    const b = (await record(A, priv)).working;

    const narrowed = await updateWorking(asUser(A), WORKSPACE_W_ID, a.id, {
      workedOn: DAY,
      visibility: 'private',
    });
    const tooWide = await refusal(
      updateWorking(asUser(A), WORKSPACE_W_ID, b.id, { workedOn: DAY, visibility: 'workspace' }),
    );

    expect(narrowed.working.visibility).toBe('private');
    expect(tooWide).toBeInstanceOf(Forbidden);
  });

  it('is refused for another member who can read the working, a viewer and a non-member', async () => {
    const spell = await spellBy(A);
    const { working } = await record(A, spell);
    expect((await getWorking(asUser(B), WORKSPACE_W_ID, working.id)).working.id).toBe(working.id);

    for (const user of [B, C, D]) {
      expect(
        await refusal(
          updateWorking(asUser(user), WORKSPACE_W_ID, working.id, { workedOn: '2026-10-09' }),
        ),
      ).toBeInstanceOf(Forbidden);
    }
    expect((await workingRow(working.id)).worked_on).toBe(DAY);
  });
});

describe('deleteWorking', () => {
  it('soft-deletes the working by its recorder and leaves the stock taken', async () => {
    const salt = await stocked('Fixture Salt', '10', 'g');
    const spell = await spellBy(A, {
      steps: [{ ingredientId: salt.ingredientId, quantity: '1', unit: 'g' }],
    });
    const { working } = await record(A, spell);
    await completeWorking(asUser(A), WORKSPACE_W_ID, working.id);

    await deleteWorking(asUser(A), WORKSPACE_W_ID, working.id);

    expect((await workingRow(working.id)).deleted_at).not.toBeNull();
    expect(await quantityOf(salt.jarId)).toBe(9);
    expect(await countRows('spell_working_deductions')).toBe(1);
    expect(await listWorkings(asUser(A), WORKSPACE_W_ID, spell)).toEqual([]);
  });

  it('is refused for another member who can read it, a viewer and a non-member', async () => {
    const spell = await spellBy(A);
    const { working } = await record(A, spell);
    expect((await getWorking(asUser(B), WORKSPACE_W_ID, working.id)).working.id).toBe(working.id);

    for (const user of [B, C, D]) {
      expect(await refusal(deleteWorking(asUser(user), WORKSPACE_W_ID, working.id))).toBeInstanceOf(
        Forbidden,
      );
    }
    expect((await workingRow(working.id)).deleted_at).toBeNull();
  });
});

describe('deleteSpell', () => {
  it('soft-deletes the spell’s workings with it, whoever recorded them, and keeps their rows', async () => {
    const salt = await stocked('Fixture Salt', '10', 'g');
    const spell = await spellBy(A, {
      steps: [{ ingredientId: salt.ingredientId, quantity: '1', unit: 'g' }],
    });
    const mine = (await record(A, spell)).working;
    const theirs = (await record(B, spell, { visibility: 'private' })).working;
    await completeWorking(asUser(A), WORKSPACE_W_ID, mine.id);

    await deleteSpell(asUser(A), WORKSPACE_W_ID, spell);

    expect((await workingRow(mine.id)).deleted_at).not.toBeNull();
    expect((await workingRow(theirs.id)).deleted_at).not.toBeNull();
    expect(await countRows('spell_working_deductions')).toBe(1);
    expect(await quantityOf(salt.jarId)).toBe(9);
  });
});
