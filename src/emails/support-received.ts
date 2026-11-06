import { Fragment, createElement as h } from 'react';
import {
  Action,
  EmailLayout,
  LinkOnlyNote,
  Paragraph,
  actionVerb,
  defineMessage,
} from './parts/layout';
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
  viewLink = false,
}: SupportReceivedProps) {
  const title = titleOf(requestSubject);
  return h(
    EmailLayout,
    { preview: 'We have your message.', heading: title, origin },
    signedOut && viewLink
      ? h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            'Thank you for writing to us. We will reply within 5 working days, and we will email you when we do.',
          ),
          h(
            Paragraph,
            null,
            `To read your request, add to it or answer our reply, ${actionVerb(part)}. Anyone with the link can open your request, so keep this email private. Only the link in the latest email works.`,
          ),
          h(Action, { href: url, label: 'Open Your Support Request', part }),
          h(LinkOnlyNote),
        )
      : h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            `We will reply within 5 working days${signedOut ? ', to this address' : ''}.`,
          ),
          signedOutRest(signedOut, url, part),
        ),
  );
}

function signedOutRest(signedOut: boolean, url: string, part: SupportReceivedProps['part']) {
  return signedOut
    ? h(
        Fragment,
        null,
        h(
          Paragraph,
          null,
          `You have no account to sign in to, so the reply comes by email. If you need to add something, ${actionVerb(part)} to write to us again.`,
        ),
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
      );
}

/** The receipt for `to`, rendered to the html and plain text `send` takes. */
export const supportReceivedMessage = defineMessage<SupportReceivedProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportReceived,
);
