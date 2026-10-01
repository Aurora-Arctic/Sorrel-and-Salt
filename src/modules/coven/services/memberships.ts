import 'server-only';
import { findManyByIds, findMembershipsOfUsers } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { MembershipWithWorkspace } from '../types';

/**
 * The live memberships of each user named, one answer per id in the order
 * given: a DataLoader's batch. A user may list only their own covens — a site
 * admin included, since an admin reaches no workspace — so any other id is
 * answered with a `Forbidden` in its own slot, and the rest of the batch
 * stands. Two queries whatever the batch size.
 */
export async function membershipsOf(
  session: Session,
  userIds: readonly string[],
): Promise<(MembershipWithWorkspace[] | Forbidden)[]> {
  const permitted = userIds.filter((id) => id === session.userId);
  const rows = await findMembershipsOfUsers([...new Set(permitted)]);
  const covens = await findManyByIds(workspaces, [...new Set(rows.map((row) => row.workspaceId))]);
  const byId = new Map(covens.map((workspace) => [workspace.id, workspace]));

  return userIds.map((id) => {
    if (id !== session.userId) return new Forbidden();
    return rows.flatMap((row) => {
      const workspace = byId.get(row.workspaceId);
      // The finder already excludes a soft-deleted workspace; this narrows the
      // type rather than filtering anything.
      return row.userId === id && workspace ? [{ ...row, workspace }] : [];
    });
  });
}
