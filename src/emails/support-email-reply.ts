import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { supportTitle } from './parts/support-title';
import type { SupportEmailReplyProps } from './types';

// Sent to a signed-out visitor when staff reply. It names the request and links to its page, and carries none of the reply:
// the reply is read on that page, behind the link.

const titleOf = (requestSubject: string): string =>
  supportTitle('Reply to your support request', requestSubject);

export function SupportEmailReply({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
}: SupportEmailReplyProps) {
  const title = titleOf(requestSubject);
  return h(
    EmailLayout,
    { preview: 'There is a reply to your support request.', heading: title, origin },
    h(Paragraph, null, `To read the reply and write back, ${actionVerb(part)}.`),
    h(Paragraph, { muted: true }, 'Only the link in the latest email works.'),
    h(Action, { href: url, label: 'Open the Request', part }),
  );
}

/** The reply notice for `to`, rendered to the html and plain text `send` takes. */
export const supportEmailReplyMessage = defineMessage<SupportEmailReplyProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportEmailReply,
);
