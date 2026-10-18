import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { COVEN_STOCK_LOCK_NAMESPACE } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, ValidationError } from '@/lib/errors';
import {
  JarMergeNeeded,
  createStock,
  createWorkspaceIngredient,
  deleteStock,
  getStock,
  promoteFolkName,
  updateStock,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf, variantRowsOf } from '../../../support/db/read-variants';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
  variantInput,
} from '../../../support/fixtures';

// M12.8: a jar follows a local ingredient that hides its compendium entry. A
// coven that holds a jar of a compendium form and then makes its own entry
// for the same ingredient finds the jar moved onto the local's form, in the
// same transaction as the save; two jars of one form merge where their units
// agree and refuse the save where they do not. This supersedes M9.4's "a
// hidden jar stays put" (claude-docs/design-decisions/m12.8-jar-follows-local.md).
// The ingredient tables are emptied per test, and the cascade empties
// `inventory_items`, so every jar a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** The compendium entry Testwort, with its one form Testform, and the jar W holds of it. */
let entry: string;
let entryForm: string;

const ENTRY_FACTS = makeVariant({
  form: 'Testform',
  description: 'Fixture form note',
  safetyNotes: 'Fixture form caution',
  toxic: true,
  elements: ['fire'],
  celestialBodies: ['Fixture Moon'],
  zodiacSigns: ['Fixture Ram'],
  colors: ['Fixture red'],
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entry = await insertIngredient(sql, makeIngredient({ variants: [ENTRY_FACTS] }), E.id);
  entryForm = await variantIdOf(sql, entry, 'Testform');
});

type JarSeed = Partial<Parameters<typeof insertStock>[1]>;

/** A jar W holds of the compendium form (5 g, threshold 10), unless it says otherwise. */
function entryJar(overrides: JarSeed = {}) {
  return insertStock(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: entry,
      variantId: entryForm,
      quantityOnHand: '5',
      unit: 'g',
      lowStockThreshold: '10',
      ...overrides,
    },
    A.id,
  );
}

/** A W-local fixture: no formal name, and so `none`, unless one is stated. */
function local(overrides: Overrides<IngredientFixture> = {}): IngredientFixture {
  const nomenclature = overrides.canonicalName ? 'botanical' : 'none';
  return makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature, ...overrides });
}

/** The fixture as a save's input: forms whole, and the picks and lists a form would send. */
function inputOf(
  fixture: IngredientFixture,
  jarMerges?: { jarId: string; quantityOnHand?: number | null; unit?: 'g' | 'kg' | 'tsp' | null }[],
) {
  const {
    workspaceId: _tier,
    categories: _categories,
    variants,
    substitutes,
    deities,
    ...input
  } = fixture;
  return {
    ...input,
    variants: variants.map((variant) => variantInput(variant)),
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
    ...(jarMerges ? { jarMerges } : {}),
  };
}

/** A Covenwort the coven already has, which hides nothing yet. */
const seedLocal = (overrides: Overrides<IngredientFixture> = {}) =>
  insertIngredient(sql, local({ name: 'Covenwort', variants: [], ...overrides }), A.id);

/** Every jar, tombstones included, by id. */
function jars() {
  return sql`
    select id, workspace_id, ingredient_id, variant_id, quantity_on_hand::text as quantity_on_hand,
      unit, unit_dimension, low_stock_threshold::text as low_stock_threshold, deleted_at
    from inventory_items order by id`;
}

async function jarRow(id: string) {
  const [row] = await sql`
    select id, workspace_id, ingredient_id, variant_id, quantity_on_hand::text as quantity_on_hand,
      unit, unit_dimension, low_stock_threshold::text as low_stock_threshold, deleted_at
    from inventory_items where id = ${id}`;
  return row;
}

/** The ingredient's live forms, whole. */
function liveVariants(ingredientId: string) {
  return sql`
    select id, form, form_id, description, safety_notes, toxic, elements, celestial_bodies,
      zodiac_signs, colors
    from ingredient_variants where ingredient_id = ${ingredientId} and deleted_at is null
    order by lower(form)`;
}

describe('a save that makes a local hide a compendium entry', () => {
  it("moves the coven's jar to a form of the new local, keeping every figure", async () => {
    const jar = await entryJar();

    const created = await createWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      inputOf(local({ name: 'Testwort', variants: [] })),
    );

    const forms = await liveVariants(created.id);
    expect(forms).toHaveLength(1);
    expect(await jarRow(jar)).toMatchObject({
      id: jar,
      workspace_id: WORKSPACE_W_ID,
      ingredient_id: created.id,
      variant_id: forms[0].id,
      quantity_on_hand: '5.000',
      unit: 'g',
      unit_dimension: 'weight',
      low_stock_threshold: '10.000',
      deleted_at: null,
    });
  });

  it("creates the form the local lacks with the compendium form's own facts, and no child rows", async () => {
    await entryJar();

    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      inputOf(local({ name: 'Testwort', variants: [] })),
    );

    const [form] = await liveVariants(created.id);
    expect(form).toMatchObject({
      form: 'Testform',
      description: 'Fixture form note',
      safety_notes: 'Fixture form caution',
      toxic: true,
      elements: ['fire'],
      celestial_bodies: ['Fixture Moon'],
      zodiac_signs: ['Fixture Ram'],
      colors: ['Fixture red'],
    });
    const [{ count }] = await sql`
      select (
        (select count(*) from ingredient_categories where variant_id = ${form.id}) +
        (select count(*) from ingredient_substitutes where variant_id = ${form.id}) +
        (select count(*) from reference_links where ingredient_variant_id = ${form.id})
      )::int as count`;
    expect(count).toBe(0);
  });

  it('reuses a form the save writes from its own list, in any casing', async () => {
    const jar = await entryJar();

    const created = await createWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      inputOf(local({ name: 'Testwort', variants: [makeVariant({ form: 'TESTFORM' })] })),
    );

    const forms = await liveVariants(created.id);
    expect(forms.map((form) => form.form)).toEqual(['TESTFORM']);
    expect((await jarRow(jar)).variant_id).toBe(forms[0].id);
  });

  it('reuses a form the local already had, in another casing', async () => {
    const jar = await entryJar();
    const id = await seedLocal({ variants: [makeVariant({ form: 'testFORM' })] });
    const existing = await variantIdOf(sql, id, 'testform');

    await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Testwort', variants: [makeVariant({ form: 'testFORM' })] })),
    );

    expect(await liveVariants(id)).toHaveLength(1);
    expect(await jarRow(jar)).toMatchObject({ ingredient_id: id, variant_id: existing });
  });

  it("moves the jar when an update relabels the local to the entry's name", async () => {
    const jar = await entryJar();
    const id = await seedLocal();

    await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Testwort', variants: [] })),
    );

    const [form] = await liveVariants(id);
    expect(await jarRow(jar)).toMatchObject({ ingredient_id: id, variant_id: form.id });
  });

  it("moves the jar when an update gives the local the entry's formal name", async () => {
    const jar = await entryJar();
    const id = await seedLocal();

    await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Covenwort', canonicalName: 'Fixtura testalis', variants: [] })),
    );

    const [form] = await liveVariants(id);
    expect(await jarRow(jar)).toMatchObject({ ingredient_id: id, variant_id: form.id });
  });

  it("moves the jar when promoting a folk name relabels the local to the entry's name", async () => {
    const jar = await entryJar();
    const id = await seedLocal({ folkNames: ['Testwort'] });
    const [folk] = await sql`
      select id from ingredient_folk_names where ingredient_id = ${id} and name = 'Testwort'`;

    await promoteFolkName(asUser(A), WORKSPACE_W_ID, id, folk.id);

    const [form] = await liveVariants(id);
    expect(await jarRow(jar)).toMatchObject({ ingredient_id: id, variant_id: form.id });
  });

  it("leaves another coven's jar of the same form where it is", async () => {
    const own = await entryJar();
    const elsewhere = await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_X_ID,
        ingredientId: entry,
        variantId: entryForm,
        quantityOnHand: '9',
        unit: 'g',
      },
      D.id,
    );
    const before = await jarRow(elsewhere);

    await createWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      inputOf(local({ name: 'Testwort', variants: [] })),
    );

    expect(await jarRow(elsewhere)).toEqual(before);
    expect((await jarRow(own)).ingredient_id).not.toBe(entry);
  });

  it.each([
    ['C, a viewer', C],
    ['D, a member of another coven', D],
  ])('refuses %s, and moves nothing', async (_label, user) => {
    const jar = await entryJar();
    const before = await jarRow(jar);

    await expect(
      createWorkspaceIngredient(
        asUser(user),
        WORKSPACE_W_ID,
        inputOf(local({ name: 'Testwort', variants: [] })),
      ),
    ).rejects.toBeInstanceOf(Forbidden);

    expect(await jarRow(jar)).toEqual(before);
  });
});

describe('two jars of one form', () => {
  /** The local Testwort holding a jar of Testform, and the coven's jar of the entry's form. */
  async function bothHeld(localJar: JarSeed, movingJar: JarSeed) {
    const id = await seedLocal({ variants: [makeVariant({ form: 'Testform' })] });
    const form = await variantIdOf(sql, id, 'Testform');
    const held = await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: id,
        variantId: form,
        lowStockThreshold: '7',
        ...localJar,
      },
      A.id,
    );
    const moving = await entryJar(movingJar);
    return { id, held, moving };
  }

  const relabel = (id: string, jarMerges?: Parameters<typeof inputOf>[1]) =>
    updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      inputOf(
        local({ name: 'Testwort', variants: [makeVariant({ form: 'Testform' })] }),
        jarMerges,
      ),
    );

  it("adds the quantities exactly where the units agree, and keeps the local jar's own threshold", async () => {
    const { id, held, moving } = await bothHeld(
      { quantityOnHand: '0.1', unit: 'g' },
      { quantityOnHand: '0.2', unit: 'g' },
    );

    await relabel(id);

    expect(await jarRow(held)).toMatchObject({
      quantity_on_hand: '0.300',
      unit: 'g',
      unit_dimension: 'weight',
      low_stock_threshold: '7.000',
      deleted_at: null,
    });
    expect((await jarRow(moving)).deleted_at).not.toBeNull();
  });

  it.each([
    [
      'the local jar',
      { quantityOnHand: null, unit: null },
      { quantityOnHand: '5', unit: 'kg' as const },
    ],
    [
      'the moving jar',
      { quantityOnHand: '5', unit: 'kg' as const },
      { quantityOnHand: null, unit: null },
    ],
  ])(
    "merges when %s holds no amount at all, taking the other's figure",
    async (_who, localJar, movingJar) => {
      const { id, held, moving } = await bothHeld(localJar, movingJar);

      await relabel(id);

      expect(await jarRow(held)).toMatchObject({
        quantity_on_hand: '5.000',
        unit: 'kg',
        unit_dimension: 'weight',
      });
      expect((await jarRow(moving)).deleted_at).not.toBeNull();
    },
  );

  it('keeps an amount of nothing unmeasured when both jars hold none', async () => {
    const { id, held } = await bothHeld(
      { quantityOnHand: null, unit: null },
      { quantityOnHand: null, unit: null },
    );

    await relabel(id);

    expect(await jarRow(held)).toMatchObject({ quantity_on_hand: null, unit: null });
  });

  it('refuses a save whose jars differ in unit, g against kg included, and writes nothing', async () => {
    const { id, held, moving } = await bothHeld(
      { quantityOnHand: '1', unit: 'kg' },
      { quantityOnHand: '500', unit: 'g' },
    );
    const beforeJars = await jars();
    const beforeLocal = (await sql`select name, slug from ingredients where id = ${id}`)[0];

    const error = await relabel(id).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(JarMergeNeeded);
    expect(error).toBeInstanceOf(ValidationError);
    const refusal = error as JarMergeNeeded;
    expect(refusal.issues.map((issue) => issue.path)).toEqual([['jarMerges']]);
    expect(refusal.conflicts).toHaveLength(1);
    expect(refusal.conflicts[0]).toMatchObject({
      reason: 'units',
      localJar: { id: held },
      movingJar: { id: moving },
    });
    expect(await jars()).toEqual(beforeJars);
    expect((await sql`select name, slug from ingredients where id = ${id}`)[0]).toEqual(
      beforeLocal,
    );
  });

  it('moves nothing when a later jar conflicts: no jar leaves, and no form is made', async () => {
    // Two compendium entries the one local hides, each with a Testform jar:
    // the first moves, the second meets it in another unit.
    const other = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Testwort',
        canonicalName: 'Fixtura altera',
        variants: [makeVariant({ form: 'testform' })],
      }),
      E.id,
    );
    const otherForm = await variantIdOf(sql, other, 'Testform');
    const first = await entryJar({ quantityOnHand: '5', unit: 'g' });
    const second = await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: other,
        variantId: otherForm,
        quantityOnHand: '5',
        unit: 'kg',
      },
      A.id,
    );
    const before = await jars();

    const error = await createWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      inputOf(local({ name: 'Testwort', variants: [] })),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(JarMergeNeeded);
    const ids = (error as JarMergeNeeded).conflicts.flatMap((c) => [c.localJar.id, c.movingJar.id]);
    expect(ids.sort()).toEqual([first, second].sort());
    expect(await jars()).toEqual(before);
    const [{ count }] = await sql`
      select count(*)::int as count from ingredients where workspace_id = ${WORKSPACE_W_ID}`;
    expect(count).toBe(0);
    const [{ forms }] = await sql`select count(*)::int as forms from ingredient_variants`;
    expect(forms).toBe(2);
  });

  it('takes the chosen figure, its unit and dimension, and soft-deletes the moving jar', async () => {
    const { id, held, moving } = await bothHeld(
      { quantityOnHand: '1', unit: 'kg' },
      { quantityOnHand: '500', unit: 'g' },
    );

    await relabel(id, [{ jarId: moving, quantityOnHand: 1500, unit: 'g' }]);

    expect(await jarRow(held)).toMatchObject({
      quantity_on_hand: '1500.000',
      unit: 'g',
      unit_dimension: 'weight',
      low_stock_threshold: '7000.000',
      deleted_at: null,
    });
    expect((await jarRow(moving)).deleted_at).not.toBeNull();
  });

  it('sets the chosen figure even where the units agree', async () => {
    const { id, held, moving } = await bothHeld(
      { quantityOnHand: '1', unit: 'g' },
      { quantityOnHand: '2', unit: 'g' },
    );

    await relabel(id, [{ jarId: moving, quantityOnHand: 2, unit: 'g' }]);

    expect((await jarRow(held)).quantity_on_hand).toBe('2.000');
  });

  it("converts the local jar's threshold when a chosen merge changes the unit within its dimension", async () => {
    const { id, held, moving } = await bothHeld(
      { quantityOnHand: '1', unit: 'g', lowStockThreshold: '10' },
      { quantityOnHand: '2', unit: 'kg' },
    );

    await relabel(id, [{ jarId: moving, quantityOnHand: 3, unit: 'kg' }]);

    expect(await jarRow(held)).toMatchObject({
      unit: 'kg',
      low_stock_threshold: '0.010',
    });
  });

  it("clears the local jar's threshold when a chosen merge crosses dimensions", async () => {
    const { id, held, moving } = await bothHeld(
      { quantityOnHand: '1', unit: 'g', lowStockThreshold: '10' },
      { quantityOnHand: '2', unit: 'g' },
    );

    await relabel(id, [{ jarId: moving, quantityOnHand: 3, unit: 'tsp' }]);

    expect(await jarRow(held)).toMatchObject({
      unit: 'tsp',
      unit_dimension: 'volume',
      low_stock_threshold: null,
    });
  });

  it("leaves the local jar's threshold alone when a chosen merge keeps the unit", async () => {
    const { id, held, moving } = await bothHeld(
      { quantityOnHand: '1', unit: 'g', lowStockThreshold: '10' },
      { quantityOnHand: '2', unit: 'g' },
    );

    await relabel(id, [{ jarId: moving, quantityOnHand: 3, unit: 'g' }]);

    expect(await jarRow(held)).toMatchObject({ unit: 'g', low_stock_threshold: '10.000' });
  });

  it("clears the threshold of a local jar with no unit when it takes the moving jar's", async () => {
    const { id, held } = await bothHeld(
      { quantityOnHand: null, unit: null, lowStockThreshold: '10' },
      { quantityOnHand: '2', unit: 'g' },
    );

    await relabel(id);

    expect(await jarRow(held)).toMatchObject({ unit: 'g', low_stock_threshold: null });
  });

  it('ignores a choice naming a jar that does not merge', async () => {
    const jar = await entryJar();
    const id = await seedLocal();

    await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Testwort', variants: [] }), [
        { jarId: jar, quantityOnHand: 99, unit: 'kg' },
      ]),
    );

    expect(await jarRow(jar)).toMatchObject({
      ingredient_id: id,
      quantity_on_hand: '5.000',
      unit: 'g',
      deleted_at: null,
    });
  });

  it('refuses a choice the merged jar cannot hold', async () => {
    const { id } = await bothHeld(
      { quantityOnHand: '999999999', unit: 'g' },
      { quantityOnHand: '2', unit: 'g' },
    );
    const before = await jars();

    const error = await relabel(id).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).not.toBeInstanceOf(JarMergeNeeded);
    expect(await jars()).toEqual(before);
  });
});

describe('createStock on a form of a hidden entry', () => {
  it("stores the jar on the local's form of the same name, making the form if it is missing", async () => {
    const id = await insertIngredient(sql, local({ name: 'Testwort', variants: [] }), A.id);

    const row = await createStock(asUser(B), WORKSPACE_W_ID, entryForm, {
      quantityOnHand: 3,
      unit: 'g',
    });

    const [form] = await liveVariants(id);
    expect(form).toMatchObject({ form: 'Testform', toxic: true });
    expect(row).toMatchObject({
      ingredientId: id,
      variantId: form.id,
      workspaceId: WORKSPACE_W_ID,
    });
    expect((await jarRow(row.id)).variant_id).toBe(form.id);
  });

  it("uses the local's existing form, in any casing", async () => {
    const id = await insertIngredient(
      sql,
      local({ name: 'Testwort', variants: [makeVariant({ form: 'TESTFORM' })] }),
      A.id,
    );

    const row = await createStock(asUser(A), WORKSPACE_W_ID, entryForm, {});

    expect(row.variantId).toBe((await variantRowsOf(sql, id))[0].id);
    expect(await liveVariants(id)).toHaveLength(1);
  });

  it('refuses a form the local already holds a jar of, beside variantId', async () => {
    const id = await insertIngredient(
      sql,
      local({ name: 'Testwort', variants: [makeVariant({ form: 'Testform' })] }),
      A.id,
    );
    await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: id,
        variantId: await variantIdOf(sql, id, 'Testform'),
      },
      A.id,
    );
    const before = await jars();

    const error = await createStock(asUser(A), WORKSPACE_W_ID, entryForm, {}).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues[0].path).toEqual(['variantId']);
    expect(await jars()).toEqual(before);
  });

  it("prefers the local that shares the entry's identity over an older one that shares its label", async () => {
    const byLabel = await insertIngredient(sql, local({ name: 'Testwort', variants: [] }), A.id);
    const byIdentity = await insertIngredient(
      sql,
      local({ name: 'Newer Wort', canonicalName: 'Fixtura testalis', variants: [] }),
      A.id,
    );
    // The older row, by creation time, is the label match.
    await sql`update ingredients set created_at = now() - interval '1 day' where id = ${byLabel}`;

    const row = await createStock(asUser(A), WORKSPACE_W_ID, entryForm, {});

    expect(row.ingredientId).toBe(byIdentity);
  });

  it('stocks the compendium form itself where no local hides the entry', async () => {
    await insertIngredient(sql, local({ name: 'Covenwort', variants: [] }), A.id);

    const row = await createStock(asUser(A), WORKSPACE_W_ID, entryForm, {});

    expect(row).toMatchObject({ ingredientId: entry, variantId: entryForm });
  });

  it('refuses a viewer', async () => {
    await insertIngredient(sql, local({ name: 'Testwort', variants: [] }), A.id);

    await expect(createStock(asUser(C), WORKSPACE_W_ID, entryForm, {})).rejects.toBeInstanceOf(
      Forbidden,
    );
    expect(await jars()).toHaveLength(0);
  });
});

describe('a jar after it has moved', () => {
  /** A moved jar: W's jar, now on a form of W's own Testwort. */
  async function movedJar() {
    const jar = await entryJar();
    const created = await createWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      inputOf(local({ name: 'Testwort', variants: [] })),
    );
    return { jar, created };
  }

  it('is changed and deleted by a member of the coven by its id, and refused to a member of another', async () => {
    const { jar, created } = await movedJar();
    // Preconditions: the jar is live in W, on W's own ingredient, and D really
    // is a member of a coven, only not this one.
    expect(await jarRow(jar)).toMatchObject({
      workspace_id: WORKSPACE_W_ID,
      ingredient_id: created.id,
      deleted_at: null,
    });
    expect(await getStock(asUser(B), WORKSPACE_W_ID, jar)).toMatchObject({ id: jar });
    const [{ member }] = await sql`
      select count(*)::int as member from workspace_members
      where user_id = ${D.id} and workspace_id = ${WORKSPACE_X_ID} and deleted_at is null`;
    expect(member).toBe(1);

    await expect(
      updateStock(asUser(D), WORKSPACE_W_ID, jar, { quantityOnHand: 1 }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(deleteStock(asUser(D), WORKSPACE_W_ID, jar)).rejects.toBeInstanceOf(Forbidden);
    expect((await jarRow(jar)).quantity_on_hand).toBe('5.000');

    await updateStock(asUser(B), WORKSPACE_W_ID, jar, { quantityOnHand: 1 });
    expect((await jarRow(jar)).quantity_on_hand).toBe('1.000');
    await deleteStock(asUser(B), WORKSPACE_W_ID, jar);
    expect((await jarRow(jar)).deleted_at).not.toBeNull();
  });

  it('is changed by nobody who is a viewer', async () => {
    const { jar } = await movedJar();

    await expect(
      updateStock(asUser(C), WORKSPACE_W_ID, jar, { quantityOnHand: 1 }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(deleteStock(asUser(C), WORKSPACE_W_ID, jar)).rejects.toBeInstanceOf(Forbidden);
  });
});

describe('a promote that meets two jars in different units', () => {
  it('is refused with no field to blame, and moves nothing', async () => {
    const id = await seedLocal({
      folkNames: ['Testwort'],
      variants: [makeVariant({ form: 'Testform' })],
    });
    const held = await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: id,
        variantId: await variantIdOf(sql, id, 'Testform'),
        quantityOnHand: '1',
        unit: 'kg',
      },
      A.id,
    );
    const moving = await entryJar({ quantityOnHand: '500', unit: 'g' });
    const [folk] = await sql`
      select id from ingredient_folk_names where ingredient_id = ${id} and name = 'Testwort'`;
    const beforeJars = await jars();

    const error = await promoteFolkName(asUser(A), WORKSPACE_W_ID, id, folk.id).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(JarMergeNeeded);
    const refusal = error as JarMergeNeeded;
    expect(refusal.issues.map((issue) => issue.path)).toEqual([[]]);
    expect(refusal.conflicts).toHaveLength(1);
    expect(refusal.conflicts[0]).toMatchObject({
      localJar: { id: held },
      movingJar: { id: moving },
    });
    expect(await jars()).toEqual(beforeJars);
    expect((await sql`select name from ingredients where id = ${id}`)[0].name).toBe('Covenwort');
  });
});

// M12.8: a save that moves jars and a create that adds one both take the
// coven's stock lock first, so whichever comes second waits for the first and
// sees it. Each test holds that lock from a connection of its own, as a save
// in flight would, and watches the call queue behind it.
describe("a coven's stock lock", () => {
  const WAIT_MS = 200;

  /**
   * Holds `workspaceId`'s lock in an open transaction while `during` runs, and
   * releases it after, even when `during` throws.
   */
  async function holding(workspaceId: string, during: () => Promise<void>) {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let acquired!: () => void;
    const held = new Promise<void>((resolve) => (acquired = resolve));
    const transaction = sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${COVEN_STOCK_LOCK_NAMESPACE}, hashtext(${workspaceId}))`;
      acquired();
      await released;
    });
    try {
      await held;
      await during();
    } finally {
      release();
      await transaction;
    }
  }

  /**
   * Starts `call` while `lockedId`'s lock is held, asserts it has not settled
   * and `untouched` still holds after the wait, then releases the lock and
   * returns what the call came to.
   */
  async function queued<T>(
    lockedId: string,
    call: () => Promise<T>,
    untouched: () => Promise<void>,
  ): Promise<T> {
    let running!: Promise<T>;
    await holding(lockedId, async () => {
      let settled = false;
      running = call();
      running.then(
        () => (settled = true),
        () => (settled = true),
      );
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
      expect(settled).toBe(false);
      await untouched();
    });
    return running;
  }

  const countOf = async (table: 'ingredients' | 'inventory_items', where: string) =>
    (await sql.unsafe(`select count(*)::int as n from ${table} where ${where}`))[0].n as number;

  it('holds a create back until the lock is released', async () => {
    const created = await queued(
      WORKSPACE_W_ID,
      () =>
        createWorkspaceIngredient(
          asUser(A),
          WORKSPACE_W_ID,
          inputOf(local({ name: 'Testwort', variants: [] })),
        ),
      async () => {
        expect(await countOf('ingredients', `workspace_id = '${WORKSPACE_W_ID}'`)).toBe(0);
      },
    );
    expect(created.name).toBe('Testwort');
  });

  it('holds an update back until the lock is released', async () => {
    const id = await seedLocal();
    const updated = await queued(
      WORKSPACE_W_ID,
      () =>
        updateWorkspaceIngredient(
          asUser(A),
          WORKSPACE_W_ID,
          id,
          inputOf(local({ name: 'Testwort', variants: [] })),
        ),
      async () => {
        expect(await countOf('ingredients', `id = '${id}' and name = 'Covenwort'`)).toBe(1);
      },
    );
    expect(updated.name).toBe('Testwort');
  });

  it('holds a promote back until the lock is released', async () => {
    const id = await seedLocal({ folkNames: ['Testwort'] });
    const [folk] = await sql`
      select id from ingredient_folk_names where ingredient_id = ${id} and name = 'Testwort'`;
    const promoted = await queued(
      WORKSPACE_W_ID,
      () => promoteFolkName(asUser(A), WORKSPACE_W_ID, id, folk.id),
      async () => {
        expect(await countOf('ingredients', `id = '${id}' and name = 'Covenwort'`)).toBe(1);
      },
    );
    expect(promoted.name).toBe('Testwort');
  });

  it('holds a new jar back until the lock is released', async () => {
    const jar = await queued(
      WORKSPACE_W_ID,
      () => createStock(asUser(A), WORKSPACE_W_ID, entryForm, { quantityOnHand: 5, unit: 'g' }),
      async () => {
        expect(await countOf('inventory_items', 'true')).toBe(0);
      },
    );
    expect(jar.variantId).toBe(entryForm);
  });

  it("is per coven: another coven's lock does not hold a call back", async () => {
    await holding(WORKSPACE_X_ID, async () => {
      const created = await createWorkspaceIngredient(
        asUser(A),
        WORKSPACE_W_ID,
        inputOf(local({ name: 'Testwort', variants: [] })),
      );
      expect(created.name).toBe('Testwort');
    });
  });
});
