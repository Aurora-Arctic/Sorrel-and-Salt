import 'server-only';
import { findManyByIds, findMembershipsOfUsers } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { MembershipWithWorkspace } from '../types';

/**
 * The live memberships of each user named, one answer per id in the order
 * given: a DataLoader's batch. A caller may list their own covens, and a site
 * admin may list anyone's, by workspace and role alone; any other id is
 * answered with a `Forbidden` in its own slot, and the rest of the batch
 * stands. Two queries whatever the batch size.
 *
 * An admin's reading widens this list and nothing else: it yields no
 * `Membership` proof, so a coven's ingredients and grimoire stay out of reach
 * (claude-docs/design-decisions/m9.19-admin-sees-user-covens.md). The role is
 * read off the session, as `identity`'s own admin check does, because
 * `coven` may import only that module's index, which does not export it.
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
 * The order the coven switcher lists in: alphabetical by name. The service's
 * own order is the database's, which looks random.
 */
export function byCovenName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

/**
 * The slug of the first coven the switcher lists for this account, or
 * `undefined` for one in none. The sign-in callback lands a member there
 * itself, so the browser makes no stop at `/coven` on the way.
 */
export async function firstCovenSlugOf(session: Session): Promise<string | undefined> {
  const [memberships] = await membershipsOf(session, [session.userId]);
  if (!memberships || memberships instanceof Error) return undefined;
  return memberships.map(({ workspace }) => workspace).sort(byCovenName)[0]?.slug;
}
