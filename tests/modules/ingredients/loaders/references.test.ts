import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { buildLoaders } from '@/graphql/loaders';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { type IngredientKey, referencesByIngredient } from '@/modules/ingredients';
import { A, B, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { makeIngredient } from '../../../support/fixtures';

// `Ingredient.references`' loader (MB.153): a page of ingredients answered in
// one read, the citations in the order a bibliography files them, and refused
// per key as the other children's loaders are. The query count is observed at
// the repository, wrapped so the test counts calls without changing what they
// answer; a role lookup is `assertMembership`'s one query.
const repository = vi.hoisted(() => ({
  findReferencesOf: vi.fn(),
  findWorkspaceRole: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  for (const [name, spy] of Object.entries(repository)) {
    spy.mockImplementation(actual[name as keyof typeof repository]);
  }
  return { ...actual, ...repository };
});

const countOf = () =>
  Object.fromEntries(
    Object.entries(repository).map(([name, spy]) => [name, spy.mock.calls.length]),
  );

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients, "references" cascade`;
  Object.values(repository).forEach((spy) => spy.mockClear());
});

const read = async (session: Session | null, ref: IngredientKey) =>
  (await buildLoaders({ referencesByIngredient }, session).referencesByIngredient.load(ref)).map(
    ({ reference, locator }) => [reference.title, locator],
  );

/** An ingredient citing `titles`, each a compendium book of its own, with a locator per book. */
async function addCiting(name: string, workspaceId: string | null, titles: string[]) {
  const id = await insertIngredient(
    sql,
    makeIngredient({ name, workspaceId, nomenclature: 'none' }),
    A.id,
  );
  for (const title of titles) {
    const reference = await insertReference(sql, { title }, E.id);
    await insertReferenceLink(sql, id, reference, A.id, `under "${name}"`);
  }
  return { id, workspaceId };
}

describe('the referencesByIngredient loader', () => {
  it('answers fifty ingredients across two tiers with one role lookup and one read', async () => {
    const refs: IngredientKey[] = [];
    for (let i = 0; i < 50; i++) {
      const n = String(i).padStart(2, '0');
      // Written out of order, so the answer's order is the read's own.
      refs.push(
        await addCiting(`Fixturewort ${n}`, i < 25 ? null : WORKSPACE_W_ID, [
          `Zeta ${n}`,
          `Alpha ${n}`,
        ]),
      );
    }
    const loader = buildLoaders({ referencesByIngredient }, asUser(B)).referencesByIngredient;

    const answers = await Promise.all(refs.map((ref) => loader.load(ref)));

    expect(answers.map((cited) => cited.map(({ reference }) => reference.title))).toEqual(
      refs.map((_, i) => [
        `Alpha ${String(i).padStart(2, '0')}`,
        `Zeta ${String(i).padStart(2, '0')}`,
      ]),
    );
    expect(countOf()).toEqual({ findReferencesOf: 1, findWorkspaceRole: 1 });
  });

  // Who it answers is the shared matrix in ingredient-children.test.ts, which
  // runs this loader with the other children's. What is its own is the link:
  // a soft-deleted citation drops out while its ingredient stays live.
  it('leaves out a soft-deleted citation', async () => {
    const ref = await addCiting('Fixturewort', WORKSPACE_W_ID, ['Fixture Herbal', 'Mock Annals']);
    await sql`update reference_links set deleted_at = now(), deleted_by = ${A.id}
      where ingredient_id = ${ref.id}
        and reference_id = (select id from "references" where title = 'Mock Annals')`;

    expect(await read(asUser(B), ref)).toEqual([['Fixture Herbal', 'under "Fixturewort"']]);
  });
});
