import type { Metadata } from 'next';
import { cache } from 'react';
import UserList from '../../../../../components/UserList';
import { USER_MODAL_ORIGINS, userListHref } from '../../../../../components/UserList/href';
import { changesLocked } from '../../../../../components/UserList/lock';
import { ROLES } from '../../../../../components/UserList/roles';
import type { UserModalOrigin } from '../../../../../components/UserList/href';
import type { UserListEntry } from '../../../../../components/UserList/types';
import type { PagerCursor } from '../../../../../lib/types';
import { impersonationEnabled } from '../../../../../lib/impersonation';
import { requireAdminSession } from '../../../../../lib/request-session';
import { oneOf, single } from '../../../../../lib/search-params';
import type { Session, UserRole } from '../../../../../lib/session';
import { RowId } from '../../../../../lib/validation';
import { membershipsOf } from '@/modules/coven';
import {
  countUsers,
  isPrimaryAdmin,
  listedOnUserList,
  listUsers,
  providersOf,
  usersForAdmin,
} from '@/modules/identity';
import { pagerHrefs } from '../../../../../lib/list-href';
import { readListPlace } from '../../list-page';
import { readNumberedPage } from '@/lib/numbered-page';
import MissingNotice from '../../missing-notice';
import { readPauseState } from '../pause-state';
import UserDialog from './user-dialog';
import { userHeading } from './user-heading';
import type { AdminUsersPageProps, OpenedUser, UsersSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Users',
};

// The page and GraphQL's `users` end at the same service, paged by the same helper (rules 1 and 8)
// and counted for the pager as every admin list is; a cursor naming no row gives the first page
// again. Cached so a second render in the request reads once.
const readUsers = cache(
  async (
    session: Session,
    query: string,
    awaitingApproval: boolean,
    role: UserRole | undefined,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const filter = { query: query || undefined, awaitingApproval, role };
    const here = { query, awaitingApproval, role };
    const page = await readNumberedPage(
      { after, before },
      (request) => listUsers(session, filter, request),
      (start) => countUsers(session, filter, start),
    );
    const providers = await providersOf(
      session,
      page.edges.map((edge) => edge.node.id),
    );
    const users = page.edges.map(({ node }, index): UserListEntry => {
      const linked = providers[index];
      // An admin's batch answers every slot; a refusal here is the guard's bug.
      if (!linked || linked instanceof Error) throw linked ?? new Error('No providers read');
      // Read from ADMIN_BOOTSTRAP_EMAIL, so the label follows the variable.
      return {
        ...node,
        providers: linked,
        primaryAdmin: isPrimaryAdmin(node),
        // Its modal over this page, the filter and cursor kept, under the head the loaded modal
        // carries.
        openHref: userListHref(here, cursorOf(after, before), node.id),
        heading: userHeading(node),
      };
    });
    return { users, pageInfo: page.pageInfo, position: page.position };
  },
);

/**
 * The user `?user=` names, with their covens; none when the list does not show them (not live, or
 * the seed's bootstrap user). Read through the services GraphQL ends at (rule 1;
 * claude-docs/design-decisions/m9.19-admin-sees-user-covens.md). Cached as `readUsers` is.
 */
const readOpenedUser = cache(async (session: Session, raw: string) => {
  // A hand-edited address is a missing user, not an error: the list beneath
  // is still the page asked for.
  const parsed = RowId.safeParse(raw);
  if (!parsed.success || !listedOnUserList(parsed.data)) return undefined;
  const id = parsed.data;
  const [[found], [memberships], [providers]] = await Promise.all([
    usersForAdmin(session, [id]),
    membershipsOf(session, [id]),
    providersOf(session, [id]),
  ]);
  // An admin's batch answers every slot; a refusal here is the guard's bug.
  if (found instanceof Error) throw found;
  if (!found) return undefined;
  if (!memberships || memberships instanceof Error)
    throw memberships ?? new Error('No memberships read');
  if (!providers || providers instanceof Error) throw providers ?? new Error('No providers read');
  return {
    heading: userHeading(found),
    // Every fact the list's row shows, so the modal holds them all.
    user: {
      id: found.id,
      name: found.name,
      email: found.email,
      emailVerified: found.emailVerified,
      role: found.role,
      primaryAdmin: isPrimaryAdmin(found),
      canCreateWorkspace: found.canCreateWorkspace,
      providers,
      createdAt: found.createdAt,
    },
    memberships: memberships.map((row) => ({
      workspaceId: row.workspaceId,
      name: row.workspace.name,
      slug: row.workspace.slug,
      role: row.role,
      joinedAt: row.joinedAt,
    })),
  } satisfies OpenedUser;
});

/** The cursor the page stands at, as the pager's and the modal's links keep it. */
function cursorOf(after: string | undefined, before: string | undefined): PagerCursor | undefined {
  if (after) return { after };
  return before ? { before } : undefined;
}

// Everyone with an account, for an admin to act on without being sent an id. A read of who has an
// account confers no workspace access, and the page offers no control over one
// (claude-docs/auth/admin-users.md, "The user list").
export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await requireAdminSession();
  const params: UsersSearchParams = await searchParams;
  const { query, after, before } = readListPlace(params);
  // A flag by presence: `?awaiting`, a native submit's `awaiting=`, or an
  // older link's `awaiting=1`.
  const awaitingApproval = params.awaiting !== undefined;
  // Either role, or none: a hand-edited value is no filter rather than an error.
  const role = oneOf(ROLES, single(params.role));
  // Blank is no modal, as a blank `?edit=` is.
  const userParam = single(params.user) || undefined;
  // Where the modal was opened from, so Close goes back there; a value outside the set is the list.
  const from = oneOf(Object.keys(USER_MODAL_ORIGINS) as UserModalOrigin[], single(params.from));

  const [{ users, pageInfo, position }, adminChanges, opened] = await Promise.all([
    readUsers(session, query, awaitingApproval, role, after, before),
    // The pause on admin changes and whether this admin may flip it, which the switch beside the
    // heading reads too (`@action/users`).
    readPauseState(session),
    userParam ? readOpenedUser(session, userParam) : undefined,
  ]);
  const canImpersonate = impersonationEnabled();
  // The pause as the list's controls read it, for the modal's own.
  const changesPaused = Boolean(adminChanges && changesLocked(adminChanges));

  return (
    <>
      {userParam && !opened && <MissingNotice noun="user" />}
      <UserList
        users={users}
        query={query}
        awaitingApproval={awaitingApproval}
        role={role}
        canImpersonate={canImpersonate}
        adminChanges={adminChanges}
        position={position}
        {...pagerHrefs(pageInfo, (cursor) =>
          userListHref({ query, awaitingApproval, role }, cursor),
        )}
      />
      {/* Rendered whatever the address opens, so a press on a name opens it at
          once and the covens arrive in it. */}
      <UserDialog
        closeHref={
          userParam && from
            ? USER_MODAL_ORIGINS[from]
            : userListHref({ query, awaitingApproval, role }, cursorOf(after, before))
        }
        opened={opened}
        canImpersonate={canImpersonate}
        changesPaused={changesPaused}
      />
    </>
  );
}
