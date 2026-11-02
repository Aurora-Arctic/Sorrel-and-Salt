import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { supportTitle } from './parts/support-title';
import type { SupportReceivedProps } from './types';

// Sent to a request's sender when it arrives. It names the request and carries the answer time, and none of what they wrote.

const titleOf = (requestSubject: string): string =>
  supportTitle('We have your support request', requestSubject);

export function SupportReceived({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
  signedOut = false,
}: SupportReceivedProps) {
  const title = titleOf(requestSubject);
  return (
    <EmailLayout preview="We have your message." heading={title} origin={origin}>
      <Paragraph>
        {`We will reply within 5 working days${signedOut ? ', to this address' : ''}.`}
      </Paragraph>
      {signedOut ? (
        <>
          <Paragraph>
            {`You have no account to sign in to, so the reply comes by email. If you need to add something, ${actionVerb(part)} to write to us again.`}
          </Paragraph>
          <Action href={url} label="Write to Us Again" part={part} />
        </>
      ) : (
        <>
          <Paragraph>
            {`You can follow it on your support page. To open the request, ${actionVerb(part)}.`}
          </Paragraph>
          <Action href={url} label="Open the Request" part={part} />
        </>
      )}
    </EmailLayout>
  );
}

/** The receipt for `to`, rendered to the html and plain text `send` takes. */
export const supportReceivedMessage = defineMessage<SupportReceivedProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportReceived,
);
