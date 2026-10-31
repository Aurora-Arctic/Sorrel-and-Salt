import 'server-only';
import { findOneById, findUserByEmail, withAudit } from '../../../db/repository';
import { normaliseEmail, validateEmailAddress } from '../../../lib/email-address';
import { ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import { getMe } from './profile';
import type { AuditSession } from '../../../db/types';
import type { EmailVerificationSender, UserRow } from '../types';

// The address an account is mailed at changes only at verification: asking
// for a new one is a token and a mail, never a write to `users.email`, so an
// established account never re-enters the provisional sweep
// (claude-docs/auth/admin-bootstrap.md, "The email page").

// `.invalid` is reserved (RFC 2606): no mailbox can exist under it, so the
// placeholder can neither be mailed nor match an invitation.
const PLACEHOLDER_DOMAIN = 'pending.invalid';

/** The address a provider that shared none is stored under, so the row and its session can exist. */
export function placeholderEmail(providerId: string, accountId: string): string {
  return `${providerId}-${accountId}@${PLACEHOLDER_DOMAIN}`.toLowerCase();
}

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`);
}

export { normaliseEmail, validateEmailAddress };

/**
 * Whether a live, verified account holds this address. Only a verified holder
 * refuses a request: a provisional one lapses before the link is followed.
 */
export async function isEmailHeldByVerifiedAccount(email: string): Promise<boolean> {
  const holder = await findUserByEmail(email);
  return holder !== undefined && holder.emailVerified;
}

/** How recently the session must have been created to ask for a new address; the day Better Auth's `freshAge` gives unlinking a provider. */
export const EMAIL_CHANGE_WINDOW_SECONDS = 24 * 60 * 60;

/** The least time between two verification mails to one account, whichever path sends them. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Seconds until the row may be mailed again, given when it last was; 0 when it may be now. */
export function verificationWaitSeconds(sentAt: Date | null, now = Date.now()): number {
  if (sentAt === null) return 0;
  return Math.max(0, Math.ceil((sentAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000));
}

/** `verificationWaitSeconds` for a row read fresh, for the hook that mails outside a service. */
export async function verificationWaitFor(userId: string): Promise<number> {
  const row = await findOneById(users, userId);
  return verificationWaitSeconds(row?.verificationSentAt ?? null);
}

/**
 * Stamps the row as mailed now, before the mail goes out. As an update it restarts a provisional row's window,
 * so it takes the row's own session (claude-docs/auth/admin-bootstrap.md, "Provisional accounts").
 */
export async function recordVerificationSent(session: AuditSession): Promise<void> {
  await withAudit(session, (write) =>
    write.updateById(users, session.userId, { verificationSentAt: new Date() }),
  );
}

/** Whether a live account other than `userId`'s holds this address — what the unique index refuses at verification. */
export async function isEmailHeldByAnother(email: string, userId: string): Promise<boolean> {
  const holder = await findUserByEmail(email);
  return holder !== undefined && holder.id !== userId;
}

/**
 * Asks for `input` to become the signed-in account's address. Nothing is
 * written to `users.email`: it becomes the row's when the mailed link is
 * followed from this account's session. The row is stamped as mailed, which
 * also restarts a provisional caller's window so the link cannot outlive the
 * row. An address a live verified account holds is answered the same and
 * mailed nothing. Both mails are sent after the answer. The row's own address, still unverified, is mailed again
 * instead; verified, there is nothing to do. Either link lands on the way to `next`,
 * which the sender guards where it builds the link.
 *
 * @throws {ValidationError} on `email`: malformed, unmailable, mailed within the last minute, or asked for from a
 * session older than `EMAIL_CHANGE_WINDOW_SECONDS`.
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

  await recordVerificationSent(session);
  // Answered alike whether or not a verified account holds the address, so the form cannot be used to find out: the holder is mailed nothing, as a
  // notice to it would be a mail anyone signed in could send to any account. Both mails go out after the answer, since waiting for one on only the
  // free path would show in how long the answer takes.
  const held = await isEmailHeldByVerifiedAccount(email);
  sender.defer(() => sender.notifyChangeRequested(me.email, email));
  if (!held) sender.defer(() => sender.requestChange(me.email, email, next));
  return me;
}
