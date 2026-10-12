import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLoaders, createLoaders } from '@/graphql/loaders';
import { Forbidden } from '@/lib/errors';
import { usersById } from '@/modules/identity';
import { A, B, C, D, asUser } from '../../../support/as-user';

// The query count, observed at the repository: every read the service could
// make is wrapped so the test counts calls without changing what they answer.
const repository = vi.hoisted(() => ({
  findCoMemberNamesIncludingSoftDeleted: vi.fn(),
  findManyByIds: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findCoMemberNamesIncludingSoftDeleted.mockImplementation(
    actual.findCoMemberNamesIncludingSoftDeleted,
  );
  repository.findManyByIds.mockImplementation(actual.findManyByIds);
  return { ...actual, ...repository };
});

beforeEach(() => {
  repository.findCoMemberNamesIncludingSoftDeleted.mockClear();
  repository.findManyByIds.mockClear();
});

describe('the usersById loader', () => {
  it('answers a batch of keys with one read', async () => {
    const { usersById: loader } = buildLoaders({ usersById }, asUser(B));

    await expect(Promise.all([A.id, C.id, D.id].map((id) => loader.load(id)))).resolves.toEqual([
      'Fixture A',
      'Fixture C',
      null,
    ]);
    expect(repository.findCoMemberNamesIncludingSoftDeleted).toHaveBeenCalledTimes(1);
    expect(repository.findManyByIds).not.toHaveBeenCalled();
  });

  it("is built per request, so one viewer's answers never reach another", async () => {
    const asB = createLoaders(asUser(B));
    const asD = createLoaders(asUser(D));
    expect(asB.usersById).not.toBe(asD.usersById);
    expect(createLoaders(asUser(B)).usersById).not.toBe(asB.usersById);

    // B shares W with A; D does not, and asks second, after B's answer is cached.
    await expect(asB.usersById.load(A.id)).resolves.toBe('Fixture A');
    await expect(asD.usersById.load(A.id)).resolves.toBeNull();
  });

  it('refuses every key for a signed-out request, without a query', async () => {
    const { usersById: loader } = buildLoaders({ usersById }, null);

    await expect(loader.load(A.id)).rejects.toBeInstanceOf(Forbidden);
    expect(repository.findCoMemberNamesIncludingSoftDeleted).not.toHaveBeenCalled();
  });
});
