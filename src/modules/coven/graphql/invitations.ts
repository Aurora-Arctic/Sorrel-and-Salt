import { InvitationCardRef, InvitationRef, cardArrivalsCsv } from '@/modules/identity';
import { builder } from '../../../graphql/builder';
import { definedArgs, sessionOf } from '../../../graphql/context-helpers';
import { membershipsOf } from '../services/memberships';
import { createInvitation, revokeWorkspaceInvitation } from '../services/invitations';
import { WorkspaceRef } from './workspace';

// The workspace tier of `Invitation`: the fields `identity` cannot
// name, and the mutation that makes one. No field carries the token or a
// link: the token exists only in the mail (claude-docs/db/invitations.md,
// "Inviting into a coven").

// Not `WorkspaceRole`: an owner is not invitable, and the schema says so
// before the service does.
const InvitableRoleEnum = builder.enumType('InvitableRole', { values: ['viewer', 'member'] });

builder.objectField(InvitationRef, 'role', (t) =>
  t.field({
    type: InvitableRoleEnum,
    nullable: true,
    description: 'The role acceptance grants in the coven; none for an admin invitation.',
    resolve: (invitation) => invitation.role as 'viewer' | 'member' | null,
  }),
);

// From the caller's own covens, which one loader already batches: a caller
// outside the invitation's coven is answered none, as for an admin invitation.
builder.objectField(InvitationRef, 'workspace', (t) =>
  t.field({
    type: WorkspaceRef,
    nullable: true,
    description:
      'The coven invited into, where the caller is a member of it; none for an admin invitation.',
    resolve: async (invitation, _args, context) => {
      if (!invitation.workspaceId) return null;
      const seats = await context.loaders.membershipsByUser.load(sessionOf(context).userId);
      return seats.find((seat) => seat.workspaceId === invitation.workspaceId)?.workspace ?? null;
    },
  }),
);

builder.mutationField('createInvitation', (t) =>
  t.field({
    type: InvitationRef,
    description:
      'Invites an address into a coven as a viewer or member, mailing it the link; answers the invitation, never the link. Owners only.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      email: t.arg.string({ required: true }),
      role: t.arg({ type: InvitableRoleEnum, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, email, role }, context) =>
      createInvitation(sessionOf(context), workspaceId, { email, role }, context.invitations),
  }),
);

builder.mutationField('revokeInvitation', (t) =>
  t.field({
    type: InvitationRef,
    description:
      'Withdraws a pending invitation of a coven, so its link says so; the row is kept. Refused for an invitation already accepted, which is a member to remove. Owners only.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, id }, context) =>
      revokeWorkspaceInvitation(sessionOf(context), workspaceId, id),
  }),
);

// On `InvitationCard` from here, as `Invitation.workspace` is: identity may import no module. A site admin reads which
// covens an account belongs to, by name and role only (the same read as `User.memberships`).
builder.objectField(InvitationCardRef, 'ownedCovens', (t) =>
  t.field({
    type: [WorkspaceRef],
    description: 'The covens the accepting account owns now; empty while the card is unaccepted.',
    resolve: async (card, _args, { loaders }) => {
      if (!card.acceptedBy) return [];
      const seats = await loaders.membershipsByUser.load(card.acceptedBy);
      return seats.filter((seat) => seat.role === 'owner').map((seat) => seat.workspace);
    },
  }),
);

// Here for the same reason: the CSV's Covens Owned column is read through this module, in one batched lookup for every
// account on the list. The admin check stays in `cardArrivalsCsv`.
builder.queryField('cardArrivalsCsv', (t) =>
  t.string({
    description:
      'Every arrival the filter keeps as CSV text: account name, email, accepted date, batch and the covens the account owns. Site admins only.',
    args: {
      query: t.arg.string({
        required: false,
        description:
          "Part of the account's name or email, or the start of the batch number, case-insensitively.",
      }),
    },
    authScopes: { admin: true },
    resolve: (_root, { query }, context) => {
      const session = sessionOf(context);
      return cardArrivalsCsv(session, definedArgs({ query }), async (userIds) => {
        const seats = await membershipsOf(session, userIds);
        return new Map(
          userIds.map((id, index) => {
            const list = seats[index];
            const names = Array.isArray(list)
              ? list.filter((seat) => seat.role === 'owner').map((seat) => seat.workspace.name)
              : [];
            return [id, names];
          }),
        );
      });
    },
  }),
);
