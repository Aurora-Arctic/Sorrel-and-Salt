import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  addSpellStep,
  createSpell,
  readSpell,
  stepsOfSpells,
  updateSpell,
  updateSpellStep,
} from '@/modules/grimoire';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { makeIngredient, makeSpell } from '../../../support/fixtures';
import type { SpellVisibility } from '@/modules/grimoire';
import type { Session } from '@/lib/session';

// The grimoire's service (M10.5): members and owners write, viewers read, and
// a private spell is its author's alone. Every row a result could come from is
// one this file wrote, through the raw client.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

/** A spell in `workspaceId`, written by `author`, as setup rather than through the service. */
function seed(
  author: typeof A,
  visibility: SpellVisibility = 'workspace',
  extra: Parameters<typeof makeSpell>[0] = {},
  workspaceId: string = WORKSPACE_W_ID,
): Promise<string> {
  return insertSpell(sql, makeSpell({ workspaceId, visibility, ...extra }), author.id);
}

/** A spell and its steps as the API reads them: `readSpell`, then `Spell.steps`' batch. */
async function readWithSteps(session: Session, workspaceId: string, spellId: string) {
  const spell = await readSpell(session, workspaceId, spellId);
  const [steps] = await stepsOfSpells(session, [spell]);
  if (steps instanceof Error) throw steps;
  return { spell, steps };
}

const countSpells = async (): Promise<number> =>
  Number((await sql`select count(*) from spells`)[0].count);

describe('createSpell', () => {
  // An owner holds `spell: create` too: tests/modules/coven/services/access-control.test.ts.
  it('lets a member create a spell, stamped with their id', async () => {
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Hearth Warding' });

    expect(spell).toMatchObject({
      title: 'Hearth Warding',
      workspaceId: WORKSPACE_W_ID,
      status: 'draft',
      visibility: 'workspace',
      createdBy: B.id,
    });
  });

  it('keeps the author’s choice of visibility and writes the free-text note', async () => {
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Quiet Working',
      visibility: 'private',
      note: 'Do it at dusk.',
    });

    expect(spell).toMatchObject({
      visibility: 'private',
      note: 'Do it at dusk.',
    });
  });

  it('refuses a viewer, who creates nothing, private spells included', async () => {
    // Why this could have succeeded: C is a live member of W and reads its spells.
    const shared = await seed(B);
    await expect(readSpell(asUser(C), WORKSPACE_W_ID, shared)).resolves.toBeDefined();
    const before = await countSpells();

    for (const visibility of ['workspace', 'private'] as const) {
      await expect(
        createSpell(asUser(C), WORKSPACE_W_ID, { title: 'Nope', visibility }),
      ).rejects.toBeInstanceOf(Forbidden);
    }
    expect(await countSpells()).toBe(before);
  });

  it('refuses a member of another coven', async () => {
    // Why this could have succeeded: D holds a live membership, of X.
    await expect(
      createSpell(asUser(D), WORKSPACE_X_ID, { title: 'Own Coven Working' }),
    ).resolves.toBeDefined();

    await expect(
      createSpell(asUser(D), WORKSPACE_W_ID, { title: 'Foreign Working' }),
    ).rejects.toBeInstanceOf(Forbidden);
  });
});

describe('updateSpell', () => {
  // One path for every writer: `updateSpell` has no author branch.
  it('lets a member edit another member’s workspace spell', async () => {
    const id = await seed(A);

    const updated = await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      title: 'Renamed',
      status: 'complete',
      intent: 'Keep the hearth safe',
    });

    expect(updated).toMatchObject({
      id,
      title: 'Renamed',
      status: 'complete',
      intent: 'Keep the hearth safe',
      updatedBy: B.id,
      createdBy: A.id,
    });
  });

  it('does not touch the visibility, which only setSpellVisibility changes', async () => {
    const id = await seed(B, 'private');
    const updated = await updateSpell(asUser(B), WORKSPACE_W_ID, id, { title: 'Still Private' });
    expect(updated.visibility).toBe('private');
  });

  it('writes a changed note', async () => {
    const id = await seed(B);
    const updated = await updateSpell(asUser(B), WORKSPACE_W_ID, id, { note: 'New note' });
    expect(updated).toMatchObject({ note: 'New note' });
  });

  it('refuses a viewer on a spell they can read', async () => {
    const id = await seed(B);
    await expect(readSpell(asUser(C), WORKSPACE_W_ID, id)).resolves.toBeDefined();

    await expect(
      updateSpell(asUser(C), WORKSPACE_W_ID, id, { title: 'Viewer Edit' }),
    ).rejects.toBeInstanceOf(Forbidden);
    expect((await sql`select title from spells where id = ${id}`)[0].title).not.toBe('Viewer Edit');
  });

  it('tells the owner a member’s private spell is not there, and leaves it alone', async () => {
    const id = await seed(B, 'private', { title: 'Mine Alone' });
    // Why the owner could have edited it: the owner may edit B's workspace spell.
    const other = await seed(B);
    await expect(
      updateSpell(asUser(A), WORKSPACE_W_ID, other, { title: 'Owner Edit' }),
    ).resolves.toBeDefined();

    await expect(
      updateSpell(asUser(A), WORKSPACE_W_ID, id, { title: 'Owner Edit' }),
    ).rejects.toBeInstanceOf(NotFound);
    expect((await sql`select title from spells where id = ${id}`)[0].title).toBe('Mine Alone');
  });

  it('refuses D by direct id at either visibility', async () => {
    const shared = await seed(B);
    const hidden = await seed(B, 'private');
    // Why this could have succeeded: D edits their own coven's spell.
    const own = await seed(D, 'workspace', {}, WORKSPACE_X_ID);
    await expect(
      updateSpell(asUser(D), WORKSPACE_X_ID, own, { title: 'Own Edit' }),
    ).resolves.toBeDefined();

    for (const id of [shared, hidden]) {
      await expect(
        updateSpell(asUser(D), WORKSPACE_W_ID, id, { title: 'Foreign Edit' }),
      ).rejects.toBeInstanceOf(Forbidden);
      // Naming X as the coven does not open W's row either.
      await expect(
        updateSpell(asUser(D), WORKSPACE_X_ID, id, { title: 'Foreign Edit' }),
      ).rejects.toBeInstanceOf(NotFound);
    }
  });
});

describe('a custom, one-off ingredient row', () => {
  const custom = { steps: [{ name: 'Fixture Ash', form: 'ash' }] };

  it('is read exactly when its spell is', async () => {
    const shared = await seed(B, 'workspace', custom);
    const hidden = await seed(B, 'private', custom);

    // Why the private row could have been read: its author reads it.
    expect((await readWithSteps(asUser(B), WORKSPACE_W_ID, hidden)).steps).toHaveLength(1);

    const read = await readWithSteps(asUser(C), WORKSPACE_W_ID, shared);
    expect(read.steps).toEqual([
      expect.objectContaining({ name: 'Fixture Ash', form: 'ash', ingredient: null }),
    ]);
    await expect(readWithSteps(asUser(A), WORKSPACE_W_ID, hidden)).rejects.toBeInstanceOf(NotFound);
    await expect(readWithSteps(asUser(D), WORKSPACE_W_ID, shared)).rejects.toBeInstanceOf(
      Forbidden,
    );
  });

  it('is written exactly when its spell is', async () => {
    const shared = await seed(B, 'workspace', custom);
    const hidden = await seed(B, 'private', custom);
    const stepOf = async (spellId: string) =>
      (await readWithSteps(asUser(B), WORKSPACE_W_ID, spellId)).steps[0];

    // Why the refusals are the rule's: the author and the owner both write the shared one.
    await updateSpellStep(asUser(A), WORKSPACE_W_ID, shared, (await stepOf(shared)).id, {
      note: 'Owner note',
    });
    const added = await addSpellStep(asUser(B), WORKSPACE_W_ID, hidden, {
      name: 'Fixture Salt',
      form: 'coarse',
    });
    expect(added).toMatchObject({ position: 2, layerOrder: 2, spellId: hidden });

    const hiddenStep = await stepOf(hidden);
    await expect(
      updateSpellStep(asUser(A), WORKSPACE_W_ID, hidden, hiddenStep.id, { note: 'Sneaky' }),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(
      addSpellStep(asUser(A), WORKSPACE_W_ID, hidden, { name: 'Sneaky Salt' }),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(
      updateSpellStep(asUser(C), WORKSPACE_W_ID, shared, (await stepOf(shared)).id, {
        note: 'Viewer note',
      }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      addSpellStep(asUser(C), WORKSPACE_W_ID, shared, { name: 'Viewer Salt' }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      updateSpellStep(asUser(D), WORKSPACE_W_ID, hidden, hiddenStep.id, { note: 'Foreign' }),
    ).rejects.toBeInstanceOf(Forbidden);

    expect((await stepOf(hidden)).note).toBeNull();
    expect((await stepOf(shared)).note).toBe('Owner note');
    expect(
      (
        await sql`select count(*) from spell_steps where name like 'Viewer%' or name like 'Sneaky%'`
      )[0].count,
    ).toBe('0');
  });

  it('cannot be reached through another spell’s id', async () => {
    const mine = await seed(B, 'workspace', custom);
    const other = await seed(B, 'workspace', { title: 'Other Working', ...custom });
    const stepOfOther = (await readWithSteps(asUser(B), WORKSPACE_W_ID, other)).steps[0];

    await expect(
      updateSpellStep(asUser(B), WORKSPACE_W_ID, mine, stepOfOther.id, { note: 'Crossed' }),
    ).rejects.toBeInstanceOf(NotFound);
  });
});

describe('a linked step’s ingredient', () => {
  it('is read with its deleted mark after the ingredient was deleted', async () => {
    const live = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Fixture Leaf', nomenclature: 'none' }),
      B.id,
    );
    const gone = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Fixture Root', nomenclature: 'none' }),
      B.id,
    );
    const id = await seed(B, 'workspace', {
      steps: [{ ingredientId: live }, { ingredientId: gone }, { body: 'Stir.' }],
    });

    const before = await readWithSteps(asUser(C), WORKSPACE_W_ID, id);
    expect(before.steps.map((step) => step.ingredient?.deleted)).toEqual([false, false, undefined]);

    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;

    const after = await readWithSteps(asUser(C), WORKSPACE_W_ID, id);
    expect(after.steps).toEqual([
      expect.objectContaining({
        ingredient: expect.objectContaining({ id: live, deleted: false }),
      }),
      expect.objectContaining({
        ingredient: expect.objectContaining({ id: gone, name: 'Fixture Root', deleted: true }),
      }),
      expect.objectContaining({ body: 'Stir.', ingredient: null }),
    ]);
  });

  it('is withheld when the ingredient belongs to another coven', async () => {
    const foreign = await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: WORKSPACE_X_ID,
        name: 'Fixture Foreign',
        nomenclature: 'none',
      }),
      D.id,
    );
    const id = await seed(B, 'workspace', { steps: [{ ingredientId: foreign }] });

    const read = await readWithSteps(asUser(B), WORKSPACE_W_ID, id);
    expect(read.steps).toHaveLength(1);
    expect(read.steps[0].ingredient).toBeNull();
  });
});
