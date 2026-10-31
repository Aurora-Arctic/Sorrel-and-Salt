import type { Metadata } from 'next';
import { cache } from 'react';
import AdminCards from '../../../../../components/AdminCards';
import { batchStatus } from '../../../../../components/AdminCards/batches';
import { cardsHref } from '../../../../../components/AdminCards/href';
import { pagerHrefs } from '../../../../../lib/list-href';
import { requireAdminSession } from '../../../../../lib/request-session';
import type { Session } from '../../../../../lib/session';
import { readNumberedPage } from '@/lib/numbered-page';
import { cardBatchTotals, countCardBatches, listCardBatches } from '@/modules/identity';
import { readListPlace } from '../../list-page';
import type { CardsPageProps } from './types';

export const metadata: Metadata = {
  title: 'Invitation Cards',
};

// One page of the batches and its count, newest first, numbered as every admin list is (rule 8), with each
// batch's cards counted in SQL. Cached so a second render in the request reads once.
const readBatches = cache(
  async (session: Session, after: string | undefined, before: string | undefined) => {
    const page = await readNumberedPage(
      { after, before },
      (request) => listCardBatches(session, request),
      (start) => countCardBatches(session, start),
    );
    const totals = new Map(
      (
        await cardBatchTotals(
          session,
          page.edges.map(({ node }) => node.batchId),
        )
      ).map((total) => [total.batchId, total] as const),
    );
    // What the list shows of each: no token or hash leaves the page.
    const now = new Date();
    const batches = page.edges.map(({ node }) => {
      const total = totals.get(node.batchId);
      const counts = {
        cards: total?.cards ?? 0,
        accepted: total?.accepted ?? 0,
        pending: total?.pending ?? 0,
      };
      return {
        batchId: node.batchId,
        mintedAt: node.createdAt,
        expiresAt: node.expiresAt,
        ...counts,
        attempts: total?.attempts ?? 0,
        status: batchStatus(counts, node.expiresAt, now),
      };
    });
    return { batches, pageInfo: page.pageInfo, position: page.position };
  },
);

// The invitation card batches with Revoke Batch, paged by cursor, with the mint form `?mint` opens. The page and GraphQL
// end at the same identity services, which are the guard (claude-docs/auth/admin-bootstrap.md, "Invitation cards").
export default async function CardsPage({ searchParams }: CardsPageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const { after, before } = readListPlace(params);
  const { batches, pageInfo, position } = await readBatches(session, after, before);
  return (
    <AdminCards
      batches={batches}
      cursor={{ after, before }}
      position={position}
      {...pagerHrefs(pageInfo, (turn) => cardsHref(turn))}
      minting={params.mint !== undefined}
    />
  );
}
