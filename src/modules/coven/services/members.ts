import 'server-only';
import { findMemberEmails, findMemberPage } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { assertMembership } from './membership';
import type { MemberEmail, MemberKey, MembershipWithWorkspace, WorkspaceRow } from '../types';

/**
 * One page of a coven's live members, in the order they joined, each carrying
 * the coven: `Workspace.members`, and the members page. One read for
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
 * same check as `listMembers`. For the pages that must count owners or
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

/**
 * The address of each of these users who sits in the coven, read off their
 * own user row so a changed address shows at once:
 * the owner's Email column on the members page. A
 * separate read rather than a wider `CoMember`, which every member reads.
 * Users outside the coven are left out, not refused. One read for the check
 * and one for the addresses.
 *
 * @throws {Forbidden} the caller holds no live seat in the coven, or holds one
 * without `member: readEmail`, which only owners hold.
 */
export async function memberEmails(
  session: Session,
  workspaceId: string,
  userIds: readonly string[],
): Promise<MemberEmail[]> {
  const membership = await assertMembership(session, workspaceId, { member: ['readEmail'] });
  const rows = await findMemberEmails(membership, userIds);
  return rows.map(({ id, email }) => ({ userId: id, address: email }));
}

/**
 * `memberEmails` for a batch of members across covens, one answer per key:
 * the address, null for someone the coven no longer seats, or the
 * `Forbidden` the coven's check gave, so one coven refused leaves another
 * answered. One check and one read per coven named.
 */
export async function emailsOfMembers(
  session: Session,
  keys: readonly MemberKey[],
): Promise<(string | null | Forbidden)[]> {
  const covens = new Map<string, string[]>();
  for (const { workspaceId, userId } of keys)
    covens.set(workspaceId, [...(covens.get(workspaceId) ?? []), userId]);
  const answers = new Map<string, Map<string, string> | Forbidden>(
    await Promise.all(
      [...covens].map(async ([workspaceId, userIds]) => {
        try {
          const emails = await memberEmails(session, workspaceId, userIds);
          return [
            workspaceId,
            new Map(emails.map(({ userId, address }) => [userId, address])),
          ] as const;
        } catch (error) {
          if (error instanceof Forbidden) return [workspaceId, error] as const;
          throw error;
        }
      }),
    ),
  );
  return keys.map(({ workspaceId, userId }) => {
    const answer = answers.get(workspaceId)!;
    return answer instanceof Forbidden ? answer : (answer.get(userId) ?? null);
  });
}
