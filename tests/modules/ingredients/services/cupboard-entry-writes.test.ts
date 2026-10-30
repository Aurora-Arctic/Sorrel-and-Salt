import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, StaleWrite, ValidationError } from '@/lib/errors';
import {
  addCupboardEntry,
  annotateCupboardEntry,
  createStock,
  createWorkspaceIngredient,
  removeCupboardEntry,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import {
  type IngredientFixture,
  makeIngredient,
  makeVariant,
  variantInput,
} from '../../../support/fixtures';

// The three writes of a coven's cupboard entry, and the two places that keep the label rule (add/annotate here, own-row names in workspace-ingredients.ts).
// Which role may do what is asserted beside the precondition that would let the write through.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let entry: string;
let form: string;
let otherForm: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entry = await insertIngredient(
    sql,
    makeIngredient({
      variants: [makeVariant({ form: 'Testform' }), makeVariant({ form: 'Otherform' })],
    }),
    E.id,
  );
  form = await variantIdOf(sql, entry, 'Testform');
  otherForm = await variantIdOf(sql, entry, 'Otherform');
});

/** The coven's live cupboard rows for an ingredient, read raw. */
async function rowsOf(ingredientId: string) {
  return sql`
    select * from workspace_compendium_entries
    where workspace_id = ${WORKSPACE_W_ID} and ingredient_id = ${ingredientId} and deleted_at is null`;
}

async function liveRows(): Promise<number> {
  const [row] = await sql`
    select count(*)::int as count from workspace_compendium_entries
    where workspace_id = ${WORKSPACE_W_ID} and deleted_at is null`;
  return row.count as number;
}

/** The fixture as a save's input, as the form sends it. */
function inputOf(fixture: IngredientFixture) {
  const { workspaceId: _tier, categories: _c, variants, substitutes, deities, ...input } = fixture;
  return {
    ...input,
    variants: variants.map((variant) => variantInput(variant)),
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
  };
}

const issuePath = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues.map((i) => i.path[0]);
};

describe('addCupboardEntry', () => {
  it('lets a member add an entry, bare, and writes the row stamped by them', async () => {
    const row = await addCupboardEntry(asUser(B), WORKSPACE_W_ID, entry);

    const [stored] = await rowsOf(entry);
    expect(stored.id).toBe(row.id);
    expect(stored.label).toBeNull();
    expect(stored.elements).toBeNull();
    expect(stored.created_by).toBe(B.id);
  });

  it('keeps the overrides it is given, an empty list included', async () => {
    await addCupboardEntry(asUser(B), WORKSPACE_W_ID, entry, {
      label: 'Hedgewort',
      safetyNotes: 'Our caution',
      elements: ['water'],
      colors: [],
    });

    const [stored] = await rowsOf(entry);
    expect(stored).toMatchObject({
      label: 'Hedgewort',
      safety_notes: 'Our caution',
      elements: ['water'],
      colors: [],
      description: null,
    });
  });

  it('refuses a viewer by direct id, with the entry live and the row absent', async () => {
    // Why it could have succeeded: C is a live member and the entry is live.
    const [member] = await sql`
      select 1 from workspace_members where workspace_id = ${WORKSPACE_W_ID} and user_id = ${C.id} and deleted_at is null`;
    expect(member).toBeDefined();
    expect(await rowsOf(entry)).toHaveLength(0);

    await expect(addCupboardEntry(asUser(C), WORKSPACE_W_ID, entry)).rejects.toBeInstanceOf(
      Forbidden,
    );
    expect(await rowsOf(entry)).toHaveLength(0);
  });

  it('refuses a non-member', async () => {
    await expect(addCupboardEntry(asUser(D), WORKSPACE_W_ID, entry)).rejects.toBeInstanceOf(
      Forbidden,
    );
    expect(await liveRows()).toBe(0);
  });

  it('is NotFound for a coven-tier id', async () => {
    const own = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Ownwort' }),
      A.id,
    );

    await expect(addCupboardEntry(asUser(B), WORKSPACE_W_ID, own)).rejects.toBeInstanceOf(NotFound);
  });

  it('is NotFound for a soft-deleted compendium entry', async () => {
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${entry}`;

    await expect(addCupboardEntry(asUser(B), WORKSPACE_W_ID, entry)).rejects.toBeInstanceOf(
      NotFound,
    );
  });

  it('refuses a second add beside ingredientId', async () => {
    await addCupboardEntry(asUser(B), WORKSPACE_W_ID, entry);

    expect(await issuePath(addCupboardEntry(asUser(B), WORKSPACE_W_ID, entry))).toEqual([
      'ingredientId',
    ]);
    expect(await rowsOf(entry)).toHaveLength(1);
  });

  it('refuses a label an own ingredient already carries, beside label', async () => {
    await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Hedgewort' }),
      A.id,
    );

    expect(
      await issuePath(addCupboardEntry(asUser(B), WORKSPACE_W_ID, entry, { label: 'hedgewort' })),
    ).toEqual(['label']);
    expect(await liveRows()).toBe(0);
  });

  it("refuses a label another entry's row already carries, beside label", async () => {
    const other = await insertIngredient(
      sql,
      makeIngredient({ name: 'Mockleaf', nomenclature: 'none', canonicalName: null }),
      E.id,
    );
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: other, label: 'Hedgewort' },
      A.id,
    );

    expect(
      await issuePath(addCupboardEntry(asUser(B), WORKSPACE_W_ID, entry, { label: 'Hedgewort' })),
    ).toEqual(['label']);
  });
});

describe('annotateCupboardEntry', () => {
  let row: string;
  beforeEach(async () => {
    row = await insertCupboardEntry(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: entry,
        label: 'Hedgewort',
        description: 'Our note',
        elements: ['fire'],
      },
      A.id,
    );
  });

  it('sets a value, hands a column back with null, clears a list with [], and leaves a missing key', async () => {
    await annotateCupboardEntry(asUser(B), WORKSPACE_W_ID, entry, {
      safetyNotes: 'New caution',
      description: null,
      elements: [],
    });

    const [stored] = await rowsOf(entry);
    expect(stored.id).toBe(row);
    expect(stored).toMatchObject({
      safety_notes: 'New caution',
      description: null,
      elements: [],
      label: 'Hedgewort',
      updated_by: B.id,
    });
  });

  it('refuses a save over a newer revision with StaleWrite and writes nothing', async () => {
    const [opened] = await rowsOf(entry);
    await annotateCupboardEntry(asUser(B), WORKSPACE_W_ID, entry, { description: 'theirs' });
    const [moved] = await rowsOf(entry);
    // The precondition: the row has moved past the revision A read.
    expect(moved.revision).toBeGreaterThan(opened.revision);

    const refused = await annotateCupboardEntry(
      asUser(A),
      WORKSPACE_W_ID,
      entry,
      { description: 'mine' },
      opened.revision as number,
    ).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(StaleWrite);
    expect((refused as StaleWrite).currentRevision).toBe(moved.revision);
    const [stored] = await rowsOf(entry);
    expect(stored).toMatchObject({ description: 'theirs', revision: moved.revision });

    // The same save at the revision now current goes through, so the refusal was the revision.
    await annotateCupboardEntry(
      asUser(A),
      WORKSPACE_W_ID,
      entry,
      { description: 'mine' },
      moved.revision as number,
    );
    expect((await rowsOf(entry))[0].description).toBe('mine');
  });

  it('writes over a newer revision when none is named', async () => {
    const [opened] = await rowsOf(entry);
    await annotateCupboardEntry(asUser(B), WORKSPACE_W_ID, entry, { description: 'theirs' });
    expect((await rowsOf(entry))[0].revision).toBeGreaterThan(opened.revision);
    await annotateCupboardEntry(asUser(A), WORKSPACE_W_ID, entry, { description: 'mine' });
    expect((await rowsOf(entry))[0].description).toBe('mine');
  });

  it('refuses a viewer by direct id, with the row live and the viewer a member', async () => {
    const [member] = await sql`
      select 1 from workspace_members where workspace_id = ${WORKSPACE_W_ID} and user_id = ${C.id} and deleted_at is null`;
    expect(member).toBeDefined();
    expect(await rowsOf(entry)).toHaveLength(1);

    await expect(
      annotateCupboardEntry(asUser(C), WORKSPACE_W_ID, entry, { description: 'Viewer note' }),
    ).rejects.toBeInstanceOf(Forbidden);
    expect((await rowsOf(entry))[0].description).toBe('Our note');
  });

  it('refuses a non-member', async () => {
    await expect(
      annotateCupboardEntry(asUser(D), WORKSPACE_W_ID, entry, { description: 'x' }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('is NotFound where the coven holds no row, and for a coven-tier id', async () => {
    const other = await insertIngredient(
      sql,
      makeIngredient({ name: 'Mockleaf', nomenclature: 'none', canonicalName: null }),
      E.id,
    );
    const own = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Ownwort' }),
      A.id,
    );

    await expect(
      annotateCupboardEntry(asUser(B), WORKSPACE_W_ID, other, { description: 'x' }),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(
      annotateCupboardEntry(asUser(B), WORKSPACE_W_ID, own, { description: 'x' }),
    ).rejects.toBeInstanceOf(NotFound);
  });

  it('is NotFound once the row is removed', async () => {
    await sql`update workspace_compendium_entries set deleted_at = now(), deleted_by = ${A.id} where id = ${row}`;

    await expect(
      annotateCupboardEntry(asUser(B), WORKSPACE_W_ID, entry, { description: 'x' }),
    ).rejects.toBeInstanceOf(NotFound);
  });

  it("refuses a label an own ingredient carries, but not the row's own label", async () => {
    await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Ownwort' }),
      A.id,
    );

    expect(
      await issuePath(
        annotateCupboardEntry(asUser(B), WORKSPACE_W_ID, entry, { label: 'Ownwort' }),
      ),
    ).toEqual(['label']);
    await expect(
      annotateCupboardEntry(asUser(B), WORKSPACE_W_ID, entry, { label: 'Hedgewort' }),
    ).resolves.toMatchObject({ id: row });
  });
});

describe('removeCupboardEntry', () => {
  let row: string;
  beforeEach(async () => {
    row = await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry },
      A.id,
    );
  });

  it('lets a member remove the row, stamping them, and leaves the compendium entry', async () => {
    await removeCupboardEntry(asUser(B), WORKSPACE_W_ID, entry);

    expect(await rowsOf(entry)).toHaveLength(0);
    const [stored] =
      await sql`select deleted_by from workspace_compendium_entries where id = ${row}`;
    expect(stored.deleted_by).toBe(B.id);
    const [kept] = await sql`select 1 from ingredients where id = ${entry} and deleted_at is null`;
    expect(kept).toBeDefined();
  });

  it('refuses a viewer by direct id, with the row live', async () => {
    expect(await rowsOf(entry)).toHaveLength(1);

    await expect(removeCupboardEntry(asUser(C), WORKSPACE_W_ID, entry)).rejects.toBeInstanceOf(
      Forbidden,
    );
    expect(await rowsOf(entry)).toHaveLength(1);
  });

  it('refuses a non-member', async () => {
    await expect(removeCupboardEntry(asUser(D), WORKSPACE_W_ID, entry)).rejects.toBeInstanceOf(
      Forbidden,
    );
  });

  it('is NotFound for a coven-tier id and for a row already removed', async () => {
    const own = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Ownwort' }),
      A.id,
    );
    await removeCupboardEntry(asUser(B), WORKSPACE_W_ID, entry);

    await expect(removeCupboardEntry(asUser(B), WORKSPACE_W_ID, own)).rejects.toBeInstanceOf(
      NotFound,
    );
    await expect(removeCupboardEntry(asUser(B), WORKSPACE_W_ID, entry)).rejects.toBeInstanceOf(
      NotFound,
    );
  });

  it('is refused while a jar exists, and allowed once the jar is soft-deleted', async () => {
    const jar = await insertStock(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry, variantId: form },
      A.id,
    );

    expect(await issuePath(removeCupboardEntry(asUser(B), WORKSPACE_W_ID, entry))).toEqual([
      'ingredientId',
    ]);
    expect(await rowsOf(entry)).toHaveLength(1);

    await sql`update inventory_items set deleted_at = now(), deleted_by = ${A.id} where id = ${jar}`;
    await removeCupboardEntry(asUser(B), WORKSPACE_W_ID, entry);
    expect(await rowsOf(entry)).toHaveLength(0);
  });
});

describe('the label rule, from the own-row side', () => {
  it('refuses an own ingredient named as a cupboard label, on name, at create and at rename', async () => {
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry, label: 'Hedgewort' },
      A.id,
    );
    const own = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Ownwort' }),
      A.id,
    );

    expect(
      await issuePath(
        createWorkspaceIngredient(
          asUser(B),
          WORKSPACE_W_ID,
          inputOf(makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'hedgewort', variants: [] })),
        ),
      ),
    ).toEqual(['name']);
    expect(
      await issuePath(
        updateWorkspaceIngredient(
          asUser(B),
          WORKSPACE_W_ID,
          own,
          inputOf(makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Hedgewort', variants: [] })),
        ),
      ),
    ).toEqual(['name']);
  });
});

describe('createStock on a compendium form', () => {
  const jarCount = async () => {
    const [row] = await sql`
      select count(*)::int as count from inventory_items
      where workspace_id = ${WORKSPACE_W_ID} and deleted_at is null`;
    return row.count as number;
  };

  it('inserts the cupboard row once, and a second jar does not duplicate it', async () => {
    expect(await rowsOf(entry)).toHaveLength(0);

    await createStock(asUser(B), WORKSPACE_W_ID, form, {});
    expect(await rowsOf(entry)).toHaveLength(1);

    await createStock(asUser(B), WORKSPACE_W_ID, otherForm, {});
    expect(await jarCount()).toBe(2);
    expect(await rowsOf(entry)).toHaveLength(1);
  });

  it('leaves a row the coven already annotated as it was', async () => {
    const row = await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry, label: 'Hedgewort' },
      A.id,
    );

    await createStock(asUser(B), WORKSPACE_W_ID, form, {});

    const stored = await rowsOf(entry);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: row, label: 'Hedgewort' });
  });

  // A name match takes nothing from the compendium entry. The jar is
  // stored where the member put it, not on the coven's same-named entry.
  it("stores the jar on the compendium form, though the coven's own entry shares its identity and form", async () => {
    const own = await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: WORKSPACE_W_ID,
        variants: [makeVariant({ form: 'Testform' })],
      }),
      A.id,
    );
    // Why the jar could have gone to the own entry: it is live in W, and its
    // name, identity and form all match the compendium entry's.
    const shared = await sql`
      select id, workspace_id, name, identity_key from ingredients
      where id in (${entry}, ${own}) and deleted_at is null`;
    const [ownRow, entryRow] = [own, entry].map((id) => shared.find((row) => row.id === id));
    expect(ownRow).toMatchObject({ workspace_id: WORKSPACE_W_ID });
    expect(entryRow).toMatchObject({ workspace_id: null });
    expect(ownRow?.name).toBe(entryRow?.name);
    expect(ownRow?.identity_key).toBe(entryRow?.identity_key);
    expect(await variantIdOf(sql, own, 'Testform')).toBeTypeOf('string');
    expect(await rowsOf(entry)).toHaveLength(0);

    const jar = await createStock(asUser(B), WORKSPACE_W_ID, form, {});

    expect(jar).toMatchObject({ ingredientId: entry, variantId: form });
    expect(await rowsOf(entry)).toHaveLength(1);
    const [{ count }] = await sql`
      select count(*)::int as count from inventory_items where ingredient_id = ${own}`;
    expect(count).toBe(0);
  });
});
