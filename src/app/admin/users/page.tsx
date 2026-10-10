import type { Metadata } from 'next';
import { cache } from 'react';
import UserList from '../../../components/UserList';
import { userListHref } from '../../../components/UserList/href';
import type { UserListEntry } from '../../../components/UserList/types';
import { impersonationEnabled } from '../../../lib/impersonation';
import { DEFAULT_PAGE_SIZE, resolvePage } from '../../../lib/pagination';
import { requireAdminSession } from '../../../lib/request-session';
import { readableCursor, single } from '../../../lib/search-params';
import type { Session, UserRole } from '../../../lib/session';
import type { ConnectionArgs } from '../../../lib/types';
import { listUsers, providersOf } from '@/modules/identity';
import type { AdminUsersPageProps, UsersSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Users — Admin — Sorrel & Salt',
};

// The page and GraphQL's `users` end at the same service, paged by the same
// helper (CLAUDE.md rule 1, rule 8); cached so a second render in the request
// reads once.
const readUsers = cache(
  async (
    session: Session,
    query: string,
    awaitingApproval: boolean,
    role: UserRole | undefined,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const args: ConnectionArgs = before
      ? { last: DEFAULT_PAGE_SIZE, before }
      : { first: DEFAULT_PAGE_SIZE, after };
    const page = await resolvePage(args, (request) =>
      listUsers(session, { query: query || undefined, awaitingApproval, role }, request),
    );
    const providers = await providersOf(
      session,
      page.edges.map((edge) => edge.node.id),
    );
    const users = page.edges.map(({ node }, index): UserListEntry => {
      const linked = providers[index];
      // An admin's batch answers every slot; a refusal here is the guard's bug.
      if (!linked || linked instanceof Error) throw linked ?? new Error('No providers read');
      return { ...node, providers: linked };
    });
    return { users, pageInfo: page.pageInfo };
  },
);

// Everyone with an account, for an admin to act on without being sent an id
// (MB.52). A read of who has an account confers no workspace access, and the
// page offers no control over one (claude-docs/auth/admin-users.md, "The user
// list").
export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await requireAdminSession();
  const params: UsersSearchParams = await searchParams;
  const query = single(params.query)?.trim() ?? '';
  // A flag by presence: `?awaiting`, a native submit's `awaiting=`, or an
  // older link's `awaiting=1`.
  const awaitingApproval = params.awaiting !== undefined;
  // Either role, or none: a hand-edited value is no filter rather than an error.
  const roleParam = single(params.role);
  const role = roleParam === 'admin' || roleParam === 'user' ? roleParam : undefined;
  const after = readableCursor(single(params.after));
  const before = after ? undefined : readableCursor(single(params.before));

  const { users, pageInfo } = await readUsers(
    session,
    query,
    awaitingApproval,
    role,
    after,
    before,
  );

  return (
    <main>
      <h1>Users</h1>
      <UserList
        users={users}
        query={query}
        awaitingApproval={awaitingApproval}
        role={role}
        canImpersonate={impersonationEnabled()}
        previousHref={
          pageInfo.hasPreviousPage && pageInfo.startCursor
            ? userListHref({ query, awaitingApproval, role }, { before: pageInfo.startCursor })
            : undefined
        }
        nextHref={
          pageInfo.hasNextPage && pageInfo.endCursor
            ? userListHref({ query, awaitingApproval, role }, { after: pageInfo.endCursor })
            : undefined
        }
      />
    </main>
  );
}
