import { graphql, type ExecutionResult } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { Forbidden, NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { noSender } from '../../../support/email-verification';
import { makeIngredient } from '../../../support/fixtures';
import type { IngredientNode } from './types';

// The `ingredient` detail query: a compendium entry for anyone, and a coven's
// own entry for its members when they name the coven. Non-null: a miss is
// `NOT_FOUND`, as every lookup here answers one.

let sql: ReturnType<typeof postgres>;
let compendiumId: string;
let localId: string;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  compendiumId = await insertIngredient(
    sql,
    makeIngredient({
      name: 'Fixture Compendial',
      nomenclature: 'none',
      folkNames: ['Fixture Folk'],
      categories: ['Protection'],
    }),
    A.id,
  );
  localId = await insertIngredient(
    sql,
    makeIngredient({ name: 'Fixture Local', nomenclature: 'none', workspaceId: WORKSPACE_W_ID }),
    A.id,
  );
});

function run(
  session: Session | null,
  variables: { id: string; workspaceId?: string },
): Promise<ExecutionResult<{ ingredient: IngredientNode }>> {
  return graphql({
    schema,
    source: `query ($id: ID!, $workspaceId: ID) {
      ingredient(id: $id, workspaceId: $workspaceId) {
        id name nomenclature canonicalName isGlobal folkNames categories { name }
      }
    }`,
    variableValues: variables,
    contextValue: { session, loaders: createLoaders(session), emailVerification: noSender },
  }) as Promise<ExecutionResult<{ ingredient: IngredientNode }>>;
}

describe('ingredient', () => {
  it('answers a compendium entry to a signed-out visitor, children included', async () => {
    const result = await run(null, { id: compendiumId });

    expect(result.errors).toBeUndefined();
    expect(result.data?.ingredient).toEqual({
      id: compendiumId,
      name: 'Fixture Compendial',
      nomenclature: 'none',
      canonicalName: null,
      isGlobal: true,
      folkNames: ['Fixture Folk'],
      categories: [{ name: 'Protection' }],
    });
  });

  it("answers a coven's own entry to its members, viewers included, when they name the coven", async () => {
    for (const member of [B, C]) {
      const result = await run(asUser(member), { id: localId, workspaceId: WORKSPACE_W_ID });

      expect(result.errors).toBeUndefined();
      expect(result.data?.ingredient).toMatchObject({ id: localId, isGlobal: false });
    }
  });

  it('answers a compendium entry under a coven as well', async () => {
    const result = await run(asUser(B), { id: compendiumId, workspaceId: WORKSPACE_W_ID });

    expect(result.data?.ingredient).toMatchObject({ id: compendiumId, isGlobal: true });
  });

  describe("refuses a coven's entry to everyone else", () => {
    // Why the refusals could have passed wrongly: the row is there, and its
    // coven's member reaches it by this id.
    beforeEach(async () => {
      const result = await run(asUser(B), { id: localId, workspaceId: WORKSPACE_W_ID });
      expect(result.data?.ingredient).toMatchObject({ id: localId });
    });

    it('as NOT_FOUND without a coven, signed in or out', async () => {
      for (const session of [null, asUser(B)]) {
        const result = await run(session, { id: localId });

        expect(result.data).toBeNull();
        expect(result.errors?.[0]?.path).toEqual(['ingredient']);
        expect(result.errors?.[0]?.originalError).toBeInstanceOf(NotFound);
      }
    });

    it('as FORBIDDEN under a coven the caller is not in, signed out included', async () => {
      // D is signed in and a member elsewhere.
      expect(asUser(D).userId).toBe(D.id);
      for (const session of [null, asUser(D)]) {
        const result = await run(session, { id: localId, workspaceId: WORKSPACE_W_ID });

        expect(result.data).toBeNull();
        expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
      }
    });

    it("as NOT_FOUND under another coven's valid proof", async () => {
      const result = await run(asUser(D), { id: localId, workspaceId: WORKSPACE_X_ID });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.originalError).toBeInstanceOf(NotFound);
    });
  });
});
