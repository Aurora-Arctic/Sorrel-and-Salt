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
import { changesLocked } from '../../../../../components/UserList/lock';
import { impersonationEnabled } from '../../../../../lib/impersonation';
import { single } from '../../../../../lib/search-params';
import { withParam } from '../../../../../lib/list-href';
import { readOpenedUser } from '../users/opened-user';
import UserDialog from '../users/user-dialog';
import { userHeading } from '../users/user-heading';
import MissingNotice from '../../missing-notice';
import { readPauseState } from '../pause-state';
import { readListPlace } from '../../list-page';
import type { ArrivalsPageProps } from '../invitation-cards/types';

export const metadata: Metadata = {
  title: 'Card Sign-Ups',
};

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
                openHref: withParam(arrivalsHref(filter, { after, before }), 'user', account.id),
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
  // Blank is no modal, as a blank `?edit=` is.
  const userParam = single(params.user) || undefined;
  const [{ arrivals, pageInfo, position }, adminChanges, opened] = await Promise.all([
    readArrivals(session, filter, after, before),
    readPauseState(session),
    userParam ? readOpenedUser(session, userParam) : undefined,
  ]);
  return (
    <>
      {userParam && !opened && <MissingNotice noun="user" />}
      <AdminArrivals
        arrivals={arrivals}
        position={position}
        filter={filter}
        {...pagerHrefs(pageInfo, (turn) => arrivalsHref(filter, turn))}
      />
      {/* Rendered whatever the address opens, so a press on a name opens it at once. Close returns to this list at its
          filter and cursor. */}
      <UserDialog
        closeHref={arrivalsHref(filter, { after, before })}
        opened={opened}
        canImpersonate={impersonationEnabled()}
        changesPaused={Boolean(adminChanges && changesLocked(adminChanges))}
      />
    </>
  );
}
