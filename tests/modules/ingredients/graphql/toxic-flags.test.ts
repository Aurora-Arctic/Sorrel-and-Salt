import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { A } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// The transport half: the `Ingredient` and `IngredientVariant` types carry each row's own toxic flag, so both searches return both,
// the compendium's to a reader with no session, as the public page reads it. Who may set a flag is services/toxic-flags.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

interface FlaggedNode {
  id: string;
  toxic: boolean;
  variants: { form: string; toxic: boolean }[];
}

const FLAGS = 'id toxic variants { form toxic }';

/** A toxic ingredient whose second form alone is flagged, and a plain one beside it. */
async function seedPair(workspaceId: string | null) {
  const toxic = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId,
      name: 'Testbane',
      canonicalName: 'Fixtura venenosa',
      toxic: true,
      variants: [makeVariant({ form: 'Testleaf' }), makeVariant({ form: 'Testoil', toxic: true })],
    }),
    A.id,
  );
  const plain = await insertIngredient(
    sql,
    makeIngredient({ workspaceId, variants: [makeVariant({ form: 'Testleaf' })] }),
    A.id,
  );
  return { toxic, plain };
}

/** The nodes by id, each form's flag by its text. */
const byId = (nodes: FlaggedNode[]) =>
  Object.fromEntries(
    nodes.map((node) => [
      node.id,
      {
        toxic: node.toxic,
        forms: Object.fromEntries(node.variants.map((variant) => [variant.form, variant.toxic])),
      },
    ]),
  );

describe('the toxic flags on the wire', () => {
  it('come back from the compendium search, read with no session', async () => {
    const { toxic, plain } = await seedPair(null);

    const result = await run<{ compendium: { edges: { node: FlaggedNode }[] } }>(
      null,
      `query { compendium(first: 50) { edges { node { ${FLAGS} } } } }`,
    );

    expect(result.errors).toBeUndefined();
    expect(byId(result.data?.compendium.edges.map((edge) => edge.node) ?? [])).toEqual({
      [toxic]: { toxic: true, forms: { Testleaf: false, Testoil: true } },
      [plain]: { toxic: false, forms: { Testleaf: false } },
    });
  });
});
