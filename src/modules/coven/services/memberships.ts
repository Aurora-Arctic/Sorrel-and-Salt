import 'server-only';
import { findManyByIds, findMembershipsOfUsers } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { MembershipWithWorkspace } from '../types';

/**
 * The live memberships of each user named, in order: a DataLoader's batch. A caller lists their own covens and a site admin anyone's, by workspace and role alone;
 * any other id is a `Forbidden` in its own slot. The admin read yields no `Membership` proof (claude-docs/design-decisions/m9.19-admin-sees-user-covens.md).
 */
export async function membershipsOf(
  session: Session,
  userIds: readonly string[],
): Promise<(MembershipWithWorkspace[] | Forbidden)[]> {
  const isAdmin = session.role === 'admin';
  const mayList = (id: string) => isAdmin || id === session.userId;
  const permitted = userIds.filter(mayList);
  const rows = await findMembershipsOfUsers([...new Set(permitted)]);
  const covens = await findManyByIds(workspaces, [...new Set(rows.map((row) => row.workspaceId))]);
  const byId = new Map(covens.map((workspace) => [workspace.id, workspace]));

  return userIds.map((id) => {
    if (!mayList(id)) return new Forbidden();
    return rows.flatMap((row) => {
      const workspace = byId.get(row.workspaceId);
      // The finder already excludes a soft-deleted workspace; this narrows the
      // type rather than filtering anything.
      return row.userId === id && workspace ? [{ ...row, workspace }] : [];
    });
  });
}

/**
 * The order the coven switcher lists in: alphabetical by name, the demo coven
 * last. The service's own order is the database's, which looks random. The
 * demo goes last so a coven of the user's own is always the landing; a row
 * with no `demo` sorts by name alone.
 */
export function byCovenName(
  a: { name: string; demo?: boolean },
  b: { name: string; demo?: boolean },
): number {
  return Number(a.demo ?? false) - Number(b.demo ?? false) || a.name.localeCompare(b.name);
}

/** The slug of the first coven the switcher lists for this account, or `undefined` for one in none. */
export async function firstCovenSlugOf(session: Session): Promise<string | undefined> {
  const [memberships] = await membershipsOf(session, [session.userId]);
  if (!memberships || memberships instanceof Error) return undefined;
  return memberships.map(({ workspace }) => workspace).sort(byCovenName)[0]?.slug;
}
