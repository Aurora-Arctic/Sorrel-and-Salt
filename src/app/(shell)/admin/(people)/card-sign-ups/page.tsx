import type { Metadata } from 'next';
import { cache } from 'react';
import AdminArrivals from '../../../../../components/AdminCards/arrivals';
import { readArrivalsFilter } from '../../../../../components/AdminCards/filter-params';
import { arrivalsHref } from '../../../../../components/AdminCards/href';
import type { ArrivalsFilter } from '../../../../../components/AdminCards/types';
import { pagerHrefs } from '../../../../../lib/list-href';
import { requireAdminSession } from '../../../../../lib/request-session';
import type { Session } from '../../../../../lib/session';
import { readNumberedPage } from '@/lib/numbered-page';
import { membershipsOf } from '@/modules/coven';
import { countCardArrivals, listCardArrivals, usersForAdmin } from '@/modules/identity';
import { userListHref } from '../../../../../components/UserList/href';
import { userHeading } from '../users/user-heading';
import { readListPlace } from '../../list-page';
import type { ArrivalsPageProps } from '../invitation-cards/types';

export const metadata: Metadata = {
  title: 'Card Sign-Ups',
};

// The Users list unfiltered: a sign-up's name opens that list's own modal for the account.
const NO_FILTER = { query: '', awaitingApproval: false };
const REMOVED_ACCOUNT = 'Removed account';

const readArrivals = cache(
  async (
    session: Session,
    filter: ArrivalsFilter,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const page = await readNumberedPage(
      { after, before },
      (request) => listCardArrivals(session, filter, request),
      (start) => countCardArrivals(session, filter, start),
    );
    const ids = page.edges.map(({ node }) => node.acceptedBy);
    const [accounts, memberships] = await Promise.all([
      usersForAdmin(session, ids),
      membershipsOf(session, ids),
    ]);
    // An account that can no longer be read keeps its row, as a removed account: the card was still accepted.
    const arrivals = page.edges.map(({ node }, index) => {
      const account = accounts[index];
      const covens = memberships[index];
      return {
        id: node.id,
        accountName: !account || account instanceof Error ? REMOVED_ACCOUNT : account.name,
        accountEmail: !account || account instanceof Error ? '' : account.email,
        acceptedAt: node.acceptedAt,
        batchId: node.batchId,
        account:
          !account || account instanceof Error
            ? null
            : {
                openHref: userListHref(NO_FILTER, undefined, account.id),
                heading: userHeading(account),
              },
        covens: Array.isArray(covens)
          ? covens.filter(({ role }) => role === 'owner').map(({ workspace }) => workspace.name)
          : [],
      };
    });
    return { arrivals, pageInfo: page.pageInfo, position: page.position };
  },
);

// Every account that arrived by a card, with the covens it owns. Services are the guard.
export default async function ArrivalsPage({ searchParams }: ArrivalsPageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const { after, before } = readListPlace(params);
  const filter = readArrivalsFilter(params);
  const { arrivals, pageInfo, position } = await readArrivals(session, filter, after, before);
  return (
    <AdminArrivals
      arrivals={arrivals}
      position={position}
      filter={filter}
      {...pagerHrefs(pageInfo, (turn) => arrivalsHref(filter, turn))}
    />
  );
}
