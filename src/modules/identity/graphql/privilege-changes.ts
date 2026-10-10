import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { Forbidden } from '../../../lib/errors';
import {
  userPrivilege,
  userPrivilegeChange,
  userPrivilegeRoute,
} from '../schema/user-privilege-changes';
import { listPrivilegeChanges } from '../services/privilege-changes';
import type { PrivilegeChangeRow } from '../types';
import { UserRef } from './user';

const UserPrivilegeEnum = builder.enumType('UserPrivilege', {
  description: 'A privilege on `users`: `admin` is the site role, `create_workspace` the flag.',
  values: userPrivilege.enumValues,
});

const PrivilegeChangeKindEnum = builder.enumType('PrivilegeChangeKind', {
  values: userPrivilegeChange.enumValues,
});

const PrivilegeRouteEnum = builder.enumType('PrivilegeRoute', {
  description:
    "How a change came about: the primary admin's bootstrap, an admin's act, an invitation accepted, or a declared manual fix.",
  values: userPrivilegeRoute.enumValues,
});

// One row of the privilege ledger (MB.194). `audit.createdAt` is when and
// `actor` who, `createdBy` read as a user: the one field a row has that the
// trigger, not the actor, wrote. Subject and actor share the page's one
// `usersByIdForAdmin` read (rule 9).
const PrivilegeChangeRef = builder.objectRef<PrivilegeChangeRow>('PrivilegeChange').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    subject: t.field({
      type: UserRef,
      nullable: true,
      description: 'Whose privilege changed; null if no live account holds the id.',
      resolve: (row, _args, { loaders }) => loaders.usersByIdForAdmin.load(row.userId),
    }),
    privilege: t.expose('privilege', { type: UserPrivilegeEnum }),
    change: t.expose('change', { type: PrivilegeChangeKindEnum }),
    via: t.expose('via', { type: PrivilegeRouteEnum }),
    note: t.exposeString('note', {
      nullable: true,
      description: 'Why, where the one who made the change gave a reason.',
    }),
    actor: t.field({
      type: UserRef,
      nullable: true,
      description: 'Who made the change; null if no live account holds the id.',
      resolve: (row, _args, { loaders }) => loaders.usersByIdForAdmin.load(row.createdBy),
    }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

// The privilege ledger (MB.199), newest first: the site admin's alone,
// scoped here and refused again by the service, which is the real gate.
builder.queryField('privilegeChanges', (t) =>
  t.pagedConnection({
    type: PrivilegeChangeRef,
    description: 'Every change to who is an admin and who may create a coven, newest first.',
    args: {
      userId: t.arg.id({ required: false }),
      privilege: t.arg({ type: UserPrivilegeEnum, required: false }),
    },
    authScopes: { admin: true },
    resolve: (_root, { userId, privilege }, page, { session }) => {
      if (!session) throw new Forbidden();
      return listPrivilegeChanges(
        session,
        { userId: userId ?? undefined, privilege: privilege ?? undefined },
        page,
      );
    },
  }),
);
