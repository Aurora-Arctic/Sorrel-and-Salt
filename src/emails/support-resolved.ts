import { Fragment, createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { supportTitle } from './parts/support-title';
import type { SupportResolvedProps } from './types';

// Sent to a request's sender when staff resolve it. It names the request and says how to reopen it; it carries none of the thread.

const titleOf = (requestSubject: string): string =>
  supportTitle('Your support request is resolved', requestSubject);

export function SupportResolved({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
  signedOut = false,
}: SupportResolvedProps) {
  const title = titleOf(requestSubject);
  return h(
    EmailLayout,
    { preview: 'Your support request is resolved.', heading: title, origin },
    signedOut
      ? h(
          Fragment,
          null,
          h(Paragraph, null, `If you still need help, ${actionVerb(part)} to write to us again.`),
          h(Action, { href: url, label: 'Write to Us Again', part }),
        )
      : h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            `A reply from you reopens it, and it closes by itself after seven days without one. To open the request, ${actionVerb(part)}.`,
          ),
          h(Action, { href: url, label: 'Open the Request', part }),
        ),
  );
}

/** The resolved notice for `to`, rendered to the html and plain text `send` takes. */
export const supportResolvedMessage = defineMessage<SupportResolvedProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportResolved,
);
