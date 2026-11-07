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
import { inIdOrder } from '../../../lib/in-id-order';
import { users } from '../schema/users';
import { isSiteAdmin, refuseBatch } from './admin-changes';
import { assertSiteAdmin } from './site-admin';
import type { PrivilegeChangeFilter, PrivilegeChangeRow, UserRow } from '../types';

// Only a site keeper reads the ledger, checked here by direct call (claude-docs/auth/admin-users.md, "The privilege ledger").

const REFUSAL = 'Only a site keeper may read the privilege ledger';

/**
 * A subject that is not an id is refused rather than read, so it is not taken for a bad cursor.
 *
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

function parsedFilter({ userId, privilege, query }: PrivilegeChangeFilter): PrivilegeChangeFilter {
  const trimmed = query?.trim();
  return {
    userId: userId === undefined ? undefined : parseInput(RowId, userId),
    privilege,
    query: trimmed || undefined,
  };
}

/** Everyone but the seed's bootstrap user (claude-docs/auth/admin-users.md, "The user list"). */
export function listedOnUserList(userId: string): boolean {
  return userId !== BOOTSTRAP_USER_ID;
}

/** A DataLoader's batch. A site admin's alone: every slot of anyone else's batch is a `Forbidden`. */
export async function usersForAdmin(
  session: Session,
  userIds: readonly string[],
): Promise<(UserRow | null | Forbidden)[]> {
  if (!isSiteAdmin(session)) return refuseBatch(userIds, REFUSAL);
  const rows = await findManyByIds(users, [...new Set(userIds)]);
  return inIdOrder(userIds, rows, () => null);
}
