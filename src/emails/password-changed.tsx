import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { PasswordChange, PasswordChangedProps } from './types';

const SUBJECT = 'Your Password Was Changed';

// The inbox line beside the subject.
const PREVIEW = 'The password of your Sorrel & Salt account was just changed.';

const WHAT_HAPPENED: Record<PasswordChange, string> = {
  reset:
    'The password of your Sorrel & Salt account was just reset from a link mailed to this address, and every browser signed in to it was signed out.',
  change:
    'The password of your Sorrel & Salt account was just changed from its account page, and every other browser signed in to it was signed out.',
  set: 'A password was just added to your Sorrel & Salt account, so it can now sign in with this email address and that password.',
};

// Sent after every reset, change and first set, so a change the holder did not make does not go unnoticed.
export function PasswordChanged({
  url,
  how,
  origin = new URL(url).origin,
  part,
}: PasswordChangedProps) {
  return (
    <EmailLayout preview={PREVIEW} heading={SUBJECT} origin={origin}>
      <Paragraph>{WHAT_HAPPENED[how]}</Paragraph>
      <Paragraph>If that was you, there is nothing more to do.</Paragraph>
      <Paragraph>
        {`If this was not you, someone else may be able to sign in to your account: ${actionVerb(part)} to reset the password now.`}
      </Paragraph>
      <Action href={url} label="Reset My Password" part={part} />
    </EmailLayout>
  );
}

/** The notice of a new password for `to`, rendered to the html and plain text `send` takes. */
export const passwordChangedMessage = defineMessage<PasswordChangedProps>(SUBJECT, PasswordChanged);
