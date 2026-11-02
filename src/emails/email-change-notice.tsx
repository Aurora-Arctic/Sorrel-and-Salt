import { EmailLayout, IgnoreNote, Paragraph, defineMessage } from './parts/layout';
import type { EmailChangeNoticeProps } from './types';

// Sent to the address an account is leaving, on the request and on the completion. It carries no action: a link here would be one a thief could
// press, and the cure for a change nobody meant is signing in and changing the address back (claude-docs/auth/admin-bootstrap.md, "The email page").

const SUBJECT = {
  requested: 'A New Email Address Was Requested',
  completed: 'Your Email Address Was Changed',
};

const PREVIEW = {
  requested: 'Someone asked to move your account to another email address.',
  completed: 'Your account now uses another email address.',
};

/** In UTC, because the mail is read in a zone the server cannot know. */
function whenOf(at: Date): string {
  return `${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(at)} UTC`;
}

export function EmailChangeNotice({
  stage,
  newDomain,
  at,
  url,
  origin = new URL(url).origin,
}: EmailChangeNoticeProps) {
  return (
    <EmailLayout
      preview={PREVIEW[stage]}
      heading={stage === 'requested' ? 'New Email Requested' : 'Email Changed'}
      origin={origin}
    >
      {stage === 'requested' ? (
        <>
          <Paragraph>
            {`On ${whenOf(at)}, a signed-in session asked to use an address at ${newDomain} for your Sorrel & Salt account.`}
          </Paragraph>
          <Paragraph>
            Nothing has changed yet: the change only takes effect when the link we sent to the new
            address is followed.
          </Paragraph>
        </>
      ) : (
        <Paragraph>
          {`On ${whenOf(at)}, your Sorrel & Salt account moved to an address at ${newDomain}. This address no longer receives its mail.`}
        </Paragraph>
      )}
      <Paragraph>
        If this was not you, sign in to Sorrel & Salt, change your email address back and remove any
        sign-in method you do not recognise.
      </Paragraph>
      <IgnoreNote when="If this was you" />
    </EmailLayout>
  );
}

/** The notice for `to`, rendered to the html and plain text `send` takes. */
export const emailChangeNoticeMessage = defineMessage<EmailChangeNoticeProps>(
  ({ stage }) => SUBJECT[stage],
  EmailChangeNotice,
);
