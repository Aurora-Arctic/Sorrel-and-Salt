import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { COVEN_STOCK_LOCK_NAMESPACE } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, ValidationError } from '@/lib/errors';
import {
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

// A coven's own entry that hides a compendium entry never moves the coven's
// jars when it is saved (M12.27 retired the save-time follow of M12.8); only
// `createStock` redirects a new jar of a hidden form onto the local, until
// M12.28. The ingredient tables are emptied per test, and the cascade empties
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
function inputOf(fixture: IngredientFixture) {
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

describe("a save of the coven's own entry", () => {
  /** The jar W holds of the compendium form, and the figures it must still hold afterwards. */
  async function heldJar() {
    const jar = await entryJar();
    const before = await jarRow(jar);
    // Preconditions: the jar is live, on the compendium entry itself.
    expect(before).toMatchObject({ ingredient_id: entry, variant_id: entryForm, deleted_at: null });
    return { jar, before };
  }

  it("leaves the coven's jar of a hidden entry where it is when it creates the entry's namesake", async () => {
    const { jar, before } = await heldJar();

    await createWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      inputOf(local({ name: 'Testwort', variants: [] })),
    );

    expect(await jarRow(jar)).toEqual(before);
  });

  it("leaves the jar where it is when an update relabels the entry to the compendium's name", async () => {
    const { jar, before } = await heldJar();
    const id = await seedLocal();

    await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Testwort', variants: [] })),
    );

    expect(await jarRow(jar)).toEqual(before);
  });

  it("leaves the jar where it is when an update gives the entry the compendium's formal name", async () => {
    const { jar, before } = await heldJar();
    const id = await seedLocal();

    await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Covenwort', canonicalName: 'Fixtura testalis', variants: [] })),
    );

    expect(await jarRow(jar)).toEqual(before);
  });

  it("leaves the jar where it is when promoting a folk name relabels the entry to the compendium's name", async () => {
    const { jar, before } = await heldJar();
    const id = await seedLocal({ folkNames: ['Testwort'] });
    const [folk] = await sql`
      select id from ingredient_folk_names where ingredient_id = ${id} and name = 'Testwort'`;

    await promoteFolkName(asUser(A), WORKSPACE_W_ID, id, folk.id);

    expect(await jarRow(jar)).toEqual(before);
  });

  it('makes no form on the entry for the jar, and merges no two jars of one form', async () => {
    const { jar } = await heldJar();
    const id = await seedLocal({ variants: [makeVariant({ form: 'Testform' })] });
    const own = await insertStock(
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
    const before = await jars();

    await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Testwort', variants: [makeVariant({ form: 'Testform' })] })),
    );

    expect(await jars()).toEqual(before);
    expect((await jarRow(jar)).deleted_at).toBeNull();
    expect((await jarRow(own)).deleted_at).toBeNull();
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

// A create that adds a jar takes the
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

  it("is per coven: another coven's lock does not hold a new jar back", async () => {
    await holding(WORKSPACE_X_ID, async () => {
      const jar = await createStock(asUser(A), WORKSPACE_W_ID, entryForm, {
        quantityOnHand: 5,
        unit: 'g',
      });
      expect(jar.variantId).toBe(entryForm);
    });
  });
});
