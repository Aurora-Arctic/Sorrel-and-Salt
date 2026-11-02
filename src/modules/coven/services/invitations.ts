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
import { users } from '../../identity/schema/users';
import { normaliseEmail, validateEmailAddress } from '../../identity';
import type { InvitationSender } from '../../identity';
import { workspaces } from '../schema/workspaces';
import type { WorkspaceRole } from '../types';
import { assertMembership } from './membership';

// An owner invites an address into a coven with a role: the workspace tier of `invitations` (claude-docs/db/invitations.md,
// "Coven invitation service details"). Who may invite is this service's; the token, expiry and workspace are the repository's.

/** The roles an invitation may grant: the database's check, said again where it can explain itself. */
const INVITABLE: readonly WorkspaceRole[] = ['viewer', 'member'];

/** How many coven invitations one account may make in a rolling window: each, and each resend, sends one mail from the site's address. */
export const INVITATION_MAIL_LIMIT = 20;
export const INVITATION_MAIL_WINDOW_MINUTES = 60;

/** Refuses the sender once their recent invitations reach the limit, saying when the oldest one leaves the window. */
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
 * Invites `email` into the coven with `role`: a pending invitation whose token is mailed through `sender` and stored as its hash
 * alone; a second invitation to the address replaces the pending one (claude-docs/db/invitations.md, "Coven invitation service details").
 *
 * @throws {Forbidden} the caller is not an owner of the coven (`member: invite`).
 * @throws {ValidationError} on `role`: owner. On `email`: malformed, unmailable, or a live member's already. On no field: the sender's
 * hourly mail limit is reached, which every new invitation and every resend counts toward.
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
        message: 'Invite someone as a viewer or a member; an owner makes them an owner afterwards',
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

  // The proof was minted from a live membership of it, so the workspace is there.
  const workspace = await findOneById(workspaces, workspaceId);
  if (!workspace) throw new ValidationError([{ path: ['workspaceId'], message: 'No such coven' }]);

  const token = newToken();
  // The waiting invitation to this address is withdrawn in the write that creates the new one.
  const [row] = await withAudit(session, async (write) => {
    await write.revokePendingInvitationsTo(membership, email);
    return write.insertInvitation(membership, { email, role, token });
  });
  // After the commit, so a mailed link always names a row. The session holds the id alone, so the sender's name is read here.
  const inviter = await findOneById(users, session.userId);
  await sender.workspaceInvitation(email, token, {
    name: workspace.name,
    role,
    inviterName: inviter?.name ?? '',
  });
  return row;
}

/**
 * One page of the coven's pending invitations, newest first, for the members page. Owners only: the rows carry the addresses of
 * people who have not joined, so the check is `member: invite`, never `member: read`.
 *
 * @throws {Forbidden} the caller is not an owner of the coven.
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
 * How many invitations `listPendingWorkspaceInvitations` pages, and how many come before `start`: "Page X of Y".
 *
 * @throws {Forbidden} the caller is not an owner of the coven.
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
 * Withdraws a pending invitation of the coven, stamped as the owner: its link is dead from now on and the row stays for the audit.
 *
 * @throws {Forbidden} the caller is not an owner of the coven.
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
  // An id that cannot name a row is one that is not there.
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
