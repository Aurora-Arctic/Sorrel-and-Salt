import 'server-only';
import { findMemberByEmail, findOneById, withAudit } from '../../../db/repository';
import type { InvitableRole, InvitationRow } from '../../../db/repository';
import { ValidationError } from '../../../lib/errors';
import { newToken } from '../../../lib/invitation-token';
import type { Session } from '../../../lib/session';
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
 * A second invitation to an address already invited is allowed, as the admin
 * tier's is: each mail carries its own link, and any one accepts.
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
  const [row] = await withAudit(session, (write) =>
    write.insertInvitation(membership, { email, role, token }),
  );
  // After the commit, so a mailed link always names a row.
  await sender.workspaceInvitation(email, token, { name: workspace.name, role });
  return row;
}
