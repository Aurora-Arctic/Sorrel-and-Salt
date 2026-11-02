import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { supportTitle } from './parts/support-title';
import type { SupportReplyNoticeProps } from './types';

// Sent to a support request's sender when staff reply. It names the request, links to the support page and carries none of the
// reply: the reply is read behind the sender's sign-in, not in a mailbox.

const titleOf = (requestSubject: string): string =>
  supportTitle('Reply to your support request', requestSubject);

export function SupportReplyNotice({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
}: SupportReplyNoticeProps) {
  const title = titleOf(requestSubject);
  return (
    <EmailLayout
      preview="There is a reply to your support request."
      heading={title}
      origin={origin}
    >
      <Paragraph>{`Sign in, then ${actionVerb(part)} to read it on your support page.`}</Paragraph>
      <Action href={url} label="Read the Reply" part={part} />
    </EmailLayout>
  );
}

/** The notice for `to`, rendered to the html and plain text `send` takes. */
export const supportReplyNoticeMessage = defineMessage<SupportReplyNoticeProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportReplyNotice,
);
