import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import SupportRequests from '@/components/SupportRequests';
import { USER_MODAL_PLACE, supportHref } from '@/components/SupportRequests/href';
import { pagerHrefs } from '@/lib/list-href';
import { impersonationEnabled } from '@/lib/impersonation';
import { requireCuratorSession } from '@/lib/request-session';
import MissingNotice from '../missing-notice';
import { changesLocked } from '@/components/UserList/lock';
import { readPauseState } from '../(people)/pause-state';
import { readOpenedUser } from '../(people)/users/opened-user';
import UserDialog from '../(people)/users/user-dialog';
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
  const { filter, cursor, request, user } = readSupportPlace(await searchParams);
  // The user modal is the Users page's own, for an admin; a curator reaches nothing on the People pages.
  const userId = session.role === 'admin' ? user : undefined;
  const [{ requests, pageInfo, position }, opened, assignees, openedUser, adminChanges] =
    await Promise.all([
      readRequests(session, filter, cursor.after, cursor.before),
      request ? readOpened(session, request) : undefined,
      readAssignees(session),
      userId ? readOpenedUser(session, userId) : undefined,
      userId ? readPauseState(session) : undefined,
    ]);

  return (
    <main>
      <PageHeader title="Support" />
      {userId && !openedUser && <MissingNotice noun="user" />}
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
      {/* Rendered whatever the address opens, after the request's, so it opens on top of it and Close
          leaves the request. */}
      <UserDialog
        place={USER_MODAL_PLACE}
        closeHref={supportHref(filter, cursor, request)}
        opened={openedUser}
        canImpersonate={impersonationEnabled()}
        changesPaused={Boolean(adminChanges && changesLocked(adminChanges))}
      />
    </main>
  );
}
