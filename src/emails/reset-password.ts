import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { ResetPasswordProps } from './types';

const SUBJECT = 'Reset Your Password';

const PREVIEW = 'Choose a new password for your account. The link works for 15 minutes, once.';

// No greeting by name: a stranger can ask for this mail for any address, so it says nothing the address
// does not already know.
export function ResetPassword({ url, origin = new URL(url).origin, part }: ResetPasswordProps) {
  return h(
    EmailLayout,
    { preview: PREVIEW, heading: SUBJECT, origin },
    h(
      Paragraph,
      null,
      'Someone asked to reset the password of the Sorrel & Salt account with this email address.',
    ),
    h(
      Paragraph,
      null,
      `If that was you, ${actionVerb(part)} within 15 minutes to choose a new one. The link works once, and choosing a new password signs the account out everywhere.`,
    ),
    h(Action, { href: url, label: 'Choose a New Password', part }),
    h(
      Paragraph,
      { muted: true },
      'If this was not you, your password has not changed, and you can ignore this email.',
    ),
  );
}

export const resetPasswordMessage = defineMessage<ResetPasswordProps>(SUBJECT, ResetPassword);
