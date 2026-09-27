import { graphql } from 'graphql';
import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { createBuilder } from '@/graphql/builder';
import type { Context } from '@/graphql/context';
import { createLoaders } from '@/graphql/loaders';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { type WorkspacePermission, assertMembership } from '@/modules/coven';
import { D, E, asUser } from '../../../support/as-user';

// CLAUDE.md rule 1, asserted rather than stated: a server component calling
// the service and a resolver reaching it over the schema get one answer,
// because the check is in the service and nowhere else. No production field
// reads a workspace yet, so the schema is a throwaway from `createBuilder()`;
// the context is built the way `createContext` builds it, minus the cookie
// parsing tests/graphql/context.test.ts covers.

const READ: WorkspacePermission = { workspace: ['read'] };

const scratch = createBuilder();
scratch.queryType({
  fields: (t) => ({
    workspaceRole: t.string({
      args: { workspaceId: t.arg.id({ required: true }) },
      authScopes: { signedIn: true },
      resolve: async (_query, { workspaceId }, { session }) => {
        // The scope has already refused a null session; the type does not know.
        if (!session) throw new Forbidden();
        return (await assertMembership(session, String(workspaceId), READ)).role;
      },
    }),
  }),
});
const schema = scratch.toSchema();

/** Path one: what a server component does. */
async function direct(session: Session, workspaceId: string) {
  return (await assertMembership(session, workspaceId, READ)).role;
}

/** Path two: what the browser's query does once Yoga has parsed the request. */
function overGraphQL(session: Session, workspaceId: string) {
  const contextValue: Context = { session, loaders: createLoaders(session) };
  return graphql({
    schema,
    source: 'query ($id: ID!) { workspaceRole(workspaceId: $id) }',
    variableValues: { id: workspaceId },
    contextValue,
  });
}

describe('one service, two transports', () => {
  // Why the refusals below could have succeeded: D is a real member of a real
  // workspace, the field resolves, and the finder is reached on both paths.
  it('answers a member the same way on both paths', async () => {
    await expect(direct(asUser(D), WORKSPACE_X_ID)).resolves.toBe('member');
    await expect(overGraphQL(asUser(D), WORKSPACE_X_ID)).resolves.toEqual({
      data: { workspaceRole: 'member' },
    });
  });

  it('refuses a member of another workspace on both paths', async () => {
    await expect(direct(asUser(D), WORKSPACE_W_ID)).rejects.toBeInstanceOf(Forbidden);

    const result = await overGraphQL(asUser(D), WORKSPACE_W_ID);
    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });

  it('refuses a site admin on both paths', async () => {
    // Why this could have succeeded: E's session says `admin`, the role that
    // would carry a bypass if either transport had one.
    expect(asUser(E).role).toBe('admin');

    await expect(direct(asUser(E), WORKSPACE_W_ID)).rejects.toBeInstanceOf(Forbidden);

    const result = await overGraphQL(asUser(E), WORKSPACE_W_ID);
    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });
});
