import { Fragment, createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { supportTitle } from './parts/support-title';
import type { SupportReceivedProps } from './types';

// Sent to a request's sender when it arrives. It names the request and carries the answer time, and none of what they wrote.

const titleOf = (requestSubject: string): string =>
  supportTitle('We have your support request', requestSubject);

export function SupportReceived({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
  signedOut = false,
}: SupportReceivedProps) {
  const title = titleOf(requestSubject);
  return h(
    EmailLayout,
    { preview: 'We have your message.', heading: title, origin },
    h(
      Paragraph,
      null,
      `We will reply within 5 working days${signedOut ? ', to this address' : ''}.`,
    ),
    signedOut
      ? h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            `You have no account to sign in to, so the reply comes by email. If you need to add something, ${actionVerb(part)} to write to us again.`,
          ),
          h(Paragraph, { muted: true }, 'Only the link in your latest email works.'),
          h(Action, { href: url, label: 'Write to Us Again', part }),
        )
      : h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            `You can follow it on your support page. To open the request, ${actionVerb(part)}.`,
          ),
          h(Action, { href: url, label: 'Open the Request', part }),
        ),
  );
}

/** The receipt for `to`, rendered to the html and plain text `send` takes. */
export const supportReceivedMessage = defineMessage<SupportReceivedProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportReceived,
);
