import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListFrame, { ListBody } from '../../../../../../components/ListFrame';
import MemberList from '../../../../../../components/MemberList';
import type { MemberListEntry } from '../../../../../../components/MemberList/types';
import { RouteModalProvider } from '../../../../../../components/Modal/route-modal-provider';
import Notice from '../../../../../../components/Notice';
import Pager from '../../../../../../components/Pager';
import { Forbidden } from '../../../../../../lib/errors';
import { resolvePage } from '../../../../../../lib/pagination';
import { requireCovenMembership, requireSession } from '../../../../../../lib/request-session';
import { listHref, pagerHrefs } from '../../../../../../lib/list-href';
import { readPageCursors } from '../../../../../../lib/numbered-page';
import { single } from '../../../../../../lib/search-params';
import type { PagerCursor } from '../../../../../../lib/types';
import { displayNamesOf } from '@/modules/identity';
import {
  listMembers,
  memberEmails,
  memberRoster,
  rolePermits,
  standingMemberPauses,
} from '@/modules/coven';
import type { CovenLayoutParams } from '../../types';
import MemberDialog from './member-dialog';
import { memberHeading } from './member-heading';
import type { MembersPageProps } from './types';

export const metadata: Metadata = {
  title: 'Members',
};

// Who is in the coven; a name opens the member's modal. An observer gets the stranger's 404. An address is a steward's
// alone, asked only when the role holds `member: readEmail` and checked again by `memberEmails`.
export default async function MembersPage({
  params,
  searchParams,
}: CovenLayoutParams & MembersPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const { after, before } = readPageCursors(query);
  const memberParam = single(query.member) || undefined;
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

  // Read to the end, since one page of the list cannot say how many stewards there are.
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
  const canChangeRoles = rolePermits(membership.role, { member: ['update'] });
  const canRemove = rolePermits(membership.role, { member: ['remove'] });
  const canPause = rolePermits(membership.role, { member: ['pause'] });
  const pauses = canPause
    ? await standingMemberPauses(
        session,
        workspace.id,
        page.edges.map(({ node }) => node.userId),
      )
    : [];
  const pauseOf = (id: string) => {
    if (!canPause) return undefined;
    const standing = pauses.find(({ userId }) => userId === id);
    return standing ? { until: standing.until } : null;
  };

  const path = `/coven/${slug}/members`;
  const cursor: PagerCursor | undefined = after ? { after } : before ? { before } : undefined;
  const members = page.edges.map(({ node }): MemberListEntry => {
    const row = {
      userId: node.userId,
      name: nameOf(node.userId),
      role: node.role,
      joinedAt: node.joinedAt,
      updatedBy: editorOf(node.updatedBy),
      updatedAt: editorOf(node.updatedBy) ? node.updatedAt : null,
      invitedBy: node.invitedBy ? editorOf(node.invitedBy) : null,
      email: emailOf(node.userId),
      paused: pauseOf(node.userId),
    };
    return {
      ...row,
      openHref: listHref(path, { ...cursor, member: node.userId }),
      heading: memberHeading(row),
    };
  });
  // The member the address opens, from this page's rows: the modal reads nothing the list has not.
  const openedRow = memberParam && members.find(({ userId }) => userId === memberParam);
  const opened = openedRow ? { heading: memberHeading(openedRow), member: openedRow } : undefined;

  return (
    <RouteModalProvider>
      {memberParam && !opened && (
        <Notice kind="error">
          No member on this page of the list has that address. They may have been removed, or be
          listed on another page.
        </Notice>
      )}
      <ListFrame>
        {/* Raised before it is urgent: a quiet status, since it is on the page
            from the start and asks nothing of the reader yet. Inside the
            frame, so the tabbed panel's own gap spaces it from the list. */}
        {soleOwner && (
          <Notice kind="warn" quiet>
            This coven has one steward. If that person loses access, nobody can manage its members.
            Make another member a steward to be safe.
          </Notice>
        )}
        <ListBody>
          <MemberList
            members={members}
            currentUserId={session.userId}
            showEmail={showEmail}
            showAccess={canPause}
          />
          <Pager {...pagerHrefs(page.pageInfo, (at) => listHref(path, at))} soft />
        </ListBody>
      </ListFrame>
      {/* Rendered whatever the address opens, so a press on a name opens it at once. */}
      <MemberDialog
        closeHref={listHref(path, cursor)}
        opened={opened}
        workspaceId={workspace.id}
        currentUserId={session.userId}
        canChangeRoles={canChangeRoles}
        canPause={canPause}
        canRemove={canRemove}
      />
    </RouteModalProvider>
  );
}
