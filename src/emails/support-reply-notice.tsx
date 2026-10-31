import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { SupportReplyNoticeProps } from './types';

// Sent to a support request's sender when staff reply. It links to the support page and carries none of the reply: the reply is
// read behind the sender's sign-in, not in a mailbox.

export function SupportReplyNotice({
  url,
  origin = new URL(url).origin,
  part,
}: SupportReplyNoticeProps) {
  return (
    <EmailLayout
      preview="There is a reply to your support request."
      heading="Reply Waiting"
      origin={origin}
    >
      <Paragraph>
        {`We have replied to a support request you sent to Sorrel & Salt. Sign in, then ${actionVerb(part)} to read it on your support page.`}
      </Paragraph>
      <Action href={url} label="Read the Reply" part={part} />
    </EmailLayout>
  );
}

/** The notice for `to`, rendered to the html and plain text `send` takes. */
export const supportReplyNoticeMessage = defineMessage<SupportReplyNoticeProps>(
  'There Is a Reply to Your Support Request',
  SupportReplyNotice,
);
