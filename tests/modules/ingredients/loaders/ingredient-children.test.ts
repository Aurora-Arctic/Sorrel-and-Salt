import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { buildLoaders } from '@/graphql/loaders';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import {
  type IngredientKey,
  categoriesByIngredient,
  folkNamesByIngredient,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import type { Written } from './types';

// The query count, observed at the repository: every read the path reaches is
// wrapped so the test counts calls without changing what they answer. A role
// lookup is `assertMembership`'s one query; the rest are the reads themselves.
const repository = vi.hoisted(() => ({
  findManyOfIngredients: vi.fn(),
  findManyByIds: vi.fn(),
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

// Three of §6's seeded categories, picked by name so the expectation reads;
// the ids are what the loader answers with.
const CATEGORY_NAMES = ['Banishing', 'Protection', 'Cleansing'];
let categoryIds: Map<string, string>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  const rows = await sql`
    select id, name from categories where name in ${sql(CATEGORY_NAMES)} and deleted_at is null
  `;
  categoryIds = new Map(rows.map((row) => [row.name as string, row.id as string]));
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  Object.values(repository).forEach((spy) => spy.mockClear());
});

async function addIngredient(
  name: string,
  workspaceId: string | null,
  folkNames: string[],
  categories: string[],
): Promise<Written> {
  const id = await insertIngredient(
    sql,
    makeIngredient({ name, workspaceId, nomenclature: 'none', folkNames, categories }),
    A.id,
  );
  return {
    ref: { id, workspaceId },
    // What each loader answers: sorted by name, whatever order they were written in.
    folkNames: [...folkNames].sort(),
    categories: [...categories].sort(),
  };
}

/**
 * Fifty ingredients, the first half in the compendium and the second in W,
 * each with its own folk names and a different subset of the categories —
 * so a slot answered with a neighbour's children shows up as a mismatch.
 */
async function addFifty(): Promise<Written[]> {
  const written: Written[] = [];
  for (let i = 0; i < 50; i++) {
    const n = String(i).padStart(2, '0');
    written.push(
      await addIngredient(
        `Fixturewort ${n}`,
        i < 25 ? null : WORKSPACE_W_ID,
        [`Testbane ${n}`, `Mock Root ${n}`],
        CATEGORY_NAMES.filter((_, c) => (i >> c) & 1),
      ),
    );
  }
  return written;
}

const loadersFor = (session: Session | null) =>
  buildLoaders({ categoriesByIngredient, folkNamesByIngredient }, session);

const categoryNames = async (session: Session | null, ref: IngredientKey) =>
  (await loadersFor(session).categoriesByIngredient.load(ref)).map((category) => category.name);

const folkNames = (session: Session | null, ref: IngredientKey) =>
  loadersFor(session).folkNamesByIngredient.load(ref);

describe('the categoriesByIngredient loader', () => {
  it('answers fifty ingredients across two tiers with one role lookup and two reads', async () => {
    const written = await addFifty();
    const { categoriesByIngredient: loader } = loadersFor(asUser(B));

    const answers = await Promise.all(written.map(({ ref }) => loader.load(ref)));

    expect(answers.map((categories) => categories.map((category) => category.name))).toEqual(
      written.map(({ categories }) => categories),
    );
    expect(countOf()).toEqual({ findManyOfIngredients: 1, findManyByIds: 1, findWorkspaceRole: 1 });
  });

  it('answers each key with its own categories, whatever order the keys arrive in', async () => {
    const written = await addFifty();
    const shuffled = [...written].reverse().filter((_, i) => i % 3 !== 1);
    const { categoriesByIngredient: loader } = loadersFor(asUser(B));

    const answers = await loader.loadMany(shuffled.map(({ ref }) => ref));

    expect(answers).toEqual(
      shuffled.map(({ categories }) =>
        categories.map((name) => expect.objectContaining({ name, id: categoryIds.get(name) })),
      ),
    );
  });

  it('reads a signed-out compendium batch without a role lookup', async () => {
    const written = (await addFifty()).slice(0, 25);

    const answers = await loadersFor(null).categoriesByIngredient.loadMany(
      written.map(({ ref }) => ref),
    );

    expect(answers).toHaveLength(25);
    expect(countOf()).toEqual({ findManyOfIngredients: 1, findManyByIds: 1, findWorkspaceRole: 0 });
  });
});

describe('the folkNamesByIngredient loader', () => {
  it('answers fifty ingredients across two tiers with one role lookup and one read', async () => {
    const written = await addFifty();
    const { folkNamesByIngredient: loader } = loadersFor(asUser(B));

    const answers = await Promise.all(written.map(({ ref }) => loader.load(ref)));

    expect(answers).toEqual(written.map(({ folkNames: names }) => names));
    expect(countOf()).toEqual({ findManyOfIngredients: 1, findManyByIds: 0, findWorkspaceRole: 1 });
  });

  it('answers each key with its own folk names, whatever order the keys arrive in', async () => {
    const written = await addFifty();
    const shuffled = [...written].reverse().filter((_, i) => i % 3 !== 1);

    const answers = await loadersFor(asUser(C)).folkNamesByIngredient.loadMany(
      shuffled.map(({ ref }) => ref),
    );

    expect(answers).toEqual(shuffled.map(({ folkNames: names }) => names));
  });

  it('leaves out a soft-deleted folk name', async () => {
    const { ref } = await addIngredient('Fixturewort', null, ['Testbane', 'Mock Root'], []);
    await sql`
      update ingredient_folk_names set deleted_at = now(), deleted_by = ${A.id}
      where name = 'Testbane'
    `;

    expect(await folkNames(asUser(B), ref)).toEqual(['Mock Root']);
  });
});

// Both loaders answer through the same two layers; each case runs against
// both, since a check forgotten in one would pass every test of the other.
describe.each([
  ['categoriesByIngredient', categoryNames, ['Protection']],
  ['folkNamesByIngredient', folkNames, ['Testbane']],
] as const)('who %s answers', (name, read, children) => {
  let local: Written;
  let compendium: Written;

  beforeEach(async () => {
    local = await addIngredient('Fixturewort', WORKSPACE_W_ID, ['Testbane'], ['Protection']);
    compendium = await addIngredient('Mockleaf', null, ['Testbane'], ['Protection']);
  });

  it("answers a member of the ingredient's coven, viewers included", async () => {
    expect(await read(asUser(B), local.ref)).toEqual(children);
    expect(await read(asUser(C), local.ref)).toEqual(children);
  });

  it('answers anyone for a compendium entry, signed out included', async () => {
    expect(await read(null, compendium.ref)).toEqual(children);
    expect(await read(asUser(D), compendium.ref)).toEqual(children);
  });

  it('refuses a workspace entry to someone outside the coven, by direct id', async () => {
    // Why it could have answered: the row exists, has children, and a member
    // reads them through this same key.
    expect(await read(asUser(B), local.ref)).toEqual(children);

    await expect(read(asUser(D), local.ref)).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a workspace entry to a site admin, who reaches no coven', async () => {
    expect(await read(asUser(B), local.ref)).toEqual(children);

    await expect(read(asUser(E), local.ref)).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a workspace entry to a signed-out request', async () => {
    await expect(read(null, local.ref)).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses one key without refusing the rest of its batch', async () => {
    const loader = loadersFor(asUser(D))[name];
    const load = (ref: IngredientKey) => loader.load(ref);

    const [refused, answered] = await Promise.allSettled([load(local.ref), load(compendium.ref)]);

    expect(refused).toMatchObject({ status: 'rejected', reason: expect.any(Forbidden) });
    expect(answered).toMatchObject({ status: 'fulfilled' });
  });

  // The key names the tier, so a caller could lie about it. The check then
  // passes — the compendium needs none, and D really is a member of X — and
  // only the read's own scope stands between D and W's rows.
  it.each([
    ['the compendium', null],
    ["the caller's own coven", WORKSPACE_X_ID],
  ])('answers nothing for a workspace entry whose key claims %s', async (_claim, workspaceId) => {
    expect(await read(asUser(B), local.ref)).toEqual(children);

    expect(await read(asUser(D), { id: local.ref.id, workspaceId })).toEqual([]);
  });

  it('answers nothing for a soft-deleted ingredient', async () => {
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${local.ref.id}`;

    expect(await read(asUser(B), local.ref)).toEqual([]);
  });
});
