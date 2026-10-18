import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findIngredientsInSpellsIncludingSoftDeleted } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { assertMembership } from '@/modules/coven';
import { convertLocalToCompendiumEntry } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { insertSpell } from '../../../support/db/insert-spell';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';

// M12.21: an own entry turned into the compendium entry it duplicates. Its
// jars and spell layers follow by folded form, the cupboard row carries what
// the coven had said differently, and the local is soft-deleted with its
// children left as they were. Every refusal leaves every row where it was.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let entry: string;
let form: string;
let local: string;
let localForm: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entry = await insertIngredient(
    sql,
    makeIngredient({
      colors: ['green'],
      variants: [makeVariant({ form: 'Testform' }), makeVariant({ form: 'Otherform' })],
    }),
    E.id,
  );
  form = await variantIdOf(sql, entry, 'Testform');
  local = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Our Testwort',
      nomenclature: 'none',
      description: 'Our description',
      elements: ['fire'],
      colors: ['green'],
      zodiacSigns: [],
      // Testform as a fold reads it; Spareform the compendium lacks.
      variants: [makeVariant({ form: 'testform' }), makeVariant({ form: 'Spareform' })],
      folkNames: ['Hedge Fixture'],
      substitutes: ['Fixture Moss'],
      categories: ['Protection'],
    }),
    A.id,
  );
  localForm = await variantIdOf(sql, local, 'testform');
});

const convert = (session = asUser(B), localId = local, compendiumId = entry) =>
  convertLocalToCompendiumEntry(session, WORKSPACE_W_ID, localId, compendiumId);

/** A jar of the local's Testform in W, with every amount set so a move can be checked. */
const jarOfLocal = () =>
  insertStock(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: local,
      variantId: localForm,
      quantityOnHand: '12.5',
      unit: 'g',
      lowStockThreshold: '2',
    },
    A.id,
  );

/** A shared spell of A's in W with one layer of `ingredientId`'s `variantId`; the layer's id. */
async function layerOf(ingredientId: string, variantId: string): Promise<string> {
  const spellId = await insertSpell(
    sql,
    makeSpell({ workspaceId: WORKSPACE_W_ID, visibility: 'workspace', layers: [{ ingredientId }] }),
    A.id,
  );
  const [layer] = await sql`
    update spell_ingredients set variant_id = ${variantId}
    where spell_id = ${spellId} returning id`;
  return layer.id as string;
}

const jarRow = async (id: string) => (await sql`select * from inventory_items where id = ${id}`)[0];
const layerRow = async (id: string) =>
  (await sql`select * from spell_ingredients where id = ${id}`)[0];
const localRow = async () => (await sql`select * from ingredients where id = ${local}`)[0];
const cupboardRows = () => sql`
  select * from workspace_compendium_entries
  where workspace_id = ${WORKSPACE_W_ID} and deleted_at is null`;

/** The refusal's issue paths, each a top-level field. */
async function refusal(promise: Promise<unknown>): Promise<ValidationError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return error as ValidationError;
}

/** Nothing moved: the jar and layer on the local, the local live, no cupboard row. */
async function expectNothingMoved(jarId: string, layerId?: string) {
  expect(await jarRow(jarId)).toMatchObject({ ingredient_id: local, variant_id: localForm });
  if (layerId) {
    expect(await layerRow(layerId)).toMatchObject({ ingredient_id: local, variant_id: localForm });
  }
  expect((await localRow()).deleted_at).toBeNull();
  expect(await cupboardRows()).toHaveLength(0);
}

describe('convertLocalToCompendiumEntry', () => {
  it("moves a jar and a spell layer to the compendium's form of the same folded name, amounts unchanged", async () => {
    const jarId = await jarOfLocal();
    const layerId = await layerOf(local, localForm);
    const before = await jarRow(jarId);

    const result = await convert();

    const jar = await jarRow(jarId);
    expect(jar).toMatchObject({
      ingredient_id: entry,
      variant_id: form,
      quantity_on_hand: before.quantity_on_hand,
      unit: before.unit,
      low_stock_threshold: before.low_stock_threshold,
      deleted_at: null,
    });
    expect(await layerRow(layerId)).toMatchObject({
      ingredient_id: entry,
      variant_id: form,
      deleted_at: null,
    });
    expect((await localRow()).deleted_at).not.toBeNull();
    expect(result.entry.ingredientId).toBe(entry);
  });

  it('writes the cupboard row with only what the local said differently', async () => {
    await convert();

    const [row] = await cupboardRows();
    expect(row).toMatchObject({
      ingredient_id: entry,
      label: 'Our Testwort',
      description: 'Our description',
      elements: ['fire'],
      // The same colours as the compendium's, an empty list and an unset note are no override.
      colors: null,
      zodiac_signs: null,
      celestial_bodies: null,
      safety_notes: null,
      created_by: B.id,
    });
  });

  it('leaves the soft-deleted local its children, and lists what the coven lost', async () => {
    const referenceId = await insertReference(
      sql,
      { workspace_id: WORKSPACE_W_ID, title: 'A Fixture Coven Notebook' },
      A.id,
    );
    await insertReferenceLink(sql, local, referenceId, A.id);

    const { dropped } = await convert();

    expect(dropped.forms).toEqual(['Spareform']);
    expect(dropped.folkNames).toEqual(['Hedge Fixture']);
    expect(dropped.substitutes).toEqual(['Fixture Moss']);
    expect(dropped.categories).toEqual(['Protection']);
    expect(dropped.references).toHaveLength(1);
    const live = await sql`
      select
        (select count(*)::int from ingredient_variants where ingredient_id = ${local} and deleted_at is null) as variants,
        (select count(*)::int from ingredient_folk_names where ingredient_id = ${local} and deleted_at is null) as folk_names,
        (select count(*)::int from ingredient_categories where ingredient_id = ${local}) as categories,
        (select count(*)::int from ingredient_substitutes where ingredient_id = ${local} and deleted_at is null) as substitutes,
        (select count(*)::int from reference_links where ingredient_id = ${local} and deleted_at is null) as references`;
    expect(live[0]).toEqual({
      variants: 2,
      folk_names: 1,
      categories: 1,
      substitutes: 1,
      references: 1,
    });
  });

  it('refuses a form holding a jar that the compendium lacks, naming it, and moves nothing', async () => {
    const lost = await sql`
      insert into ingredient_variants (ingredient_id, form, created_by, updated_by)
      values (${local}, 'Lostform', ${A.id}, ${A.id}) returning id`;
    const lostJar = await insertStock(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: local, variantId: lost[0].id },
      A.id,
    );
    const jarId = await jarOfLocal();

    const error = await refusal(convert());

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['forms']);
    expect(error.issues[0].message).toContain('Lostform');
    expect(await jarRow(lostJar)).toMatchObject({ ingredient_id: local });
    await expectNothingMoved(jarId);
  });

  it('refuses a form holding only a spell layer that the compendium lacks', async () => {
    const spare = await variantIdOf(sql, local, 'Spareform');
    const layerId = await layerOf(local, spare);

    const error = await refusal(convert());

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['forms']);
    expect(await layerRow(layerId)).toMatchObject({ ingredient_id: local, variant_id: spare });
    expect((await localRow()).deleted_at).toBeNull();
  });

  it('refuses when the coven already holds a jar of the compendium form, and moves nothing', async () => {
    // A jar from before M12.15, which wrote no cupboard row beside it.
    await insertStock(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry, variantId: form },
      A.id,
    );
    const jarId = await jarOfLocal();
    const layerId = await layerOf(local, localForm);

    const error = await refusal(convert());

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['jars']);
    await expectNothingMoved(jarId, layerId);
  });

  it('refuses when one spell holds both forms, and moves nothing', async () => {
    const jarId = await jarOfLocal();
    const spellId = await insertSpell(
      sql,
      makeSpell({
        workspaceId: WORKSPACE_W_ID,
        visibility: 'workspace',
        layers: [{ ingredientId: local }, { ingredientId: entry }],
      }),
      A.id,
    );
    await sql`update spell_ingredients set variant_id = ${localForm} where spell_id = ${spellId} and ingredient_id = ${local}`;
    await sql`update spell_ingredients set variant_id = ${form} where spell_id = ${spellId} and ingredient_id = ${entry}`;

    const error = await refusal(convert());

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['layers']);
    await expectNothingMoved(jarId);
  });

  it('refuses when the coven already holds the compendium entry, and moves nothing', async () => {
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: entry }, A.id);
    const jarId = await jarOfLocal();

    const error = await refusal(convert());

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['ingredientId']);
    expect(await jarRow(jarId)).toMatchObject({ ingredient_id: local });
    expect((await localRow()).deleted_at).toBeNull();
  });

  it('rolls back the moves when a later write fails', async () => {
    const jarId = await jarOfLocal();
    const layerId = await layerOf(local, localForm);
    // A fault in the cupboard insert, which comes after the jar and layer
    // moves. Not pg_temp: the service writes on another connection.
    await sql.unsafe(`
      create function refuse_cupboard_insert() returns trigger language plpgsql
      as $$ begin raise exception 'refused by the test'; end $$`);
    await sql`
      create trigger refuse_cupboard_insert before insert on workspace_compendium_entries
      for each row execute function refuse_cupboard_insert()`;
    try {
      // The fault itself, not some earlier refusal, is what stopped it.
      const error = await convert().catch((e: unknown) => e);
      expect((error as { cause?: unknown }).cause).toMatchObject({
        message: 'refused by the test',
      });
    } finally {
      await sql`drop trigger refuse_cupboard_insert on workspace_compendium_entries`;
      await sql`drop function refuse_cupboard_insert()`;
    }

    await expectNothingMoved(jarId, layerId);
  });

  it('leaves a layer of a form deleted before the convert on the local, which its spell still reads', async () => {
    const spare = await variantIdOf(sql, local, 'Spareform');
    const layerId = await layerOf(local, spare);
    await sql`update ingredient_variants set deleted_at = now(), deleted_by = ${A.id} where id = ${spare}`;

    await convert();

    expect(await layerRow(layerId)).toMatchObject({ ingredient_id: local, variant_id: spare });
    const reader = await assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['read'] });
    const held = await findIngredientsInSpellsIncludingSoftDeleted(reader, [local]);
    expect(held.map((row) => row.id)).toEqual([local]);
    expect(held[0].deletedAt).not.toBeNull();
  });

  it('refuses a viewer by direct id, though the local and the entry are live and they are a member', async () => {
    const jarId = await jarOfLocal();
    // Why it could have succeeded: C is a live member of W and may read the local.
    const viewer = await assertMembership(asUser(C), WORKSPACE_W_ID, { ingredient: ['read'] });
    expect(viewer.workspaceId).toBe(WORKSPACE_W_ID);
    expect((await localRow()).deleted_at).toBeNull();

    await expect(convert(asUser(C))).rejects.toBeInstanceOf(Forbidden);
    await expectNothingMoved(jarId);
  });

  it('refuses a non-member by direct id', async () => {
    const jarId = await jarOfLocal();
    // Why it could have succeeded: D is a member who may convert, in X.
    await expect(
      assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['create', 'delete'] }),
    ).resolves.toBeDefined();

    await expect(convert(asUser(D))).rejects.toBeInstanceOf(Forbidden);
    await expectNothingMoved(jarId);
  });

  it("answers NotFound for another coven's local named by id", async () => {
    const theirs = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_X_ID, name: 'Their Testwort', nomenclature: 'none' }),
      D.id,
    );
    // Why it could have succeeded: the row is live, and B may convert in W.
    const [row] = await sql`select deleted_at from ingredients where id = ${theirs}`;
    expect(row.deleted_at).toBeNull();

    await expect(convert(asUser(B), theirs)).rejects.toBeInstanceOf(NotFound);
    const [after] = await sql`select deleted_at from ingredients where id = ${theirs}`;
    expect(after.deleted_at).toBeNull();
  });
});
