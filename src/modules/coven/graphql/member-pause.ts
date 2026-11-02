import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { AuditInfo } from '../../../graphql/schema/audit';
import { liftMemberAccessPause, pauseMemberAccess } from '../services/member-pause';
import type { WorkspaceMemberPauseRow } from '../types';

const WorkspaceMemberPauseRef = builder
  .objectRef<WorkspaceMemberPauseRow>('WorkspaceMemberPause')
  .implement({
    description:
      'A pause on one member’s access to a coven: every read and write in it is refused until `until`, or with no end when `until` is null, unless lifted sooner. The member keeps their seat.',
    fields: (t) => ({
      id: t.exposeID('id'),
      workspaceId: t.exposeID('workspaceId'),
      userId: t.exposeID('userId'),
      until: t.expose('until', { type: 'DateTime', nullable: true }),
      note: t.exposeString('note', { nullable: true }),
      liftedAt: t.expose('liftedAt', { type: 'DateTime', nullable: true }),
      liftedBy: t.exposeID('liftedBy', { nullable: true }),
      audit: t.field({ type: AuditInfo, resolve: (row) => row }),
    }),
  });

builder.mutationField('pauseMemberAccess', (t) =>
  t.field({
    type: WorkspaceMemberPauseRef,
    description:
      'Pauses a member’s access to a coven until `until`, or with no end when it is left out. Owners only; an owner cannot be paused.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      userId: t.arg.id({ required: true }),
      until: t.arg({ type: 'DateTime', required: false }),
      note: t.arg.string({ required: false }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, userId, until, note }, context) =>
      pauseMemberAccess(sessionOf(context), workspaceId, userId, until, note),
  }),
);

builder.mutationField('liftMemberAccessPause', (t) =>
  t.field({
    type: WorkspaceMemberPauseRef,
    description:
      'Lifts the pause standing on a member’s access to a coven now, and answers it. Owners only.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      userId: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, userId }, context) =>
      liftMemberAccessPause(sessionOf(context), workspaceId, userId),
  }),
);
