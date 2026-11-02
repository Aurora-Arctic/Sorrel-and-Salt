import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { sessionOf } from '../../../graphql/context-helpers';
import { liftUserAccessPause, pauseUserAccess } from '../services/access-pause';
import type { UserAccessPauseRow } from '../types';

const UserAccessPauseRef = builder.objectRef<UserAccessPauseRow>('UserAccessPause').implement({
  description:
    'A pause on a user’s access to the site: no sign-in by any method until `until`, or with no end when `until` is null, unless lifted sooner.',
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeID('userId'),
    until: t.expose('until', { type: 'DateTime', nullable: true }),
    note: t.exposeString('note', { nullable: true }),
    liftedAt: t.expose('liftedAt', { type: 'DateTime', nullable: true }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

builder.mutationField('pauseUserAccess', (t) =>
  t.field({
    type: UserAccessPauseRef,
    description:
      'Pauses a user’s access until `until`, or with no end when it is left out, and ends every session they hold. Site admins only.',
    args: {
      userId: t.arg.id({ required: true }),
      until: t.arg({ type: 'DateTime', required: false }),
      note: t.arg.string({ required: false }),
    },
    authScopes: { admin: true },
    resolve: (_root, { userId, until, note }, context) =>
      pauseUserAccess(sessionOf(context), userId, until, note),
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
