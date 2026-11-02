import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import type { GraphQLObjectType } from 'graphql';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { schema } from '@/graphql/schema';
import { Forbidden, NotFound } from '@/lib/errors';
import { readSourcingScore } from '@/modules/ingredients';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { makeIngredient } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// A compendium entry's sourcing score is a curator's and an admin's read: anyone else, signed out included, gets null from
// GraphQL and Forbidden from the service, asked by the entry's own id. A coven's ingredient is never scored.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const SCORE = `query ($id: ID!) { compendiumSourcingScore(id: $id) { score facts { fact label points } } }`;

/** A compendium entry citing one book with a locator, the name stated: 10 + 18 + 15 = 43, its one form citing nothing taking 5. */
async function citedEntry(): Promise<string> {
  const id = await insertIngredient(
    sql,
    makeIngredient({ workspaceId: null, nomenclature: 'botanical' }),
    A.id,
  );
  const book = await insertReference(sql, {}, A.id);
  await insertReferenceLink(sql, id, book, A.id, 'p. 12', { name_basis: 'stated' });
  return id;
}

describe('compendiumSourcingScore', () => {
  it('gives curator F and admin E the score, the same entry the others are refused', async () => {
    const id = await citedEntry();
    for (const user of [E, F]) {
      const result = await run<{ compendiumSourcingScore: { score: number; facts: unknown[] } }>(
        asUser(user),
        SCORE,
        { id },
      );
      expect(result.errors).toBeUndefined();
      expect(result.data?.compendiumSourcingScore.score).toBe(38);
      expect(result.data?.compendiumSourcingScore.facts).toHaveLength(8);
    }
  });

  it('answers null by direct id to a member, a viewer, a member of another coven and a signed-out request', async () => {
    const id = await citedEntry();
    for (const session of [asUser(B), asUser(C), asUser(D), null]) {
      const result = await run(session, SCORE, { id });
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ compendiumSourcingScore: null });
    }
  });

  it('adds no score field to the ingredient type covens read', () => {
    const ingredient = schema.getType('Ingredient') as GraphQLObjectType;
    // The type is real and has fields, so the next line would fail were a score field added.
    expect(Object.keys(ingredient.getFields())).toContain('references');
    expect(Object.keys(ingredient.getFields()).filter((name) => /sourc/i.test(name))).toEqual([]);
  });
});

describe('readSourcingScore', () => {
  it('scores a compendium entry for a curator, and refuses everyone else by its id', async () => {
    const id = await citedEntry();
    await expect(readSourcingScore(asUser(F), id)).resolves.toMatchObject({ score: 38 });
    for (const user of [A, B, C, D]) {
      await expect(readSourcingScore(asUser(user), id)).rejects.toBeInstanceOf(Forbidden);
    }
  });

  it('finds no coven ingredient to score, even for an admin', async () => {
    const local = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', canonicalName: null }),
      A.id,
    );
    await expect(readSourcingScore(asUser(E), local)).rejects.toBeInstanceOf(NotFound);
    await expect(readSourcingScore(asUser(E), 'not-an-id')).rejects.toBeInstanceOf(NotFound);
  });

  it('reads the review mark the curator set', async () => {
    const id = await citedEntry();
    await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${F.id} where id = ${id}`;
    await expect(readSourcingScore(asUser(F), id)).resolves.toMatchObject({ score: 68 });
  });
});
