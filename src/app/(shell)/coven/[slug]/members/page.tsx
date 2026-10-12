import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MemberList from '../../../../../components/MemberList';
import RemoveControl from '../../../../../components/MemberList/remove-control';
import RoleFailure from '../../../../../components/MemberList/role-failure';
import RoleControl from '../../../../../components/MemberList/role-control';
import type { MemberListEntry } from '../../../../../components/MemberList/types';
import Notice from '../../../../../components/Notice';
import Pager from '../../../../../components/Pager';
import { Forbidden } from '../../../../../lib/errors';
import { resolvePage } from '../../../../../lib/pagination';
import { requireCovenMembership, requireSession } from '../../../../../lib/request-session';
import { readableCursor, single } from '../../../../../lib/search-params';
import { displayNamesOf } from '@/modules/identity';
import { listMembers, memberRoster, rolePermits } from '@/modules/coven';
import type { CovenLayoutParams } from '../types';
import type { MembersPageProps } from './types';

export const metadata: Metadata = {
  title: 'Members',
};

// Who is in the coven and what each may do (story 9; M6.13). Owners and
// members see it; a viewer gets the 404 a stranger does, since the page's
// existence would otherwise say who holds which role. The read is
// `listMembers`, the service behind `Workspace.members`, so the page and
// GraphQL end at one check (CLAUDE.md rule 1). The role controls are drawn for
// owners only and the service refuses anyone else again. The page checks
// `member: read` through the service rather than reading the role itself
// (claude-docs/auth/coven-guard.md, "The members page").
export default async function MembersPage({
  params,
  searchParams,
}: CovenLayoutParams & MembersPageProps) {
  const { slug } = await params;
  const { after, before } = await searchParams;
  const { workspace, membership } = await requireCovenMembership(slug);
  const session = await requireSession();

  const afterCursor = readableCursor(single(after));
  // One cursor at a time: an address carrying both reads as `after`'s page.
  const beforeCursor = afterCursor ? undefined : readableCursor(single(before));
  let page;
  try {
    page = await resolvePage(
      afterCursor === undefined && beforeCursor !== undefined
        ? { last: 25, before: beforeCursor }
        : { first: 25, after: afterCursor },
      (request) => listMembers(session, workspace, request),
    );
  } catch (error) {
    if (error instanceof Forbidden) notFound();
    throw error;
  }

  // Read to the end, since one page of the list cannot say how many owners
  // there are (M6.16).
  const soleOwner =
    (await memberRoster(session, workspace)).filter(({ role }) => role === 'owner').length === 1;

  const ids = [...new Set(page.edges.flatMap(({ node }) => [node.userId, node.updatedBy]))];
  const names = await displayNamesOf(session, ids);
  // A name the service withholds (it answers co-members only) reads as Unknown.
  const nameOf = (id: string) => names[ids.indexOf(id)] ?? 'Unknown';
  // The editor's name withheld, the stamp is left empty: a date with no one to
  // ask about it says little.
  const editorOf = (id: string) => names[ids.indexOf(id)] ?? null;
  const members = page.edges.map(({ node }): MemberListEntry => ({
    userId: node.userId,
    name: nameOf(node.userId),
    role: node.role,
    joinedAt: node.joinedAt,
    updatedBy: editorOf(node.updatedBy),
    updatedAt: editorOf(node.updatedBy) ? node.updatedAt : null,
  }));

  const canChangeRoles = rolePermits(membership.role, { member: ['update'] });
  const canRemove = rolePermits(membership.role, { member: ['remove'] });
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = page.pageInfo;
  const href = (cursor: string) => `/coven/${slug}/members${cursor}`;

  return (
    <main>
      <h1>Members</h1>
      {/* Raised before it is urgent: a quiet status, since it is on the page
          from the start and asks nothing of the reader yet. */}
      {soleOwner && (
        <Notice kind="warn" quiet className="member-list__warning">
          This coven has one owner. If that person loses access, nobody can manage its members. Make
          another member an owner to be safe.
        </Notice>
      )}
      <RoleFailure>
        <MemberList
          members={members}
          currentUserId={session.userId}
          roleAction={
            canChangeRoles
              ? (member) => (
                  <RoleControl
                    workspaceId={workspace.id}
                    userId={member.userId}
                    name={member.name}
                    currentRole={member.role}
                  />
                )
              : undefined
          }
          // Another's row only: leaving is the coven page's, for every role.
          removeAction={
            canRemove
              ? (member) =>
                  member.userId !== session.userId && (
                    <RemoveControl
                      workspaceId={workspace.id}
                      userId={member.userId}
                      name={member.name}
                    />
                  )
              : undefined
          }
        />
      </RoleFailure>
      <Pager
        previousHref={
          hasPreviousPage && startCursor
            ? href(`?before=${encodeURIComponent(startCursor)}`)
            : undefined
        }
        nextHref={
          hasNextPage && endCursor ? href(`?after=${encodeURIComponent(endCursor)}`) : undefined
        }
        soft
      />
    </main>
  );
}
