import { UserRef } from '@/modules/identity';
import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { workspaceRole } from '../schema/workspaces';
import type { MembershipWithWorkspace, WorkspaceRow } from '../services/memberships';

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
