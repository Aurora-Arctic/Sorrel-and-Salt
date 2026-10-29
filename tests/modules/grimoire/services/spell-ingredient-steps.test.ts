import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import { createSpell, readSpell, updateSpell } from '@/modules/grimoire';
import { B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// The spell builder's Add to Jar: a step names an ingredient and the form laid, as the ingredient and variant ids, and never the coven's cupboard entry or jar of it.
// Every assertion reads the rows a save left behind, raw.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

interface Form {
  ingredientId: string;
  variantId: string;
}

/** An ingredient in `workspaceId` (null: the compendium) with one form, `Testform`. */
async function formOf(
  name: string,
  workspaceId: string | null = null,
  author = workspaceId === null ? E : workspaceId === WORKSPACE_X_ID ? D : B,
): Promise<Form> {
  const ingredientId = await insertIngredient(
    sql,
    makeIngredient({ workspaceId, name, nomenclature: 'none', variants: [makeVariant()] }),
    author.id,
  );
  return { ingredientId, variantId: await variantIdOf(sql, ingredientId, 'Testform') };
}

/** Every step row of the spell, live and tombstoned, in place order. */
const stepRowsOf = (spellId: string) =>
  sql`
    select * from spell_steps where spell_id = ${spellId} order by position, id`;

const liveStepsOf = (spellId: string) =>
  sql`
    select id, ingredient_id, variant_id, name, form from spell_steps
    where spell_id = ${spellId} and deleted_at is null order by position`;

const revisionOf = async (spellId: string): Promise<number> =>
  (await sql`select revision from spells where id = ${spellId}`)[0].revision as number;

const countIngredients = async (): Promise<number> =>
  Number((await sql`select count(*) from ingredients`)[0].count);

describe('an ingredient step', () => {
  it('saves the ingredient and form ids, and never the cupboard entry or jar it was picked from', async () => {
    const rosewort = await formOf('Fixture Rosewort');
    const cupboardId = await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: rosewort.ingredientId },
      B.id,
    );
    const jarId = await insertStock(
      sql,
      { workspaceId: WORKSPACE_W_ID, ...rosewort, quantityOnHand: '20', unit: 'g' },
      B.id,
    );

    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Fixture Working',
      steps: [{ ...rosewort, quantity: 2, unit: 'g' }],
    });

    const [row] = await stepRowsOf(spell.id);
    expect(row).toMatchObject({
      ingredient_id: rosewort.ingredientId,
      variant_id: rosewort.variantId,
      name: null,
    });
    // No column of the row holds the cupboard entry's id or the jar's.
    expect(Object.values(row)).not.toContain(cupboardId);
    expect(Object.values(row)).not.toContain(jarId);
    // Nor could one: no key of the table points at either.
    const targets = await sql<{ target: string }[]>`
      select confrelid::regclass::text as target from pg_constraint
      where conrelid = 'spell_steps'::regclass and contype = 'f'`;
    const tables = targets.map((t) => t.target);
    expect(tables).toContain('ingredients');
    expect(tables).not.toContain('inventory_items');
    expect(tables).not.toContain('workspace_compendium_entries');
  });

  it('adds a live compendium form the coven’s cupboard does not name', async () => {
    const rosewort = await formOf('Fixture Rosewort');
    // Why it is worth asserting: the coven's cupboard holds no entry for it.
    const [{ count }] = await sql`
      select count(*) from workspace_compendium_entries
      where ingredient_id = ${rosewort.ingredientId}`;
    expect(Number(count)).toBe(0);

    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Fixture Working',
      steps: [rosewort],
    });

    expect(await liveStepsOf(spell.id)).toMatchObject([
      { ingredient_id: rosewort.ingredientId, variant_id: rosewort.variantId },
    ]);
  });

  it('keeps a retired form already in the spell, and refuses adding it again', async () => {
    const rosewort = await formOf('Fixture Rosewort');
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Fixture Working',
      steps: [rosewort],
    });
    const [saved] = await liveStepsOf(spell.id);
    await sql`
      update ingredient_variants set deleted_at = now(), deleted_by = ${E.id}
      where id = ${rosewort.variantId}`;

    // The saved step comes back with the save and is kept.
    await updateSpell(asUser(B), WORKSPACE_W_ID, spell.id, {
      expectedRevision: null,
      steps: [{ id: saved.id as string, ...rosewort, quantity: 3, unit: 'g' }],
    });
    expect((await liveStepsOf(spell.id)).map((row) => row.id)).toEqual([saved.id]);

    // The same form on a new step is refused, and the recipe is left alone.
    const before = await revisionOf(spell.id);
    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, spell.id, {
        expectedRevision: null,
        steps: [rosewort],
      }),
    ).rejects.toMatchObject({ issues: [{ path: ['steps', 0, 'ingredientId'] }] });
    expect(await revisionOf(spell.id)).toBe(before);
    expect((await liveStepsOf(spell.id)).map((row) => row.id)).toEqual([saved.id]);
  });

  it('refuses a form the coven holds of a retired entry as a new layer, and keeps one already laid', async () => {
    // A live form beneath a soft-deleted compendium entry, as migration 0090
    // leaves a form a coven holds, and the coven's cupboard row naming it.
    const rosewort = await formOf('Fixture Rosewort');
    const cupboard = await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: rosewort.ingredientId },
      B.id,
    );
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Fixture Working',
      steps: [rosewort],
    });
    const [saved] = await liveStepsOf(spell.id);
    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${E.id}
      where id = ${rosewort.ingredientId}`;

    // Why access could have succeeded: the coven's cupboard row is live, and
    // so is the form; only the entry is retired.
    const [held] =
      await sql`select deleted_at from workspace_compendium_entries where id = ${cupboard}`;
    const [form] =
      await sql`select deleted_at from ingredient_variants where id = ${rosewort.variantId}`;
    const [entry] =
      await sql`select deleted_at from ingredients where id = ${rosewort.ingredientId}`;
    expect(held.deleted_at).toBeNull();
    expect(form.deleted_at).toBeNull();
    expect(entry.deleted_at).not.toBeNull();

    // The step already laid comes back with the save and is kept.
    await updateSpell(asUser(B), WORKSPACE_W_ID, spell.id, {
      expectedRevision: null,
      steps: [{ id: saved.id as string, ...rosewort, quantity: 3, unit: 'g' }],
    });
    expect((await liveStepsOf(spell.id)).map((row) => row.id)).toEqual([saved.id]);

    // The same form as a new step, on this spell or a new one, is refused.
    const before = await revisionOf(spell.id);
    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, spell.id, {
        expectedRevision: null,
        steps: [{ id: saved.id as string, ...rosewort }, rosewort],
      }),
    ).rejects.toMatchObject({ issues: [{ path: ['steps', 1, 'ingredientId'] }] });
    expect(await revisionOf(spell.id)).toBe(before);
    await expect(
      createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Fixture Second', steps: [rosewort] }),
    ).rejects.toMatchObject({ issues: [{ path: ['steps', 0, 'ingredientId'] }] });
  });

  it('lays one form in several steps, and keeps each through a reorder and a later save', async () => {
    const rosewort = await formOf('Fixture Rosewort');
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Fixture Working',
      steps: [
        { ...rosewort, quantity: 2, unit: 'g' },
        { body: 'Stir' },
        { ...rosewort, quantity: 5, unit: 'g' },
      ],
    });

    const saved = await liveStepsOf(spell.id);
    expect(saved).toHaveLength(3);
    expect(saved.filter((row) => row.variant_id === rosewort.variantId)).toHaveLength(2);

    // Swapped ends: both rows move through the same form at once.
    const [first, stir, last] = saved.map((row) => row.id as string);
    await updateSpell(asUser(B), WORKSPACE_W_ID, spell.id, {
      expectedRevision: null,
      steps: [
        { id: last, ...rosewort, quantity: 5, unit: 'g' },
        { id: stir, body: 'Stir' },
        { id: first, ...rosewort, quantity: 2, unit: 'g' },
      ],
    });
    expect((await liveStepsOf(spell.id)).map((row) => row.id)).toEqual([last, stir, first]);
  });

  it('as a one-off name and form, writes no ingredients row', async () => {
    const before = await countIngredients();

    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Fixture Working',
      steps: [{ name: 'Testwort', form: 'Dried Root' }],
    });

    expect(await liveStepsOf(spell.id)).toMatchObject([
      { ingredient_id: null, variant_id: null, name: 'Testwort', form: 'Dried Root' },
    ]);
    expect(await countIngredients()).toBe(before);
  });
});

describe('adding an ingredient step by direct id', () => {
  it('is refused to a member of another coven, through either coven’s id', async () => {
    const rosewort = await formOf('Fixture Rosewort');
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Fixture Working' });
    // Why it could have succeeded: D lays the same compendium form in their
    // own coven's spell, and B lays it in this one.
    const own = await createSpell(asUser(D), WORKSPACE_X_ID, { title: 'Fixture Own' });
    await updateSpell(asUser(D), WORKSPACE_X_ID, own.id, {
      expectedRevision: null,
      steps: [rosewort],
    });
    expect(await liveStepsOf(own.id)).toHaveLength(1);
    const twin = await createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Fixture Twin' });
    await updateSpell(asUser(B), WORKSPACE_W_ID, twin.id, {
      expectedRevision: null,
      steps: [rosewort],
    });
    expect(await liveStepsOf(twin.id)).toHaveLength(1);
    const before = await revisionOf(spell.id);

    await expect(
      updateSpell(asUser(D), WORKSPACE_W_ID, spell.id, {
        expectedRevision: null,
        steps: [rosewort],
      }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      updateSpell(asUser(D), WORKSPACE_X_ID, spell.id, {
        expectedRevision: null,
        steps: [rosewort],
      }),
    ).rejects.toBeInstanceOf(NotFound);

    expect(await revisionOf(spell.id)).toBe(before);
    expect(await stepRowsOf(spell.id)).toHaveLength(0);
  });

  it('is refused to a viewer of the spell’s own coven', async () => {
    const rosewort = await formOf('Fixture Rosewort');
    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Fixture Working' });
    // Why it could have succeeded: C reads the spell, and B's identical save
    // is written.
    await expect(readSpell(asUser(C), WORKSPACE_W_ID, spell.id)).resolves.toBeDefined();
    const twin = await createSpell(asUser(B), WORKSPACE_W_ID, { title: 'Fixture Twin' });
    await updateSpell(asUser(B), WORKSPACE_W_ID, twin.id, {
      expectedRevision: null,
      steps: [rosewort],
    });
    expect(await liveStepsOf(twin.id)).toHaveLength(1);
    const before = await revisionOf(spell.id);

    await expect(
      updateSpell(asUser(C), WORKSPACE_W_ID, spell.id, {
        expectedRevision: null,
        steps: [rosewort],
      }),
    ).rejects.toBeInstanceOf(Forbidden);

    expect(await revisionOf(spell.id)).toBe(before);
    expect(await stepRowsOf(spell.id)).toHaveLength(0);
  });
});
