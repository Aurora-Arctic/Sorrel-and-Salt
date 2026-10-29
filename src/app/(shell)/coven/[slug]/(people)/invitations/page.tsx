import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PendingInvitations from '../../../../../../components/PendingInvitations';
import { listHref, pagerHrefs } from '../../../../../../lib/list-href';
import { requireCovenMembership, requireSession } from '../../../../../../lib/request-session';
import { readNumberedPage, readPageCursors } from '@/lib/numbered-page';
import {
  countPendingWorkspaceInvitations,
  listPendingWorkspaceInvitations,
  rolePermits,
} from '@/modules/coven';
import type { CovenLayoutParams } from '../../types';
import type { InvitationsPageProps } from './types';

export const metadata: Metadata = {
  title: 'Invitations',
};

// The invitations an owner has sent and nobody has answered, newest first with Revoke on each.
// Owners only, as the addresses are those of people who have not joined. The page decides by the
// permission (`member: invite`) and answers anyone else with the stranger's 404; the services check
// again (claude-docs/auth/coven-guard.md, "The invitations page").
export default async function InvitationsPage({
  params,
  searchParams,
}: CovenLayoutParams & InvitationsPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const { workspace, membership } = await requireCovenMembership(slug);
  if (!rolePermits(membership.role, { member: ['invite'] })) notFound();
  const session = await requireSession();

  const page = await readNumberedPage(
    readPageCursors(query),
    (request) => listPendingWorkspaceInvitations(session, workspace.id, request),
    (start) => countPendingWorkspaceInvitations(session, workspace.id, start),
  );

  return (
    <PendingInvitations
      workspaceId={workspace.id}
      invitations={page.edges.map(({ node: { id, email, role, expiresAt, declinedAt } }) => ({
        id,
        email,
        // A coven's invitation always names a role: the tier CHECK.
        role: role ?? 'viewer',
        expiresAt,
        declinedAt,
      }))}
      position={page.position}
      {...pagerHrefs(page.pageInfo, (cursor) => listHref(`/coven/${slug}/invitations`, cursor))}
    />
  );
}
