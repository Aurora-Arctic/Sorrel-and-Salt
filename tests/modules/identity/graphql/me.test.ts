import { graphql } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { noSender } from '../../../support/email-verification';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { A, asUser } from '../../../support/as-user';
import type { Context } from '@/graphql/types';

// `me` over the real schema, with the context built the way `createContext`
// builds it minus the cookie parsing tests/graphql/context.test.ts covers.

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

function run(session: Session | null, contextValue?: Context) {
  return graphql({
    schema,
    source: ME,
    contextValue: contextValue ?? {
      session,
      loaders: createLoaders(session),
      emailVerification: noSender,
    },
  });
}

describe('the me query', () => {
  it('answers the signed-in user, private fields included', async () => {
    const result = await run(asUser(A));

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

    const result = await run(session, { session, loaders, emailVerification: noSender });

    expect(load).toHaveBeenCalledWith(A.id);
    expect(result.data?.me).toMatchObject({
      memberships: [{ role: 'owner', workspace: { id: WORKSPACE_W_ID } }],
    });
  });

  it('refuses a signed-out request', async () => {
    // Why this could have answered: the same query resolves for a session.
    expect((await run(asUser(A))).data?.me).toBeTruthy();

    const result = await run(null);

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });
});
