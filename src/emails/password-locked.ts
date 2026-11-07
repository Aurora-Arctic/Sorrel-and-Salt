import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { providerList } from './parts/providers';
import type { ProviderId } from '../lib/types';
import type { PasswordLockedProps } from './types';

const SUBJECT = 'Password Sign-In Paused';

const PREVIEW =
  'Several wrong passwords were tried on your account, so password sign-in is paused for a while.';

export function lockLength(minutes: number): string {
  if (minutes % 60 === 0) return minutes === 60 ? '1 hour' : `${minutes / 60} hours`;
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

/** The account's other ways in as a sentence, or `''` when it has none. */
function otherWays(providers: readonly ProviderId[], hasPasskey: boolean): string {
  const ways = [providerList(providers), hasPasskey ? 'a passkey' : ''].filter(Boolean);
  return ways.length ? ` Signing in with ${ways.join(' or ')} still works.` : '';
}

// Sent when a lock starts, so the holder learns of guessing they did not do; it offers a way in the lock does not hold back.
export function PasswordLocked({
  url,
  minutes,
  providers = [],
  hasPasskey = false,
  origin = new URL(url).origin,
  part,
}: PasswordLockedProps) {
  const length = lockLength(minutes);
  return h(
    EmailLayout,
    { preview: PREVIEW, heading: SUBJECT, origin },
    h(
      Paragraph,
      null,
      `Several wrong passwords were just tried on the Sorrel & Salt account with this email address, so signing in to it with a password is paused for ${length}. It starts again on its own after that.${otherWays(providers, hasPasskey)}`,
    ),
    h(
      Paragraph,
      null,
      `If that was you and you have forgotten the password, ${actionVerb(part)} within 15 minutes to choose a new one. Choosing one lifts the pause at once and signs the account out everywhere.`,
    ),
    h(Action, { href: url, label: 'Choose a New Password', part }),
    h(
      Paragraph,
      { muted: true },
      'If this was not you, your password has not changed and nobody signed in with it. You can ignore this email, or choose a new password if you think someone knows it.',
    ),
  );
}

export const passwordLockedMessage = defineMessage<PasswordLockedProps>(SUBJECT, PasswordLocked);
