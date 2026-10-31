import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { providerList } from './parts/providers';
import type { ProviderId } from '../lib/types';
import type { PasswordLockedProps } from './types';

const SUBJECT = 'Password Sign-In Paused';

// The inbox line beside the subject.
const PREVIEW =
  'Several wrong passwords were tried on your account, so password sign-in is paused for a while.';

/** A lock's length in words: minutes below an hour, hours from one up. */
export function lockLength(minutes: number): string {
  if (minutes % 60 === 0) return minutes === 60 ? '1 hour' : `${minutes / 60} hours`;
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

/** The account's other ways in as a sentence, or `''` when it has none. */
function otherWays(providers: readonly ProviderId[], hasPasskey: boolean): string {
  const ways = [providerList(providers), hasPasskey ? 'a passkey' : ''].filter(Boolean);
  return ways.length ? ` Signing in with ${ways.join(' or ')} still works.` : '';
}

// Sent when a lock starts, so the account's holder learns of guessing they did not do, and has a way in that the
// lock does not hold back.
export function PasswordLocked({
  url,
  minutes,
  providers = [],
  hasPasskey = false,
  origin = new URL(url).origin,
  part,
}: PasswordLockedProps) {
  const length = lockLength(minutes);
  return (
    <EmailLayout preview={PREVIEW} heading={SUBJECT} origin={origin}>
      <Paragraph>
        {`Several wrong passwords were just tried on the Sorrel & Salt account with this email address, so signing in to it with a password is paused for ${length}. It starts again on its own after that.${otherWays(providers, hasPasskey)}`}
      </Paragraph>
      <Paragraph>
        {`If that was you and you have forgotten the password, ${actionVerb(part)} within 15 minutes to choose a new one. Choosing one lifts the pause at once and signs the account out everywhere.`}
      </Paragraph>
      <Action href={url} label="Choose a New Password" part={part} />
      <Paragraph muted>
        If this was not you, your password has not changed and nobody signed in with it. You can
        ignore this email, or choose a new password if you think someone knows it.
      </Paragraph>
    </EmailLayout>
  );
}

/** The notice of a password lock for `to`, rendered to the html and plain text `send` takes. */
export const passwordLockedMessage = defineMessage<PasswordLockedProps>(SUBJECT, PasswordLocked);
