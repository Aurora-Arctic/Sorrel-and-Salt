import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { SupportReplyNoticeProps } from './types';

// Sent to a support request's sender when staff reply. It names the request, links to the support page and carries none of the
// reply: the reply is read behind the sender's sign-in, not in a mailbox.

// A subject is up to 120 characters; the heading and subject line keep to 80 so a long one does not wrap a mail client's list.
const SUBJECT_LIMIT = 80;

const titleOf = (requestSubject: string): string => {
  const subject = requestSubject.trim();
  const cut =
    subject.length > SUBJECT_LIMIT ? `${subject.slice(0, SUBJECT_LIMIT).trimEnd()}…` : subject;
  return `Reply to your support request: ${cut}`;
};

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
      <Paragraph>
        {`${title}. Sign in, then ${actionVerb(part)} to read it on your support page.`}
      </Paragraph>
      <Action href={url} label="Read the Reply" part={part} />
    </EmailLayout>
  );
}

/** The notice for `to`, rendered to the html and plain text `send` takes. */
export const supportReplyNoticeMessage = defineMessage<SupportReplyNoticeProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportReplyNotice,
);
