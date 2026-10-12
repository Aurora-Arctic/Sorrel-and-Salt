import 'server-only';
import { findMemberPage } from '../../../db/repository';
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
 * without `member: read`, which owners alone hold until M6.13.
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
