import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';
import type { CupboardEntryNode } from './types';

// `Ingredient.cupboardEntry(workspaceId)` over the wire: a coven's own say over a compendium entry, read beside the entry.
// The transport's half: the answer and its `annotated`, a reader and a viewer answered, a coven the caller is not in refused at the field as `Ingredient.stock` refuses,
// null where there is no row to read, and one read for a page of entries, counted at the repository.
const repository = vi.hoisted(() => ({ findCupboardEntriesOf: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findCupboardEntriesOf.mockImplementation(actual.findCupboardEntriesOf);
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** The compendium's Testwort, and its row in W's cupboard. */
let entry: string;
let row: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  repository.findCupboardEntriesOf.mockClear();
  entry = await insertIngredient(sql, makeIngredient(), E.id);
  row = await insertCupboardEntry(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: entry,
      label: 'Hedgewort',
      safetyNotes: 'Our own caution.',
      elements: ['water'],
      colors: [],
    },
    A.id,
  );
});

const FIELDS = `id label description safetyNotes elements celestialBodies zodiacSigns colors annotated compendiumName`;

const ONE = `query ($id: ID!, $workspaceId: ID!) {
  ingredient(id: $id) { cupboardEntry(workspaceId: $workspaceId) { ${FIELDS} } }
}`;

const read = (session: Session, id: string, workspaceId = WORKSPACE_W_ID) =>
  run<{ ingredient: { cupboardEntry: CupboardEntryNode | null } }>(session, ONE, {
    id,
    workspaceId,
  });

describe('Ingredient.cupboardEntry', () => {
  it("answers the coven's row, its overrides as set and the compendium's name beside them", async () => {
    const result = await read(asUser(A), entry);

    expect(result.errors).toBeUndefined();
    expect(result.data?.ingredient.cupboardEntry).toEqual({
      id: row,
      label: 'Hedgewort',
      description: null,
      safetyNotes: 'Our own caution.',
      elements: ['water'],
      celestialBodies: null,
      zodiacSigns: null,
      colors: [],
      annotated: true,
      compendiumName: 'Testwort',
    });
  });

  it('answers a viewer, who reads the coven', async () => {
    const result = await read(asUser(C), entry);

    expect(result.errors).toBeUndefined();
    expect(result.data?.ingredient.cupboardEntry?.id).toBe(row);
  });

  it('is not annotated while every override is null', async () => {
    const plain = await insertIngredient(
      sql,
      makeIngredient({ name: 'Mockleaf', nomenclature: 'none' }),
      E.id,
    );
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: plain }, A.id);

    const result = await read(asUser(B), plain);

    expect(result.data?.ingredient.cupboardEntry).toMatchObject({
      label: null,
      annotated: false,
      compendiumName: 'Mockleaf',
    });
  });

  it('is FORBIDDEN naming a coven the caller is not in, at the field', async () => {
    // Why it could have answered: the row is there, and B reads it.
    expect((await read(asUser(B), entry)).data?.ingredient.cupboardEntry?.id).toBe(row);

    const asD = await read(asUser(D), entry);

    expect(asD.data?.ingredient.cupboardEntry).toBeNull();
    expect(asD.errors?.[0]).toMatchObject({
      path: ['ingredient', 'cupboardEntry'],
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it("is null for another coven's row, an entry with no row, and a coven's own ingredient", async () => {
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: entry }, D.id);
    // X's row reads under X.
    expect(
      (await read(asUser(D), entry, WORKSPACE_X_ID)).data?.ingredient.cupboardEntry,
    ).not.toBeNull();
    const absent = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixturebark', nomenclature: 'none' }),
      E.id,
    );
    const own = await insertIngredient(
      sql,
      makeIngredient({ name: 'Mockroot', nomenclature: 'none', workspaceId: WORKSPACE_W_ID }),
      A.id,
    );
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: own }, A.id);

    const ownRead = await run<{ ingredient: { cupboardEntry: unknown } }>(
      asUser(A),
      `query ($id: ID!, $workspaceId: ID!) {
        ingredient(id: $id, workspaceId: $workspaceId) { cupboardEntry(workspaceId: $workspaceId) { id } }
      }`,
      { id: own, workspaceId: WORKSPACE_W_ID },
    );

    expect(
      (await read(asUser(D), absent, WORKSPACE_X_ID)).data?.ingredient.cupboardEntry,
    ).toBeNull();
    expect(ownRead.errors).toBeUndefined();
    expect(ownRead.data?.ingredient.cupboardEntry).toBeNull();
  });

  it('reads a page of entries with one batched read', async () => {
    const second = await insertIngredient(
      sql,
      makeIngredient({ name: 'Mockleaf', nomenclature: 'none' }),
      E.id,
    );
    await insertIngredient(sql, makeIngredient({ name: 'Stubroot', nomenclature: 'none' }), E.id);
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: second, label: 'Mock Leaf' },
      A.id,
    );

    const result = await run<{
      compendium: { edges: { node: { id: string; cupboardEntry: { label: string } | null } }[] };
    }>(
      asUser(A),
      `query ($workspaceId: ID!) {
        compendium(first: 10) { edges { node { id cupboardEntry(workspaceId: $workspaceId) { label } } } }
      }`,
      { workspaceId: WORKSPACE_W_ID },
    );

    expect(result.errors).toBeUndefined();
    expect(
      result.data?.compendium.edges.map(({ node }) => node.cupboardEntry?.label ?? null).sort(),
    ).toEqual(['Hedgewort', 'Mock Leaf', null]);
    expect(repository.findCupboardEntriesOf).toHaveBeenCalledTimes(1);
  });
});
