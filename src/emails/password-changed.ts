import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { PasswordChange, PasswordChangedProps } from './types';

const SUBJECT = 'Your Password Was Changed';

const PREVIEW = 'The password of your Sorrel & Salt account was just changed.';

const WHAT_HAPPENED: Record<PasswordChange, string> = {
  reset:
    'The password of your Sorrel & Salt account was just reset from a link mailed to this address, and every browser signed in to it was signed out.',
  change:
    'The password of your Sorrel & Salt account was just changed from its account page, and every other browser signed in to it was signed out.',
  set: 'A password was just added to your Sorrel & Salt account, so it can now sign in with this email address and that password.',
};

// Sent after every reset, change and first set, so a change the holder did not make does not go unnoticed.
function PasswordChanged({ url, how, origin = new URL(url).origin, part }: PasswordChangedProps) {
  return h(
    EmailLayout,
    { preview: PREVIEW, heading: SUBJECT, origin },
    h(Paragraph, null, WHAT_HAPPENED[how]),
    h(Paragraph, null, 'If that was you, there is nothing more to do.'),
    h(
      Paragraph,
      null,
      `If this was not you, someone else may be able to sign in to your account: ${actionVerb(part)} to reset the password now.`,
    ),
    h(Action, { href: url, label: 'Reset My Password', part }),
  );
}

export const passwordChangedMessage = defineMessage<PasswordChangedProps>(SUBJECT, PasswordChanged);
