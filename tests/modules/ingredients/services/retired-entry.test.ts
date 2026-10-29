import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findCompendiumMatchesByName } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { NotFound } from '@/lib/errors';
import type { PageRequest } from '@/lib/types';
import {
  createStock,
  deleteStock,
  getIngredient,
  ingredientDetailOf,
  listCompendium,
  readCompendiumEntry,
  stockOf,
  suggestIngredients,
  updateStock,
} from '@/modules/ingredients';
import { A, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { makeIngredient } from '../../../support/fixtures';

// A compendium entry the curators retire (soft-delete) stays readable
// to exactly the covens whose cupboard names it, through the one hatch
// `findCupboardEntryIncludingSoftDeleted`, and leaves every other read at once
// (claude-docs/db/workspace-compendium-entries.md, "When the compendium
// retires the entry"). Coven W holds the entry and a jar of its one form;
// coven X holds a jar of the same form but no cupboard row, which no service
// writes but the table does not refuse, so X is the coven that could have read
// it and must not.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 26, inverted: false };
const SLUG = 'testwort-fixtura-testalis';

let entryId: string;
let variantId: string;
let wJar: string;
let xJar: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entryId = await insertIngredient(sql, makeIngredient({ folkNames: ['Fixture Bane'] }), E.id);
  [{ id: variantId }] = await sql`
    select id from ingredient_variants where ingredient_id = ${entryId}`;
  await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: entryId, label: 'Hedgewort' },
    A.id,
  );
  const jar = { ingredientId: entryId, variantId, quantityOnHand: '3', unit: 'g' } as const;
  wJar = await insertStock(sql, { ...jar, workspaceId: WORKSPACE_W_ID }, A.id);
  xJar = await insertStock(sql, { ...jar, workspaceId: WORKSPACE_X_ID }, D.id);
});

/** Retires the entry as a curator's delete does: the ingredient row alone, its forms left live. */
async function retire(id = entryId) {
  await sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${E.id}, true)`;
    await tx`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;
  });
}

/** The precondition every refusal below leans on: the entry exists, and is retired. */
async function expectRetired() {
  const [row] = await sql`select deleted_at from ingredients where id = ${entryId}`;
  expect(row.deleted_at).not.toBeNull();
}

describe('a coven whose cupboard names a retired entry', () => {
  it('reads the entry, marked retired, with its forms, folk names and cupboard entry', async () => {
    await retire();

    // A viewer reads it as the owner does: the read asks `ingredient: ['read']`.
    for (const user of [A, C]) {
      const entry = await getIngredient(asUser(user), entryId, WORKSPACE_W_ID);
      expect(entry.id).toBe(entryId);

      const detail = await ingredientDetailOf(asUser(user), entry, WORKSPACE_W_ID);
      expect(detail.retired).toBe(true);
      expect(detail.variants.map(({ variant }) => variant.id)).toEqual([variantId]);
      expect(detail.folkNames).toEqual(['Fixture Bane']);
      expect(detail.cupboardEntry).toMatchObject({ ingredientId: entryId, label: 'Hedgewort' });
    }
  });

  it('reads, changes and empties its jars, by the entry and by the jar', async () => {
    await retire();
    const owner = asUser(A);

    const [jars] = await stockOf(owner, [{ ingredientId: entryId, workspaceId: WORKSPACE_W_ID }]);
    expect(jars).toEqual([expect.objectContaining({ id: wJar, variantId })]);

    await expect(
      updateStock(owner, WORKSPACE_W_ID, wJar, { quantityOnHand: 1 }),
    ).resolves.toMatchObject({ id: wJar });
    await deleteStock(owner, WORKSPACE_W_ID, wJar);
    const [{ deleted_at }] = await sql`select deleted_at from inventory_items where id = ${wJar}`;
    expect(deleted_at).not.toBeNull();
  });

  it('is not marked while the compendium still holds the entry', async () => {
    const entry = await getIngredient(asUser(A), entryId, WORKSPACE_W_ID);

    expect((await ingredientDetailOf(asUser(A), entry, WORKSPACE_W_ID)).retired).toBe(false);
  });

  it('reads nothing once its own cupboard entry is removed', async () => {
    await retire();
    // Why it could have read: the same call answers while the row is live.
    await expect(getIngredient(asUser(A), entryId, WORKSPACE_W_ID)).resolves.toBeDefined();

    await sql`update workspace_compendium_entries set deleted_at = now(), deleted_by = ${A.id}`;

    await expect(getIngredient(asUser(A), entryId, WORKSPACE_W_ID)).rejects.toThrow(NotFound);
  });

  it('starts a fresh jar of it once its old one is emptied', async () => {
    await retire();
    await sql`update inventory_items set deleted_at = now(), deleted_by = ${A.id} where id = ${wJar}`;
    // The owner's decision of 2026-10-19 reverses M12.24's "no new jar": the
    // coven still reads the form, and may stock it again
    // (retired-entry-writes.test.ts has the refusals).
    const jar = await createStock(asUser(A), WORKSPACE_W_ID, variantId, {});

    expect(jar).toMatchObject({ workspaceId: WORKSPACE_W_ID, variantId });
    expect(jar.id).not.toBe(wJar);
  });
});

describe('a coven whose cupboard does not name the retired entry', () => {
  it('gets NotFound for the entry, by its id', async () => {
    await retire();
    await expectRetired();
    // Why it could have read: the coven holding it reads the same id.
    const entry = await getIngredient(asUser(A), entryId, WORKSPACE_W_ID);

    await expect(getIngredient(asUser(D), entryId, WORKSPACE_X_ID)).rejects.toThrow(NotFound);
    await expect(ingredientDetailOf(asUser(D), entry, WORKSPACE_X_ID)).rejects.toThrow(NotFound);
  });

  it('reads none of its jars, by the entry or by the jar', async () => {
    const key = { ingredientId: entryId, workspaceId: WORKSPACE_X_ID };
    // Why it could have read: the jar is the coven's own, and reads before retirement.
    expect((await stockOf(asUser(D), [key]))[0]).toEqual([expect.objectContaining({ id: xJar })]);
    await retire();
    await expectRetired();

    expect(await stockOf(asUser(D), [key])).toEqual([[]]);
    await expect(
      updateStock(asUser(D), WORKSPACE_X_ID, xJar, { quantityOnHand: 1 }),
    ).rejects.toThrow(NotFound);
  });
});

describe('everywhere else, a retired entry is gone at once', () => {
  it('leaves the public page, the public list and its search', async () => {
    // Why each could have shown it: before retirement each does.
    await expect(readCompendiumEntry(SLUG)).resolves.toMatchObject({ kind: 'entry' });
    const names = async (filter = {}) =>
      (await listCompendium(filter, PAGE)).map(({ node }) => node.id);
    expect(await names()).toEqual([entryId]);
    expect(await names({ query: 'Testwort' })).toEqual([entryId]);

    await retire();

    await expect(readCompendiumEntry(SLUG)).rejects.toThrow(NotFound);
    await expect(getIngredient(null, entryId)).rejects.toThrow(NotFound);
    expect(await names()).toEqual([]);
    expect(await names({ query: 'Testwort' })).toEqual([]);
  });

  it("leaves the add flow's exact match", async () => {
    expect((await findCompendiumMatchesByName('Testwort')).map(({ id }) => id)).toEqual([entryId]);
    await retire();

    expect(await findCompendiumMatchesByName('Testwort')).toEqual([]);
  });

  it('leaves both picker groups: the coven holding it and the coven that does not', async () => {
    const suggested = async (user: typeof A, workspaceId: string) =>
      (await suggestIngredients(asUser(user), workspaceId, 'Testwort', PAGE)).map(
        ({ node }) => node.id,
      );
    // Why each could have offered it: the holding coven's group and the
    // compendium's group each offer it before retirement.
    expect(await suggested(A, WORKSPACE_W_ID)).toContain(entryId);
    expect(await suggested(D, WORKSPACE_X_ID)).toContain(entryId);

    await retire();

    expect(await suggested(A, WORKSPACE_W_ID)).not.toContain(entryId);
    expect(await suggested(D, WORKSPACE_X_ID)).not.toContain(entryId);
  });
});
