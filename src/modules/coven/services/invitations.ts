import 'server-only';
import {
  findInvitationInWorkspace,
  findMemberByEmail,
  findOneById,
  findPendingWorkspaceInvitationCount,
  findPendingWorkspaceInvitationPage,
  withAudit,
} from '../../../db/repository';
import type { InvitableRole, InvitationRow } from '../../../db/repository';
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

// M7.3: an owner invites an address into a coven with a role, the workspace
// tier of `invitations` (claude-docs/db/invitations.md, "Inviting into a
// coven"). Who may invite is this service's; the token's hash, the expiry and
// the workspace the row names are the repository's named write's.

/** The roles an invitation may grant: the database's check, said again where it can explain itself. */
const INVITABLE: readonly WorkspaceRole[] = ['viewer', 'member'];

function isInvitable(role: WorkspaceRole): role is InvitableRole {
  return INVITABLE.includes(role);
}

/**
 * Invites `email` into the coven with `role`: a pending invitation, stamped as
 * the session's user, whose token is mailed to the address through `sender`
 * and stored as its hash alone. Answers the row, which carries no token. A
 * failed send is the transport's to log: the invitation stays pending and can
 * be revoked and sent again.
 *
 * A second invitation to an address already invited replaces the pending one
 * (MB.269): that one is stamped revoked by the session's user in the same write,
 * so only the newest link works and its role is the one that applies. Another
 * coven's invitation, an accepted or lapsed one, and the site tier's are left
 * alone.
 *
 * @throws {Forbidden} the caller is not an owner of the coven (`member: invite`).
 * @throws {ValidationError} on `role`: owner, which is granted afterwards on
 * the members page. On `email`: malformed, unmailable, or a live member's
 * already.
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

  // The proof was minted from a live membership of it, so the workspace is there.
  const workspace = await findOneById(workspaces, workspaceId);
  if (!workspace) throw new ValidationError([{ path: ['workspaceId'], message: 'No such coven' }]);

  const token = newToken();
  // The waiting invitation to this address is withdrawn in the write that
  // creates the new one, so a failed insert leaves it pending.
  const [row] = await withAudit(session, async (write) => {
    await write.revokePendingInvitationsTo(membership, email);
    return write.insertInvitation(membership, { email, role, token });
  });
  // After the commit, so a mailed link always names a row.
  // The mail names who sent it; the session holds the id alone, so the name is read here.
  const inviter = await findOneById(users, session.userId);
  await sender.workspaceInvitation(email, token, {
    name: workspace.name,
    role,
    inviterName: inviter?.name ?? '',
  });
  return row;
}

/**
 * One page of the coven's pending invitations, newest first, for the members
 * page (M7.6). Owners only: the rows carry the addresses of people who have
 * not joined, and members now read the roll (M6.13), so the check is
 * `member: invite`, never `member: read`. A pending invitation outlives its
 * inviter's demotion or removal, as the admin tier's does.
 *
 * @throws {Forbidden} the caller is not an owner of the coven.
 */
export async function listPendingWorkspaceInvitations(
  session: Session,
  workspaceId: string,
  page: PageRequest,
): Promise<PageEntry<InvitationRow>[]> {
  const membership = await assertMembership(session, workspaceId, { member: ['invite'] });
  return findPendingWorkspaceInvitationPage(membership, page);
}

/**
 * How many invitations `listPendingWorkspaceInvitations` pages, and how many
 * come before `start`, a page's first row, none on an empty page: the list's
 * "Page X of Y".
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
 * Withdraws a pending invitation of the coven, stamped as the owner: its link
 * is dead from now on and the row stays for the audit. An invitation already
 * revoked or lapsed is no longer pending, so it is answered as not found, as
 * the admin tier's is.
 *
 * @throws {Forbidden} the caller is not an owner of the coven.
 * @throws {NotFound} no invitation of this coven has this id, or it is no
 * longer pending.
 * @throws {ValidationError} on `id`: the invitation was accepted, so the
 * person is a member and is removed on the members page instead.
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
