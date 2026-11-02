import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { sessionOf } from '../../../graphql/context-helpers';
import {
  liftUserAccessPause,
  listUserAccessPauses,
  pauseUserAccess,
} from '../services/access-pause';
import type { UserAccessPauseRow } from '../types';

const UserAccessPauseRef = builder.objectRef<UserAccessPauseRow>('UserAccessPause').implement({
  description:
    'A pause on a user’s access to the site: nothing but support until `until`, or with no end when `until` is null, unless lifted sooner. `note` says why, for staff.',
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeID('userId'),
    until: t.expose('until', { type: 'DateTime', nullable: true }),
    note: t.exposeString('note'),
    liftedAt: t.expose('liftedAt', { type: 'DateTime', nullable: true }),
    liftedBy: t.exposeID('liftedBy', { nullable: true }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

builder.mutationField('pauseUserAccess', (t) =>
  t.field({
    type: UserAccessPauseRef,
    description:
      'Pauses a user’s access until `until`, or with no end when it is left out, with a note saying why, and ends every session they hold. Site admins only.',
    args: {
      userId: t.arg.id({ required: true }),
      until: t.arg({ type: 'DateTime', required: false }),
      note: t.arg.string({ required: true }),
    },
    authScopes: { admin: true },
    resolve: (_root, { userId, until, note }, context) =>
      pauseUserAccess(sessionOf(context), userId, until, note, context.pauses),
  }),
);

builder.mutationField('liftUserAccessPause', (t) =>
  t.field({
    type: UserAccessPauseRef,
    description:
      'Lifts the pause standing on a user’s access now, and answers it. Site admins only.',
    args: { userId: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { userId }, context) => liftUserAccessPause(sessionOf(context), userId),
  }),
);

builder.queryField('userAccessPauses', (t) =>
  t.pagedConnection({
    type: UserAccessPauseRef,
    description:
      'Every pause set on a user’s access, standing, run out and lifted alike, newest first. Site admins only.',
    args: { userId: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { userId }, page, context) =>
      listUserAccessPauses(sessionOf(context), userId, page),
  }),
);
