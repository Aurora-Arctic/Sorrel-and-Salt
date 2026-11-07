import 'server-only';
import { findMemberEmails, findMemberPage } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { assertMembership } from './membership';
import type { MemberEmail, MemberKey, MembershipWithWorkspace, WorkspaceRow } from '../types';

/**
 * One page of a coven's live members, in the order they joined: `Workspace.members` and the members page. `query` narrows to
 * names holding the text, in any case. One coven at a time, not batched
 * (claude-docs/design-decisions/m6.11-members-without-a-loader.md).
 *
 * @throws {Forbidden} the caller holds no live seat, or holds one without `member: read`, which an observer lacks.
 */
export async function listMembers(
  session: Session,
  workspace: WorkspaceRow,
  page: PageRequest,
  query?: string,
): Promise<PageEntry<MembershipWithWorkspace>[]> {
  const membership = await assertMembership(session, workspace.id, { member: ['read'] });
  const entries = await findMemberPage(membership, page, query?.trim() || undefined);
  return entries.map(({ node, ...entry }) => ({ ...entry, node: { ...node, workspace } }));
}

/**
 * Every live member of a coven with their role, read to the end through the same check as `listMembers`, for pages that must
 * count or name stewards.
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
 * The address of each of these users who sits in the coven, read off their own user row so a changed address shows at once: the
 * steward's Email column. Users outside the coven are left out, not refused.
 *
 * @throws {Forbidden} the caller holds no live seat, or holds one without `member: readEmail`, which only stewards hold.
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
 * `memberEmails` for a batch of members across covens, one answer per key: the address, null for someone no longer seated,
 * or the coven's `Forbidden`, so one refused coven leaves another answered.
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
