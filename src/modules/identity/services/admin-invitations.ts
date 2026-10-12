import 'server-only';
import {
  findPendingSiteInvitationCount,
  findPendingSiteInvitationPage,
  findOneById,
  findUserByEmail,
  withAudit,
} from '../../../db/repository';
import type { InvitationRow, SiteInvitationFilter } from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import { newToken } from '../../../lib/invitation-token';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { normaliseEmail, validateEmailAddress } from './email';
import { users } from '../schema/users';
import { assertSiteAdmin } from './site-admin';
import { adminDeclaration } from './admin-changes';
import { assertAdminChangesOpen } from './admin-role-pause';
import type { AdminInvitationFilter, InvitationSender } from '../types';

// MB.70: an admin invites an address to become an admin, M2.9's option B on
// MB.201's site tier of `invitations`. Who may invite and the pause are this
// service's; the token's hash, the expiry and the pending predicate are the
// repository's named writes'. Accepting is invitation-acceptance.ts's
// (claude-docs/auth/admin-users.md, "Inviting an admin").

const REFUSAL = 'Only a site admin may invite or withdraw an admin invitation';

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
  const admin = await assertAdminChangesOpen(session, REFUSAL);
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
    write.insertInvitation(admin, { email, token, note: adminDeclaration(note).note ?? null }),
  );
  // After the commit, so a mailed link always names a row.
  // The mail names who sent it; the session holds the id alone, so the name is read here.
  const inviter = await findOneById(users, session.userId);
  await sender.siteInvitation(email, token, { name: inviter?.name ?? '' });
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
  const admin = await assertAdminChangesOpen(session, REFUSAL);
  const [row] = await withAudit(session, (write) => write.revokeInvitation(admin, id));
  if (!row) throw new NotFound('No pending admin invitation has this id');
  return row;
}

/** How soon an invitation lapses for Expires in 24 Hrs to list it (MB.115). */
const EXPIRING_SOON_HOURS = 24;

const LIST_REFUSAL = 'Only a site admin may see admin invitations';

/**
 * One page of the pending admin invitations under `filter`, newest first,
 * for `/admin/invitations`. To every admin, paused or not: the list is where
 * an invitation is seen. Narrowed by `filter` in the finder's SQL: `email` a
 * fragment of the address, trimmed, and `expiringSoon` only those lapsing
 * within `EXPIRING_SOON_HOURS`.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function listPendingAdminInvitations(
  session: Session,
  filter: AdminInvitationFilter,
  page: PageRequest,
): Promise<PageEntry<InvitationRow>[]> {
  const admin = assertSiteAdmin(session, LIST_REFUSAL);
  return findPendingSiteInvitationPage(admin, siteFilter(filter), page);
}

/**
 * How many invitations `listPendingAdminInvitations` pages under `filter`,
 * and how many come before `start`, a page's first row, none on an empty
 * page: the Invitations tab's "Page X of Y" (MB.115).
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function countPendingAdminInvitations(
  session: Session,
  filter: AdminInvitationFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const admin = assertSiteAdmin(session, LIST_REFUSAL);
  return findPendingSiteInvitationCount(admin, siteFilter(filter), start);
}

/** The filter as the finder takes it: a blank address none, and the window in hours. */
function siteFilter({ email, expiringSoon }: AdminInvitationFilter): SiteInvitationFilter {
  return {
    email: email?.trim() || undefined,
    expiresWithinHours: expiringSoon ? EXPIRING_SOON_HOURS : undefined,
  };
}
