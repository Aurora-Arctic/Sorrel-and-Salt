import { afterAll, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import postgres from 'postgres';
import { buildLoaders, createLoaders } from '@/graphql/loaders';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { ingredientsById } from '@/modules/ingredients';
import { A, D, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// The query count, observed at the repository: the batch's one read, wrapped
// so the test counts calls without changing what it answers.
const repository = vi.hoisted(() => ({ findManyIngredients: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findManyIngredients.mockImplementation(actual.findManyIngredients);
  return { ...actual, ...repository };
});

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});
afterAll(() => sql.end());

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  repository.findManyIngredients.mockClear();
});

const add = (name: string, workspaceId: string | null) =>
  insertIngredient(sql, makeIngredient({ name, workspaceId, nomenclature: 'none' }), A.id);

describe('the ingredientsById loader', () => {
  it('answers a batch of keys, compendium and own coven alike, with one read', async () => {
    const entry = await add('Testwort', null);
    const own = await add('Mockroot', WORKSPACE_W_ID);
    const { ingredientsById: loader } = buildLoaders({ ingredientsById }, asUser(A));

    const found = await Promise.all([
      loader.load({ id: entry, workspaceId: WORKSPACE_W_ID }),
      loader.load({ id: own, workspaceId: WORKSPACE_W_ID }),
    ]);

    expect(found.map((row) => row?.id)).toEqual([entry, own]);
    expect(repository.findManyIngredients).toHaveBeenCalledTimes(1);
  });

  it("is built per request, so one viewer's answers never reach another", async () => {
    const own = await add('Mockroot', WORKSPACE_W_ID);
    const asA = createLoaders(asUser(A));
    const asD = createLoaders(asUser(D));
    expect(createLoaders(asUser(A)).ingredientsById).not.toBe(asA.ingredientsById);

    // A sits in W, D does not; D asks second, after A's answer is cached.
    const key = { id: own, workspaceId: WORKSPACE_W_ID };
    await expect(asA.ingredientsById.load(key)).resolves.toMatchObject({ id: own });
    await expect(asD.ingredientsById.load(key)).resolves.toBeNull();
  });

  it('answers null for a soft-deleted row and for an id no row holds', async () => {
    const gone = await add('Goneroot', WORKSPACE_W_ID);
    await sql`update ingredients set deleted_at = now() where id = ${gone}`;
    const { ingredientsById: loader } = buildLoaders({ ingredientsById }, asUser(A));

    await expect(loader.load({ id: gone, workspaceId: WORKSPACE_W_ID })).resolves.toBeNull();
    await expect(
      loader.load({ id: crypto.randomUUID(), workspaceId: WORKSPACE_W_ID }),
    ).resolves.toBeNull();
    await expect(loader.load({ id: 'not-a-uuid', workspaceId: null })).resolves.toBeNull();
  });

  it("answers null for another coven's row, asked directly by id", async () => {
    const theirs = await add('Theirroot', WORKSPACE_X_ID);
    // A sits in W and the row is in X: a key claiming W, or no coven, finds nothing.
    const { ingredientsById: loader } = buildLoaders({ ingredientsById }, asUser(A));
    await expect(loader.load({ id: theirs, workspaceId: WORKSPACE_W_ID })).resolves.toBeNull();
    await expect(loader.load({ id: theirs, workspaceId: null })).resolves.toBeNull();

    // The precondition: its own coven's member does read it.
    const { ingredientsById: asX } = buildLoaders({ ingredientsById }, asUser(D));
    await expect(asX.load({ id: theirs, workspaceId: WORKSPACE_X_ID })).resolves.toMatchObject({
      id: theirs,
    });
  });

  it("does not hand a ref's row to a key naming a coven the caller also sits in", async () => {
    // Both covens are proved in one read; the row must still be the ref's own.
    await sql`insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${WORKSPACE_X_ID}, ${A.id}, 'member', ${A.id}, ${A.id})`;
    const theirs = await add('Theirroot', WORKSPACE_X_ID);
    const { ingredientsById: loader } = buildLoaders({ ingredientsById }, asUser(A));
    onTestFinished(async () => {
      await sql`delete from workspace_members where workspace_id = ${WORKSPACE_X_ID} and user_id = ${A.id}`;
    });

    // Added before either load, so both keys reach one batch.
    const own = await add('Ownroot', WORKSPACE_X_ID);

    const [crossed, home] = await Promise.all([
      loader.load({ id: theirs, workspaceId: WORKSPACE_W_ID }),
      loader.load({ id: own, workspaceId: WORKSPACE_X_ID }),
    ]);
    expect(crossed).toBeNull();
    expect(home).not.toBeNull();
  });
});
