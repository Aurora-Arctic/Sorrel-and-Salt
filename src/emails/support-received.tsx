import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { SupportReceivedProps } from './types';

// Sent to a signed-out visitor when their request arrives. It carries the answer time and none of what they wrote.

export function SupportReceived({ url, origin = new URL(url).origin, part }: SupportReceivedProps) {
  return (
    <EmailLayout preview="We have your message." heading="We Have Your Message" origin={origin}>
      <Paragraph>
        We have your message to Sorrel & Salt, and we will reply to this address within 5 working
        days.
      </Paragraph>
      <Paragraph>
        {`You have no account to sign in to, so the reply comes by email. If you need to add something, ${actionVerb(part)} to write to us again.`}
      </Paragraph>
      <Action href={url} label="Write to Us Again" part={part} />
    </EmailLayout>
  );
}

/** The receipt for `to`, rendered to the html and plain text `send` takes. */
export const supportReceivedMessage = defineMessage<SupportReceivedProps>(
  'We Have Your Message',
  SupportReceived,
);
