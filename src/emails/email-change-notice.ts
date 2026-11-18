import { Fragment, createElement as h } from 'react';
import { EmailLayout, IgnoreNote, LinkedParagraph, Paragraph, defineMessage } from './parts/layout';
import { inUtc } from '@/lib/utc';
import type { EmailChangeNoticeProps } from './types';

// Sent to the address an account is leaving, on the request and on the completion. It has no button: the one link beside the wordmark is the account page, where the reader signs in, and it never carries a token that acts on the account (claude-docs/auth/admin-bootstrap.md, "The email page").

const SUBJECT = {
  requested: 'A New Email Address Was Requested',
  completed: 'Your Email Address Was Changed',
};

const PREVIEW = {
  requested: 'Someone asked to move your account to another email address.',
  completed: 'Your account now uses another email address.',
};

function EmailChangeNotice({
  stage,
  newDomain,
  at,
  url,
  origin = new URL(url).origin,
  part,
}: EmailChangeNoticeProps) {
  const what =
    stage === 'requested'
      ? h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            `On ${inUtc(at)}, a signed-in session asked to use an address at ${newDomain} for your Sorrel & Salt account.`,
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
          `On ${inUtc(at)}, your Sorrel & Salt account moved to an address at ${newDomain}. This address no longer receives its mail.`,
        );
  return h(
    EmailLayout,
    {
      preview: PREVIEW[stage],
      heading: stage === 'requested' ? 'New Email Requested' : 'Email Changed',
      origin,
    },
    what,
    h(LinkedParagraph, {
      before: 'If this was not you, ',
      linkText: 'sign in to Sorrel & Salt',
      after: ', change your email address back and remove any sign-in method you do not recognise.',
      href: `${origin}/account`,
      part,
    }),
    h(IgnoreNote, { when: 'If this was you' }),
  );
}

export const emailChangeNoticeMessage = defineMessage<EmailChangeNoticeProps>(
  ({ stage }) => SUBJECT[stage],
  EmailChangeNotice,
);
