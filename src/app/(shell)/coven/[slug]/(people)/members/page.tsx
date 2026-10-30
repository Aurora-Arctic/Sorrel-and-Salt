import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListFrame, { ListBody } from '../../../../../../components/ListFrame';
import MemberList from '../../../../../../components/MemberList';
import RemoveControl from '../../../../../../components/MemberList/remove-control';
import RoleControl from '../../../../../../components/MemberList/role-control';
import type { MemberListEntry } from '../../../../../../components/MemberList/types';
import Notice from '../../../../../../components/Notice';
import Pager from '../../../../../../components/Pager';
import { Forbidden } from '../../../../../../lib/errors';
import { resolvePage } from '../../../../../../lib/pagination';
import { requireCovenMembership, requireSession } from '../../../../../../lib/request-session';
import { listHref, pagerHrefs } from '../../../../../../lib/list-href';
import { readPageCursors } from '../../../../../../lib/numbered-page';
import { displayNamesOf } from '@/modules/identity';
import { listMembers, memberEmails, memberRoster, rolePermits } from '@/modules/coven';
import type { CovenLayoutParams } from '../../types';
import type { MembersPageProps } from './types';

export const metadata: Metadata = {
  title: 'Members',
};

// Who is in the coven and what each may do. A viewer gets the stranger's 404. The read is
// `listMembers`, which GraphQL ends at too (rule 1). An address is an owner's alone, asked only when
// the role holds `member: readEmail` and checked again by `memberEmails`.
export default async function MembersPage({
  params,
  searchParams,
}: CovenLayoutParams & MembersPageProps) {
  const { slug } = await params;
  const { after, before } = readPageCursors(await searchParams);
  const { workspace, membership } = await requireCovenMembership(slug);
  const session = await requireSession();

  let page;
  try {
    page = await resolvePage(
      after === undefined && before !== undefined ? { last: 25, before } : { first: 25, after },
      (request) => listMembers(session, workspace, request),
    );
  } catch (error) {
    if (error instanceof Forbidden) notFound();
    throw error;
  }

  // Read to the end, since one page of the list cannot say how many owners there are.
  const soleOwner =
    (await memberRoster(session, workspace)).filter(({ role }) => role === 'owner').length === 1;

  const ids = [
    ...new Set(
      page.edges.flatMap(({ node }) =>
        node.invitedBy
          ? [node.userId, node.updatedBy, node.invitedBy]
          : [node.userId, node.updatedBy],
      ),
    ),
  ];
  const names = await displayNamesOf(session, ids);
  // A name the service withholds (it answers co-members only) reads as Unknown.
  const nameOf = (id: string) => names[ids.indexOf(id)] ?? 'Unknown';
  // The editor's name withheld, the stamp is left empty: a date with no one to
  // ask about it says little.
  const editorOf = (id: string) => names[ids.indexOf(id)] ?? null;
  const showEmail = rolePermits(membership.role, { member: ['readEmail'] });
  const emails = showEmail
    ? await memberEmails(
        session,
        workspace.id,
        page.edges.map(({ node }) => node.userId),
      )
    : [];
  const emailOf = (id: string) => emails.find(({ userId }) => userId === id)?.address ?? null;
  const members = page.edges.map(({ node }): MemberListEntry => ({
    userId: node.userId,
    name: nameOf(node.userId),
    role: node.role,
    joinedAt: node.joinedAt,
    updatedBy: editorOf(node.updatedBy),
    updatedAt: editorOf(node.updatedBy) ? node.updatedAt : null,
    invitedBy: node.invitedBy ? editorOf(node.invitedBy) : null,
    email: emailOf(node.userId),
  }));

  const canChangeRoles = rolePermits(membership.role, { member: ['update'] });
  const canRemove = rolePermits(membership.role, { member: ['remove'] });

  return (
    <>
      <ListFrame>
        {/* Raised before it is urgent: a quiet status, since it is on the page
            from the start and asks nothing of the reader yet. Inside the
            frame, so the tabbed panel's own gap spaces it from the list. */}
        {soleOwner && (
          <Notice kind="warn" quiet>
            This coven has one owner. If that person loses access, nobody can manage its members.
            Make another member an owner to be safe.
          </Notice>
        )}
        <ListBody>
          <MemberList
            members={members}
            currentUserId={session.userId}
            showEmail={showEmail}
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
          <Pager
            {...pagerHrefs(page.pageInfo, (cursor) => listHref(`/coven/${slug}/members`, cursor))}
            soft
          />
        </ListBody>
      </ListFrame>
    </>
  );
}
