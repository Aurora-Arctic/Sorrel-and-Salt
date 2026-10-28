import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, StaleWrite, ValidationError } from '@/lib/errors';
import {
  addSpellStep,
  createSpell,
  readSpell,
  stepsOfSpells,
  updateSpell,
  updateSpellStep,
} from '@/modules/grimoire';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';
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
      expectedRevision: null,
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

  it('leaves the visibility alone when the update does not name it', async () => {
    const id = await seed(B, 'private');
    const updated = await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      title: 'Still Private',
    });
    expect(updated.visibility).toBe('private');
  });

  it('writes a changed note', async () => {
    const id = await seed(B);
    const updated = await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      note: 'New note',
    });
    expect(updated).toMatchObject({ note: 'New note' });
  });

  it('refuses a viewer on a spell they can read', async () => {
    const id = await seed(B);
    await expect(readSpell(asUser(C), WORKSPACE_W_ID, id)).resolves.toBeDefined();

    await expect(
      updateSpell(asUser(C), WORKSPACE_W_ID, id, { expectedRevision: null, title: 'Viewer Edit' }),
    ).rejects.toBeInstanceOf(Forbidden);
    expect((await sql`select title from spells where id = ${id}`)[0].title).not.toBe('Viewer Edit');
  });

  it('tells the owner a member’s private spell is not there, and leaves it alone', async () => {
    const id = await seed(B, 'private', { title: 'Mine Alone' });
    // Why the owner could have edited it: the owner may edit B's workspace spell.
    const other = await seed(B);
    await expect(
      updateSpell(asUser(A), WORKSPACE_W_ID, other, {
        expectedRevision: null,
        title: 'Owner Edit',
      }),
    ).resolves.toBeDefined();

    await expect(
      updateSpell(asUser(A), WORKSPACE_W_ID, id, { expectedRevision: null, title: 'Owner Edit' }),
    ).rejects.toBeInstanceOf(NotFound);
    expect((await sql`select title from spells where id = ${id}`)[0].title).toBe('Mine Alone');
  });

  it('refuses D by direct id at either visibility', async () => {
    const shared = await seed(B);
    const hidden = await seed(B, 'private');
    // Why this could have succeeded: D edits their own coven's spell.
    const own = await seed(D, 'workspace', {}, WORKSPACE_X_ID);
    await expect(
      updateSpell(asUser(D), WORKSPACE_X_ID, own, { expectedRevision: null, title: 'Own Edit' }),
    ).resolves.toBeDefined();

    for (const id of [shared, hidden]) {
      await expect(
        updateSpell(asUser(D), WORKSPACE_W_ID, id, {
          expectedRevision: null,
          title: 'Foreign Edit',
        }),
      ).rejects.toBeInstanceOf(Forbidden);
      // Naming X as the coven does not open W's row either.
      await expect(
        updateSpell(asUser(D), WORKSPACE_X_ID, id, {
          expectedRevision: null,
          title: 'Foreign Edit',
        }),
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

// M10.10: a save writes the spell's fields and its whole recipe, one ordered
// list of steps, in one transaction. What each test asserts is the rows the
// save left behind, read raw, tombstones included.

/** An ingredient in `workspaceId` (null: the compendium) with one form, `Testform`: its ids. */
async function ingredientWithForm(
  name: string,
  workspaceId: string | null = WORKSPACE_W_ID,
  author: typeof A = workspaceId === WORKSPACE_X_ID ? D : B,
): Promise<{ ingredientId: string; variantId: string }> {
  const ingredientId = await insertIngredient(
    sql,
    makeIngredient({ workspaceId, name, nomenclature: 'none', variants: [makeVariant()] }),
    // The compendium's rows are the admin's to write.
    workspaceId === null ? E.id : author.id,
  );
  return { ingredientId, variantId: await variantIdOf(sql, ingredientId, 'Testform') };
}

/** Every step row of the spell, live and tombstoned, by the place each was given. */
function stepRowsOf(spellId: string) {
  return sql`
    select id, position, layer_order, body, ingredient_id, variant_id, name, form, quantity,
      unit, note, deleted_at, deleted_by
    from spell_steps where spell_id = ${spellId} order by position, id`;
}

/** The live steps in recipe order, as a reader sees them. */
async function liveRecipe(spellId: string, user: typeof A = B) {
  return (await readWithSteps(asUser(user), WORKSPACE_W_ID, spellId)).steps;
}

const revisionOf = async (spellId: string): Promise<number> =>
  (await sql`select revision from spells where id = ${spellId}`)[0].revision as number;

describe('createSpell, with its recipe', () => {
  it('makes a draft with nothing but a draft status, and none of the fields', async () => {
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, { status: 'draft' });
    expect(spell).toMatchObject({ title: null, status: 'draft', revision: 1 });
    expect(await stepRowsOf(spell.id)).toHaveLength(0);
  });

  it('refuses a complete spell with no title, and writes nothing', async () => {
    // Why it could have succeeded: the same spell with a title is written.
    await expect(
      createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Named', status: 'complete' }),
    ).resolves.toMatchObject({ status: 'complete' });
    const before = await countSpells();

    await expect(
      createSpell(asUser(B), WORKSPACE_W_ID, { status: 'complete' }),
    ).rejects.toMatchObject({ issues: [{ path: ['title'] }] });
    expect(await countSpells()).toBe(before);
  });

  it('writes the spell’s fields, its note alone and never the old instructions column', async () => {
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Hearth Ward',
      intent: 'Keep the hearth safe',
      jarSize: 'Small',
      sealWaxColor: 'Red',
      moonPhase: 'Waxing',
      dayOfWeek: 'Sunday',
      note: 'Do it at dusk.',
    });

    const [row] = await sql`select * from spells where id = ${spell.id}`;
    expect(row).toMatchObject({
      intent: 'Keep the hearth safe',
      jar_size: 'Small',
      seal_wax_color: 'Red',
      moon_phase: 'Waxing',
      day_of_week: 'Sunday',
      note: 'Do it at dusk.',
      instructions: null,
    });
  });

  it('writes the steps in the order given, each place in position and layer_order alike', async () => {
    const coven = await ingredientWithForm('Fixture Leaf');
    const compendium = await ingredientWithForm('Fixture Compendium Root', null);

    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Layered Jar',
      steps: [
        { body: 'Cleanse the jar.' },
        { ...coven, quantity: 2, unit: 'tsp', note: 'Packed down', body: 'Lay the leaf.' },
        { name: 'Fixture Pebble', form: 'whole' },
        compendium,
      ],
    });

    const rows = await stepRowsOf(spell.id);
    expect(rows.map((row) => [row.position, row.layer_order])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
    expect(rows[1]).toMatchObject({
      ingredient_id: coven.ingredientId,
      variant_id: coven.variantId,
      quantity: '2.000',
      unit: 'tsp',
      note: 'Packed down',
      body: 'Lay the leaf.',
    });
    // The instruction-only step reads back in its place.
    const recipe = await liveRecipe(spell.id);
    expect(recipe.map((step) => step.body ?? step.name ?? step.ingredient?.name)).toEqual([
      'Cleanse the jar.',
      'Lay the leaf.',
      'Fixture Pebble',
      'Fixture Compendium Root',
    ]);
    expect(recipe[0]).toMatchObject({ ingredient: null, name: null });
  });

  it.each([
    ['both an ingredient and a name', { name: 'Fixture Both' }, 'name'],
    ['a form id without an ingredient', { ingredientId: null }, 'variantId'],
  ])('refuses a step with %s, and writes nothing', async (_what, change, field) => {
    const linked = await ingredientWithForm('Fixture Leaf');
    const before = await countSpells();

    await expect(
      createSpell(asUser(B), WORKSPACE_W_ID, {
        title: 'Muddled',
        steps: [{ ...linked, body: 'Lay it.', ...change }],
      }),
    ).rejects.toMatchObject({ issues: [{ path: ['steps', 0, field] }] });
    expect(await countSpells()).toBe(before);
  });

  it('refuses a step with neither an ingredient nor an instruction', async () => {
    await expect(
      createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Empty Step', steps: [{ quantity: 1 }] }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await countSpells()).toBe(0);
  });

  it('refuses a link to a deleted ingredient, a deleted form, or another coven’s ingredient', async () => {
    const live = await ingredientWithForm('Fixture Leaf');
    // Why each could have succeeded: the same step linking a live coven
    // ingredient is written.
    await expect(
      createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Live Link', steps: [live] }),
    ).resolves.toBeDefined();

    const deleted = await ingredientWithForm('Fixture Gone');
    await sql`update ingredients set deleted_at = now(), deleted_by = ${B.id} where id = ${deleted.ingredientId}`;
    const formGone = await ingredientWithForm('Fixture Formless');
    await sql`update ingredient_variants set deleted_at = now(), deleted_by = ${B.id} where id = ${formGone.variantId}`;
    const foreign = await ingredientWithForm('Fixture Foreign', WORKSPACE_X_ID);
    // A real form, but of another ingredient than the step names.
    const mismatched = { ingredientId: live.ingredientId, variantId: foreign.variantId };
    const before = await countSpells();

    for (const link of [deleted, formGone, foreign, mismatched]) {
      await expect(
        createSpell(asUser(B), WORKSPACE_W_ID, {
          title: 'Bad Link',
          steps: [{ body: 'Begin.' }, link],
        }),
      ).rejects.toMatchObject({ issues: [{ path: ['steps', 1, 'ingredientId'] }] });
    }
    expect(await countSpells()).toBe(before);
  });
});

describe('updateSpell, with its recipe', () => {
  /** A spell B wrote through the service, so its steps are what a save writes. */
  async function saved(steps: Parameters<typeof createSpell>[2]['steps']) {
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Working Jar', steps });
    const ids = (await liveRecipe(spell.id)).map((step) => step.id);
    return { id: spell.id, ids, revision: spell.revision };
  }

  it('adds and removes steps in one save, tombstoning the removed one', async () => {
    const { id, ids, revision } = await saved([
      { body: 'One' },
      { name: 'Fixture Pebble' },
      { body: 'Three' },
    ]);

    const updated = await updateSpell(asUser(A), WORKSPACE_W_ID, id, {
      expectedRevision: revision,
      steps: [{ id: ids[0], body: 'One' }, { body: 'New' }, { id: ids[2], body: 'Three' }],
    });

    expect(updated.revision).toBe(revision + 1);
    const rows = await stepRowsOf(id);
    const removed = rows.find((row) => row.id === ids[1]);
    expect(removed).toMatchObject({ name: 'Fixture Pebble', deleted_by: A.id });
    expect(removed?.deleted_at).not.toBeNull();
    expect((await liveRecipe(id)).map((step) => [step.id, step.body, step.position])).toEqual([
      [ids[0], 'One', 1],
      [expect.any(String), 'New', 2],
      [ids[2], 'Three', 3],
    ]);
  });

  it('reorders the steps, position and layer_order following the new order', async () => {
    const { id, ids } = await saved([{ body: 'One' }, { body: 'Two' }, { body: 'Three' }]);

    await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      steps: [
        { id: ids[2], body: 'Three' },
        { id: ids[0], body: 'One' },
        { id: ids[1], body: 'Two, reworded' },
      ],
    });

    const live = (await stepRowsOf(id)).filter((row) => row.deleted_at === null);
    const byId = new Map(live.map((row) => [row.id, row]));
    expect([ids[2], ids[0], ids[1]].map((step) => byId.get(step))).toEqual([
      expect.objectContaining({ position: 1, layer_order: 1, body: 'Three' }),
      expect.objectContaining({ position: 2, layer_order: 2, body: 'One' }),
      expect.objectContaining({ position: 3, layer_order: 3, body: 'Two, reworded' }),
    ]);
  });

  it('reorders linked, one-off and instruction steps alike, moving each row in place', async () => {
    const leaf = await ingredientWithForm('Fixture Leaf');
    const { id, ids } = await saved([leaf, { name: 'Fixture Pebble' }, { body: 'Stir.' }]);

    await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      steps: [
        { id: ids[2], body: 'Stir.' },
        { id: ids[0], ...leaf },
        { id: ids[1], name: 'Fixture Pebble' },
      ],
    });

    // The same three rows, none soft-deleted and none added: a move, never a
    // Remove and a fresh Add, which would leave a tombstone behind.
    const rows = await stepRowsOf(id);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.deleted_at === null)).toBe(true);
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect([ids[2], ids[0], ids[1]].map((step) => byId.get(step))).toEqual([
      expect.objectContaining({ position: 1, layer_order: 1, body: 'Stir.' }),
      expect.objectContaining({ position: 2, layer_order: 2, variant_id: leaf.variantId }),
      expect.objectContaining({ position: 3, layer_order: 3, name: 'Fixture Pebble' }),
    ]);
  });

  it('swaps two steps’ ingredients without tripping the one-form-per-jar index', async () => {
    const leaf = await ingredientWithForm('Fixture Leaf');
    const root = await ingredientWithForm('Fixture Root');
    const { id, ids } = await saved([leaf, { name: 'Fixture Pebble' }, root]);

    await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      steps: [
        { id: ids[0], ...root },
        { id: ids[1], name: 'Fixture Shell' },
        { id: ids[2], ...leaf },
      ],
    });

    expect((await liveRecipe(id)).map((step) => [step.id, step.variantId ?? step.name])).toEqual([
      [ids[0], root.variantId],
      [ids[1], 'Fixture Shell'],
      [ids[2], leaf.variantId],
    ]);
  });

  it('keeps a step whose ingredient was deleted since, and refuses a new link to it', async () => {
    const gone = await ingredientWithForm('Fixture Root');
    const { id, ids } = await saved([{ body: 'Begin.' }, gone]);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone.ingredientId}`;

    await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      steps: [
        { id: ids[1], ...gone, note: 'Kept' },
        { id: ids[0], body: 'Begin.' },
      ],
    });
    expect((await liveRecipe(id)).map((step) => [step.id, step.ingredient?.deleted])).toEqual([
      [ids[1], true],
      [ids[0], undefined],
    ]);

    // The same link, on a step the save adds, is refused and nothing changes.
    const before = await revisionOf(id);
    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, id, {
        expectedRevision: null,
        steps: [{ body: 'Begin.' }, gone],
      }),
    ).rejects.toMatchObject({ issues: [{ path: ['steps', 1, 'ingredientId'] }] });
    expect(await revisionOf(id)).toBe(before);
  });

  it('refuses a saved step relinked to another coven’s ingredient', async () => {
    const leaf = await ingredientWithForm('Fixture Leaf');
    const root = await ingredientWithForm('Fixture Root');
    const foreign = await ingredientWithForm('Fixture Foreign', WORKSPACE_X_ID);
    const { id, ids } = await saved([leaf]);
    // Why it could have succeeded: relinking the step to W's own root is written.
    await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      steps: [{ id: ids[0], ...root }],
    });

    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, id, {
        expectedRevision: null,
        steps: [{ id: ids[0], ...foreign }],
      }),
    ).rejects.toMatchObject({ issues: [{ path: ['steps', 0, 'ingredientId'] }] });
    expect((await liveRecipe(id))[0].variantId).toBe(root.variantId);
  });

  it('refuses a step id that is not one of this spell’s live steps', async () => {
    const { id, ids } = await saved([{ body: 'One' }, { body: 'Two' }]);
    const other = await saved([{ body: 'Elsewhere' }]);
    await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      steps: [{ id: ids[0], body: 'One' }],
    });

    for (const stepId of [other.ids[0], ids[1]]) {
      await expect(
        updateSpell(asUser(B), WORKSPACE_W_ID, id, {
          expectedRevision: null,
          steps: [{ id: stepId, body: 'Hijack' }],
        }),
      ).rejects.toMatchObject({ issues: [{ path: ['steps', 0, 'id'] }] });
    }
    expect((await liveRecipe(other.id)).map((step) => step.body)).toEqual(['Elsewhere']);
  });

  it('leaves the recipe alone when the save names no steps', async () => {
    const { id, ids } = await saved([{ body: 'One' }]);
    await updateSpell(asUser(B), WORKSPACE_W_ID, id, { expectedRevision: null, note: 'Only this' });
    expect((await liveRecipe(id)).map((step) => step.id)).toEqual(ids);
  });

  it('writes the note alone, leaving the old instructions column as it was', async () => {
    const { id } = await saved([]);
    // A row the deploy before M13.1 wrote, whose old column holds text.
    await sql`update spells set instructions = 'Old words' where id = ${id}`;
    await updateSpell(asUser(B), WORKSPACE_W_ID, id, { expectedRevision: null, note: 'At dusk' });
    const [row] = await sql`select note, instructions from spells where id = ${id}`;
    expect(row).toEqual({ note: 'At dusk', instructions: 'Old words' });
  });

  it('lets a draft drop its title and refuses completing without one', async () => {
    const { id } = await saved([]);
    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, id, { expectedRevision: null, title: null }),
    ).resolves.toMatchObject({ title: null, status: 'draft' });

    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, id, { expectedRevision: null, status: 'complete' }),
    ).rejects.toMatchObject({ issues: [{ path: ['title'] }] });
    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, id, {
        expectedRevision: null,
        title: 'Named',
        status: 'complete',
      }),
    ).resolves.toMatchObject({ status: 'complete' });
  });

  it('throws StaleWrite on a revision the spell has moved past, and writes nothing', async () => {
    const { id, ids, revision } = await saved([{ body: 'One' }]);
    // Why it could have succeeded: the revision the spell was loaded at is current.
    const first = await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: revision,
      title: 'First Save',
    });

    const stale = updateSpell(asUser(A), WORKSPACE_W_ID, id, {
      expectedRevision: revision,
      title: 'Second Save',
      steps: [{ body: 'Replaced' }],
    });
    await expect(stale).rejects.toBeInstanceOf(StaleWrite);
    await expect(stale).rejects.toMatchObject({ currentRevision: first.revision });
    expect(await revisionOf(id)).toBe(first.revision);
    expect((await liveRecipe(id)).map((step) => step.id)).toEqual(ids);

    // Null overwrites without checking: "Keep My Version".
    await expect(
      updateSpell(asUser(A), WORKSPACE_W_ID, id, { expectedRevision: null, title: 'Kept' }),
    ).resolves.toMatchObject({ title: 'Kept', revision: first.revision + 1 });
  });

  it('refuses a viewer by direct id, touching neither the spell nor its steps', async () => {
    const { id, ids } = await saved([{ body: 'One' }]);
    // Why it could have succeeded: C reads the spell, and a member's identical
    // save is written.
    await expect(readSpell(asUser(C), WORKSPACE_W_ID, id)).resolves.toBeDefined();
    const save = { expectedRevision: null, title: 'Edited', steps: [{ body: 'Replaced' }] };
    const other = await saved([{ body: 'One' }]);
    await expect(updateSpell(asUser(B), WORKSPACE_W_ID, other.id, save)).resolves.toBeDefined();
    const before = await revisionOf(id);

    await expect(updateSpell(asUser(C), WORKSPACE_W_ID, id, save)).rejects.toBeInstanceOf(
      Forbidden,
    );
    expect(await revisionOf(id)).toBe(before);
    expect((await liveRecipe(id)).map((step) => [step.id, step.body])).toEqual([[ids[0], 'One']]);
  });

  it('widens a private spell and refuses to narrow a shared one, saying why', async () => {
    const hidden = await createSpell(asUser(B), WORKSPACE_W_ID, { visibility: 'private' });
    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, hidden.id, {
        expectedRevision: null,
        visibility: 'workspace',
      }),
    ).resolves.toMatchObject({ visibility: 'workspace' });

    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, hidden.id, {
        expectedRevision: null,
        visibility: 'private',
      }),
    ).rejects.toThrow(/cannot be made private again/);
    expect((await sql`select visibility from spells where id = ${hidden.id}`)[0].visibility).toBe(
      'workspace',
    );
  });
});

describe('a spell’s assigned categories', () => {
  // A test here soft-deletes a seeded category; the next one finds it live.
  afterEach(async () => {
    await sql`update categories set deleted_at = null, deleted_by = null where deleted_at is not null`;
  });

  const idOf = async (name: string): Promise<string> =>
    (await sql`select id from categories where name = ${name} and deleted_at is null`)[0].id;

  /** The spell's assigned categories by name, read raw, so a soft-deleted one shows too. */
  const assigned = async (spellId: string): Promise<string[]> =>
    (
      await sql`
        select categories.name from spell_categories
        join categories on categories.id = spell_categories.category_id
        where spell_categories.spell_id = ${spellId}
        order by categories.name`
    ).map((row) => row.name as string);

  it('writes the categories a new spell names, a repeat once, stamped with the author', async () => {
    const protection = await idOf('Protection');
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Hearth Jar',
      categoryIds: [protection, await idOf('Warding'), protection],
    });
    expect(await assigned(spell.id)).toEqual(['Protection', 'Warding']);
    const stamps = await sql`select created_by from spell_categories where spell_id = ${spell.id}`;
    expect(stamps.map((row) => row.created_by)).toEqual([B.id, B.id]);
  });

  it('assigns none when a new spell names none', async () => {
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Bare Jar' });
    expect(await assigned(spell.id)).toEqual([]);
  });

  it('brings the set to exactly the ids an update names, and leaves it when it names none', async () => {
    const id = await seed(B, 'workspace', { categories: ['Protection', 'Warding'] });

    await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      categoryIds: [await idOf('Warding'), await idOf('Release')],
    });
    expect(await assigned(id)).toEqual(['Release', 'Warding']);

    await updateSpell(asUser(B), WORKSPACE_W_ID, id, { expectedRevision: null, title: 'Renamed' });
    expect(await assigned(id)).toEqual(['Release', 'Warding']);

    await updateSpell(asUser(B), WORKSPACE_W_ID, id, { expectedRevision: null, categoryIds: [] });
    expect(await assigned(id)).toEqual([]);
  });

  it('refuses an id naming no live category, at its index, and writes nothing', async () => {
    const id = await seed(B, 'workspace', { title: 'Untouched', categories: ['Protection'] });
    const retired = await idOf('Cleansing');
    await sql`update categories set deleted_at = now(), deleted_by = ${E.id} where id = ${retired}`;
    const unknown = '44444444-4444-4444-8444-444444444444';

    const save = updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      title: 'Edited',
      categoryIds: [await idOf('Warding'), retired, unknown],
    });
    await expect(save).rejects.toBeInstanceOf(ValidationError);
    await expect(save).rejects.toMatchObject({
      issues: [
        { path: ['categoryIds', 1], message: expect.stringMatching(/No such category/) },
        { path: ['categoryIds', 2], message: expect.stringMatching(/No such category/) },
      ],
    });
    expect(await assigned(id)).toEqual(['Protection']);
    expect((await sql`select title from spells where id = ${id}`)[0].title).toBe('Untouched');

    await expect(
      createSpell(asUser(B), WORKSPACE_W_ID, { categoryIds: [unknown] }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await countSpells()).toBe(1);
  });

  it('keeps a pair whose category was deleted since, for a restore to bring back', async () => {
    const id = await seed(B, 'workspace', { categories: ['Protection', 'Warding'] });
    await sql`update categories set deleted_at = now(), deleted_by = ${E.id} where name = 'Warding'`;

    // The builder never shows the deleted category, so its save leaves it out.
    await updateSpell(asUser(B), WORKSPACE_W_ID, id, {
      expectedRevision: null,
      categoryIds: [await idOf('Release')],
    });
    expect(await assigned(id)).toEqual(['Release', 'Warding']);
  });

  it('refuses a viewer by direct id, and leaves the categories as they were', async () => {
    const id = await seed(B, 'workspace', { categories: ['Protection'] });
    const save = { expectedRevision: null, categoryIds: [await idOf('Release')] };
    // Why it could have succeeded: C reads the spell, and a member's identical
    // save is written.
    await expect(readSpell(asUser(C), WORKSPACE_W_ID, id)).resolves.toBeDefined();
    const other = await seed(B, 'workspace', { categories: ['Protection'] });
    await updateSpell(asUser(B), WORKSPACE_W_ID, other, save);
    expect(await assigned(other)).toEqual(['Release']);

    await expect(updateSpell(asUser(C), WORKSPACE_W_ID, id, save)).rejects.toBeInstanceOf(
      Forbidden,
    );
    expect(await assigned(id)).toEqual(['Protection']);
  });

  it('refuses a member of another coven by direct id, naming either coven', async () => {
    const id = await seed(B, 'workspace', { categories: ['Protection'] });
    const save = { expectedRevision: null, categoryIds: [await idOf('Release')] };
    // Why this could have succeeded: D assigns categories to their own coven's
    // spell with the same save.
    const own = await seed(D, 'workspace', {}, WORKSPACE_X_ID);
    await updateSpell(asUser(D), WORKSPACE_X_ID, own, save);
    expect(await assigned(own)).toEqual(['Release']);

    await expect(updateSpell(asUser(D), WORKSPACE_W_ID, id, save)).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(updateSpell(asUser(D), WORKSPACE_X_ID, id, save)).rejects.toBeInstanceOf(NotFound);
    expect(await assigned(id)).toEqual(['Protection']);
  });
});
