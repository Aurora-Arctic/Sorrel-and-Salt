import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { ResetPasswordProps } from './types';

const SUBJECT = 'Reset Your Password';

// The inbox line beside the subject.
const PREVIEW = 'Choose a new password for your account. The link works for 15 minutes, once.';

// No greeting by name: a stranger can ask for this mail for any address, so it says nothing the address
// does not already know.
export function ResetPassword({ url, origin = new URL(url).origin, part }: ResetPasswordProps) {
  return (
    <EmailLayout preview={PREVIEW} heading={SUBJECT} origin={origin}>
      <Paragraph>
        Someone asked to reset the password of the Sorrel & Salt account with this email address.
      </Paragraph>
      <Paragraph>
        {`If that was you, ${actionVerb(part)} within 15 minutes to choose a new one. The link works once, and choosing a new password signs the account out everywhere.`}
      </Paragraph>
      <Action href={url} label="Choose a New Password" part={part} />
      <Paragraph muted>
        If this was not you, your password has not changed, and you can ignore this email.
      </Paragraph>
    </EmailLayout>
  );
}

/** The reset mail for `to`, rendered to the html and plain text `send` takes. */
export const resetPasswordMessage = defineMessage<ResetPasswordProps>(SUBJECT, ResetPassword);
