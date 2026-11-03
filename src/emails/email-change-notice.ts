import { Fragment, createElement as h } from 'react';
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
  const what =
    stage === 'requested'
      ? h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            `On ${whenOf(at)}, a signed-in session asked to use an address at ${newDomain} for your Sorrel & Salt account.`,
          ),
          h(
            Paragraph,
            null,
            'Nothing has changed yet: the change only takes effect when the link we sent to the new address is followed.',
          ),
        )
      : h(
          Paragraph,
          null,
          `On ${whenOf(at)}, your Sorrel & Salt account moved to an address at ${newDomain}. This address no longer receives its mail.`,
        );
  return h(
    EmailLayout,
    {
      preview: PREVIEW[stage],
      heading: stage === 'requested' ? 'New Email Requested' : 'Email Changed',
      origin,
    },
    what,
    h(
      Paragraph,
      null,
      'If this was not you, sign in to Sorrel & Salt, change your email address back and remove any sign-in method you do not recognise.',
    ),
    h(IgnoreNote, { when: 'If this was you' }),
  );
}

/** The notice for `to`, rendered to the html and plain text `send` takes. */
export const emailChangeNoticeMessage = defineMessage<EmailChangeNoticeProps>(
  ({ stage }) => SUBJECT[stage],
  EmailChangeNotice,
);
