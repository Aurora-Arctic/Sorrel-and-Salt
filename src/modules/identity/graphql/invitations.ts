import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { sessionOf } from '../../../graphql/context-helpers';
import type { InvitableSiteRole, InvitationRow } from '../../../db/repository';
import { createAdminInvitation, revokeAdminInvitation } from '../services/admin-invitations';
import {
  acceptInvitation,
  acceptInvitationById,
  declineInvitationById,
} from '../services/invitation-acceptance';

// MB.70's admin invitation and the one accept. No field carries the
// token or a link: the token exists only in the mail, and the row holds its
// hash, which is not exposed either (claude-docs/auth/admin-users.md,
// "Inviting an admin"). The workspace tier's `workspace` and `role` are added
// from `coven`, since `identity` cannot name a `Workspace`. The names
// still say "admin invitation" for the site tier, which since M11.20 may
// invite a curator as well: `siteRole` says which.

const INVITABLE_SITE_ROLES = ['curator', 'admin'] as const satisfies readonly InvitableSiteRole[];

const InvitableSiteRoleEnum = builder.enumType('InvitableSiteRole', {
  description: 'A site role an invitation may grant: never `user`, which every account holds.',
  values: INVITABLE_SITE_ROLES,
});

export const InvitationRef = builder.objectRef<InvitationRow>('Invitation').implement({
  description:
    'An invitation, pending or not. Its link is mailed to the address and never answered.',
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    note: t.exposeString('note', {
      nullable: true,
      description: 'Why the person is invited, where the inviter gave a reason.',
    }),
    siteRole: t.field({
      type: InvitableSiteRoleEnum,
      nullable: true,
      description: 'The site role a site invitation grants; none on a coven invitation.',
      // A CHECK holds the column to these two (invitations_site_role_invitable).
      resolve: (row) => row.siteRole as InvitableSiteRole | null,
    }),
    expiresAt: t.expose('expiresAt', { type: 'DateTime' }),
    acceptedAt: t.expose('acceptedAt', { type: 'DateTime', nullable: true }),
    revokedAt: t.expose('revokedAt', { type: 'DateTime', nullable: true }),
    declinedAt: t.expose('declinedAt', {
      type: 'DateTime',
      nullable: true,
      description: 'When the invitee declined it, from the account page; a coven invitation only.',
    }),
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
      'Invites an address to become a curator or an admin, mailing it the link; answers the invitation, never the link. Refused for an address already holding that role or a higher one, and while admin changes are paused, but to the primary admin.',
    args: {
      email: t.arg.string({ required: true }),
      siteRole: t.arg({ type: InvitableSiteRoleEnum, required: true }),
      note: t.arg.string(),
    },
    authScopes: { admin: true },
    resolve: (_root, { email, siteRole, note }, context) =>
      createAdminInvitation(
        sessionOf(context),
        email,
        siteRole,
        note ?? undefined,
        context.invitations,
      ),
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

// The account page's accept: a coven invitation by the id the page
// lists, for a person whose mail never arrived. The same service checks, the
// session's verified address matched in SQL, and the site tier out of reach.
builder.mutationField('acceptInvitationById', (t) =>
  t.field({
    type: InvitationRef,
    description:
      "Accepts a pending coven invitation sent to the signed-in account's verified address, by its id, as the account page lists it; an admin invitation is accepted by its link alone.",
    args: { id: t.arg.id({ required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { id }, context) => acceptInvitationById(sessionOf(context), String(id)),
  }),
);

// The account page's Decline: the accept by id's checks, and the
// invitation stamped declined rather than accepted; nothing is granted.
builder.mutationField('declineInvitationById', (t) =>
  t.field({
    type: InvitationRef,
    description:
      "Declines a pending coven invitation sent to the signed-in account's verified address, by its id, as the account page lists it; its link then says it was declined, and the coven's owner sees it declined until they remove it.",
    args: { id: t.arg.id({ required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { id }, context) => declineInvitationById(sessionOf(context), String(id)),
  }),
);
