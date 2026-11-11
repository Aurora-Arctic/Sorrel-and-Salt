import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { definedArgs, sessionOf } from '../../../graphql/context-helpers';
import { userRole } from '../schema/users';
import { pauseAdminRoleChanges, resumeAdminRoleChanges } from '../services/admin-role-pause';
import { setEmail } from '../services/email';
import { setName } from '../services/name';
import { agreeToTerms } from '../services/terms';
import { setPassword } from '../services/password';
import { getMe } from '../services/profile';
import { listUsers } from '../services/user-list';
import { setUserRole } from '../services/user-role';
import { grantWorkspaceCreation, revokeWorkspaceCreation } from '../services/workspace-creation';
import type { UserRow } from '../types';

const UserRoleEnum = builder.enumType('UserRole', { values: userRole.enumValues });

/** Readable on one's own row and by a site admin, else `Forbidden` (claude-docs/graphql/schema.md, "Auth scopes: the second check"). */
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
    agreedTermsVersion: t.exposeInt('agreedTermsVersion', {
      nullable: true,
      authScopes: selfOrAdmin,
    }),
    agreedDisclaimerVersion: t.exposeInt('agreedDisclaimerVersion', {
      nullable: true,
      authScopes: selfOrAdmin,
    }),
    agreedEthicsVersion: t.exposeInt('agreedEthicsVersion', {
      nullable: true,
      authScopes: selfOrAdmin,
    }),
    // An admin's alone, the user's own row included: the account page reads a
    // user's own from Better Auth, whose table it is.
    providers: t.stringList({
      description: 'The sign-in providers linked to the account, by id, sorted.',
      authScopes: { admin: true },
      resolve: (user, _args, { loaders }) => loaders.providersByUser.load(user.id),
    }),
    hasPasskey: t.boolean({
      description: 'Whether the account holds at least one passkey.',
      authScopes: { admin: true },
      resolve: (user, _args, { loaders }) => loaders.passkeyHeldByUser.load(user.id),
    }),
    audit: t.field({ type: AuditInfo, resolve: (user) => user }),
  }),
});

builder.queryField('me', (t) =>
  t.field({
    type: UserRef,
    authScopes: { signedIn: true },
    resolve: (_query, _args, context) => getMe(sessionOf(context)),
  }),
);

// Returns the row as it is: `email` is still the old one until the mailed link is followed.
builder.mutationField('setEmail', (t) =>
  t.field({
    type: UserRef,
    args: { email: t.arg.string({ required: true }), next: t.arg.string() },
    authScopes: { signedIn: true },
    resolve: (_root, { email, next }, context) =>
      setEmail(sessionOf(context), email, context.emailVerification, next ?? undefined),
  }),
);

// A change goes to Better Auth's own `/change-password`, which asks for the current one.
builder.mutationField('setPassword', (t) =>
  t.boolean({
    args: { newPassword: t.arg.string({ required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { newPassword }, context) =>
      setPassword(sessionOf(context), newPassword, context.passwords),
  }),
);

builder.mutationField('setName', (t) =>
  t.field({
    type: UserRef,
    args: { name: t.arg.string({ required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { name }, context) => setName(sessionOf(context), name),
  }),
);

const AgreementVersionInput = builder.inputType('AgreementVersionInput', {
  fields: (t) => ({
    terms: t.int({ required: true }),
    disclaimer: t.int({ required: true }),
    ethics: t.int({ required: true }),
  }),
});

builder.mutationField('agreeToTerms', (t) =>
  t.field({
    type: UserRef,
    args: { version: t.arg({ type: AgreementVersionInput, required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { version }, context) => agreeToTerms(sessionOf(context), version),
  }),
);

// The service's own check refuses a non-admin rather than the mutation scope; `email` resolves through the scope above and no second path.
builder.queryField('users', (t) =>
  t.pagedConnection({
    type: UserRef,
    args: {
      query: t.arg.string({ required: false }),
      awaitingApproval: t.arg.boolean({ required: false }),
      role: t.arg({ type: UserRoleEnum, required: false }),
      timedOut: t.arg.boolean({
        required: false,
        description: 'Only the users a support time-out stands on.',
      }),
      paused: t.arg.boolean({
        required: false,
        description: 'Only the users a site access pause stands on.',
      }),
    },
    resolve: (_root, { query, awaitingApproval, role, timedOut, paused }, page, context) =>
      listUsers(
        sessionOf(context),
        definedArgs({ query, awaitingApproval, role, timedOut, paused }),
        page,
      ),
  }),
);

// Scoped here and refused again by the service, which is the real gate.
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
      args: { userId: t.arg.id({ required: true }), note: t.arg.string() },
      authScopes: { admin: true },
      resolve: (_root, { userId, note }, context) =>
        write(sessionOf(context), userId, note ?? undefined),
    }),
  );
}

// Scoped here and refused again by the service, the real gate; the actor is the session's, never an argument.
builder.mutationField('setUserRole', (t) =>
  t.field({
    type: UserRef,
    description:
      'Gives a user a site role, user, curator or admin, with an optional reason for the record. Refused for a role already held, for moving the primary admin or the last admin off admin, and for a curator.',
    args: {
      userId: t.arg.id({ required: true }),
      role: t.arg({ type: UserRoleEnum, required: true }),
      note: t.arg.string(),
    },
    authScopes: { admin: true },
    resolve: (_root, { userId, role, note }, context) =>
      setUserRole(sessionOf(context), userId, role, note ?? undefined),
  }),
);

// The service refuses every admin but the primary one. Answers the state, so a second click gets no error.
builder.mutationField('pauseAdminRoleChanges', (t) =>
  t.boolean({
    description:
      'Pauses admin grants and revokes for every admin but the primary one; answers true, paused. The primary admin alone may.',
    authScopes: { admin: true },
    resolve: (_root, _args, context) => pauseAdminRoleChanges(sessionOf(context)),
  }),
);

builder.mutationField('resumeAdminRoleChanges', (t) =>
  t.boolean({
    description:
      'Ends the pause on admin grants and revokes; answers false, not paused. The primary admin alone may.',
    authScopes: { admin: true },
    resolve: (_root, _args, context) => resumeAdminRoleChanges(sessionOf(context)),
  }),
);
