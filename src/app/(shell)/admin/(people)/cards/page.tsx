import type { Metadata } from 'next';
import { cache } from 'react';
import AdminCards from '../../../../../components/AdminCards';
import { cardsHref } from '../../../../../components/AdminCards/href';
import { pagerHrefs } from '../../../../../lib/list-href';
import { requireAdminSession } from '../../../../../lib/request-session';
import type { Session } from '../../../../../lib/session';
import { readNumberedPage } from '@/lib/numbered-page';
import {
  cardState,
  countInvitationCards,
  listInvitationCards,
  totalCardAttempts,
  usersForAdmin,
} from '@/modules/identity';
import { readListPlace } from '../../list-page';
import type { CardsPageProps } from './types';

export const metadata: Metadata = {
  title: 'Invitation Cards',
};

// One page of the cards in any state and its count, newest first, numbered as every admin list is (rule 8).
// Cached so a second render in the request reads once.
const readCards = cache(
  async (session: Session, after: string | undefined, before: string | undefined) => {
    const page = await readNumberedPage(
      { after, before },
      (request) => listInvitationCards(session, undefined, request),
      (start) => countInvitationCards(session, undefined, start),
    );
    const ids = [
      ...new Set(page.edges.flatMap(({ node }) => (node.acceptedBy ? [node.acceptedBy] : []))),
    ];
    const accounts = new Map(
      (await usersForAdmin(session, ids)).flatMap((user, index) =>
        user && !(user instanceof Error) ? [[ids[index] as string, user.name] as const] : [],
      ),
    );
    const attempts = new Map(
      (
        await totalCardAttempts(
          session,
          page.edges.map(({ node }) => node.id),
        )
      ).map(({ invitationId, total }) => [invitationId, total] as const),
    );
    // What the list shows of each: no token or hash leaves the page.
    const cards = page.edges.map(({ node }) => ({
      id: node.id,
      batchId: node.batchId,
      state: cardState(node),
      expiresAt: node.expiresAt,
      accountName: node.acceptedBy ? (accounts.get(node.acceptedBy) ?? null) : null,
      attemptCount: attempts.get(node.id) ?? 0,
    }));
    return { cards, pageInfo: page.pageInfo, position: page.position };
  },
);

// The invitation cards with Revoke, paged by cursor, with the mint form `?mint` opens. The page and GraphQL
// end at the same identity services, which are the guard (claude-docs/auth/admin-bootstrap.md, "Invitation cards").
export default async function CardsPage({ searchParams }: CardsPageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const { after, before } = readListPlace(params);
  const { cards, pageInfo, position } = await readCards(session, after, before);
  return (
    <AdminCards
      cards={cards}
      cursor={{ after, before }}
      position={position}
      {...pagerHrefs(pageInfo, (turn) => cardsHref(turn))}
      minting={params.mint !== undefined}
    />
  );
}
