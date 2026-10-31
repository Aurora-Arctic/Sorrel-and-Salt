import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import SupportRequests from '@/components/SupportRequests';
import { supportHref } from '@/components/SupportRequests/href';
import { pagerHrefs } from '@/lib/list-href';
import { requireCuratorSession } from '@/lib/request-session';
import MissingNotice from '../missing-notice';
import { readSupportPlace } from './filter';
import { readAssignees, readOpened, readRequests } from './reads';
import type { SupportRequestsCursor } from '@/components/SupportRequests/types';
import type { SupportPageProps } from './types';

export const metadata: Metadata = {
  title: 'Support',
};

// The support requests an admin may read, narrowed in SQL and paged by cursor, with the request
// `?request=` opens. The page and GraphQL end at the same support services, which are the guard.
export default async function SupportPage({ searchParams }: SupportPageProps) {
  const session = await requireCuratorSession();
  const { filter, cursor, request } = readSupportPlace(await searchParams);
  const [{ requests, pageInfo, position }, opened, assignees] = await Promise.all([
    readRequests(session, filter, cursor.after, cursor.before),
    request ? readOpened(session, request) : undefined,
    readAssignees(session),
  ]);

  return (
    <main>
      <PageHeader title="Support" />
      {request && !opened && <MissingNotice noun="support request" />}
      <SupportRequests
        requests={requests}
        viewer={{ id: session.userId, role: session.role === 'admin' ? 'admin' : 'curator' }}
        filter={filter}
        cursor={cursor}
        position={position}
        {...pagerHrefs(pageInfo, (turn: SupportRequestsCursor) => supportHref(filter, turn))}
        opened={opened}
        assignees={assignees}
      />
    </main>
  );
}
