import 'server-only';
import {
  findManyByIds,
  findPrivilegeChangeCount,
  findPrivilegeChangePage,
} from '../../../db/repository';
import { BOOTSTRAP_USER_ID } from '../../../db/bootstrap';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { RowId, parseInput } from '../../../lib/validation';
import { users } from '../schema/users';
import { assertSiteAdmin } from './site-admin';
import type { PrivilegeChangeFilter, PrivilegeChangeRow, UserRow } from '../types';

// The privilege ledger's reads (MB.199), behind `/admin/privilege-changes`
// and GraphQL's `privilegeChanges`: the database writes the ledger (MB.195),
// and only a site admin reads it, checked here by direct call
// (claude-docs/auth/admin-users.md, "The privilege ledger").

const REFUSAL = 'Only a site admin may read the privilege ledger';

/**
 * One page of the privilege ledger under `filter`, newest first, to a site
 * admin. A subject that is not an id is refused rather than read, so a
 * malformed one is not taken for a bad cursor.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} `filter.userId` is not an id.
 */
export async function listPrivilegeChanges(
  session: Session,
  filter: PrivilegeChangeFilter,
  page: PageRequest,
): Promise<PageEntry<PrivilegeChangeRow>[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findPrivilegeChangePage(admin, parsedFilter(filter), page);
}

/**
 * How many changes `listPrivilegeChanges` pages under `filter`, and how many
 * come before `start`, a page's first row, none on an empty page: "Page X
 * of Y" on `/admin/privilege-changes` (MB.200).
 *
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} `filter.userId` is not an id.
 */
export async function countPrivilegeChanges(
  session: Session,
  filter: PrivilegeChangeFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findPrivilegeChangeCount(admin, parsedFilter(filter), start);
}

/** The filter as the repository takes it, its subject checked to be an id. */
function parsedFilter({ userId, privilege }: PrivilegeChangeFilter): PrivilegeChangeFilter {
  return { userId: userId === undefined ? undefined : parseInput(RowId, userId), privilege };
}

/**
 * Whether `/admin/users` lists this user, so a row naming them can link to
 * theirs: everyone but the seed's bootstrap user, which stamps the seeded
 * rows and which the list leaves out (claude-docs/auth/admin-users.md, "The
 * user list").
 */
export function listedOnUserList(userId: string): boolean {
  return userId !== BOOTSTRAP_USER_ID;
}

/**
 * The live user behind each id, one answer per id in the order given and
 * null where none is live: a DataLoader's batch, the ledger's subjects and
 * actors in one read. A site admin's alone, as the ledger is: every slot of
 * anyone else's batch is a `Forbidden`.
 */
export async function usersForAdmin(
  session: Session,
  userIds: readonly string[],
): Promise<(UserRow | null | Forbidden)[]> {
  if (session.role !== 'admin') return userIds.map(() => new Forbidden(REFUSAL));
  const rows = await findManyByIds(users, [...new Set(userIds)]);
  return userIds.map((id) => rows.find((row) => row.id === id) ?? null);
}
