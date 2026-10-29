import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import {
  annotateCupboardEntry,
  convertCompendiumEntryToLocal,
  countWorkspaceIngredients,
  createStock,
  deleteStock,
  listWorkspaceIngredients,
  removeCupboardEntry,
  stockOf,
  updateStock,
  workspaceIngredientFacets,
} from '@/modules/ingredients';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// The writes a coven keeps on a compendium entry the curators retired
// (soft-deleted) while its cupboard row names it, which still lets the coven write on it: annotating the
// entry through the row's overrides, removing it from the cupboard, Make It
// Ours, and its jars (claude-docs/db/workspace-compendium-entries.md, "When
// the compendium retires the entry"). Coven W holds the entry; coven X holds
// no row naming it. Every test retires the entry first. No viewer case is
// here: `assertMembership` refuses a viewer before the entry is read, so a
// retired entry changes nothing the write paths' own viewer tests prove.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let entryId: string;
let variantId: string;
let cupboardRowId: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entryId = await insertIngredient(
    sql,
    makeIngredient({
      description: 'The compendium description',
      variants: [makeVariant({ form: 'Herb' })],
    }),
    E.id,
  );
  [{ id: variantId }] = await sql`
    select id from ingredient_variants where ingredient_id = ${entryId}`;
  cupboardRowId = await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: entryId },
    A.id,
  );
  await softDelete('ingredients', entryId, E.id);
});

/** Marks one row deleted, as its own delete would, by `actor`. */
async function softDelete(
  table: 'ingredients' | 'workspace_compendium_entries',
  id: string,
  actor: string,
) {
  await sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${actor}, true)`;
    await tx`update ${tx(table)} set deleted_at = now(), deleted_by = ${actor} where id = ${id}`;
  });
}

/**
 * The preconditions every assertion leans on: the entry is the compendium's
 * and retired, W's row naming it is live (or, with `rowLive` false,
 * tombstoned), and X has no row naming it.
 */
async function expectPreconditions(rowLive = true) {
  const [entry] = await sql`
    select workspace_id, deleted_at from ingredients where id = ${entryId}`;
  expect(entry.workspace_id).toBeNull();
  expect(entry.deleted_at).not.toBeNull();
  const rows = await sql`
    select workspace_id, deleted_at from workspace_compendium_entries
    where ingredient_id = ${entryId}`;
  expect(rows).toHaveLength(1);
  expect(rows[0].workspace_id).toBe(WORKSPACE_W_ID);
  expect(rows[0].deleted_at === null).toBe(rowLive);
}

/** The retired compendium row as it stands, to show a write left it be. */
const entryRow = async () => (await sql`select * from ingredients where id = ${entryId}`)[0];

const annotate = (session = asUser(B), workspaceId = WORKSPACE_W_ID) =>
  annotateCupboardEntry(session, workspaceId, entryId, {
    label: 'Our Retired Testwort',
    description: 'Our note',
    colors: ['green'],
  });

const remove = (session = asUser(B), workspaceId = WORKSPACE_W_ID) =>
  removeCupboardEntry(session, workspaceId, entryId);

/** What W's Ingredients list, its pager total and its form facet say of the entry. */
async function onW() {
  const page = await resolvePage({ first: 100 }, (request) =>
    listWorkspaceIngredients(asUser(B), WORKSPACE_W_ID, {}, request),
  );
  const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {});
  return {
    listed: page.edges.map(({ node }) => node.id),
    total: (await countWorkspaceIngredients(asUser(B), WORKSPACE_W_ID, {}, undefined)).totalCount,
    herb: facets.forms.find(({ value }) => value === 'Herb')?.count ?? 0,
  };
}

const convert = (session = asUser(B), workspaceId = WORKSPACE_W_ID) =>
  convertCompendiumEntryToLocal(session, workspaceId, entryId);

describe('annotating a retired entry', () => {
  it('lets W annotate it, and the override reads back, leaving the compendium row unwritten', async () => {
    await expectPreconditions();
    const before = await entryRow();

    const row = await annotate();

    expect(row).toMatchObject({ id: cupboardRowId, label: 'Our Retired Testwort' });
    const [stored] = await sql`
      select label, description, colors, updated_by from workspace_compendium_entries
      where id = ${cupboardRowId}`;
    expect(stored).toEqual({
      label: 'Our Retired Testwort',
      description: 'Our note',
      colors: ['green'],
      updated_by: B.id,
    });
    expect(await entryRow()).toEqual(before);
  });

  it('refuses X by direct id, in its own coven and in W', async () => {
    await expectPreconditions();

    await expect(annotate(asUser(D), WORKSPACE_X_ID)).rejects.toBeInstanceOf(NotFound);
    await expect(annotate(asUser(D))).rejects.toBeInstanceOf(Forbidden);
    const [stored] = await sql`
      select label from workspace_compendium_entries where id = ${cupboardRowId}`;
    expect(stored.label).toBeNull();
  });

  it("refuses W once W's row is tombstoned", async () => {
    await softDelete('workspace_compendium_entries', cupboardRowId, A.id);
    await expectPreconditions(false);

    await expect(annotate()).rejects.toBeInstanceOf(NotFound);
  });
});

describe('removing a retired entry from the cupboard', () => {
  it("lets W remove it: W's row goes, and with it the list entry, the count and the facet count", async () => {
    await expectPreconditions();
    expect(await onW()).toEqual({ listed: [entryId], total: 1, herb: 1 });
    const before = await entryRow();

    await remove();

    await expectPreconditions(false);
    const [row] = await sql`
      select deleted_by from workspace_compendium_entries where id = ${cupboardRowId}`;
    expect(row.deleted_by).toBe(B.id);
    expect(await onW()).toEqual({ listed: [], total: 0, herb: 0 });
    expect(await entryRow()).toEqual(before);
  });

  it('refuses a second remove, as it refuses one of a live entry', async () => {
    await remove();
    await expectPreconditions(false);

    await expect(remove()).rejects.toBeInstanceOf(NotFound);
  });

  it('refuses X by direct id, in its own coven and in W', async () => {
    await expectPreconditions();

    await expect(remove(asUser(D), WORKSPACE_X_ID)).rejects.toBeInstanceOf(NotFound);
    await expect(remove(asUser(D))).rejects.toBeInstanceOf(Forbidden);
    await expectPreconditions();
  });

  it('refuses W while W holds a jar of it, as for a live entry', async () => {
    await insertStock(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entryId, variantId, quantityOnHand: '1' },
      A.id,
    );
    await expectPreconditions();

    const error = await remove().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues.map((issue) => issue.path[0])).toEqual([
      'ingredientId',
    ]);
    await expectPreconditions();
  });
});

describe('Make It Ours on a retired entry', () => {
  it("lets W make it its own: a new entry takes the jars, W's row goes, the compendium row stays unwritten", async () => {
    const jarId = await insertStock(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entryId, variantId, quantityOnHand: '2' },
      A.id,
    );
    await expectPreconditions();
    const before = await entryRow();

    const { entry: own } = await convert();

    expect(own).toMatchObject({ workspaceId: WORKSPACE_W_ID, deletedAt: null });
    expect(own.id).not.toBe(entryId);
    const [jar] =
      await sql`select ingredient_id, variant_id from inventory_items where id = ${jarId}`;
    expect(jar.ingredient_id).toBe(own.id);
    expect(jar.variant_id).not.toBe(variantId);
    const [row] = await sql`
      select deleted_at from workspace_compendium_entries where id = ${cupboardRowId}`;
    expect(row.deleted_at).not.toBeNull();
    expect(await entryRow()).toEqual(before);
  });

  it('refuses X by direct id, in its own coven and in W', async () => {
    await expectPreconditions();

    await expect(convert(asUser(D), WORKSPACE_X_ID)).rejects.toBeInstanceOf(NotFound);
    await expect(convert(asUser(D))).rejects.toBeInstanceOf(Forbidden);
    const owns = await sql`select id from ingredients where workspace_id is not null`;
    expect(owns).toHaveLength(0);
  });

  it("refuses W once W's row is tombstoned", async () => {
    await softDelete('workspace_compendium_entries', cupboardRowId, A.id);
    await expectPreconditions(false);

    await expect(convert()).rejects.toBeInstanceOf(NotFound);
    const owns = await sql`select id from ingredients where workspace_id = ${WORKSPACE_W_ID}`;
    expect(owns).toHaveLength(0);
  });
});

describe("a jar of a retired entry's form", () => {
  /** The retired compendium row and its forms as they stand, to show a jar write left them be. */
  const compendiumRows = async () => ({
    entry: await entryRow(),
    forms:
      await sql`select * from ingredient_variants where ingredient_id = ${entryId} order by id`,
  });

  /** W's live jars of the entry, as the entry page reads them. */
  const wJars = async () => {
    const [jars] = await stockOf(asUser(B), [
      { ingredientId: entryId, workspaceId: WORKSPACE_W_ID },
    ]);
    if (jars instanceof Forbidden) throw jars;
    return jars;
  };

  const addJar = (session = asUser(B), workspaceId = WORKSPACE_W_ID) =>
    createStock(session, workspaceId, variantId, { quantityOnHand: 2, unit: 'g' });

  const seedJar = () =>
    insertStock(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entryId, variantId, quantityOnHand: '1' },
      A.id,
    );

  it('lets W add a jar of its form, then change it and remove it, leaving the compendium rows unwritten', async () => {
    await expectPreconditions();
    const before = await compendiumRows();
    expect(await wJars()).toEqual([]);

    const jar = await addJar();

    expect(jar).toMatchObject({ workspaceId: WORKSPACE_W_ID, ingredientId: entryId, variantId });
    expect((await wJars()).map(({ id }) => id)).toEqual([jar.id]);
    // The live cupboard row that admitted it is the one row still: no second is written.
    await expectPreconditions();

    await expect(
      updateStock(asUser(B), WORKSPACE_W_ID, jar.id, { quantityOnHand: 5 }),
    ).resolves.toMatchObject({ id: jar.id, quantityOnHand: '5.000' });
    await deleteStock(asUser(B), WORKSPACE_W_ID, jar.id);
    expect(await wJars()).toEqual([]);

    expect(await compendiumRows()).toEqual(before);
  });

  it('refuses X each write by direct id, in its own coven and in W', async () => {
    const jarId = await seedJar();
    await expectPreconditions();
    // Why X could have reached them: W reads the form and the jar by the same ids.
    expect((await wJars()).map(({ id }) => id)).toEqual([jarId]);

    await expect(addJar(asUser(D), WORKSPACE_X_ID)).rejects.toBeInstanceOf(NotFound);
    await expect(addJar(asUser(D))).rejects.toBeInstanceOf(Forbidden);
    await expect(
      updateStock(asUser(D), WORKSPACE_X_ID, jarId, { quantityOnHand: 9 }),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(deleteStock(asUser(D), WORKSPACE_X_ID, jarId)).rejects.toBeInstanceOf(NotFound);
    await expect(
      updateStock(asUser(D), WORKSPACE_W_ID, jarId, { quantityOnHand: 9 }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(deleteStock(asUser(D), WORKSPACE_W_ID, jarId)).rejects.toBeInstanceOf(Forbidden);

    const jars = await sql`select id, quantity_on_hand, deleted_at from inventory_items`;
    expect(jars).toEqual([{ id: jarId, quantity_on_hand: '1.000', deleted_at: null }]);
  });

  it("refuses W each write once W's row is tombstoned", async () => {
    const jarId = await seedJar();
    await softDelete('workspace_compendium_entries', cupboardRowId, A.id);
    await expectPreconditions(false);

    await expect(addJar()).rejects.toBeInstanceOf(NotFound);
    await expect(
      updateStock(asUser(B), WORKSPACE_W_ID, jarId, { quantityOnHand: 9 }),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(deleteStock(asUser(B), WORKSPACE_W_ID, jarId)).rejects.toBeInstanceOf(NotFound);

    const jars = await sql`select id, quantity_on_hand, deleted_at from inventory_items`;
    expect(jars).toEqual([{ id: jarId, quantity_on_hand: '1.000', deleted_at: null }]);
  });

  it("still refuses a new jar of a form of W's own deleted ingredient, even with a cupboard row naming it", async () => {
    const ownId = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Ownwort',
        workspaceId: WORKSPACE_W_ID,
        variants: [makeVariant({ form: 'Root' })],
      }),
      A.id,
    );
    const [{ id: ownVariantId }] = await sql`
      select id from ingredient_variants where ingredient_id = ${ownId}`;
    // The table does not refuse a cupboard row naming a coven's own entry; no service writes one.
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: ownId }, A.id);
    // Why it could have been admitted: a new jar of the form answers while the entry is live.
    const live = await createStock(asUser(B), WORKSPACE_W_ID, ownVariantId, {});
    await sql`update inventory_items set deleted_at = now(), deleted_by = ${A.id} where id = ${live.id}`;
    await softDelete('ingredients', ownId, A.id);
    const [own] = await sql`select workspace_id, deleted_at from ingredients where id = ${ownId}`;
    expect(own.workspace_id).toBe(WORKSPACE_W_ID);
    expect(own.deleted_at).not.toBeNull();
    const [form] = await sql`select deleted_at from ingredient_variants where id = ${ownVariantId}`;
    expect(form.deleted_at).toBeNull();

    await expect(createStock(asUser(B), WORKSPACE_W_ID, ownVariantId, {})).rejects.toBeInstanceOf(
      NotFound,
    );
  });
});
