import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { supportTitle } from './parts/support-title';
import type { SupportResolvedProps } from './types';

// Sent to a request's sender when staff resolve it. It names the request and says how to reopen it; it carries none of the thread.

const titleOf = (requestSubject: string): string =>
  supportTitle('Your support request is resolved', requestSubject);

export function SupportResolved({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
  signedOut = false,
}: SupportResolvedProps) {
  const title = titleOf(requestSubject);
  return (
    <EmailLayout preview="Your support request is resolved." heading={title} origin={origin}>
      {signedOut ? (
        <>
          <Paragraph>{`${title}. If you still need help, ${actionVerb(part)} to write to us again.`}</Paragraph>
          <Action href={url} label="Write to Us Again" part={part} />
        </>
      ) : (
        <>
          <Paragraph>
            {`${title}. A reply from you reopens it, and it closes by itself after seven days without one. To open the request, ${actionVerb(part)}.`}
          </Paragraph>
          <Action href={url} label="Open the Request" part={part} />
        </>
      )}
    </EmailLayout>
  );
}

/** The resolved notice for `to`, rendered to the html and plain text `send` takes. */
export const supportResolvedMessage = defineMessage<SupportResolvedProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportResolved,
);
