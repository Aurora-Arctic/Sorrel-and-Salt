import 'server-only';
import { SECONDS_PER_DAY } from '../../../lib/duration';
import { findOneById, findUserByEmail, withAudit } from '../../../db/repository';
import { normaliseEmail, validateEmailAddress } from '../../../lib/email-address';
import { ValidationError } from '../../../lib/errors';
import { SYSTEM_SESSION } from '../../../lib/system-actor';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import { getMe } from './profile';
import type { AuditSession } from '../../../db/types';
import type { EmailVerificationSender, UserRow } from '../types';

// The address an account is mailed at changes only at verification: a new one
// goes to `pending_email` with a mailed link, never to `users.email`, so an
// established account never re-enters the provisional sweep
// (claude-docs/auth/admin-bootstrap.md, "The email page").

// `.invalid` is reserved (RFC 2606): no mailbox can exist under it, so the
// placeholder can neither be mailed nor match an invitation.
const PLACEHOLDER_DOMAIN = 'pending.invalid';

export function placeholderEmail(providerId: string, accountId: string): string {
  return `${providerId}-${accountId}@${PLACEHOLDER_DOMAIN}`.toLowerCase();
}

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`);
}

export { normaliseEmail, validateEmailAddress };

/** Only a verified holder refuses a request: a provisional one lapses before the link is followed. */
export async function isEmailHeldByVerifiedAccount(email: string): Promise<boolean> {
  const holder = await findUserByEmail(email);
  return holder !== undefined && holder.emailVerified;
}

/** How recently the session must have been created to ask for a new address; the day Better Auth's `freshAge` gives unlinking a provider. */
export const EMAIL_CHANGE_WINDOW_SECONDS = SECONDS_PER_DAY;

export const RESEND_COOLDOWN_SECONDS = 60;

export function verificationWaitSeconds(sentAt: Date | null, now = Date.now()): number {
  if (sentAt === null) return 0;
  return Math.max(0, Math.ceil((sentAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000));
}

/** `verificationWaitSeconds` for a row read fresh, for the hook that mails outside a service. */
export async function verificationWaitFor(userId: string): Promise<number> {
  const row = await findOneById(users, userId);
  return verificationWaitSeconds(row?.verificationSentAt ?? null);
}

/** Written before the mail goes out. As an update it restarts a provisional row's window, so it takes the row's own session (claude-docs/auth/admin-bootstrap.md, "Provisional accounts"). */
export async function recordVerificationSent(session: AuditSession): Promise<void> {
  await withAudit(session, (write) =>
    write.updateById(users, session.userId, { verificationSentAt: new Date() }),
  );
}

/** One write that leaves `users.email` alone; a later change replaces the address and the stamp, so only the newest link is honoured. */
async function recordEmailChange(session: AuditSession, address: string): Promise<void> {
  await withAudit(session, (write) =>
    write.updateById(users, session.userId, {
      verificationSentAt: new Date(),
      pendingEmail: address,
    }),
  );
}

export async function emailChangeStanding(
  userId: string,
  address: string,
): Promise<'pending' | 'replaced' | 'lapsed'> {
  const row = await findOneById(users, userId);
  if (!row?.pendingEmail) return 'lapsed';
  return row.pendingEmail === address.toLowerCase() ? 'pending' : 'replaced';
}

/** Does nothing if a later change restamped the row since `sentAt`. */
export async function lapseEmailChange(userId: string, sentAt: Date): Promise<boolean> {
  const cleared = await withAudit(SYSTEM_SESSION, (write) =>
    write.lapseEmailChange(userId, sentAt),
  );
  return cleared.length > 0;
}

/** The address whose notice is still owed, else the row's own; none when the row already holds `address` or a placeholder, which nobody reads. */
export async function addressBeingLeft(userId: string, address: string): Promise<string | null> {
  const row = await findOneById(users, userId);
  if (!row || row.email.toLowerCase() === address.toLowerCase()) return null;
  if (row.formerEmail) return row.formerEmail;
  return isPlaceholderEmail(row.email) ? null : row.email;
}

/** Does nothing if the address or the move the notice named has changed since. */
export async function clearFormerEmail(
  userId: string,
  formerEmail: string,
  email: string,
): Promise<boolean> {
  const cleared = await withAudit(SYSTEM_SESSION, (write) =>
    write.clearFormerEmail(userId, formerEmail, email),
  );
  return cleared.length > 0;
}

export async function isEmailHeldByAnother(email: string, userId: string): Promise<boolean> {
  const holder = await findUserByEmail(email);
  return holder !== undefined && holder.id !== userId;
}

/**
 * An address a live verified account holds is answered the same and mailed nothing; the row's own unverified address is mailed again (claude-docs/auth/admin-bootstrap.md, "The email page").
 *
 * @throws {ValidationError} on `email`: malformed, unmailable, mailed within the last minute, or asked for from a session older than `EMAIL_CHANGE_WINDOW_SECONDS`.
 */
export async function setEmail(
  session: Session,
  input: string,
  sender: EmailVerificationSender,
  next?: string,
): Promise<UserRow> {
  const me = await getMe(session);
  const email = normaliseEmail(input);
  const issue = validateEmailAddress(email);
  if (issue) throw new ValidationError([issue]);

  const unchanged = email === me.email;
  if (unchanged && me.emailVerified) return me;

  // A session left open on a borrowed device must not move the account; resending the row's own link moves nothing.
  if (!unchanged && !(await sender.sessionIsFresh(EMAIL_CHANGE_WINDOW_SECONDS))) {
    throw new ValidationError([
      {
        path: ['email'],
        message: 'Sign in again to change your email address, then try again',
      },
    ]);
  }

  const wait = verificationWaitSeconds(me.verificationSentAt);
  if (wait > 0) {
    throw new ValidationError([
      { path: ['email'], message: `Wait ${wait} seconds before sending another confirmation` },
    ]);
  }

  if (unchanged) {
    // Better Auth's endpoint: its hook stamps the row and mails.
    await sender.resend(email, next);
    return me;
  }

  await recordEmailChange(session, email);
  // Answered alike whether or not a verified account holds the address, so the form cannot be used to find out: the holder is mailed nothing, as a
  // notice to it would be a mail anyone signed in could send to any account. Both mails go out after the answer, since waiting for one on only the
  // free path would show in how long the answer takes.
  const held = await isEmailHeldByVerifiedAccount(email);
  sender.defer(() => sender.notifyChangeRequested(me.id));
  if (!held) sender.defer(() => sender.requestChange(me.id, next));
  return me;
}
