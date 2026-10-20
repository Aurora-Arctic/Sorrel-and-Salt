import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { assertMembership } from '@/modules/coven';
import { splitLocalIntoCompendiumEntries } from '@/modules/ingredients';
import type { FormAssignment } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';

// M8.17: an own entry split across several compendium entries (the owner's
// call, 2026-10-20). Each of its forms goes to the pick whose form folds to
// the same name; a form two picks share goes where the caller assigns it.
// The one-pick case is convertLocalToCompendiumEntry, whose rules
// convert-local-to-compendium.test.ts holds; this file holds what a second
// pick adds. Every refusal leaves every row where it was.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** Two compendium entries: Splitwort with Rootform and Leafform, Twinwort with Leafform and Barkform. */
let split: string;
let twin: string;
let local: string;
/** The local's forms, by name. */
let root: string;
let leaf: string;
let bark: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  split = await insertIngredient(
    sql,
    makeIngredient({
      name: 'Splitwort',
      canonicalName: 'Fixtura splitta',
      variants: [makeVariant({ form: 'Rootform' }), makeVariant({ form: 'Leafform' })],
    }),
    E.id,
  );
  twin = await insertIngredient(
    sql,
    makeIngredient({
      name: 'Twinwort',
      canonicalName: 'Fixtura gemina',
      variants: [makeVariant({ form: 'Leafform' }), makeVariant({ form: 'Barkform' })],
    }),
    E.id,
  );
  local = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Our Mixwort',
      nomenclature: 'none',
      // Folded as the compendium's are; Leafform both picks have.
      variants: [
        makeVariant({ form: 'rootform' }),
        makeVariant({ form: 'leafform' }),
        makeVariant({ form: 'barkform' }),
      ],
    }),
    A.id,
  );
  root = await variantIdOf(sql, local, 'rootform');
  leaf = await variantIdOf(sql, local, 'leafform');
  bark = await variantIdOf(sql, local, 'barkform');
});

const splitInto = (
  assignments: FormAssignment[] = [],
  session = asUser(B),
  picks = [split, twin],
  localId = local,
) => splitLocalIntoCompendiumEntries(session, WORKSPACE_W_ID, localId, picks, assignments);

const jarOf = (variantId: string) =>
  insertStock(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: local, variantId, quantityOnHand: '3', unit: 'g' },
    A.id,
  );

/** A shared spell of A's in W with one layer of the local's `variantId`; the layer's id. */
async function layerOf(variantId: string): Promise<string> {
  const spellId = await insertSpell(
    sql,
    makeSpell({
      workspaceId: WORKSPACE_W_ID,
      visibility: 'workspace',
      layers: [{ ingredientId: local }],
    }),
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
  where workspace_id = ${WORKSPACE_W_ID} and deleted_at is null
  order by ingredient_id`;

async function refusal(promise: Promise<unknown>): Promise<ValidationError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return error as ValidationError;
}

/** Nothing moved: each jar still the local's, the local live, no cupboard row. */
async function expectNothingMoved(...jarIds: string[]) {
  for (const jarId of jarIds) {
    expect(await jarRow(jarId)).toMatchObject({ ingredient_id: local });
  }
  expect((await localRow()).deleted_at).toBeNull();
  expect(await cupboardRows()).toHaveLength(0);
}

describe('splitLocalIntoCompendiumEntries', () => {
  it('moves each form to the pick that has it, a shared one where assigned, and writes a cupboard row per pick', async () => {
    const rootJar = await jarOf(root);
    const leafJar = await jarOf(leaf);
    const barkLayer = await layerOf(bark);

    const result = await splitInto([{ formId: leaf, compendiumId: twin }]);

    expect(await jarRow(rootJar)).toMatchObject({
      ingredient_id: split,
      variant_id: await variantIdOf(sql, split, 'Rootform'),
      quantity_on_hand: '3.000',
    });
    expect(await jarRow(leafJar)).toMatchObject({
      ingredient_id: twin,
      variant_id: await variantIdOf(sql, twin, 'Leafform'),
    });
    expect(await layerRow(barkLayer)).toMatchObject({
      ingredient_id: twin,
      variant_id: await variantIdOf(sql, twin, 'Barkform'),
    });
    expect((await localRow()).deleted_at).not.toBeNull();
    const rows = await cupboardRows();
    expect(rows.map((row) => row.ingredient_id).sort()).toEqual([split, twin].sort());
    // Two entries cannot both take the own entry's name, which labels are unique by.
    expect(rows.map((row) => row.label)).toEqual([null, null]);
    expect(result.entries.map((row) => row.ingredientId).sort()).toEqual([split, twin].sort());
    expect(result.dropped.forms).toEqual([]);
  });

  it('drops a shared form that holds nothing and has no assignment', async () => {
    const rootJar = await jarOf(root);

    const result = await splitInto();

    expect(await jarRow(rootJar)).toMatchObject({ ingredient_id: split });
    expect((await localRow()).deleted_at).not.toBeNull();
    // Both picks have Leafform, so nothing of the name is lost.
    expect(result.dropped.forms).toEqual([]);
  });

  it('refuses a shared form holding a jar with no assignment, naming both picks, and moves nothing', async () => {
    const rootJar = await jarOf(root);
    const leafJar = await jarOf(leaf);

    const error = await refusal(splitInto());

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['forms']);
    expect(error.issues[0].message).toContain('leafform');
    expect(error.issues[0].message).toContain('Splitwort');
    expect(error.issues[0].message).toContain('Twinwort');
    await expectNothingMoved(rootJar, leafJar);
  });

  it('refuses a form holding something that no pick has, and moves nothing', async () => {
    const lost = await sql`
      insert into ingredient_variants (ingredient_id, form, created_by, updated_by)
      values (${local}, 'Lostform', ${A.id}, ${A.id}) returning id`;
    const lostJar = await jarOf(lost[0].id);
    const rootJar = await jarOf(root);

    const error = await refusal(splitInto([{ formId: leaf, compendiumId: split }]));

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['forms']);
    expect(error.issues[0].message).toContain('Lostform');
    await expectNothingMoved(lostJar, rootJar);
  });

  it('refuses an assignment to a pick without the form, and moves nothing', async () => {
    const rootJar = await jarOf(root);

    // Twinwort has no Rootform.
    const error = await refusal(splitInto([{ formId: root, compendiumId: twin }]));

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['assignments']);
    await expectNothingMoved(rootJar);
  });

  it('refuses an assignment naming a form that is not one of the entry', async () => {
    const rootJar = await jarOf(root);
    const theirForm = await variantIdOf(sql, split, 'Leafform');

    const error = await refusal(splitInto([{ formId: theirForm, compendiumId: split }]));

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['assignments']);
    await expectNothingMoved(rootJar);
  });

  it('refuses a pick that is not a live compendium entry', async () => {
    const rootJar = await jarOf(root);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${twin}`;

    await expect(splitInto()).rejects.toBeInstanceOf(NotFound);
    await expect(
      splitInto([], asUser(B), [split, '00000000-0000-4000-8000-000000000000']),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(splitInto([], asUser(B), [split, 'not-an-id'])).rejects.toBeInstanceOf(NotFound);
    await expectNothingMoved(rootJar);
  });

  it('refuses no picks at all', async () => {
    const error = await refusal(splitInto([], asUser(B), []));

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['picks']);
    expect((await localRow()).deleted_at).toBeNull();
  });

  it('refuses when a jar would meet one of a pick, and moves nothing', async () => {
    const rootJar = await jarOf(root);
    const barkJar = await jarOf(bark);
    // The coven already holds a jar of Twinwort's Barkform.
    await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: twin,
        variantId: await variantIdOf(sql, twin, 'Barkform'),
      },
      A.id,
    );

    const error = await refusal(splitInto());

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['jars']);
    // Rootform, which met nothing, did not move either.
    await expectNothingMoved(rootJar, barkJar);
  });

  it('refuses when a spell would lay a form twice, and moves nothing', async () => {
    const rootJar = await jarOf(root);
    const spellId = await insertSpell(
      sql,
      makeSpell({
        workspaceId: WORKSPACE_W_ID,
        visibility: 'workspace',
        layers: [{ ingredientId: local }, { ingredientId: twin }],
      }),
      A.id,
    );
    await sql`update spell_ingredients set variant_id = ${bark} where spell_id = ${spellId} and ingredient_id = ${local}`;
    await sql`update spell_ingredients set variant_id = ${await variantIdOf(sql, twin, 'Barkform')} where spell_id = ${spellId} and ingredient_id = ${twin}`;

    const error = await refusal(splitInto());

    expect(error.issues.map((issue) => issue.path[0])).toEqual(['layers']);
    await expectNothingMoved(rootJar);
  });

  it('refuses a viewer by direct id, though the entry and the picks are live and they are a member', async () => {
    const rootJar = await jarOf(root);
    // Why it could have succeeded: C is a live member of W and may read the local.
    const viewer = await assertMembership(asUser(C), WORKSPACE_W_ID, { ingredient: ['read'] });
    expect(viewer.workspaceId).toBe(WORKSPACE_W_ID);
    expect((await localRow()).deleted_at).toBeNull();

    await expect(splitInto([], asUser(C))).rejects.toBeInstanceOf(Forbidden);
    await expectNothingMoved(rootJar);
  });

  it('refuses a member of another coven by direct id', async () => {
    const rootJar = await jarOf(root);
    // Why it could have succeeded: D may create and delete ingredients, in X.
    await expect(
      assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['create', 'delete'] }),
    ).resolves.toBeDefined();

    await expect(splitInto([], asUser(D))).rejects.toBeInstanceOf(Forbidden);
    await expectNothingMoved(rootJar);
  });
});
