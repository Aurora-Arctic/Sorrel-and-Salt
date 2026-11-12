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
const RESET_PASSWORD_PAGE = '/reset-password';

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

/** `updateTo` plus this `requestType` is the branch of /verify-email that swaps the address and verifies it in one write. */
export async function changeLinkMessage(
  authBase: string,
  userId: string,
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
    { requestType: 'change-email-verification', userId },
  );
  const url = `${authBase}/verify-email?token=${token}&callbackURL=${encodeURIComponent(verifiedLanding(next ?? undefined))}`;
  return verifyEmailMessage({ to: pending, url, purpose: 'change', providers });
}

function resetLink(authBase: string, token: string): string {
  const link = new URL(`${authBase}/reset-password/${token}`);
  link.searchParams.set('callbackURL', RESET_PASSWORD_PAGE);
  return link.toString();
}

export function resetLinkMessage(authBase: string, to: string, token: string): Promise<Message> {
  return resetPasswordMessage({ to, url: resetLink(authBase, token) });
}

/** So the owner can choose a new password at once. */
export function lockNoticeMessage(
  authBase: string,
  to: string,
  token: string,
  lock: { minutes: number; providers: ProviderId[]; hasPasskey: boolean },
): Promise<Message> {
  return passwordLockedMessage({ to, url: resetLink(authBase, token), ...lock });
}
