import { CoMemberRef, UserRef } from '@/modules/identity';
import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { AuditInfo } from '../../../graphql/schema/audit';
import { workspaceRole } from '../schema/workspaces';
import { leaveWorkspace, removeMember } from '../services/member-removal';
import { updateMemberRole } from '../services/member-role';
import { listMembers } from '../services/members';
import { createWorkspace } from '../services/workspace-creation';
import { deleteWorkspace } from '../services/workspace-deletion';
import type { MembershipWithWorkspace, WorkspaceRow } from '../types';

const WorkspaceRoleEnum = builder.enumType('WorkspaceRole', {
  values: workspaceRole.enumValues,
});

export const WorkspaceRef = builder.objectRef<WorkspaceRow>('Workspace').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    audit: t.field({ type: AuditInfo, resolve: (workspace) => workspace }),
  }),
});

export const WorkspaceMemberRef = builder
  .objectRef<MembershipWithWorkspace>('WorkspaceMember')
  .implement({
    fields: (t) => ({
      role: t.expose('role', { type: WorkspaceRoleEnum }),
      joinedAt: t.expose('joinedAt', { type: 'DateTime' }),
      workspace: t.field({ type: WorkspaceRef, resolve: (member) => member.workspace }),
      // The name through `usersById`, one read for every member a request
      // lists, whichever covens they sit in.
      user: t.field({ type: CoMemberRef, resolve: (member) => ({ id: member.userId }) }),
      // Who sent the invitation that seated them; null for a coven's creator.
      // Named through `usersById` with `user`, so one read covers both.
      invitedBy: t.field({
        type: CoMemberRef,
        nullable: true,
        resolve: (member) => (member.invitedBy ? { id: member.invitedBy } : null),
      }),
      // The owner's alone, on a field of its own rather than on
      // `user`, a `CoMember` every member reads. Through `memberEmailsByMember`,
      // one read per page of members; anyone else gets `FORBIDDEN`.
      email: t.field({
        type: 'String',
        nullable: true,
        description:
          "The member's address, as their own account holds it now. Owners only; null for someone the coven no longer seats.",
        resolve: (member, _args, { loaders }) =>
          loaders.memberEmailsByMember.load({
            workspaceId: member.workspaceId,
            userId: member.userId,
          }),
      }),
      audit: t.field({ type: AuditInfo, resolve: (member) => member }),
    }),
  });

// Here rather than in `WorkspaceRef`'s own fields, which are built before
// `WorkspaceMemberRef` exists. A coven at a time: the service checks
// `member: read` and reads one page.
builder.objectField(WorkspaceRef, 'members', (t) =>
  t.pagedConnection({
    type: WorkspaceMemberRef,
    description:
      "The coven's live members, in the order they joined, for the roles that may read them.",
    resolve: (workspace, _args, page, context) => listMembers(sessionOf(context), workspace, page),
  }),
);

// On `User` from here rather than in identity, which may import no module.
// A caller reads their own; a site admin reads anyone's, by name and role only,
// and the service answers a `Forbidden` for the rest.
builder.objectField(UserRef, 'memberships', (t) =>
  t.field({
    type: [WorkspaceMemberRef],
    resolve: (user, _args, { loaders }) => loaders.membershipsByUser.load(user.id),
  }),
);

// The gate is the service's, so this scope only keeps a signed-out caller out
// (claude-docs/graphql/schema.md, "Auth scopes").
builder.mutationField('createWorkspace', (t) =>
  t.field({
    type: WorkspaceRef,
    description:
      'Creates a coven with the caller as its owner. Refused for a user who may not create one.',
    args: { name: t.arg.string({ required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { name }, context) => createWorkspace(sessionOf(context), { name }),
  }),
);

builder.mutationField('updateMemberRole', (t) =>
  t.field({
    type: WorkspaceMemberRef,
    description:
      "Sets an existing member's role. Owners only; refused when it would leave the coven without an owner.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      userId: t.arg.id({ required: true }),
      role: t.arg({ type: WorkspaceRoleEnum, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, userId, role }, context) =>
      updateMemberRole(sessionOf(context), workspaceId, userId, role),
  }),
);

builder.mutationField('deleteWorkspace', (t) =>
  t.boolean({
    description:
      'Deletes a coven, which no member can reach afterwards. Owners only; nothing is destroyed, so it can be restored by hand.',
    args: { workspaceId: t.arg.id({ required: true }) },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId }, context) => {
      await deleteWorkspace(sessionOf(context), workspaceId);
      return true;
    },
  }),
);

builder.mutationField('removeMember', (t) =>
  t.boolean({
    description:
      'Removes a member from a coven, who can no longer reach it. Owners only; refused when it would leave the coven without an owner.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      userId: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, userId }, context) => {
      await removeMember(sessionOf(context), workspaceId, userId);
      return true;
    },
  }),
);

builder.mutationField('leaveWorkspace', (t) =>
  t.boolean({
    description:
      "Takes the caller out of a coven, whatever their role. Only the caller's own membership; refused when they are its only owner.",
    args: { workspaceId: t.arg.id({ required: true }) },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId }, context) => {
      await leaveWorkspace(sessionOf(context), workspaceId);
      return true;
    },
  }),
);
