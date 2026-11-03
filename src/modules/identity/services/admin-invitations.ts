import 'server-only';
import {
  findPendingSiteInvitationCount,
  findPendingSiteInvitationPage,
  findUserByEmail,
  withAudit,
} from '../../../db/repository';
import type {
  InvitableSiteRole,
  InvitationRow,
  SiteInvitationRow,
  SiteInvitationFilter,
} from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import { newToken } from '../../../lib/invitation-token';
import type { Session, UserRole } from '../../../lib/session';
import { outranks } from '../../../lib/site-roles';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { normaliseEmail, validateEmailAddress } from './email';
import { assertSiteAdmin } from './site-admin';
import { adminDeclaration } from './admin-changes';
import { assertAdminChangesOpen } from './admin-role-pause';
import type { AdminInvitationFilter, InvitationSender } from '../types';

// A keeper invites an address to become a keeper or a curator: the site tier of `invitations`. Accepting is invitation-acceptance.ts's
// (claude-docs/auth/admin-users.md, "Admin invitation service details").

const REFUSAL = 'Only a site keeper may invite or withdraw a keeper invitation';

/**
 * Invites `input` to `siteRole`, curator or admin: a pending site-tier invitation whose token is mailed through `sender` and
 * stored as its hash alone (claude-docs/auth/admin-users.md, "Admin invitation service details").
 *
 * @throws {Forbidden} the session's role is not `admin`, or keeper changes are paused and the caller is not the primary keeper.
 * @throws {ValidationError} on `email`: malformed, unmailable, or a live account's that holds `siteRole` or above.
 */
export async function createAdminInvitation(
  session: Session,
  input: string,
  siteRole: InvitableSiteRole,
  note: string | undefined,
  sender: InvitationSender,
): Promise<InvitationRow> {
  const admin = await assertAdminChangesOpen(session, REFUSAL);
  const email = normaliseEmail(input);
  const issue = validateEmailAddress(email);
  if (issue) throw new ValidationError([issue]);
  const held = (await findUserByEmail(email))?.role;
  if (held && !outranks(siteRole, held)) {
    throw new ValidationError([
      { path: ['email'], message: `That address belongs to ${withArticle(held)} already` },
    ]);
  }

  // The waiting site-tier invitation to this address is withdrawn in the same write. The token stored here is never told
  // to anyone: the mail's step replaces it with the one it mails.
  const [row] = await withAudit(session, async (write) => {
    await write.revokePendingInvitationsTo(admin, email);
    return write.insertInvitation(admin, {
      email,
      token: newToken(),
      siteRole,
      note: adminDeclaration(note).note ?? null,
    });
  });
  // After the commit, so the job's step finds the row.
  await sender.invitation(row.id);
  return row;
}

/** A held role as the refusal names it: "an admin", "a curator". */
const withArticle = (role: UserRole): string => (role === 'admin' ? 'an admin' : `a ${role}`);

/**
 * Withdraws a pending admin invitation, stamped as the admin: its link is dead from now on, and says so.
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

/** How soon an invitation lapses for Expires in 24 Hrs to list it. */
const EXPIRING_SOON_HOURS = 24;

const LIST_REFUSAL = 'Only a site keeper may see admin invitations';

/**
 * One page of the pending admin invitations under `filter`, newest first. Open to every keeper, paused or not, as the list is where an invitation is seen.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function listPendingAdminInvitations(
  session: Session,
  filter: AdminInvitationFilter,
  page: PageRequest,
): Promise<PageEntry<SiteInvitationRow>[]> {
  const admin = assertSiteAdmin(session, LIST_REFUSAL);
  return findPendingSiteInvitationPage(admin, siteFilter(filter), page);
}

/**
 * How many invitations `listPendingAdminInvitations` pages under `filter`, and how many come before `start`: "Page X of Y".
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
