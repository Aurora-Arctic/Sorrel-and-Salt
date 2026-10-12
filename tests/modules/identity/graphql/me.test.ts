import { describe, expect, it, vi } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { A, asUser } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';

// `me` over the real schema, through the shared harness: the signed-in user's
// own row and its memberships through the request's loader. A signed-out
// caller is tests/db/graphql-query-scopes.test.ts's, and the route carrying
// that refusal tests/app/api/graphql/route.test.ts's.

const ME = /* GraphQL */ `
  query {
    me {
      id
      name
      email
      role
      canCreateWorkspace
      memberships {
        role
        workspace {
          id
          slug
        }
      }
    }
  }
`;

describe('the me query', () => {
  it('answers the signed-in user, private fields included', async () => {
    const result = await run(asUser(A), ME);

    expect(result.errors).toBeUndefined();
    expect(result.data?.me).toMatchObject({
      id: A.id,
      name: A.name,
      email: A.email,
      role: 'user',
      canCreateWorkspace: A.canCreateWorkspace,
    });
  });

  it('resolves memberships through the request’s loader', async () => {
    const session = asUser(A);
    const loaders = createLoaders(session);
    const load = vi.spyOn(loaders.membershipsByUser, 'load');

    const result = await run(session, ME, {}, { loaders });

    expect(load).toHaveBeenCalledWith(A.id);
    expect(result.data?.me).toMatchObject({
      memberships: [{ role: 'owner', workspace: { id: WORKSPACE_W_ID } }],
    });
  });
});
