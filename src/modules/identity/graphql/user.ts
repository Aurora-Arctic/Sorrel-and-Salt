import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { Forbidden } from '../../../lib/errors';
import { userRole } from '../schema/users';
import { setEmail } from '../services/email';
import { type UserRow, getMe } from '../services/profile';

const UserRoleEnum = builder.enumType('UserRole', { values: userRole.enumValues });

/**
 * A user's own business, not a co-member's: readable on one's own row and by
 * a site admin, refused with `Forbidden` otherwise — the second check behind
 * the service that chose the row (claude-docs/graphql.md, "Auth scopes").
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
// followed, so the answer's `email` is still the old one.
builder.mutationField('setEmail', (t) =>
  t.field({
    type: UserRef,
    args: { email: t.arg.string({ required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { email }, { session, emailVerification }) => {
      if (!session) throw new Forbidden();
      return setEmail(session, email, emailVerification);
    },
  }),
);
