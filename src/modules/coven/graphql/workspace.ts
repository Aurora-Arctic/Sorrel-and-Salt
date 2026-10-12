import { UserRef } from '@/modules/identity';
import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { AuditInfo } from '../../../graphql/schema/audit';
import { workspaceRole } from '../schema/workspaces';
import { updateMemberRole } from '../services/member-role';
import { createWorkspace } from '../services/workspace-creation';
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
      audit: t.field({ type: AuditInfo, resolve: (member) => member }),
    }),
  });

// On `User` from here rather than in identity, which may import no module.
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
