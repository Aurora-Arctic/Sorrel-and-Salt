import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { buildLoaders } from '@/graphql/loaders';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { type IngredientKey, referencesByIngredient } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { makeIngredient } from '../../../support/fixtures';

// `Ingredient.references`' loader (MB.153): a page of ingredients answered in
// one read, the citations in the order a bibliography files them, and refused
// per key as the other children's loaders are. The query count is observed at
// the repository, wrapped so the test counts calls without changing what they
// answer; a role lookup is `assertMembership`'s one query.
const repository = vi.hoisted(() => ({
  findReferencesOfIngredients: vi.fn(),
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
    await insertReferenceLink(sql, id, reference, A.id, `s.v. ${name}`);
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
    expect(countOf()).toEqual({ findReferencesOfIngredients: 1, findWorkspaceRole: 1 });
  });

  it('answers [] for an ingredient citing nothing', async () => {
    const ref = await addCiting('Fixturewort', WORKSPACE_W_ID, []);

    expect(await read(asUser(B), ref)).toEqual([]);
  });
});

describe('who referencesByIngredient answers', () => {
  const CITED = [['Fixture Herbal', 's.v. Fixturewort']];
  let local: IngredientKey;
  let compendium: IngredientKey;

  beforeEach(async () => {
    local = await addCiting('Fixturewort', WORKSPACE_W_ID, ['Fixture Herbal']);
    compendium = await addCiting('Mockleaf', null, ['Fixture Herbal']);
  });

  it("answers a member of the ingredient's coven, viewers included", async () => {
    expect(await read(asUser(B), local)).toEqual(CITED);
    expect(await read(asUser(C), local)).toEqual(CITED);
  });

  it('answers anyone for a compendium entry, signed out included', async () => {
    expect(await read(null, compendium)).toEqual([['Fixture Herbal', 's.v. Mockleaf']]);
  });

  it('refuses a workspace entry to someone outside the coven, by direct id', async () => {
    // Why it could have answered: the row exists, cites a reference, and a
    // member reads it through this same key.
    expect(await read(asUser(B), local)).toEqual(CITED);

    await expect(read(asUser(D), local)).rejects.toBeInstanceOf(Forbidden);
    await expect(read(asUser(E), local)).rejects.toBeInstanceOf(Forbidden);
    await expect(read(null, local)).rejects.toBeInstanceOf(Forbidden);
  });

  // The key names the tier, so a caller could lie about it: only the read's
  // own scope stands between D and W's rows.
  it.each([
    ['the compendium', null],
    ["the caller's own coven", WORKSPACE_X_ID],
  ])('answers nothing for a workspace entry whose key claims %s', async (_claim, workspaceId) => {
    expect(await read(asUser(B), local)).toEqual(CITED);

    expect(await read(asUser(D), { id: local.id, workspaceId })).toEqual([]);
  });

  it('answers nothing for a soft-deleted ingredient, or a soft-deleted link', async () => {
    await sql`update reference_links set deleted_at = now(), deleted_by = ${A.id}
      where ingredient_id = ${compendium.id}`;
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${local.id}`;

    expect(await read(asUser(B), local)).toEqual([]);
    expect(await read(null, compendium)).toEqual([]);
  });
});
