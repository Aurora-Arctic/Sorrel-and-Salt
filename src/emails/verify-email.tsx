import {
  Action,
  EmailLayout,
  IgnoreNote,
  Paragraph,
  actionVerb,
  defineMessage,
} from './parts/layout';
import { providerList } from './parts/providers';
import type { VerifyEmailProps } from './types';

const SUBJECT = 'Confirm Your Email Address';

// The inbox line beside the subject.
const PREVIEW = {
  'sign-up': 'Confirm the address you signed up with. The link works for one hour.',
  change: 'Confirm this address for your account. The link works for one hour.',
};

// No greeting by name, unlike the invitations: the address is not yet proved, and a
// mistyped one would hand a stranger the account's name.
export function VerifyEmail({
  url,
  purpose = 'sign-up',
  providers,
  origin = new URL(url).origin,
  part,
}: VerifyEmailProps) {
  const signedUpWith = providerList(providers);
  return (
    <EmailLayout preview={PREVIEW[purpose]} heading="Confirm Your Email Address" origin={origin}>
      <Paragraph>
        {purpose === 'change'
          ? 'Someone asked to use this email address for their Sorrel & Salt account'
          : 'Someone made a Sorrel & Salt account with this email address'}
        {signedUpWith && purpose === 'sign-up' && <>, using {signedUpWith}</>}.
      </Paragraph>
      <Paragraph>
        {`If that was you, ${actionVerb(part)} within one hour, in the same browser where you are signed in to Sorrel & Salt.`}
      </Paragraph>
      <Paragraph>
        If the link has expired, sign in and ask for a new one from your account page.
      </Paragraph>
      <Action href={url} label="Confirm My Email" part={part} />
      <IgnoreNote when="If this was not you" />
    </EmailLayout>
  );
}

/** The verification mail for `to`, rendered to the html and plain text `send` takes. */
export const verifyEmailMessage = defineMessage<VerifyEmailProps>(SUBJECT, VerifyEmail);
