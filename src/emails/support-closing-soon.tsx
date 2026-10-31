import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { supportTitle } from './parts/support-title';
import type { SupportClosingSoonProps } from './types';

// Sent to a request's sender two days before a resolved request closes. It names the request and carries none of the thread.

const titleOf = (requestSubject: string): string =>
  supportTitle('Your support request closes soon', requestSubject);

export function SupportClosingSoon({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
  signedOut = false,
}: SupportClosingSoonProps) {
  const title = titleOf(requestSubject);
  return (
    <EmailLayout preview="Your support request closes soon." heading={title} origin={origin}>
      {signedOut ? (
        <>
          <Paragraph>
            {`${title}. It closes in 2 days. If you still need help, ${actionVerb(part)} to write to us again.`}
          </Paragraph>
          <Action href={url} label="Write to Us Again" part={part} />
        </>
      ) : (
        <>
          <Paragraph>
            {`${title}. It closes in 2 days, and a reply from you before then keeps it open. To open the request, ${actionVerb(part)}.`}
          </Paragraph>
          <Action href={url} label="Open the Request" part={part} />
        </>
      )}
    </EmailLayout>
  );
}

/** The closing-soon notice for `to`, rendered to the html and plain text `send` takes. */
export const supportClosingSoonMessage = defineMessage<SupportClosingSoonProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportClosingSoon,
);
