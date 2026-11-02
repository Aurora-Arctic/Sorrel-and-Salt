import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { SupportEmailReplyProps } from './types';

// Sent to a signed-out visitor when staff reply. Unlike the notice a signed-in sender gets, it carries the reply itself: the
// visitor has no support page to read it on.

export function SupportEmailReply({
  url,
  body,
  origin = new URL(url).origin,
  part,
}: SupportEmailReplyProps) {
  return h(
    EmailLayout,
    { preview: 'There is a reply to your message.', heading: 'Reply to Your Message', origin },
    body.split(/\n{2,}/).map((paragraph, index) => h(Paragraph, { key: index }, paragraph)),
    h(
      Paragraph,
      { muted: true },
      `To answer, ${actionVerb(part)} to write to us again, from this address.`,
    ),
    h(Action, { href: url, label: 'Write to Us', part }),
  );
}

/** The reply for `to`, rendered to the html and plain text `send` takes. */
export const supportEmailReplyMessage = defineMessage<SupportEmailReplyProps>(
  'Reply to Your Message to Sorrel & Salt',
  SupportEmailReply,
);
