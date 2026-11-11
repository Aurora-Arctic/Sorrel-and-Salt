import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { supportTitle } from './parts/support-title';
import type { SupportReplyNoticeProps } from './types';

// Carries none of the reply: it is read behind the sender's sign-in.

const titleOf = (requestSubject: string): string =>
  supportTitle('Reply to your support request', requestSubject);

function SupportReplyNotice({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
}: SupportReplyNoticeProps) {
  const title = titleOf(requestSubject);
  return h(
    EmailLayout,
    { preview: 'There is a reply to your support request.', heading: title, origin },
    h(Paragraph, null, `Sign in, then ${actionVerb(part)} to read it on your support page.`),
    h(Action, { href: url, label: 'Read the Reply', part }),
  );
}

export const supportReplyNoticeMessage = defineMessage<SupportReplyNoticeProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportReplyNotice,
);
