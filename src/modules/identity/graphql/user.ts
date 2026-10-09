import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { Forbidden } from '../../../lib/errors';
import { userRole } from '../schema/users';
import { setEmail } from '../services/email';
import { getMe } from '../services/profile';
import { listUsers } from '../services/user-list';
import { grantWorkspaceCreation, revokeWorkspaceCreation } from '../services/workspace-creation';
import type { UserRow } from '../types';

const UserRoleEnum = builder.enumType('UserRole', { values: userRole.enumValues });

/**
 * A user's own business, not a co-member's: readable on one's own row and by
 * a site admin, refused with `Forbidden` otherwise — the second check behind
 * the service that chose the row (claude-docs/graphql/schema.md, "Auth scopes").
 */
const selfOrAdmin = (user: UserRow) => ({ self: user.id, admin: true });

export const UserRef = builder.objectRef<UserRow>('User').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    image: t.exposeString('image', { nullable: true }),
    email: t.exposeString('email', { authScopes: selfOrAdmin }),
    role: t.expose('role', { type: UserRoleEnum, authScopes: selfOrAdmin }),
    canCreateWorkspace: t.exposeBoolean('canCreateWorkspace', { authScopes: selfOrAdmin }),
    emailVerified: t.exposeBoolean('emailVerified', { authScopes: selfOrAdmin }),
    // An admin's alone, the user's own row included: the account page reads a
    // user's own from Better Auth, whose table it is.
    providers: t.stringList({
      description: 'The sign-in providers linked to the account, by id, sorted.',
      authScopes: { admin: true },
      resolve: (user, _args, { loaders }) => loaders.providersByUser.load(user.id),
    }),
    audit: t.field({ type: AuditInfo, resolve: (user) => user }),
  }),
});

builder.queryField('me', (t) =>
  t.field({
    type: UserRef,
    authScopes: { signedIn: true },
    resolve: (_query, _args, { session }) => {
      // The scope has already refused a null session; the type does not know.
      if (!session) throw new Forbidden();
      return getMe(session);
    },
  }),
);

// Returns the row as it is: the address counts once the mailed link is
// followed, so the answer's `email` is still the old one. `next` is where
// the link's landing goes on to.
builder.mutationField('setEmail', (t) =>
  t.field({
    type: UserRef,
    args: { email: t.arg.string({ required: true }), next: t.arg.string() },
    authScopes: { signedIn: true },
    resolve: (_root, { email, next }, { session, emailVerification }) => {
      if (!session) throw new Forbidden();
      return setEmail(session, email, emailVerification, next ?? undefined);
    },
  }),
);

// The admin user list (MB.52): a read, so the service's own check refuses a
// non-admin rather than M5.7's mutation scope. Its nodes are the ordinary
// `User`, so `email` resolves through the scope above and no second path.
builder.queryField('users', (t) =>
  t.pagedConnection({
    type: UserRef,
    args: {
      query: t.arg.string({ required: false }),
      awaitingApproval: t.arg.boolean({ required: false }),
    },
    resolve: (_root, { query, awaitingApproval }, page, { session }) => {
      if (!session) throw new Forbidden();
      return listUsers(
        session,
        { query: query ?? undefined, awaitingApproval: awaitingApproval ?? undefined },
        page,
      );
    },
  }),
);

// M5.8's approval and its revoke: the site admin's alone, scoped here and
// refused again by the service, which is the real gate. Each answers the row,
// so the list re-reads it.
const CREATION_WRITES = [
  {
    field: 'grantWorkspaceCreation',
    description: 'Lets a user with no invitation create a coven. Refused once they may.',
    write: grantWorkspaceCreation,
  },
  {
    field: 'revokeWorkspaceCreation',
    description:
      'Stops a user creating covens; those they own stay theirs. Refused for an admin, and for a user who cannot.',
    write: revokeWorkspaceCreation,
  },
] as const;

for (const { field, description, write } of CREATION_WRITES) {
  builder.mutationField(field, (t) =>
    t.field({
      type: UserRef,
      description,
      args: { userId: t.arg.id({ required: true }) },
      authScopes: { admin: true },
      resolve: (_root, { userId }, { session }) => {
        if (!session) throw new Forbidden();
        return write(session, userId);
      },
    }),
  );
}
