import type { Metadata } from 'next';
import { cache } from 'react';
import UserList from '../../../../components/UserList';
import { userListHref } from '../../../../components/UserList/href';
import { ROLES } from '../../../../components/UserList/roles';
import type { UserListEntry } from '../../../../components/UserList/types';
import { impersonationEnabled } from '../../../../lib/impersonation';
import { requireAdminSession } from '../../../../lib/request-session';
import { oneOf, single } from '../../../../lib/search-params';
import type { Session, UserRole } from '../../../../lib/session';
import { countUsers, isPrimaryAdmin, listUsers, providersOf } from '@/modules/identity';
import { pagerHrefs, readListPlace, readNumberedPage } from '../../list-page';
import { readPauseState } from '../pause-state';
import type { AdminUsersPageProps, UsersSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Users — Admin — Sorrel & Salt',
};

// The page and GraphQL's `users` end at the same service, paged by the same
// helper (CLAUDE.md rule 1, rule 8), and counted for the pager's "Page X of
// Y" as every admin list is (MB.115): the first page again for a cursor that
// names no row of the list. Cached so a second render in the request reads
// once.
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
      // Read from ADMIN_BOOTSTRAP_EMAIL now, so the label follows the variable (MB.59).
      return { ...node, providers: linked, primaryAdmin: isPrimaryAdmin(node) };
    });
    return { users, pageInfo: page.pageInfo, position: page.position };
  },
);

// Everyone with an account, for an admin to act on without being sent an id
// (MB.52). A read of who has an account confers no workspace access, and the
// page offers no control over one (claude-docs/auth/admin-users.md, "The user
// list").
export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await requireAdminSession();
  const params: UsersSearchParams = await searchParams;
  const { query, after, before } = readListPlace(params);
  // A flag by presence: `?awaiting`, a native submit's `awaiting=`, or an
  // older link's `awaiting=1`.
  const awaitingApproval = params.awaiting !== undefined;
  // Either role, or none: a hand-edited value is no filter rather than an error.
  const role = oneOf(ROLES, single(params.role));

  const [{ users, pageInfo, position }, adminChanges] = await Promise.all([
    readUsers(session, query, awaitingApproval, role, after, before),
    // The pause on admin changes and whether this admin may flip it (MB.63),
    // which the switch beside the heading reads too (`@action/users`).
    readPauseState(session),
  ]);

  return (
    <UserList
      users={users}
      query={query}
      awaitingApproval={awaitingApproval}
      role={role}
      canImpersonate={impersonationEnabled()}
      adminChanges={adminChanges}
      position={position}
      {...pagerHrefs(pageInfo, (cursor) => userListHref({ query, awaitingApproval, role }, cursor))}
    />
  );
}
