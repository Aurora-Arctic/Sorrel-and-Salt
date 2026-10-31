import type { Metadata, Route } from 'next';
import { readNumberedPage, readPageCursors } from '@/lib/numbered-page';
import {
  countMySupportRequests,
  countMySupportRequestsByStatus,
  listMySupportRequests,
  repliesForRequests,
} from '@/modules/support';
import SupportList from '../../../../../components/SupportList';
import { requireSession } from '../../../../../lib/request-session';
import { SUPPORT_LIST_PATH } from '../../../../../lib/support-path';
import { readOpenedRequest } from './reads';
import type { SupportListPageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Support Requests',
};

// The sender's own requests, one compact row each, with the request `?request=` opens in a dialog. The
// services take the session, so another sender's rows are outside the queries.
export default async function SupportListPage({ searchParams }: SupportListPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const { after, before } = readPageCursors(params);
  const requestParam = Array.isArray(params.request) ? params.request[0] : params.request;
  const [page, opened, counts] = await Promise.all([
    readNumberedPage(
      { after, before },
      (request) => listMySupportRequests(session, request),
      (start) => countMySupportRequests(session, start),
    ),
    requestParam ? readOpenedRequest(session, requestParam) : undefined,
    countMySupportRequestsByStatus(session),
  ]);
  const rows = page.edges.map(({ node }) => node);
  const replies = await repliesForRequests(
    session,
    rows.map((row) => row.id),
  );
  const href = (cursor: Record<string, string>) =>
    `${SUPPORT_LIST_PATH}?${new URLSearchParams(cursor).toString()}` as Route;
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = page.pageInfo;
  return (
    <div className="page-with-nav page-with-nav--headless">
      <SupportList
        requests={rows.map((row, index) => ({
          id: row.id,
          about: row.about,
          subject: row.subject,
          status: row.status,
          createdAt: row.createdAt,
          replyCount: replies[index]?.length ?? 0,
        }))}
        opened={opened}
        counts={counts}
        cursor={{ after, before }}
        position={page.position}
        previousHref={hasPreviousPage && startCursor ? href({ before: startCursor }) : undefined}
        nextHref={hasNextPage && endCursor ? href({ after: endCursor }) : undefined}
      />
    </div>
  );
}
