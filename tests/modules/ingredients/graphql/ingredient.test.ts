import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { run as runOperation } from '../../../support/graphql/run';
import { makeIngredient } from '../../../support/fixtures';
import type { IngredientNode } from './types';

// The `ingredient` detail query: a compendium entry for anyone, and a coven's
// own entry for its members when they name the coven. Non-null: a miss is
// `NOT_FOUND`, as every lookup here answers one. Which callers are refused at
// which rows is services/compendium.test.ts's; this file holds the
// transport's half — the coven forwarded, and one refusal per code on the wire.

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

const run = (session: Session | null, variables: { id: string; workspaceId?: string }) =>
  runOperation<{ ingredient: IngredientNode }>(
    session,
    `query ($id: ID!, $workspaceId: ID) {
      ingredient(id: $id, workspaceId: $workspaceId) {
        id name nomenclature canonicalName isGlobal folkNames categories { name }
      }
    }`,
    variables,
  );

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

  describe("refuses a coven's entry to everyone else", () => {
    // Why the refusals could have passed wrongly: the row is there, and its
    // coven's member reaches it by this id.
    beforeEach(async () => {
      const result = await run(asUser(B), { id: localId, workspaceId: WORKSPACE_W_ID });
      expect(result.data?.ingredient).toMatchObject({ id: localId });
    });

    it('as NOT_FOUND without a coven', async () => {
      const result = await run(asUser(B), { id: localId });

      expect(result.data).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatchObject({
        path: ['ingredient'],
        extensions: { code: 'NOT_FOUND' },
      });
    });

    it('as FORBIDDEN under a coven the caller is not in', async () => {
      // D is signed in and a member elsewhere.
      expect(asUser(D).userId).toBe(D.id);

      const result = await run(asUser(D), { id: localId, workspaceId: WORKSPACE_W_ID });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]).toMatchObject({
        path: ['ingredient'],
        extensions: { code: 'FORBIDDEN' },
      });
    });
  });
});
