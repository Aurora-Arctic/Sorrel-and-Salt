import { graphql } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import type { getMe as GetMe } from '@/modules/identity';
import { A, B, E, asUser } from '../../../support/as-user';

// The schema's second check on `User.email`, `emailVerified`, `role` and
// `canCreateWorkspace` (DESIGN.md §7). `getMe` takes no id, and `users`
// answers an admin alone (MB.52), so no query a non-admin can make reaches
// another user's row; this test hands `me` B's row whoever asks — a service
// that answered the wrong row, which is exactly the bug the scope stands behind.
// The mock names the service's file because the index re-exports it: mocking
// the index would leave the resolver's own import untouched.

const { getMe, actual } = vi.hoisted(() => ({
  getMe: vi.fn(),
  actual: { getMe: undefined as unknown as typeof GetMe },
}));
vi.mock('@/modules/identity/services/profile', async (importOriginal) => {
  const original = await importOriginal<{ getMe: typeof GetMe }>();
  actual.getMe = original.getMe;
  return { ...original, getMe };
});

async function meAs(session: Session, field: string) {
  getMe.mockResolvedValue(await actual.getMe(asUser(B)));
  return graphql({
    schema,
    source: `query { me { id name ${field} } }`,
    contextValue: { session, loaders: createLoaders(session) },
  });
}

describe.each(['email', 'emailVerified', 'role', 'canCreateWorkspace'])('User.%s', (field) => {
  it('resolves on the user’s own row', async () => {
    const result = await meAs(asUser(B), field);

    expect(result.errors).toBeUndefined();
    expect(result.data?.me).toMatchObject({ id: B.id, [field]: expect.anything() });
  });

  it('resolves for a site admin', async () => {
    expect(asUser(E).role).toBe('admin');

    const result = await meAs(asUser(E), field);

    expect(result.errors).toBeUndefined();
    expect(result.data?.me).toMatchObject({ id: B.id });
  });

  it("is refused on another user's row, though the row carries it", async () => {
    // Why this could have succeeded: the row handed back is B's, whole, and
    // the unscoped `name` beside the field resolves for A.
    const unscoped = await meAs(asUser(A), '');
    expect(unscoped.data?.me).toMatchObject({ id: B.id, name: B.name });

    const result = await meAs(asUser(A), field);

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.path).toEqual(['me', field]);
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });
});
