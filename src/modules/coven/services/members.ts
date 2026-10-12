import 'server-only';
import { findMemberPage } from '../../../db/repository';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { assertMembership } from './membership';
import type { MembershipWithWorkspace, WorkspaceRow } from '../types';

/**
 * One page of a coven's live members, in the order they joined, each carrying
 * the coven: `Workspace.members`, and the members page (M6.13). One read for
 * the check and one for the page. A coven at a time rather than batched across
 * covens, since no page lists two covens' members at once
 * (claude-docs/design-decisions/m6.11-members-without-a-loader.md).
 *
 * @throws {Forbidden} the caller holds no live seat in the coven, or holds one
 * without `member: read`, which a viewer does not hold.
 */
export async function listMembers(
  session: Session,
  workspace: WorkspaceRow,
  page: PageRequest,
): Promise<PageEntry<MembershipWithWorkspace>[]> {
  const membership = await assertMembership(session, workspace.id, { member: ['read'] });
  const entries = await findMemberPage(membership, page);
  return entries.map(({ node, ...entry }) => ({ ...entry, node: { ...node, workspace } }));
}

/**
 * Every live member of a coven with their role, read to the end through the
 * same check as `listMembers` (M6.16). For the pages that must count owners or
 * name who could be made one, which a single page of the list cannot say once
 * a coven outgrows it.
 *
 * @throws {Forbidden} as `listMembers` does.
 */
export async function memberRoster(
  session: Session,
  workspace: WorkspaceRow,
): Promise<Pick<MembershipWithWorkspace, 'userId' | 'role'>[]> {
  const members = await allPages((request) => listMembers(session, workspace, request));
  return members.map(({ userId, role }) => ({ userId, role }));
}
