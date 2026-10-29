import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { assertMembership } from '@/modules/coven';
import { convertCompendiumEntryToLocal } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient, insertSubstituteLink } from '../../../support/db/insert-ingredient';
import {
  insertReference,
  insertReferenceLink,
  insertVariantReferenceLink,
} from '../../../support/db/insert-reference';
import { insertSpell } from '../../../support/db/insert-spell';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';

// M12.23: a compendium entry the coven holds, made into the coven's own. A
// new own entry is written from the merged values with copies of the
// compendium's children, the coven's jars and spell layers move to its forms
// by folded name, and the cupboard row is soft-deleted. The compendium entry
// itself is never touched, and every refusal leaves every row where it was.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let entry: string;
let form: string;
let otherForm: string;
let cupboardId: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entry = await insertIngredient(
    sql,
    makeIngredient({
      description: 'The compendium description',
      elements: ['water'],
      colors: ['green'],
      variants: [
        makeVariant({ form: 'Testform', categories: ['Protection'] }),
        makeVariant({ form: 'Otherform' }),
      ],
      folkNames: ['Hedge Fixture'],
      substitutes: ['Fixture Moss'],
      deities: ['Fixture Deity'],
      categories: ['Protection'],
    }),
    E.id,
  );
  form = await variantIdOf(sql, entry, 'Testform');
  otherForm = await variantIdOf(sql, entry, 'Otherform');
  cupboardId = await insertCupboardEntry(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: entry,
      label: 'Our Testwort',
      description: 'Our description',
    },
    A.id,
  );
});

const convert = (session = asUser(B), ingredientId = entry) =>
  convertCompendiumEntryToLocal(session, WORKSPACE_W_ID, ingredientId);

/** A jar of the compendium's Testform in W, with every amount set so a move can be checked. */
const jarOfEntry = () =>
  insertStock(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: entry,
      variantId: form,
      quantityOnHand: '12.5',
      unit: 'g',
      lowStockThreshold: '2',
    },
    A.id,
  );

/** A shared spell of A's in W laying the compendium's Testform; the spell's and the layer's ids. */
async function spellOfEntry(): Promise<{ spellId: string; layerId: string }> {
  const spellId = await insertSpell(
    sql,
    makeSpell({
      workspaceId: WORKSPACE_W_ID,
      visibility: 'workspace',
      steps: [{ ingredientId: entry }],
    }),
    A.id,
  );
  const [layer] = await sql`
    update spell_steps set variant_id = ${form}
    where spell_id = ${spellId} returning id`;
  return { spellId, layerId: layer.id as string };
}

const jarRow = async (id: string) => (await sql`select * from inventory_items where id = ${id}`)[0];
const layerRow = async (id: string) => (await sql`select * from spell_steps where id = ${id}`)[0];
const cupboardRow = async () =>
  (await sql`select * from workspace_compendium_entries where id = ${cupboardId}`)[0];
const ownEntries = () => sql`
  select * from ingredients where workspace_id = ${WORKSPACE_W_ID} and deleted_at is null`;

/** Nothing moved: the jar and layer on the compendium entry, the cupboard row live, no own entry. */
async function expectNothingMoved(jarId: string, layerId?: string, own = 0) {
  expect(await jarRow(jarId)).toMatchObject({ ingredient_id: entry, variant_id: form });
  if (layerId) {
    expect(await layerRow(layerId)).toMatchObject({ ingredient_id: entry, variant_id: form });
  }
  expect((await cupboardRow()).deleted_at).toBeNull();
  expect(await ownEntries()).toHaveLength(own);
}

/** Each live form of `ingredientId` by its text. */
async function formsOf(ingredientId: string): Promise<Map<string, string>> {
  const rows = await sql`
    select id, form from ingredient_variants
    where ingredient_id = ${ingredientId} and deleted_at is null`;
  return new Map(rows.map((row) => [row.form as string, row.id as string]));
}

describe('convertCompendiumEntryToLocal', () => {
  it('writes an own entry from the merged values, copying the children, and retires the cupboard row', async () => {
    const root = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Root', canonicalName: 'Fixtura radix' }),
      E.id,
    );
    await insertSubstituteLink(sql, entry, root, E.id);
    // A form of the entry standing in for another of its own forms.
    await insertSubstituteLink(sql, entry, entry, E.id, {
      variantId: otherForm,
      substituteVariantId: form,
    });
    const book = await insertReference(sql, { title: 'A Fixture Herbal' }, E.id);
    await insertReferenceLink(sql, entry, book, E.id, 'p. 12');
    await insertVariantReferenceLink(sql, form, book, E.id);

    const result = await convert();

    const [own] = await ownEntries();
    expect(own).toMatchObject({
      id: result.entry.id,
      name: 'Our Testwort',
      canonical_name: 'Fixtura testalis',
      nomenclature: 'botanical',
      description: 'Our description',
      elements: ['water'],
      colors: ['green'],
      created_by: B.id,
    });
    const forms = await formsOf(own.id);
    expect([...forms.keys()].sort()).toEqual(['Otherform', 'Testform']);

    const folkNames = await sql`
      select name from ingredient_folk_names where ingredient_id = ${own.id} and deleted_at is null`;
    expect(folkNames.map((row) => row.name)).toEqual(['Hedge Fixture']);
    const deities = await sql`
      select name from ingredient_deities where ingredient_id = ${own.id} and deleted_at is null`;
    expect(deities.map((row) => row.name)).toEqual(['Fixture Deity']);
    const substitutes = await sql`
      select variant_id, substitute_id, substitute_variant_id, name from ingredient_substitutes
      where ingredient_id = ${own.id} and deleted_at is null order by variant_id nulls first, name nulls first`;
    expect(substitutes).toEqual([
      { variant_id: null, substitute_id: root, substitute_variant_id: null, name: null },
      { variant_id: null, substitute_id: null, substitute_variant_id: null, name: 'Fixture Moss' },
      // The form's link to a sibling form follows to the new entry's forms.
      {
        variant_id: forms.get('Otherform'),
        substitute_id: own.id,
        substitute_variant_id: forms.get('Testform'),
        name: null,
      },
    ]);
    const categories = await sql`
      select c.name, ic.variant_id from ingredient_categories ic
      join categories c on c.id = ic.category_id
      where ic.ingredient_id = ${own.id} order by ic.variant_id nulls first`;
    expect(categories).toEqual([
      { name: 'Protection', variant_id: null },
      { name: 'Protection', variant_id: forms.get('Testform') },
    ]);
    const references = await sql`
      select reference_id, locator, ingredient_id, ingredient_variant_id from reference_links
      where (ingredient_id = ${own.id} or ingredient_variant_id = ${forms.get('Testform')!})
        and deleted_at is null
      order by ingredient_id nulls last`;
    expect(references).toEqual([
      { reference_id: book, locator: 'p. 12', ingredient_id: own.id, ingredient_variant_id: null },
      {
        reference_id: book,
        locator: null,
        ingredient_id: null,
        ingredient_variant_id: forms.get('Testform'),
      },
    ]);

    expect((await cupboardRow()).deleted_at).not.toBeNull();
    const [compendium] = await sql`select deleted_at from ingredients where id = ${entry}`;
    expect(compendium.deleted_at).toBeNull();
    expect(result.dropped).toEqual({
      forms: [],
      folkNames: [],
      substitutes: [],
      categories: [],
      references: [],
      deities: [],
    });
  });

  it('moves a jar and a spell layer to the new form of the same name, amounts unchanged', async () => {
    const jarId = await jarOfEntry();
    const { layerId } = await spellOfEntry();
    const before = await jarRow(jarId);

    const { entry: own } = await convert();

    const newForm = (await formsOf(own.id)).get('Testform');
    expect(await jarRow(jarId)).toMatchObject({
      id: jarId,
      ingredient_id: own.id,
      variant_id: newForm,
      quantity_on_hand: before.quantity_on_hand,
      unit: before.unit,
      low_stock_threshold: before.low_stock_threshold,
      deleted_at: null,
    });
    expect(await layerRow(layerId)).toMatchObject({
      ingredient_id: own.id,
      variant_id: newForm,
      deleted_at: null,
    });
  });

  it('moves both layers of a spell laying two of its forms, each to its own', async () => {
    const { spellId, layerId } = await spellOfEntry();
    const [other] = await sql`
      insert into spell_steps (spell_id, ingredient_id, variant_id, position, created_by, updated_by)
      values (${spellId}, ${entry}, ${otherForm}, 99, ${A.id}, ${A.id}) returning id`;

    const { entry: own } = await convert();

    const forms = await formsOf(own.id);
    expect(await layerRow(layerId)).toMatchObject({ variant_id: forms.get('Testform') });
    expect(await layerRow(other.id)).toMatchObject({ variant_id: forms.get('Otherform') });
  });

  it('leaves out, and lists, a folk name the new name takes', async () => {
    await sql`update workspace_compendium_entries set label = 'hedge fixture' where id = ${cupboardId}`;

    const { entry: own, dropped } = await convert();

    expect(dropped.folkNames).toEqual(['Hedge Fixture']);
    const folkNames = await sql`
      select name from ingredient_folk_names where ingredient_id = ${own.id}`;
    expect(folkNames).toHaveLength(0);
  });

  it('refuses when the coven has its own entry of the same formal name, and moves nothing', async () => {
    await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Wild Testwort', variants: [] }),
      A.id,
    );
    const jarId = await jarOfEntry();
    const { layerId } = await spellOfEntry();

    const error = await convert().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues.map((issue) => issue.path[0])).toEqual([
      'canonicalName',
    ]);
    await expectNothingMoved(jarId, layerId, 1);
  });

  it('rolls back every write when a later one fails', async () => {
    const jarId = await jarOfEntry();
    const { layerId } = await spellOfEntry();
    // A fault in the cupboard row's soft delete, the last write. Not
    // pg_temp: the service writes on another connection.
    await sql.unsafe(`
      create function refuse_cupboard_update() returns trigger language plpgsql
      as $$ begin raise exception 'refused by the test'; end $$`);
    await sql`
      create trigger refuse_cupboard_update before update on workspace_compendium_entries
      for each row execute function refuse_cupboard_update()`;
    try {
      // The fault itself, not some earlier refusal, is what stopped it.
      const error = await convert().catch((e: unknown) => e);
      expect((error as { cause?: unknown }).cause).toMatchObject({
        message: 'refused by the test',
      });
    } finally {
      await sql`drop trigger refuse_cupboard_update on workspace_compendium_entries`;
      await sql`drop function refuse_cupboard_update()`;
    }

    await expectNothingMoved(jarId, layerId);
  });

  it('answers NotFound for a compendium entry the coven does not hold', async () => {
    const loose = await insertIngredient(
      sql,
      makeIngredient({ name: 'Loose Testwort', canonicalName: 'Fixtura soluta' }),
      E.id,
    );
    // Why it could have succeeded: the entry is live, and B may convert in W.
    const [row] = await sql`select deleted_at from ingredients where id = ${loose}`;
    expect(row.deleted_at).toBeNull();

    await expect(convert(asUser(B), loose)).rejects.toBeInstanceOf(NotFound);
    expect(await ownEntries()).toHaveLength(0);
  });

  it('refuses a viewer by direct id, though the coven holds the entry and they are a member', async () => {
    const jarId = await jarOfEntry();
    // Why it could have succeeded: C is a live member of W and may read the entry.
    const viewer = await assertMembership(asUser(C), WORKSPACE_W_ID, { ingredient: ['read'] });
    expect(viewer.workspaceId).toBe(WORKSPACE_W_ID);
    expect((await cupboardRow()).deleted_at).toBeNull();

    await expect(convert(asUser(C))).rejects.toBeInstanceOf(Forbidden);
    await expectNothingMoved(jarId);
  });

  it('refuses a non-member by direct id', async () => {
    const jarId = await jarOfEntry();
    // Why it could have succeeded: D is a member who may convert, in X.
    await expect(
      assertMembership(asUser(D), WORKSPACE_X_ID, {
        ingredient: ['create', 'delete'],
        inventory: ['update'],
      }),
    ).resolves.toBeDefined();

    await expect(convert(asUser(D))).rejects.toBeInstanceOf(Forbidden);
    await expectNothingMoved(jarId);
  });
});
