import { CoMemberRef } from '@/modules/identity';
import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { AuditInfo } from '../../../graphql/schema/audit';
import {
  liftMemberAccessPause,
  listMemberPauses,
  pauseMemberAccess,
} from '../services/member-pause';
import { WorkspaceRef } from './workspace';
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
      // Named through `usersById` as a member's name is: one read for every pause on the page.
      setBy: t.field({
        type: CoMemberRef,
        description: 'The owner who set the pause.',
        resolve: (row) => ({ id: row.createdBy }),
      }),
      liftedBy: t.field({
        type: CoMemberRef,
        nullable: true,
        description:
          'The owner who lifted the pause; null while it stands or after it ran out by itself.',
        resolve: (row) => (row.liftedBy ? { id: row.liftedBy } : null),
      }),
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
      message: t.arg.string({
        required: false,
        description: 'What the user is emailed, up to 500 characters; the note is never mailed.',
      }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, userId, until, note, message }, context) =>
      pauseMemberAccess(
        sessionOf(context),
        workspaceId,
        userId,
        until,
        note,
        context.pauses,
        message,
      ),
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

// On `Workspace`, as its members are: the members page's dialog asks for one member's pauses through the coven it already holds.
builder.objectField(WorkspaceRef, 'memberPauses', (t) =>
  t.pagedConnection({
    type: WorkspaceMemberPauseRef,
    description:
      'Every pause set on one member of the coven, standing, run out and lifted alike, newest first. Owners only.',
    args: { userId: t.arg.id({ required: true }) },
    resolve: (workspace, { userId }, page, context) =>
      listMemberPauses(sessionOf(context), workspace.id, userId, page),
  }),
);
