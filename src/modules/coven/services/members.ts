import 'server-only';
import { findMemberEmails, findMemberPage } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { assertMembership, tryMembership } from './membership';
import type { MemberEmail, MemberKey, MembershipWithWorkspace, WorkspaceRow } from '../types';

/**
 * One coven at a time, not batched (claude-docs/design-decisions/data.md, "A coven's members are read a coven at a time, without a loader").
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
 * Read off the user row so a changed address shows at once. Users outside the coven are left out, not refused.
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

/** A refused coven is its `Forbidden` in its own slot, so it leaves another answered. */
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
        const membership = await tryMembership(session, workspaceId, { member: ['readEmail'] });
        if (membership instanceof Forbidden) return [workspaceId, membership] as const;
        const rows = await findMemberEmails(membership, userIds);
        return [workspaceId, new Map(rows.map(({ id, email }) => [id, email]))] as const;
      }),
    ),
  );
  return keys.map(({ workspaceId, userId }) => {
    const answer = answers.get(workspaceId)!;
    return answer instanceof Forbidden ? answer : (answer.get(userId) ?? null);
  });
}
