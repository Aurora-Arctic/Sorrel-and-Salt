import { Fragment, createElement as h } from 'react';
import {
  Action,
  EmailLayout,
  LinkOnlyNote,
  Paragraph,
  actionVerb,
  defineMessage,
} from './parts/layout';
import { cutSubject, supportTitle } from './parts/support-title';
import type { SupportEmailReplyProps } from './types';

// Carries none of the reply: it is read on the page behind the link.

const titleOf = (requestSubject: string): string =>
  supportTitle('Reply to your support request', requestSubject);

export function SupportEmailReply({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
  viewLink = false,
}: SupportEmailReplyProps) {
  const title = titleOf(requestSubject);
  return h(
    EmailLayout,
    { preview: 'There is a reply to your support request.', heading: title, origin },
    viewLink
      ? h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            `We have replied to your request: ${cutSubject(requestSubject)}. To read the reply and answer it, ${actionVerb(part)}. The link opens your request without a sign-in. Only the link in the latest email works.`,
          ),
          h(Action, { href: url, label: 'Read the Reply', part }),
          h(LinkOnlyNote),
        )
      : h(
          Fragment,
          null,
          h(Paragraph, null, `To read the reply and write back, ${actionVerb(part)}.`),
          h(Paragraph, { muted: true }, 'Only the link in the latest email works.'),
          h(Action, { href: url, label: 'Open the Request', part }),
        ),
  );
}

export const supportEmailReplyMessage = defineMessage<SupportEmailReplyProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportEmailReply,
);
