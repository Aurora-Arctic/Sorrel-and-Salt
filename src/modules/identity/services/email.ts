import 'server-only';
import { findOneById, findUserByEmail, withAudit } from '../../../db/repository';
import { ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import { getMe } from './profile';
import type { AuditSession } from '../../../db/types';
import type { ValidationIssue } from '../../../lib/types';
import type { EmailVerificationSender, UserRow } from '../types';

// The address an account is mailed at changes only at verification: asking
// for a new one is a token and a mail, never a write to `users.email`, so an
// established account never re-enters the provisional sweep
// (claude-docs/auth.md, "The email page").

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

/** Trimmed and lower-cased, as the column stores it. */
export function normaliseEmail(input: string): string {
  return input.trim().toLowerCase();
}

// Deliberately loose: the mail is the real check, and a rule stricter than
// the inbox refuses addresses that work. Replacing this function is the whole
// of the v2 swap for a real validator (claude-docs/backlog.md).
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 254;

/** The one rule a normalised address broke, pathed to the field, or `null`. */
export function validateEmailAddress(email: string): ValidationIssue | null {
  const path = ['email'];
  if (email.length === 0) return { path, message: 'Enter an email address' };
  if (email.length > MAX_LENGTH || !SHAPE.test(email)) {
    return { path, message: "That doesn't look like an email address" };
  }
  if (email.endsWith('.invalid')) return { path, message: "That address can't receive mail" };
  return null;
}

/**
 * Whether a live, verified account holds this address. Only a verified holder
 * refuses a request: a provisional one lapses before the link is followed.
 */
export async function isEmailHeldByVerifiedAccount(email: string): Promise<boolean> {
  const holder = await findUserByEmail(email);
  return holder !== undefined && holder.emailVerified;
}

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
 * Stamps the row as mailed now, before the mail goes out. Being an update,
 * it restarts a provisional row's window through the trigger too, which is
 * why it takes the row's own session and never a stranger's
 * (claude-docs/auth.md, "Provisional accounts").
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
 * row. The row's own address, still unverified, is mailed again instead;
 * verified, there is nothing to do.
 *
 * @throws {ValidationError} on `email`: malformed, unmailable, held by a
 * live verified account, or mailed within the last minute.
 */
export async function setEmail(
  session: Session,
  input: string,
  sender: EmailVerificationSender,
): Promise<UserRow> {
  const me = await getMe(session);
  const email = normaliseEmail(input);
  const issue = validateEmailAddress(email);
  if (issue) throw new ValidationError([issue]);

  const unchanged = email === me.email;
  if (unchanged && me.emailVerified) return me;

  if (!unchanged && (await isEmailHeldByVerifiedAccount(email))) {
    throw new ValidationError([
      { path: ['email'], message: 'That address is already in use by another account' },
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
    await sender.resend(email);
    return me;
  }

  await recordVerificationSent(session);
  await sender.requestChange(me.email, email);
  return me;
}
