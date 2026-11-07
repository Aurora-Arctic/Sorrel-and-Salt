import 'server-only';
import { findManyByIds, findMembershipsOfUsers } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { MembershipOfUser } from '../types';

/**
 * A caller lists their own covens and a site keeper anyone's; any other id is a `Forbidden` in its own slot. An unverified
 * session gets an empty list in every slot, not a refusal: the shell draws the email page and the public pages from this call.
 * The admin read yields no `Membership` proof (claude-docs/design-decisions/auth.md, "A site keeper sees which covens a user belongs to").
 */
export async function membershipsOf(
  session: Session,
  userIds: readonly string[],
): Promise<(MembershipOfUser[] | Forbidden)[]> {
  if (session.emailUnverified)
    return userIds.map((id) =>
      id === session.userId || session.role === 'admin' ? [] : new Forbidden(),
    );
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
      // Narrows the type; the finder already excludes a soft-deleted workspace.
      return row.userId === id && workspace ? [{ ...row, workspace }] : [];
    });
  });
}

/** The demo coven last, so a coven of the user's own is always the landing. */
export function byCovenName(
  a: { name: string; demo?: boolean },
  b: { name: string; demo?: boolean },
): number {
  return Number(a.demo ?? false) - Number(b.demo ?? false) || a.name.localeCompare(b.name);
}

/** Passes over a coven whose access is paused; the first when every one is. */
export async function firstCovenSlugOf(session: Session): Promise<string | undefined> {
  const [memberships] = await membershipsOf(session, [session.userId]);
  if (!memberships || memberships instanceof Error) return undefined;
  const listed = memberships
    .map(({ workspace, pause }) => ({ ...workspace, pause }))
    .sort(byCovenName);
  return (listed.find(({ pause }) => !pause) ?? listed[0])?.slug;
}
