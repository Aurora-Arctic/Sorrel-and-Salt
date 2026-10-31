import type { Metadata } from 'next';
import { cache } from 'react';
import AdminArrivals from '../../../../../components/AdminCards/arrivals';
import { pagerHrefs } from '../../../../../lib/list-href';
import { requireAdminSession } from '../../../../../lib/request-session';
import type { Session } from '../../../../../lib/session';
import { readNumberedPage } from '@/lib/numbered-page';
import { membershipsOf } from '@/modules/coven';
import { countCardArrivals, listCardArrivals, usersForAdmin } from '@/modules/identity';
import { readListPlace } from '../../list-page';
import type { CardsPageProps } from '../invitation-cards/types';
import type { Route } from 'next';

export const metadata: Metadata = {
  title: 'Card Sign-Ups',
};

const REMOVED_ACCOUNT = 'Removed account';

const readArrivals = cache(
  async (session: Session, after: string | undefined, before: string | undefined) => {
    const page = await readNumberedPage(
      { after, before },
      (request) => listCardArrivals(session, request),
      (start) => countCardArrivals(session, start),
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
        covens: Array.isArray(covens)
          ? covens.filter(({ role }) => role === 'owner').map(({ workspace }) => workspace.name)
          : [],
      };
    });
    return { arrivals, pageInfo: page.pageInfo, position: page.position };
  },
);

const arrivalsHref = ({ after, before }: { after?: string; before?: string }): Route =>
  (after
    ? `/admin/card-sign-ups?after=${encodeURIComponent(after)}`
    : before
      ? `/admin/card-sign-ups?before=${encodeURIComponent(before)}`
      : '/admin/card-sign-ups') as Route;

// Every account that arrived by a card, with the covens it owns. Services are the guard.
export default async function ArrivalsPage({ searchParams }: CardsPageProps) {
  const session = await requireAdminSession();
  const { after, before } = readListPlace(await searchParams);
  const { arrivals, pageInfo, position } = await readArrivals(session, after, before);
  return (
    <AdminArrivals
      arrivals={arrivals}
      position={position}
      {...pagerHrefs(pageInfo, arrivalsHref)}
    />
  );
}
