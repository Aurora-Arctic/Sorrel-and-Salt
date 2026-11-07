import 'server-only';
import {
  findHoldsPasskey,
  findInvitedCoven,
  findNewestResetToken,
  findOneById,
  findOwnProviderIds,
  rotateInvitationToken,
} from '../../../db/repository';
import { invitationLinkMessage } from '../../../lib/invitation-link-mail';
import { deliver } from '../../../lib/mail-transport';
import {
  changeLinkMessage,
  lockNoticeMessage,
  resetLinkMessage,
  verificationLinkMessage,
} from '../../../lib/secret-link-mail';
import { isRosterProvider } from '../../../lib/social-providers';
import { users } from '../schema/users';
import { isEmailHeldByVerifiedAccount, isPlaceholderEmail } from './email';
import { VERIFICATION_LIFETIME_SECONDS } from './provisional-accounts';
import type { Message } from '../../../lib/types';
import type { SecretLink } from '../types';

// The secret-link mails, built from the rows when they are sent, so the job that retries one carries ids alone: a
// verification link is signed afresh, and a reset link's token is the newest Better Auth holds for the account.

export async function secretLinkMessage(link: SecretLink): Promise<Message | null> {
  if (link.kind === 'invitation') return invitationMessage(link);
  const user = await findOneById(users, link.userId);
  if (!user) return null;
  const providers = (await findOwnProviderIds(user.id)).filter(isRosterProvider);
  // A placeholder row asks for its first address this way, so only the pending address need be mailable. One a verified
  // account came to hold after it was asked for is mailed nothing, as setEmail mails none it holds then.
  if (link.kind === 'change') {
    const pending = user.pendingEmail;
    if (!pending || (await isEmailHeldByVerifiedAccount(pending))) return null;
    return changeLinkMessage(
      link.authBase,
      user.email,
      pending,
      link.next,
      VERIFICATION_LIFETIME_SECONDS,
      providers,
    );
  }
  if (isPlaceholderEmail(user.email)) return null;
  if (link.kind === 'verification') {
    if (user.emailVerified) return null;
    return verificationLinkMessage(
      link.authBase,
      user.email,
      link.next,
      VERIFICATION_LIFETIME_SECONDS,
      providers,
    );
  }
  // A reset reaches only an inbox the account has proved.
  if (!user.emailVerified) return null;
  const token = await findNewestResetToken(user.id);
  if (!token) return null;
  if (link.kind === 'reset') return resetLinkMessage(link.authBase, user.email, token);
  return lockNoticeMessage(link.authBase, user.email, token, {
    minutes: link.minutes,
    providers,
    hasPasskey: await findHoldsPasskey(user.id),
  });
}

/**
 * The row's hash is swapped for the new token's, so a retried step mails a fresh link and every earlier one stops working.
 */
async function invitationMessage(
  link: Extract<SecretLink, { kind: 'invitation' }>,
): Promise<Message | null> {
  const rotated = await rotateInvitationToken(link.invitationId);
  if (!rotated) return null;
  const { token, invitation } = rotated;
  const inviterName = (await findOneById(users, invitation.createdBy))?.name ?? '';
  const to = invitation.email;
  if (!to) return null;
  if (invitation.workspaceId === null) {
    if (invitation.siteRole !== 'curator' && invitation.siteRole !== 'admin') return null;
    return invitationLinkMessage(link.origin, token, {
      to,
      inviterName,
      siteRole: invitation.siteRole,
    });
  }
  const coven = await findInvitedCoven(invitation.workspaceId);
  if (!coven || !invitation.role || invitation.role === 'owner') return null;
  return invitationLinkMessage(link.origin, token, {
    to,
    inviterName,
    covenName: coven.name,
    role: invitation.role,
  });
}

/** A transport failure throws, so a job's step is retried. */
export async function sendChangeLink(
  link: Extract<SecretLink, { kind: 'change' }>,
): Promise<{ sentAt: string; lapsesInSeconds: number } | null> {
  const user = await findOneById(users, link.userId);
  const message = await secretLinkMessage(link);
  if (!user?.verificationSentAt || !message || !(await deliver(message))) return null;
  return {
    sentAt: user.verificationSentAt.toISOString(),
    lapsesInSeconds: VERIFICATION_LIFETIME_SECONDS,
  };
}

/** A transport failure throws, so a job's step is retried. */
export async function sendSecretLink(link: SecretLink): Promise<boolean> {
  const message = await secretLinkMessage(link);
  if (!message) return false;
  return deliver(message);
}
