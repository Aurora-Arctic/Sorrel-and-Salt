import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { cache } from 'react';
import UserList from '../../../../../components/UserList';
import { USER_MODAL_ORIGINS, userListHref } from '../../../../../components/UserList/href';
import { ROLES } from '../../../../../components/UserList/roles';
import type { UserModalOrigin } from '../../../../../components/UserList/href';
import type { UserListEntry } from '../../../../../components/UserList/types';
import { impersonationEnabled } from '../../../../../lib/impersonation';
import { requireAdminSession } from '../../../../../lib/request-session';
import { oneOf, single } from '../../../../../lib/search-params';
import type { Session, UserRole } from '../../../../../lib/session';
import {
  countUsers,
  isPrimaryAdmin,
  listUsers,
  providersOf,
  standingAccessPausesOf,
} from '@/modules/identity';
import { standingTimeoutsOf } from '@/modules/support';
import { pagerHrefs } from '../../../../../lib/list-href';
import { readListPlace } from '@/app/(shell)/_admin/list-page';
import { cursorOf, readNumberedPage } from '@/lib/numbered-page';
import MissingNotice from '@/app/(shell)/_admin/missing-notice';
import { readPauseState } from '../pause-state';
import UserDialogHost from './user-dialog-host';
import { readOpenedUser } from './opened-user';
import { userHeading } from './user-heading';
import type { AdminUsersPageProps, UsersSearchParams } from './types';

export const metadata: Metadata = pageTitle('Users');

// The page and GraphQL's `users` end at the same service, paged by the same helper (rules 1 and 8)
// and counted for the pager as every admin list is; a cursor naming no row gives the first page
// again. Cached so a second render in the request reads once.
const readUsers = cache(
  async (
    session: Session,
    query: string,
    awaitingApproval: boolean,
    role: UserRole | undefined,
    timedOut: boolean,
    paused: boolean,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const filter = {
      query: query || undefined,
      awaitingApproval,
      role,
      timedOut: timedOut || undefined,
      paused: paused || undefined,
    };
    const here = { query, awaitingApproval, role, timedOut, paused };
    const page = await readNumberedPage(
      { after, before },
      (request) => listUsers(session, filter, request),
      (start) => countUsers(session, filter, start),
    );
    const ids = page.edges.map((edge) => edge.node.id);
    const [providers, timeouts, pauses] = await Promise.all([
      providersOf(session, ids),
      standingTimeoutsOf(session, ids),
      standingAccessPausesOf(session, ids),
    ]);
    const users = page.edges.map(({ node }, index): UserListEntry => {
      const linked = providers[index];
      // A keeper's batch answers every slot; a refusal here is the guard's bug.
      if (!linked || linked instanceof Error) throw linked ?? new Error('No providers read');
      return {
        ...node,
        providers: linked,
        supportTimeout: timeouts[index] ? { until: timeouts[index].until } : undefined,
        accessPause: pauses[index] ? { until: pauses[index].until } : undefined,
        primaryAdmin: isPrimaryAdmin(node),
        openHref: userListHref(here, cursorOf({ after, before }), node.id),
        heading: userHeading(node),
      };
    });
    return { users, pageInfo: page.pageInfo, position: page.position };
  },
);

// Everyone with an account, for a keeper to act on without being sent an id. A read of who has an
// account confers no workspace access, and the page offers no control over one
// (claude-docs/auth/admin-users.md, "The user list").
export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await requireAdminSession();
  const params: UsersSearchParams = await searchParams;
  const { query, after, before } = readListPlace(params);
  // A flag by presence: `?awaiting`, a native submit's `awaiting=`, or an
  // older link's `awaiting=1`.
  const awaitingApproval = params.awaiting !== undefined;
  const timedOut = params['timed-out'] !== undefined;
  const paused = params.paused !== undefined;
  const role = oneOf(ROLES, single(params.role));
  const here = { query, awaitingApproval, role, timedOut, paused };
  const userParam = single(params.user) || undefined;
  const from = oneOf(Object.keys(USER_MODAL_ORIGINS) as UserModalOrigin[], single(params.from));

  const [{ users, pageInfo, position }, adminChanges, opened] = await Promise.all([
    readUsers(session, query, awaitingApproval, role, timedOut, paused, after, before),
    readPauseState(session),
    userParam ? readOpenedUser(session, userParam) : undefined,
  ]);
  const canImpersonate = impersonationEnabled();

  return (
    <>
      {userParam && !opened && <MissingNotice noun="user" />}
      <UserList
        users={users}
        query={query}
        awaitingApproval={awaitingApproval}
        role={role}
        timedOut={timedOut}
        paused={paused}
        canImpersonate={canImpersonate}
        position={position}
        {...pagerHrefs(pageInfo, (cursor) => userListHref(here, cursor))}
      />
      {/* Rendered whatever the address opens, so a press on a name opens it at
          once and the covens arrive in it. */}
      <UserDialogHost
        closeHref={
          userParam && from
            ? USER_MODAL_ORIGINS[from]
            : userListHref(here, cursorOf({ after, before }))
        }
        opened={opened}
        adminChanges={adminChanges}
      />
    </>
  );
}
