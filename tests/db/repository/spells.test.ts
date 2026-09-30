import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import {
  findIngredientsInSpellsIncludingSoftDeleted,
  findManyOfIngredients,
  findManyOfSpellIngredientsIncludingSoftDeleted,
  findOneIngredient,
} from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import { ingredientCategories } from '@/modules/ingredients/schema/ingredient-categories';
import { ingredientFolkNames } from '@/modules/ingredients/schema/ingredient-folk-names';
import { A, B, C, D, E, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { insertSpell } from '../../support/db/insert-spell';
import { makeIngredient, makeSpell } from '../../support/fixtures';

// What a spell holds, read past a tombstone: a spell is a record of a working,
// so an ingredient deleted after it went into the jar is still in it — and
// its categories still count — for everyone who may read the spell and nobody
// else (claude-docs/db.md, "What a spell holds"). Every row a result could
// come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** A real proof, minted against the seeded cast: there is no other way to get one. */
const proofFor = (user: typeof A, workspaceId: string = WORKSPACE_W_ID): Promise<Membership> =>
  assertMembership(asUser(user), workspaceId, { spell: ['read'] });

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

const softDelete = (table: 'ingredients' | 'spells', id: string) =>
  sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

/** A compendium entry, filed under Protection, with a live and a removed folk name. */
async function entry(): Promise<string> {
  const id = await insertIngredient(
    sql,
    makeIngredient({ folkNames: ['Test Root', 'Gone Root'], categories: ['Protection'] }),
    E.id,
  );
  await sql`
    update ingredient_folk_names set deleted_at = now(), deleted_by = ${E.id}
    where ingredient_id = ${id} and name = 'Gone Root'`;
  return id;
}

/** A coven's own ingredient, filed under Cleansing. */
const local = (workspaceId: string, author: typeof A) =>
  insertIngredient(
    sql,
    makeIngredient({
      workspaceId,
      name: 'Fixture Leaf',
      nomenclature: 'none',
      categories: ['Cleansing'],
    }),
    author.id,
  );

/** A spell in W holding these ingredients, one layer each, written by `author`. */
const spellHolding = (
  ingredientIds: string[],
  { author = B, visibility = 'workspace' as 'workspace' | 'private' } = {},
) =>
  insertSpell(
    sql,
    makeSpell({ visibility, layers: ingredientIds.map((ingredientId) => ({ ingredientId })) }),
    author.id,
  );

const idsOf = (rows: { id: string }[]) => rows.map((row) => row.id).sort();

describe('findIngredientsInSpellsIncludingSoftDeleted', () => {
  it('hands every member what a shared spell holds, a deleted ingredient tombstone and all', async () => {
    const entryId = await entry();
    const localId = await local(WORKSPACE_W_ID, A);
    await spellHolding([entryId, localId]);
    await softDelete('ingredients', localId);
    // Why only this finder could answer it: every other read has let it go.
    await expect(findOneIngredient([await proofFor(A)], localId)).resolves.toBeUndefined();

    for (const reader of [A, B, C]) {
      const held = await findIngredientsInSpellsIncludingSoftDeleted(await proofFor(reader), [
        entryId,
        localId,
      ]);

      expect(idsOf(held)).toEqual([entryId, localId].sort());
      expect(held.find((row) => row.id === localId)?.deletedAt).toBeInstanceOf(Date);
      expect(held.find((row) => row.id === entryId)?.deletedAt).toBeNull();
    }
  });

  it('answers a deleted compendium entry the same way', async () => {
    const entryId = await entry();
    await spellHolding([entryId]);
    await softDelete('ingredients', entryId);

    const held = await findIngredientsInSpellsIncludingSoftDeleted(await proofFor(C), [entryId]);

    expect(held).toEqual([expect.objectContaining({ id: entryId, deletedBy: A.id })]);
  });

  it('withholds an ingredient no spell holds, deleted or not', async () => {
    const localId = await local(WORKSPACE_W_ID, A);
    // Why it could have been answered: the row is W's, and W's member reads it.
    await expect(findOneIngredient([await proofFor(B)], localId)).resolves.toMatchObject({
      id: localId,
    });

    await expect(
      findIngredientsInSpellsIncludingSoftDeleted(await proofFor(B), [localId]),
    ).resolves.toEqual([]);
    await softDelete('ingredients', localId);
    await expect(
      findIngredientsInSpellsIncludingSoftDeleted(await proofFor(B), [localId]),
    ).resolves.toEqual([]);
  });

  it('withholds what a private spell holds from every member but its author, the owner included', async () => {
    const localId = await local(WORKSPACE_W_ID, A);
    await spellHolding([localId], { author: B, visibility: 'private' });
    await softDelete('ingredients', localId);

    // Why it could have been answered: the author is handed it.
    await expect(
      findIngredientsInSpellsIncludingSoftDeleted(await proofFor(B), [localId]),
    ).resolves.toHaveLength(1);

    for (const reader of [A, C]) {
      await expect(
        findIngredientsInSpellsIncludingSoftDeleted(await proofFor(reader), [localId]),
      ).resolves.toEqual([]);
    }
  });

  it('withholds what a deleted spell held, from its author too', async () => {
    const localId = await local(WORKSPACE_W_ID, A);
    const spellId = await spellHolding([localId]);
    await expect(
      findIngredientsInSpellsIncludingSoftDeleted(await proofFor(B), [localId]),
    ).resolves.toHaveLength(1);

    await softDelete('spells', spellId);

    await expect(
      findIngredientsInSpellsIncludingSoftDeleted(await proofFor(B), [localId]),
    ).resolves.toEqual([]);
  });

  it('withholds another coven’s spell’s contents by direct id', async () => {
    const xLocalId = await local(WORKSPACE_X_ID, D);
    await insertSpell(
      sql,
      makeSpell({ workspaceId: WORKSPACE_X_ID, layers: [{ ingredientId: xLocalId }] }),
      D.id,
    );
    // Why it could have been answered: X's own member is handed it.
    await expect(
      findIngredientsInSpellsIncludingSoftDeleted(await proofFor(D, WORKSPACE_X_ID), [xLocalId]),
    ).resolves.toHaveLength(1);

    await expect(
      findIngredientsInSpellsIncludingSoftDeleted(await proofFor(A), [xLocalId]),
    ).resolves.toEqual([]);
  });

  // Nothing in the schema stops a layer naming another coven's ingredient —
  // the foreign key checks the id alone — so the tier is the finder's to hold.
  it('withholds another coven’s ingredient that a W spell links', async () => {
    const localId = await local(WORKSPACE_W_ID, A);
    const xLocalId = await local(WORKSPACE_X_ID, D);
    const spellId = await spellHolding([localId, xLocalId]);
    // Why it could have been answered: the layer is there, beside one that is.
    const [layer] = await sql`
      select count(*)::int as count from spell_ingredients
      where spell_id = ${spellId} and ingredient_id = ${xLocalId}`;
    expect(layer.count).toBe(1);

    const held = await findIngredientsInSpellsIncludingSoftDeleted(await proofFor(B), [
      localId,
      xLocalId,
    ]);

    expect(idsOf(held)).toEqual([localId]);
  });

  it('answers an empty list with nothing', async () => {
    await expect(
      findIngredientsInSpellsIncludingSoftDeleted(await proofFor(B), []),
    ).resolves.toEqual([]);
  });
});

describe('findManyOfSpellIngredientsIncludingSoftDeleted', () => {
  it('hands a deleted ingredient’s categories and live folk names through a spell holding it', async () => {
    const entryId = await entry();
    await spellHolding([entryId]);
    await softDelete('ingredients', entryId);
    // Why only this finder could answer it: the ingredient's own read has let them go.
    await expect(
      findManyOfIngredients([await proofFor(B)], ingredientCategories, [entryId]),
    ).resolves.toEqual([]);

    const categories = await findManyOfSpellIngredientsIncludingSoftDeleted(
      await proofFor(C),
      ingredientCategories,
      [entryId],
    );
    const folkNames = await findManyOfSpellIngredientsIncludingSoftDeleted(
      await proofFor(C),
      ingredientFolkNames,
      [entryId],
    );

    const [protection] = await sql`select id from categories where name = 'Protection'`;
    expect(categories).toEqual([expect.objectContaining({ categoryId: protection.id })]);
    // The folk name removed before the delete stays removed.
    expect(folkNames.map((row) => row.name)).toEqual(['Test Root']);
  });

  it('withholds them where the spell is not readable, or no spell holds the ingredient', async () => {
    const localId = await local(WORKSPACE_W_ID, A);
    const unheldId = await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: WORKSPACE_W_ID,
        name: 'Fixture Root',
        nomenclature: 'none',
        categories: ['Cleansing'],
      }),
      A.id,
    );
    await spellHolding([localId], { author: B, visibility: 'private' });
    // Why they could have been answered: the author is handed the held one's.
    await expect(
      findManyOfSpellIngredientsIncludingSoftDeleted(await proofFor(B), ingredientCategories, [
        localId,
      ]),
    ).resolves.toHaveLength(1);

    await expect(
      findManyOfSpellIngredientsIncludingSoftDeleted(await proofFor(A), ingredientCategories, [
        localId,
      ]),
    ).resolves.toEqual([]);
    await expect(
      findManyOfSpellIngredientsIncludingSoftDeleted(await proofFor(B), ingredientCategories, [
        unheldId,
      ]),
    ).resolves.toEqual([]);
  });
});
