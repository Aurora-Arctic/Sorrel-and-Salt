import type { Metadata } from 'next';
import { cache } from 'react';
import AdminInvitations from '../../../../../components/AdminInvitations';
import { invitationsHref } from '../../../../../components/AdminInvitations/href';
import { requireAdminSession } from '../../../../../lib/request-session';
import type { Session } from '../../../../../lib/session';
import { countPendingAdminInvitations, listPendingAdminInvitations } from '@/modules/identity';
import { pagerHrefs } from '../../../../../lib/list-href';
import { readNumberedPage } from '@/lib/numbered-page';
import { readInvitationsPlace } from './filter';
import { invitationsLock } from './lock';
import type { AdminInvitationsPageProps } from './types';

export const metadata: Metadata = {
  title: 'Admin Invitations',
};

// One page of the pending invitations and its count, newest first. A cursor naming no row gives the
// first page again; numbered as every admin list is (rule 8). Cached so a second render in the
// request reads once.
const readInvitations = cache(
  async (
    session: Session,
    email: string,
    expiringSoon: boolean,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const filter = { email, expiringSoon };
    const page = await readNumberedPage(
      { after, before },
      (request) => listPendingAdminInvitations(session, filter, request),
      (start) => countPendingAdminInvitations(session, filter, start),
    );
    // What the list shows of each: no token or hash leaves the page.
    const invitations = page.edges.map(({ node: { id, email, siteRole, note, expiresAt } }) => ({
      id,
      email,
      siteRole,
      note,
      expiresAt,
    }));
    return { invitations, pageInfo: page.pageInfo, position: page.position };
  },
);

// The pending admin invitations with Revoke, narrowed by the filter in SQL and paged by cursor, with
// the invite form `?invite` opens. The page and GraphQL end at the same identity services, which are
// the guard (claude-docs/auth/admin-users.md, "Inviting an admin").
export default async function AdminInvitationsPage({ searchParams }: AdminInvitationsPageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const { filter, cursor } = readInvitationsPlace(params);
  const [locked, { invitations, pageInfo, position }] = await Promise.all([
    // Whether admin changes are paused, which locks Invite and Revoke for every admin but the
    // primary one.
    invitationsLock(session),
    readInvitations(session, filter.email, filter.expiringSoon, cursor.after, cursor.before),
  ]);

  return (
    <AdminInvitations
      invitations={invitations}
      filter={filter}
      cursor={cursor}
      position={position}
      {...pagerHrefs(pageInfo, (turn) => invitationsHref(filter, turn))}
      locked={locked}
      // By presence: `?invite` is written bare. Never while locked.
      inviting={!locked && params.invite !== undefined}
    />
  );
}
