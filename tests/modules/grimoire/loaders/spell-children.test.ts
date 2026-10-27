import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { buildLoaders } from '@/graphql/loaders';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import {
  assignedCategoriesBySpell,
  derivedCategoriesBySpell,
  stepsBySpell,
} from '@/modules/grimoire';
import { A, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { makeIngredient, makeSpell } from '../../../support/fixtures';

// A spell's batched fields (M10.9): a grimoire page's spells read together,
// however many there are. Who may read them is services/spell-reads.test.ts's;
// this file counts the reads, observed at the repository.
const repository = vi.hoisted(() => ({
  findManyInSpells: vi.fn(),
  findIngredientsInSpellsIncludingSoftDeleted: vi.fn(),
  findManyOfSpellIngredientsIncludingSoftDeleted: vi.fn(),
  findFormsInSpellsIncludingSoftDeleted: vi.fn(),
  findManyByIds: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  for (const [name, spy] of Object.entries(repository)) {
    spy.mockImplementation(actual[name as keyof typeof repository]);
  }
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
  for (const spy of Object.values(repository)) spy.mockClear();
});

const reads = () =>
  Object.values(repository).reduce((total, spy) => total + spy.mock.calls.length, 0);

/** `count` shared spells of W, each laying its own ingredient filed under Protection. */
async function spells(count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({
        name: `Testroot ${i}`,
        workspaceId: WORKSPACE_W_ID,
        nomenclature: 'none',
        categories: ['Protection'],
      }),
      A.id,
    );
    ids.push(
      await insertSpell(
        sql,
        makeSpell({
          workspaceId: WORKSPACE_W_ID,
          categories: ['Warding'],
          steps: [{ ingredientId }, { body: 'Stir.' }],
        }),
        A.id,
      ),
    );
  }
  return ids;
}

const loaders = { stepsBySpell, assignedCategoriesBySpell, derivedCategoriesBySpell };

describe('the spell loaders', () => {
  it.each([1, 5])('read a batch of %i spells in the same number of statements', async (count) => {
    const ids = await spells(count);
    const built = buildLoaders(loaders, asUser(A));
    const keys = ids.map((id) => ({ id, workspaceId: WORKSPACE_W_ID }));

    const [steps, assigned, derived] = await Promise.all([
      Promise.all(keys.map((key) => built.stepsBySpell.load(key))),
      Promise.all(keys.map((key) => built.assignedCategoriesBySpell.load(key))),
      Promise.all(keys.map((key) => built.derivedCategoriesBySpell.load(key))),
    ]);

    // Why the count means anything: every spell answered with its rows.
    expect(steps.map((recipe) => recipe.length)).toEqual(ids.map(() => 2));
    expect(assigned.flat().map((row) => row.name)).toEqual(ids.map(() => 'Warding'));
    expect(derived.flat().map((row) => row.name)).toEqual(ids.map(() => 'Protection'));
    // Steps: steps, ingredients, forms. Assigned: links, categories. Derived:
    // steps, pairs, categories. Eight, at one spell or five.
    expect(reads()).toBe(8);
    // The forms and the derived pairs come through the finders that keep what
    // was deleted since, never the live-only ones.
    expect(repository.findFormsInSpellsIncludingSoftDeleted).toHaveBeenCalledTimes(1);
    expect(repository.findManyOfSpellIngredientsIncludingSoftDeleted).toHaveBeenCalledTimes(1);
  });
});
