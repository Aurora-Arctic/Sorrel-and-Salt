import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, StaleWrite } from '@/lib/errors';
import {
  createCompendiumEntry,
  createWorkspaceIngredient,
  updateCompendiumEntry,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { curatedFormId } from '../../../support/db/curated-ids';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
  variantInput,
} from '../../../support/fixtures';

// An ingredient's save names the revision it read: a save over a newer one is refused with `StaleWrite` and writes nothing, `null`
// writes whatever the row holds, and a refusal for who is asking comes before any revision is read (claude-docs/components/autosave.md, "The server's half").

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

const revisionOf = async (id: string): Promise<number> => {
  const [row] = await sql`select revision from ingredients where id = ${id}`;
  return row!.revision as number;
};

describe("a coven ingredient's save", () => {
  it('answers the revision the row holds after the save, children included', async () => {
    const made = await createWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, localInput());
    const saved = await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      made.id,
      localInput({ name: 'Testwort Renamed', description: 'changed' }),
      made.revision,
    );
    expect(saved.revision).toBe(await revisionOf(made.id));
    expect(saved.revision).toBeGreaterThan(made.revision);
  });

  it('refuses a save over a newer revision with StaleWrite and writes nothing', async () => {
    const made = await createWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, localInput());
    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      made.id,
      localInput({ description: 'theirs' }),
      made.revision,
    );
    const now = await revisionOf(made.id);
    // The precondition: the row has moved past the revision A read.
    expect(now).toBeGreaterThan(made.revision);
    const refused = await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      made.id,
      localInput({ description: 'mine' }),
      made.revision,
    ).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(StaleWrite);
    expect((refused as StaleWrite).currentRevision).toBe(now);
    const [row] = await sql`select description, revision from ingredients where id = ${made.id}`;
    expect(row).toEqual({ description: 'theirs', revision: now });
  });

  it('writes over a newer revision when none is named', async () => {
    const made = await createWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, localInput());
    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      made.id,
      localInput({ description: 'theirs' }),
      made.revision,
    );
    await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      made.id,
      localInput({ description: 'mine' }),
      null,
    );
    const [row] = await sql`select description from ingredients where id = ${made.id}`;
    expect(row!.description).toBe('mine');
  });

  it('refuses a viewer and an outsider by direct id, even at the right revision', async () => {
    const made = await createWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, localInput());
    // The precondition: both name the row's current revision, so only who they are can refuse them.
    expect(await revisionOf(made.id)).toBe(made.revision);
    await expect(
      updateWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, made.id, localInput(), made.revision),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      updateWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, made.id, localInput(), made.revision),
    ).rejects.toBeInstanceOf(Forbidden);
    expect(await revisionOf(made.id)).toBe(made.revision);
  });
});

describe("a compendium entry's save", () => {
  it('refuses a stale revision with StaleWrite, for an admin and a curator, and writes nothing', async () => {
    const made = await createCompendiumEntry(asUser(E), compendiumInput());
    await updateCompendiumEntry(
      asUser(F),
      made.id,
      compendiumInput({ description: 'theirs' }),
      made.revision,
    );
    const now = await revisionOf(made.id);
    expect(now).toBeGreaterThan(made.revision);
    for (const who of [E, F]) {
      const refused = await updateCompendiumEntry(
        asUser(who),
        made.id,
        compendiumInput({ description: 'mine' }),
        made.revision,
      ).catch((error: unknown) => error);
      expect(refused).toBeInstanceOf(StaleWrite);
      expect((refused as StaleWrite).currentRevision).toBe(now);
    }
    const [row] = await sql`select description from ingredients where id = ${made.id}`;
    expect(row!.description).toBe('theirs');
  });

  it('answers the revision the row holds after the save', async () => {
    const made = await createCompendiumEntry(asUser(E), compendiumInput());
    const saved = await updateCompendiumEntry(
      asUser(E),
      made.id,
      compendiumInput({ description: 'changed' }),
      made.revision,
    );
    expect(saved.revision).toBe(await revisionOf(made.id));
  });

  it('refuses a coven member by direct id, at the right revision', async () => {
    const made = await createCompendiumEntry(asUser(E), compendiumInput());
    // The precondition: the revision is current, and the member is an owner of a coven, so only the compendium tier refuses.
    expect(await revisionOf(made.id)).toBe(made.revision);
    await expect(
      updateCompendiumEntry(asUser(A), made.id, compendiumInput(), made.revision),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      updateCompendiumEntry(asUser(B), made.id, compendiumInput(), made.revision),
    ).rejects.toBeInstanceOf(Forbidden);
    expect(await revisionOf(made.id)).toBe(made.revision);
  });

  it('answers NotFound, not StaleWrite, for a coven ingredient named as a compendium entry', async () => {
    const local = await createWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, localInput());
    await expect(
      updateCompendiumEntry(asUser(E), local.id, compendiumInput(), 1),
    ).rejects.toBeInstanceOf(NotFound);
  });
});
