import { Action, EmailLayout, Paragraph, defineMessage } from './parts/layout';
import { pauseEnd } from './parts/pause-end';
import type { SupportTimedOutProps } from './types';

const SUBJECT = 'You Were Timed Out of Support';

const PREVIEW = 'An admin timed your account out of sending support requests.';

// Sent when an admin sets a support time-out. It states the end, the admin's note and what the time-out stops, and links to the
// support page, where the user's past requests and the time-out notice stay readable.
export function SupportTimedOut({
  url,
  until,
  note,
  origin = new URL(url).origin,
  part,
}: SupportTimedOutProps) {
  return (
    <EmailLayout preview={PREVIEW} heading={SUBJECT} origin={origin}>
      <Paragraph>
        {`A site admin set a support time-out on your Sorrel & Salt account. ${pauseEnd(until)}`}
      </Paragraph>
      <Paragraph>{`The admin's note: ${note}`}</Paragraph>
      <Paragraph>
        Until it ends, no support request can be sent from your account. Your earlier requests and
        their replies stay on your support page.
      </Paragraph>
      <Action href={url} label="Open Your Support Page" part={part} />
    </EmailLayout>
  );
}

/** The notice of a support time-out for `to`, rendered to the html and plain text `send` takes. */
export const supportTimedOutMessage = defineMessage<SupportTimedOutProps>(SUBJECT, SupportTimedOut);
