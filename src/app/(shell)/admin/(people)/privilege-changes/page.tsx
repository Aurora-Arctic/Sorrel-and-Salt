import type { Metadata } from 'next';
import { cache } from 'react';
import PrivilegeLedger from '../../../../../components/PrivilegeLedger';
import { privilegeLedgerHref } from '../../../../../components/PrivilegeLedger/href';
import { PRIVILEGES } from '../../../../../components/PrivilegeLedger/privileges';
import type {
  LedgerPerson,
  LedgerPrivilege,
  PrivilegeLedgerEntry,
} from '../../../../../components/PrivilegeLedger/types';
import { userListHref } from '../../../../../components/UserList/href';
import { requireAdminSession } from '../../../../../lib/request-session';
import { oneOf, single } from '../../../../../lib/search-params';
import type { Session } from '../../../../../lib/session';
import {
  countPrivilegeChanges,
  listPrivilegeChanges,
  listedOnUserList,
  usersForAdmin,
} from '@/modules/identity';
import { pagerHrefs } from '../../../../../lib/list-href';
import { readListPlace } from '../../list-page';
import { readNumberedPage } from '@/lib/numbered-page';
import type { AdminPrivilegeChangesPageProps, PrivilegeChangesSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Privilege Changes',
};

/** One page of the ledger and its count, the first page again for a cursor that names no row of it. */
function readLedgerPage(
  session: Session,
  filter: { query?: string; privilege?: LedgerPrivilege },
  after: string | undefined,
  before: string | undefined,
) {
  return readNumberedPage(
    { after, before },
    (request) => listPrivilegeChanges(session, filter, request),
    (start) => countPrivilegeChanges(session, filter, start),
  );
}

// The page and GraphQL's `privilegeChanges` end at the same service, paged by the same helper
// (rules 1 and 8) and numbered as every admin list is; the users a page names are one read beside
// it. Cached so a second render in the request reads once.
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

// The privilege ledger: every change to who is an admin and who may create a coven, newest first.
// One page, filtered by the subject's name or email and by privilege
// (claude-docs/auth/admin-users.md, "The privilege ledger").
export default async function AdminPrivilegeChangesPage({
  searchParams,
}: AdminPrivilegeChangesPageProps) {
  const session = await requireAdminSession();
  const params: PrivilegeChangesSearchParams = await searchParams;
  const place = readListPlace(params);
  // None rather than blank: the ledger's filter leaves an unasked field out.
  const query = place.query || undefined;
  // Either privilege, or none: a hand-edited value is no filter.
  const privilege = oneOf(PRIVILEGES, single(params.privilege));
  const { changes, pageInfo, position } = await readLedger(
    session,
    query,
    privilege,
    place.after,
    place.before,
  );
  const filter = { query, privilege };

  return (
    <PrivilegeLedger
      changes={changes}
      filter={filter}
      position={position}
      {...pagerHrefs(pageInfo, (cursor) => privilegeLedgerHref(filter, cursor))}
    />
  );
}
