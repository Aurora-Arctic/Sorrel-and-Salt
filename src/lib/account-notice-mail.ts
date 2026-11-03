import { accountExistsMessage } from '../emails/account-exists';
import { passwordChangedMessage } from '../emails/password-changed';
import { isRosterProvider } from './social-providers';
import type { PasswordChange } from '../emails/types';
import type { Message } from './types';

// The account notices a job's step renders from the row when it sends, so a run carries ids and never an address. Only
// templates are imported, as the step bundle takes in everything this file reaches.

/** Tells `to` a sign-up arrived for its address, naming the ways it already signs in by `providerIds`, and links to sign-in under `origin`. */
export function accountExistsNotice(
  origin: string,
  to: string,
  providerIds: readonly string[],
): Promise<Message> {
  return accountExistsMessage({
    to,
    url: `${origin}/sign-in`,
    providers: providerIds.filter(isRosterProvider),
    hasPassword: providerIds.includes('credential'),
  });
}

/** Tells `to` its password was just replaced, linking to `/forgot-password` under `origin` for a holder who made no change. */
export function passwordChangedNotice(
  origin: string,
  to: string,
  how: PasswordChange,
): Promise<Message> {
  return passwordChangedMessage({ to, url: `${origin}/forgot-password`, how });
}
