import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLoaders } from '@/graphql/loaders';
import { Forbidden } from '@/lib/errors';
import { membershipsByUser } from '@/modules/coven';
import { A, B, asUser } from '../../../support/as-user';

// The query count, observed at the repository: every read the service makes
// is wrapped so the test counts calls without changing what they answer.
const repository = vi.hoisted(() => ({
  findMembershipsOfUsers: vi.fn(),
  findManyByIds: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findMembershipsOfUsers.mockImplementation(actual.findMembershipsOfUsers);
  repository.findManyByIds.mockImplementation(actual.findManyByIds);
  return { ...actual, ...repository };
});

beforeEach(() => {
  repository.findMembershipsOfUsers.mockClear();
  repository.findManyByIds.mockClear();
});

describe('the membershipsByUser loader', () => {
  it('answers a batch of keys with one membership read and one workspace read', async () => {
    const { membershipsByUser: loader } = buildLoaders({ membershipsByUser }, asUser(A));

    const [own, other] = await Promise.allSettled([loader.load(A.id), loader.load(B.id)]);

    expect(own).toMatchObject({
      status: 'fulfilled',
      value: [expect.objectContaining({ role: 'owner' })],
    });
    expect(other).toMatchObject({ status: 'rejected', reason: expect.any(Forbidden) });
    expect(repository.findMembershipsOfUsers).toHaveBeenCalledTimes(1);
    expect(repository.findManyByIds).toHaveBeenCalledTimes(1);
  });

  it('refuses every key for a signed-out request, without a query', async () => {
    const { membershipsByUser: loader } = buildLoaders({ membershipsByUser }, null);

    await expect(loader.load(A.id)).rejects.toBeInstanceOf(Forbidden);
    expect(repository.findMembershipsOfUsers).not.toHaveBeenCalled();
  });
});
