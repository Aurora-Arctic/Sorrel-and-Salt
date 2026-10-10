import type { Metadata } from 'next';
import { cache } from 'react';
import PrivilegeLedger from '../../../components/PrivilegeLedger';
import { privilegeLedgerHref } from '../../../components/PrivilegeLedger/href';
import type {
  LedgerPerson,
  LedgerPrivilege,
  PrivilegeLedgerEntry,
} from '../../../components/PrivilegeLedger/types';
import { userListHref } from '../../../components/UserList/href';
import { InvalidCursor } from '../../../lib/errors';
import { resolveNumberedPage } from '../../../lib/pagination';
import { requireAdminSession } from '../../../lib/request-session';
import { readableCursor, single } from '../../../lib/search-params';
import type { Session } from '../../../lib/session';
import {
  countPrivilegeChanges,
  listPrivilegeChanges,
  listedOnUserList,
  usersForAdmin,
} from '@/modules/identity';
import type { AdminPrivilegeChangesPageProps, PrivilegeChangesSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Privilege Changes — Admin — Sorrel & Salt',
};

/** The privileges a filter may name. */
const PRIVILEGES: readonly LedgerPrivilege[] = ['admin', 'create_workspace'];

/** One page of the ledger and its count, the first page again for a cursor that names no row of it. */
async function readLedgerPage(
  session: Session,
  filter: { query?: string; privilege?: LedgerPrivilege },
  after: string | undefined,
  before: string | undefined,
) {
  const read = (cursors: { after?: string; before?: string }) =>
    resolveNumberedPage(
      cursors,
      (request) => listPrivilegeChanges(session, filter, request),
      (start) => countPrivilegeChanges(session, filter, start),
    );
  try {
    return await read({ after, before });
  } catch (error) {
    // A cursor the codec reads but this list's key will not cast, one copied
    // from another list: the first page, as for one the codec refuses.
    if (error instanceof InvalidCursor && (after || before)) return read({});
    throw error;
  }
}

// The page and GraphQL's `privilegeChanges` end at the same service, paged by
// the same helper (CLAUDE.md rule 1, rule 8), numbered as every admin list is
// (MB.132); the users a page names are one read beside it. Cached so a second
// render in the request reads once.
const readLedger = cache(
  async (
    session: Session,
    query: string | undefined,
    privilege: LedgerPrivilege | undefined,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const page = await readLedgerPage(session, { query, privilege }, after, before);
    const ids = [...new Set(page.edges.flatMap(({ node }) => [node.userId, node.createdBy]))];
    const read = await usersForAdmin(session, ids);
    const people = new Map<string, LedgerPerson | null>(
      ids.map((id, index) => {
        const user = read[index];
        // An admin's batch answers every slot; a refusal here is the guard's bug.
        if (user instanceof Error) throw user;
        return [
          id,
          user && {
            name: user.name,
            href: listedOnUserList(user.id)
              ? userListHref({ query: user.email, awaitingApproval: false })
              : undefined,
          },
        ];
      }),
    );
    const changes = page.edges.map(({ node }): PrivilegeLedgerEntry => ({
      id: node.id,
      at: node.createdAt,
      subject: people.get(node.userId) ?? null,
      privilege: node.privilege,
      change: node.change,
      via: node.via,
      actor: people.get(node.createdBy) ?? null,
      note: node.note,
    }));
    return {
      changes,
      pageInfo: page.pageInfo,
      position: page.position,
    };
  },
);

// The privilege ledger (MB.200): every change to who is an admin and who may
// create a coven, newest first, for the admin who suspects misuse. One page,
// filtered by the subject's name or email and by privilege, rather than a
// page per privilege
// (claude-docs/auth/admin-users.md, "The privilege ledger").
export default async function AdminPrivilegeChangesPage({
  searchParams,
}: AdminPrivilegeChangesPageProps) {
  const session = await requireAdminSession();
  const params: PrivilegeChangesSearchParams = await searchParams;
  const query = single(params.query)?.trim() || undefined;
  // Either privilege, or none: a hand-edited value is no filter.
  const privilegeParam = single(params.privilege);
  const privilege = PRIVILEGES.find((value) => value === privilegeParam);
  const after = readableCursor(single(params.after));
  const before = after ? undefined : readableCursor(single(params.before));

  const { changes, pageInfo, position } = await readLedger(
    session,
    query,
    privilege,
    after,
    before,
  );
  const filter = { query, privilege };

  return (
    <main>
      <h1>Privilege Changes</h1>
      <PrivilegeLedger
        changes={changes}
        filter={filter}
        position={position}
        previousHref={
          pageInfo.hasPreviousPage && pageInfo.startCursor
            ? privilegeLedgerHref(filter, { before: pageInfo.startCursor })
            : undefined
        }
        nextHref={
          pageInfo.hasNextPage && pageInfo.endCursor
            ? privilegeLedgerHref(filter, { after: pageInfo.endCursor })
            : undefined
        }
      />
    </main>
  );
}
