import 'server-only';
import {
  findHoldsPasskey,
  findNewestResetToken,
  findOneById,
  findOwnProviderIds,
} from '../../../db/repository';
import { deliver } from '../../../lib/mail-transport';
import {
  lockNoticeMessage,
  resetLinkMessage,
  verificationLinkMessage,
} from '../../../lib/secret-link-mail';
import { isRosterProvider } from '../../../lib/social-providers';
import { users } from '../schema/users';
import { isPlaceholderEmail } from './email';
import { VERIFICATION_LIFETIME_SECONDS } from './provisional-accounts';
import type { Message } from '../../../lib/types';
import type { SecretLink } from '../types';

// The secret-link mails, built from the rows when they are sent, so the job that retries one carries ids alone: a
// verification link is signed afresh, and a reset link's token is the newest Better Auth holds for the account.

/** The mail for `link` as the rows stand, or null when there is none to send: the account is gone, unmailable, or has nothing left to verify or reset. */
export async function secretLinkMessage(link: SecretLink): Promise<Message | null> {
  const user = await findOneById(users, link.userId);
  if (!user || isPlaceholderEmail(user.email)) return null;
  const providers = (await findOwnProviderIds(user.id)).filter(isRosterProvider);
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

/** Builds and sends the mail for `link`; true once the transport took it, false when there was none to send or the transport refused it before trying. A transport failure throws, so a job's step is retried. */
export async function sendSecretLink(link: SecretLink): Promise<boolean> {
  const message = await secretLinkMessage(link);
  if (!message) return false;
  return deliver(message);
}
