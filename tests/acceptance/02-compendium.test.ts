import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import { createWorkspaceIngredient, getWorkspaceIngredient } from '@/modules/ingredients';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { A, B, C, D, asUser } from '../support/as-user';
import { useTestDatabase } from '../support/db/database';
import { makeIngredient } from '../support/fixtures';

// Story 15 against M8.2's service, written with it: M8.1's scaffold for
// stories 14 and 16 runs later and adds their describes to this file.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** Live rows by this label in either tier, case-folded as the label index compares. */
async function tiersHolding(name: string): Promise<(string | null)[]> {
  const rows = await sql<{ workspace_id: string | null }[]>`
    select workspace_id from ingredients
    where lower(name) = lower(${name}) and deleted_at is null
  `;
  return rows.map((row) => row.workspace_id);
}

describe('Story 15: Create an ingredient local to my workspace when the compendium lacks it.', () => {
  it('lets a member create one that the coven reads, the compendium never gains, and no other coven sees', async () => {
    const {
      workspaceId: _tier,
      categories: _categories,
      ...fixture
    } = makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      form: 'root',
      folkNames: ['Fixture Root'],
    });
    const input: LocalIngredientInput = fixture;

    // Why this is story 15's case: nothing by this name exists in any tier.
    expect(await tiersHolding(input.name)).toEqual([]);

    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input);

    for (const user of [A, B, C]) {
      await expect(
        getWorkspaceIngredient(asUser(user), WORKSPACE_W_ID, created.id),
      ).resolves.toMatchObject({ name: input.name, canonicalName: input.canonicalName });
    }
    const [folkName] = await sql`
      select name from ingredient_folk_names where ingredient_id = ${created.id}`;
    expect(folkName.name).toBe('Fixture Root');

    // Local, and only local: the compendium still lacks it.
    expect(await tiersHolding(input.name)).toEqual([WORKSPACE_W_ID]);

    // Another coven's member, by direct id, under either coven's name.
    await expect(getWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, created.id)).rejects.toThrow(
      Forbidden,
    );
    await expect(getWorkspaceIngredient(asUser(D), WORKSPACE_X_ID, created.id)).rejects.toThrow(
      NotFound,
    );
  });

  it('refuses a viewer, who reads the coven but writes nothing', async () => {
    const {
      workspaceId: _tier,
      categories: _categories,
      ...input
    } = makeIngredient({
      name: 'Fixture Viewerwort',
      nomenclature: 'none',
    });

    await expect(createWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, input)).rejects.toThrow(
      Forbidden,
    );
    expect(await tiersHolding(input.name)).toEqual([]);
  });
});
