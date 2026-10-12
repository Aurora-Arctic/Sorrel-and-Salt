import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import PendingInvitations from '../../../../../../components/PendingInvitations';
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

// The invitations an owner has sent and nobody has answered (story 5; M7.6),
// newest first with Revoke on each. Owners only: the addresses are those of
// people who have not joined. The page decides by the permission
// (`member: invite`) and answers anyone else with the 404 a stranger gets,
// and the services check it again, so a direct visit by a member reads
// nothing (claude-docs/auth/coven-guard.md, "The invitations page").
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
  const href = (cursor: Record<string, string>) =>
    `/coven/${slug}/invitations?${new URLSearchParams(cursor).toString()}` as Route;
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = page.pageInfo;

  return (
    <PendingInvitations
      workspaceId={workspace.id}
      invitations={page.edges.map(({ node: { id, email, role, expiresAt } }) => ({
        id,
        email,
        // A coven's invitation always names a role: the tier CHECK.
        role: role ?? 'viewer',
        expiresAt,
      }))}
      position={page.position}
      previousHref={hasPreviousPage && startCursor ? href({ before: startCursor }) : undefined}
      nextHref={hasNextPage && endCursor ? href({ after: endCursor }) : undefined}
    />
  );
}
