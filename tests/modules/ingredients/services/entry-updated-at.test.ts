import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { entryRecency } from '@/lib/entry-recency';
import {
  createCompendiumEntry,
  updateCompendiumEntry,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
  variantInput,
} from '../../../support/fixtures';
import { curatedFormId } from '../../../support/db/curated-ids';

// `updated_at` moves only when an entry really changed (migration
// 0079), and a change to a child list (folk names, categories, references,
// forms) moves the parent's, so the New/Updated marker reads it. Rows are
// backdated with the trigger off (a plain update of the stamps is itself a
// no-op to it), then the service under test is run.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let herb: string;
beforeAll(async () => {
  herb = await curatedFormId(sql, 'Herb');
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const LONG_AGO = '2020-01-01 00:00:00';

function compendiumInput(
  overrides: Overrides<IngredientFixture> = {},
): Parameters<typeof createCompendiumEntry>[1] {
  const fixture = makeIngredient({ variants: [makeVariant({ form: 'Herb' })], ...overrides });
  const { workspaceId: _tier, categories: _c, substitutes, deities, variants, ...input } = fixture;
  return {
    ...input,
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
    variants: variants.map((variant) => variantInput(variant, { formId: herb })),
  };
}

function localInput(
  overrides: Overrides<IngredientFixture> = {},
): Parameters<typeof updateWorkspaceIngredient>[3] {
  const fixture = makeIngredient({
    workspaceId: WORKSPACE_W_ID,
    nomenclature: 'none',
    variants: [makeVariant({ form: 'Herb' })],
    ...overrides,
  });
  const { workspaceId: _tier, categories: _c, substitutes, deities, variants, ...input } = fixture;
  return {
    ...input,
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
    variants: variants.map((variant) => variantInput(variant)),
  };
}

/** Writes both stamps of `id`'s row far in the past, past the trigger that would hold them. */
async function backdate(id: string): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`alter table ingredients disable trigger set_updated_at`;
    await tx`update ingredients set created_at = ${LONG_AGO}, updated_at = ${LONG_AGO} where id = ${id}`;
    await tx`alter table ingredients enable trigger set_updated_at`;
  });
}

async function stampsOf(id: string) {
  const [row] = await sql<{ created_at: Date; updated_at: Date; updated_by: string }[]>`
    select created_at, updated_at, updated_by from ingredients where id = ${id}`;
  return row;
}

const recencyOf = async (id: string) => {
  const row = await stampsOf(id);
  return entryRecency(row.created_at, row.updated_at);
};

describe('saving a compendium entry', () => {
  it('leaves updated_at when nothing changed, whoever saves', async () => {
    const created = await createCompendiumEntry(asUser(E), compendiumInput());
    await backdate(created.id);
    const before = await stampsOf(created.id);
    // Why it could have moved: a different curator saves, and the writer sends fresh stamps.
    expect(F.id).not.toBe(before.updated_by);

    await updateCompendiumEntry(asUser(F), created.id, compendiumInput());

    expect((await stampsOf(created.id)).updated_at).toEqual(before.updated_at);
    expect(await recencyOf(created.id)).toBeNull();
  });

  it('marks the entry Updated when a field of the row changed', async () => {
    const created = await createCompendiumEntry(asUser(E), compendiumInput());
    await backdate(created.id);

    await updateCompendiumEntry(asUser(E), created.id, compendiumInput({ description: 'Edited' }));

    expect(await recencyOf(created.id)).toBe('updated');
  });

  // One child list stands for all: every child write ends at the same touch of the row
  // in `writeChildren` (ingredient-rows.ts), so a folk name, reference, form or category alike.
  it('marks the entry Updated when only a child list changed', async () => {
    const created = await createCompendiumEntry(asUser(E), compendiumInput());
    await backdate(created.id);

    await updateCompendiumEntry(
      asUser(E),
      created.id,
      compendiumInput({ folkNames: ['Test Root'] }),
    );

    const after = await stampsOf(created.id);
    // The row's own columns are the same, so only the touch can have moved it.
    expect(after.updated_at.getFullYear()).not.toBe(2020);
    expect(await recencyOf(created.id)).toBe('updated');
  });
});

describe('saving a coven ingredient', () => {
  it('leaves updated_at when nothing changed', async () => {
    const created = await updateOrCreate();
    await backdate(created);
    const before = await stampsOf(created);

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, created, localInput());

    expect((await stampsOf(created)).updated_at).toEqual(before.updated_at);
  });

  it('moves updated_at when a child list changed', async () => {
    const created = await updateOrCreate();
    await backdate(created);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created,
      localInput({ folkNames: ['Test Root'] }),
    );

    expect((await stampsOf(created)).updated_at.getFullYear()).not.toBe(2020);
  });
});

async function updateOrCreate(): Promise<string> {
  const { createWorkspaceIngredient } = await import('@/modules/ingredients');
  const row = await createWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, localInput());
  return row.id;
}
