import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// `compendiumMatches(name, workspaceId)` and `Ingredient.inCupboard`:
// the Add flow's exact-name question. Exact on the name or the formal name,
// case aside, and never a near spelling; `inCupboard` reads this coven's
// cupboard row alone; a caller outside the coven is refused by its id.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let held: string;
let loose: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  // Held by W, and by X too, so a row of another coven's cannot be mistaken for W's.
  held = await insertIngredient(
    sql,
    makeIngredient({ name: 'Testwort', canonicalName: 'Fixtura testalis' }),
    E.id,
  );
  loose = await insertIngredient(
    sql,
    makeIngredient({ name: 'Mockleaf', canonicalName: 'Fixtura mockalis' }),
    E.id,
  );
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: held }, A.id);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: loose }, D.id);
});

const QUERY = `query ($name: String!, $workspaceId: ID!) {
  compendiumMatches(name: $name, workspaceId: $workspaceId) {
    edges { node { id name inCupboard(workspaceId: $workspaceId) } }
  }
}`;

interface Matches {
  compendiumMatches: { edges: { node: { id: string; name: string; inCupboard: boolean } }[] };
}

const ask = (session: Session, name: string, workspaceId = WORKSPACE_W_ID) =>
  run<Matches>(session, QUERY, { name, workspaceId });

const nodes = (result: Awaited<ReturnType<typeof ask>>) =>
  result.data?.compendiumMatches.edges.map((edge) => edge.node) ?? [];

describe('compendiumMatches', () => {
  it('matches no near spelling, which the did-you-mean list is for', async () => {
    expect(nodes(await ask(asUser(A), 'Testwart'))).toEqual([]);
    expect(nodes(await ask(asUser(A), 'Test'))).toEqual([]);
    expect(nodes(await ask(asUser(A), '   '))).toEqual([]);
  });

  it("says in the cupboard for this coven's row alone, not another coven's", async () => {
    // Why the other answer could have been true: X holds Mockleaf, W does not.
    const rows = await sql`select 1 from workspace_compendium_entries
      where workspace_id = ${WORKSPACE_X_ID} and ingredient_id = ${loose}`;
    expect(rows).toHaveLength(1);

    expect(nodes(await ask(asUser(A), 'Testwort'))[0].inCupboard).toBe(true);
    expect(nodes(await ask(asUser(A), 'Mockleaf'))[0].inCupboard).toBe(false);
    expect(nodes(await ask(asUser(D), 'Mockleaf', WORKSPACE_X_ID))[0].inCupboard).toBe(true);
  });

  it('answers a viewer, who reads the coven', async () => {
    expect(nodes(await ask(asUser(C), 'Testwort')).map((node) => node.id)).toEqual([held]);
  });

  it('refuses a caller outside the coven, named by its id', async () => {
    // Why it could have answered: the compendium is public and the entry exists.
    expect(nodes(await ask(asUser(A), 'Testwort'))).toHaveLength(1);

    const result = await ask(asUser(D), 'Testwort');

    expect(nodes(result)).toEqual([]);
    expect(result.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});
