import { defineLoader } from '../../../graphql/loaders/define-loader';
import { Forbidden } from '../../../lib/errors';
import { usersForAdmin } from '../services/privilege-changes';
import type { UserRow } from '../types';

/**
 * `PrivilegeChange.subject` and `.actor`, batched: every user a page of the
 * ledger names, in one read whichever field asked. Null for an id no live
 * user holds.
 */
export const usersByIdForAdmin = defineLoader<string, UserRow | null>(async (session, userIds) =>
  session ? usersForAdmin(session, userIds) : userIds.map(() => new Forbidden()),
);
