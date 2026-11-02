import { createEmailVerificationToken } from 'better-auth/api';
import { passwordLockedMessage } from '../emails/password-locked';
import { resetPasswordMessage } from '../emails/reset-password';
import { verifyEmailMessage } from '../emails/verify-email';
import { verifiedLanding } from './account-email';
import { verificationSigningSecret } from './auth-secrets';
import type { Message, ProviderId } from './types';

// The secret-link mails a job's step renders when it sends, from ids the run carries: a verification link is signed here, and
// a reset link's token is the one Better Auth stored, read by the caller. Only templates, paths and signing are imported, as
// the step bundle takes in everything this file reaches.

/** Where a reset link always lands, so a request cannot point it anywhere else. */
export const RESET_PASSWORD_PAGE = '/reset-password';

/**
 * A sign-up or resend verification link for `email`, signed now for `lifetimeSeconds`, under `authBase` (the request's own
 * `/api/auth`), landing on the email page's confirmed view and carrying `next` on to Continue.
 */
export async function verificationLinkMessage(
  authBase: string,
  email: string,
  next: string | null,
  lifetimeSeconds: number,
  providers: ProviderId[],
): Promise<Message> {
  const token = await createEmailVerificationToken(
    verificationSigningSecret(),
    email,
    undefined,
    lifetimeSeconds,
  );
  const url = `${authBase}/verify-email?token=${token}&callbackURL=${encodeURIComponent(verifiedLanding(next ?? undefined))}`;
  return verifyEmailMessage({ to: email, url, providers });
}

/**
 * The change-of-address link, mailed to `pending`, signed now for `lifetimeSeconds` as the change from `current`: `updateTo` plus
 * this `requestType` is the branch of /verify-email that swaps the address and verifies it in one write.
 */
export async function changeLinkMessage(
  authBase: string,
  current: string,
  pending: string,
  next: string | null,
  lifetimeSeconds: number,
  providers: ProviderId[],
): Promise<Message> {
  const token = await createEmailVerificationToken(
    verificationSigningSecret(),
    current,
    pending,
    lifetimeSeconds,
    { requestType: 'change-email-verification' },
  );
  const url = `${authBase}/verify-email?token=${token}&callbackURL=${encodeURIComponent(verifiedLanding(next ?? undefined))}`;
  return verifyEmailMessage({ to: pending, url, purpose: 'change', providers });
}

/** The reset link for `token` under `authBase`, as Better Auth builds it, landing on the reset page. */
function resetLink(authBase: string, token: string): string {
  const link = new URL(`${authBase}/reset-password/${token}`);
  link.searchParams.set('callbackURL', RESET_PASSWORD_PAGE);
  return link.toString();
}

/** The password reset mail for `token`. */
export function resetLinkMessage(authBase: string, to: string, token: string): Promise<Message> {
  return resetPasswordMessage({ to, url: resetLink(authBase, token) });
}

/** The lockout mail, carrying the reset link for `token` so the owner can choose a new password at once. */
export function lockNoticeMessage(
  authBase: string,
  to: string,
  token: string,
  lock: { minutes: number; providers: ProviderId[]; hasPasskey: boolean },
): Promise<Message> {
  return passwordLockedMessage({ to, url: resetLink(authBase, token), ...lock });
}
