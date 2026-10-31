import type { Metadata, Route } from 'next';
import { readNumberedPage, readPageCursors } from '@/lib/numbered-page';
import {
  countMySupportRequests,
  listMySupportRequests,
  repliesForRequests,
} from '@/modules/support';
import PageHeader from '../../../../components/PageHeader';
import SupportList from '../../../../components/SupportList';
import { requireSession } from '../../../../lib/request-session';
import { SUPPORT_LIST_PATH } from '../../../../lib/support-path';
import type { SupportListPageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Support Requests',
};

// The sender's own requests with the replies to each. The services take the session, so another
// sender's rows are outside the queries.
export default async function SupportListPage({ searchParams }: SupportListPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const { after, before } = readPageCursors(params);
  const page = await readNumberedPage(
    { after, before },
    (request) => listMySupportRequests(session, request),
    (start) => countMySupportRequests(session, start),
  );
  const rows = page.edges.map(({ node }) => node);
  const replies = await repliesForRequests(
    session,
    rows.map((row) => row.id),
  );
  const href = (cursor: Record<string, string>) =>
    `${SUPPORT_LIST_PATH}?${new URLSearchParams(cursor).toString()}` as Route;
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = page.pageInfo;
  return (
    <main className="page-frame page-frame--narrow">
      <PageHeader title="Your Support Requests" />
      <SupportList
        requests={rows.map((row, index) => ({
          id: row.id,
          kind: row.kind,
          subject: row.subject,
          message: row.message,
          status: row.status,
          createdAt: row.createdAt,
          issueUrl: row.issueUrl,
          replies: (replies[index] ?? []).map(({ id, body, createdAt }) => ({
            id,
            body,
            createdAt,
          })),
        }))}
        position={page.position}
        previousHref={hasPreviousPage && startCursor ? href({ before: startCursor }) : undefined}
        nextHref={hasNextPage && endCursor ? href({ after: endCursor }) : undefined}
      />
    </main>
  );
}
