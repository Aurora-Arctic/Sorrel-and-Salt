import 'server-only';
import { randomBytes } from 'node:crypto';
import { findPendingSiteInvitations, findUserByEmail, withAudit } from '../../../db/repository';
import type { InvitationRow } from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { normaliseEmail, validateEmailAddress } from './email';
import { assertSiteAdmin } from './site-admin';
import { assertChangesOpen } from './admin-role-pause';
import type { InvitationSender } from '../types';

// MB.70: an admin invites an address to become an admin, M2.9's option B on
// MB.201's site tier of `invitations`. Who may invite and the pause are this
// service's; the token's hash, the expiry and the pending predicate are the
// repository's named writes'. Accepting is invitation-acceptance.ts's
// (claude-docs/auth/admin-users.md, "Inviting an admin").

const REFUSAL = 'Only a site admin may invite or withdraw an admin invitation';

/**
 * 32 bytes from the CSPRNG, base64url: unguessable, and safe in a path. Never
 * `Math.random()` (CLAUDE.md, "Invitation tokens").
 */
function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Invites `input` to become an admin: a pending site-tier invitation, stamped
 * as the admin, whose token is mailed to the address through `sender` and
 * stored as its hash alone. `note` is the optional reason, a blank one stored
 * as none, which accepting records on the ledger row. Answers the row, which
 * carries no token. A failed send is the transport's to log: the invitation
 * stays pending and can be withdrawn and sent again.
 *
 * @throws {Forbidden} the session's role is not `admin`, or the primary admin
 * has paused admin changes and the caller is another admin (MB.63).
 * @throws {ValidationError} on `email`: malformed, unmailable, or a live
 * admin's already.
 */
export async function createAdminInvitation(
  session: Session,
  input: string,
  note: string | undefined,
  sender: InvitationSender,
): Promise<InvitationRow> {
  const admin = assertSiteAdmin(session, REFUSAL);
  await assertChangesOpen(session, admin);
  const email = normaliseEmail(input);
  const issue = validateEmailAddress(email);
  if (issue) throw new ValidationError([issue]);
  if ((await findUserByEmail(email))?.role === 'admin') {
    throw new ValidationError([
      { path: ['email'], message: 'That address belongs to an admin already' },
    ]);
  }

  const token = newToken();
  const [row] = await withAudit(session, (write) =>
    write.insertInvitation(admin, { email, token, note: note?.trim() || null }),
  );
  // After the commit, so a mailed link always names a row.
  await sender.siteInvitation(email, token);
  return row;
}

/**
 * Withdraws a pending admin invitation, stamped as the admin: its link is
 * dead from now on, and says so.
 *
 * @throws {Forbidden} as `createAdminInvitation` does.
 * @throws {NotFound} no pending site-tier invitation has this id.
 */
export async function revokeAdminInvitation(session: Session, id: string): Promise<InvitationRow> {
  const admin = assertSiteAdmin(session, REFUSAL);
  await assertChangesOpen(session, admin);
  const [row] = await withAudit(session, (write) => write.revokeInvitation(admin, id));
  if (!row) throw new NotFound('No pending admin invitation has this id');
  return row;
}

/**
 * The pending admin invitations, newest first, for `/admin/users`. To every
 * admin, paused or not: the list is where an invitation is seen.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function listPendingAdminInvitations(session: Session): Promise<InvitationRow[]> {
  const admin = assertSiteAdmin(session, 'Only a site admin may see admin invitations');
  const rows = await findPendingSiteInvitations(admin);
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
