import 'server-only';
import {
  findInvitationInWorkspace,
  findMemberByEmail,
  findOneById,
  findPendingWorkspaceInvitationCount,
  findPendingWorkspaceInvitationPage,
  findRecentCovenInvitationTimes,
  withAudit,
} from '../../../db/repository';
import type { AddressInvitationRow, InvitableRole, InvitationRow } from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { newToken } from '../../../lib/invitation-token';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import { normaliseEmail, validateEmailAddress } from '../../identity';
import type { InvitationSender } from '../../identity';
import { workspaces } from '../schema/workspaces';
import type { WorkspaceRole } from '../types';
import { assertMembership } from './membership';

// Who may invite is this service's; the token, expiry and workspace are the repository's (claude-docs/db/invitations.md, "Coven invitation service details").

const INVITABLE: readonly WorkspaceRole[] = ['viewer', 'member'];

/** Each invitation and each resend sends one mail from the site's address. */
export const INVITATION_MAIL_LIMIT = 20;
export const INVITATION_MAIL_WINDOW_MINUTES = 60;

async function assertUnderMailLimit(session: Session): Promise<void> {
  const windowMs = INVITATION_MAIL_WINDOW_MINUTES * 60_000;
  const times = await findRecentCovenInvitationTimes(session, windowMs / 1000);
  if (times.length < INVITATION_MAIL_LIMIT) return;
  const oldest = Math.min(...times.map((time) => time.getTime()));
  const retry = new Date(oldest + windowMs);
  throw new ValidationError([
    {
      path: [],
      message: `You have sent ${INVITATION_MAIL_LIMIT} invitations in the last ${INVITATION_MAIL_WINDOW_MINUTES} minutes, which is the most allowed. Try again after ${retry.toISOString().slice(11, 16)} UTC.`,
    },
  ]);
}

function isInvitable(role: WorkspaceRole): role is InvitableRole {
  return INVITABLE.includes(role);
}

/**
 * A second invitation to the address replaces the pending one (claude-docs/db/invitations.md, "Coven invitation service details").
 *
 * @throws {Forbidden} the caller is not a steward of the coven (`member: invite`).
 * @throws {ValidationError} on `role`: owner. On `email`: malformed, unmailable, or a live member's already. On no field: the hourly mail limit.
 */
export async function createInvitation(
  session: Session,
  workspaceId: string,
  input: { email: string; role: WorkspaceRole },
  sender: InvitationSender,
): Promise<InvitationRow> {
  const membership = await assertMembership(session, workspaceId, { member: ['invite'] });

  const { role } = input;
  if (!isInvitable(role)) {
    throw new ValidationError([
      {
        path: ['role'],
        message:
          'Invite someone as an observer or a practitioner; a steward makes them a steward afterwards',
      },
    ]);
  }
  const email = normaliseEmail(input.email);
  const issue = validateEmailAddress(email);
  if (issue) throw new ValidationError([issue]);
  if (await findMemberByEmail(membership, email)) {
    throw new ValidationError([
      { path: ['email'], message: 'That address belongs to a member of this coven already' },
    ]);
  }

  await assertUnderMailLimit(session);

  const workspace = await findOneById(workspaces, workspaceId);
  if (!workspace) throw new ValidationError([{ path: ['workspaceId'], message: 'No such coven' }]);

  // The token stored here is never told to anyone; the mail's step replaces it with the one it mails.
  const [row] = await withAudit(session, async (write) => {
    await write.revokePendingInvitationsTo(membership, email);
    return write.insertInvitation(membership, { email, role, token: newToken() });
  });
  // After the commit, so the job's step finds the row.
  await sender.invitation(row.id);
  return row;
}

/**
 * Stewards only: the rows carry the addresses of people who have not joined, so the check is `member: invite`, never `member: read`.
 *
 * @throws {Forbidden} the caller is not a steward of the coven.
 */
export async function listPendingWorkspaceInvitations(
  session: Session,
  workspaceId: string,
  page: PageRequest,
): Promise<PageEntry<AddressInvitationRow>[]> {
  const membership = await assertMembership(session, workspaceId, { member: ['invite'] });
  return findPendingWorkspaceInvitationPage(membership, page);
}

/**
 * @throws {Forbidden} the caller is not a steward of the coven.
 */
export async function countPendingWorkspaceInvitations(
  session: Session,
  workspaceId: string,
  start: Cursor | undefined,
): Promise<PageCount> {
  const membership = await assertMembership(session, workspaceId, { member: ['invite'] });
  return findPendingWorkspaceInvitationCount(membership, start);
}

/**
 * @throws {Forbidden} the caller is not a steward of the coven.
 * @throws {NotFound} no invitation of this coven has this id, or it is no longer pending.
 * @throws {ValidationError} on `id`: the invitation was accepted, so the person is removed on the members page instead.
 */
export async function revokeWorkspaceInvitation(
  session: Session,
  workspaceId: string,
  id: string,
): Promise<InvitationRow> {
  const membership = await assertMembership(session, workspaceId, { member: ['invite'] });
  const missing = () => new NotFound('No pending invitation in this coven has this id');
  if (!RowId.safeParse(id).success) throw missing();

  const invitation = await findInvitationInWorkspace(membership, id);
  if (!invitation) throw missing();
  if (invitation.acceptedAt) {
    throw new ValidationError([
      {
        path: ['id'],
        message:
          'That invitation was accepted, so the person is a member of this coven. Remove them from the members list instead.',
      },
    ]);
  }

  // Two tabs revoking at once, or the link lapsing in between: nothing pending is left to stamp.
  const [row] = await withAudit(session, (write) => write.revokeInvitation(membership, id));
  if (!row) throw missing();
  return row;
}
