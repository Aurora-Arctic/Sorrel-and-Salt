import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { sessionOf } from '../../../graphql/context-helpers';
import type { InvitationRow } from '../../../db/repository';
import { createAdminInvitation, revokeAdminInvitation } from '../services/admin-invitations';
import { acceptInvitation } from '../services/invitation-acceptance';

// MB.70's admin invitation and the one accept (MB.202). No field carries the
// token or a link: the token exists only in the mail, and the row holds its
// hash, which is not exposed either (claude-docs/auth/admin-users.md,
// "Inviting an admin"). M7.3 adds the workspace tier's `workspace` and
// `role`, which DESIGN.md §7 sketches; `identity` cannot name a `Workspace`.

const InvitationRef = builder.objectRef<InvitationRow>('Invitation').implement({
  description:
    'An invitation, pending or not. Its link is mailed to the address and never answered.',
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    note: t.exposeString('note', {
      nullable: true,
      description: 'Why the person is invited, where the inviter gave a reason.',
    }),
    expiresAt: t.expose('expiresAt', { type: 'DateTime' }),
    acceptedAt: t.expose('acceptedAt', { type: 'DateTime', nullable: true }),
    revokedAt: t.expose('revokedAt', { type: 'DateTime', nullable: true }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

// The site admin's alone, scoped here and refused again by the service, which
// is the real gate and also refuses another admin than the primary one while
// admin changes are paused. The actor is the session's, never an argument.
builder.mutationField('createAdminInvitation', (t) =>
  t.field({
    type: InvitationRef,
    description:
      'Invites an address to become an admin, mailing it the link; answers the invitation, never the link. Refused while admin changes are paused, but to the primary admin.',
    args: { email: t.arg.string({ required: true }), note: t.arg.string() },
    authScopes: { admin: true },
    resolve: (_root, { email, note }, context) =>
      createAdminInvitation(sessionOf(context), email, note ?? undefined, context.invitations),
  }),
);

builder.mutationField('revokeAdminInvitation', (t) =>
  t.field({
    type: InvitationRef,
    description:
      'Withdraws a pending admin invitation, so its link says so. Refused while admin changes are paused, but to the primary admin.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { id }, context) => revokeAdminInvitation(sessionOf(context), id),
  }),
);

// Any signed-in session may try: the service admits only the holder of the
// invited address, verified, and refuses a dead link in words of its own.
builder.mutationField('acceptInvitation', (t) =>
  t.field({
    type: InvitationRef,
    description:
      "Accepts the invitation a link's token names, as the signed-in account, which must hold the invited address, verified; answers it accepted.",
    args: { token: t.arg.string({ required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { token }, context) => acceptInvitation(sessionOf(context), token),
  }),
);
