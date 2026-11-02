import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { pauseEnd } from './parts/pause-end';
import type { AccessPausedProps } from './types';

const SUBJECT = 'Your Access Was Paused';

const PREVIEW = 'An admin paused your access to Sorrel & Salt.';

// Sent when an admin pauses a user's site access. It states the end and the admin's note, and links to the support page, the one
// page a paused account can still reach after signing in.
export function AccessPaused({
  url,
  until,
  note,
  origin = new URL(url).origin,
  part,
}: AccessPausedProps) {
  return (
    <EmailLayout preview={PREVIEW} heading={SUBJECT} origin={origin}>
      <Paragraph>
        {`A site admin paused your access to Sorrel & Salt. ${pauseEnd(until)} You have been signed out everywhere.`}
      </Paragraph>
      <Paragraph>{`The admin's note: ${note}`}</Paragraph>
      <Paragraph>
        {`You can still sign in to reach the support page, where you can write to us about the pause. To open it, ${actionVerb(part)}.`}
      </Paragraph>
      <Action href={url} label="Open the Support Page" part={part} />
    </EmailLayout>
  );
}

/** The notice of a site access pause for `to`, rendered to the html and plain text `send` takes. */
export const accessPausedMessage = defineMessage<AccessPausedProps>(SUBJECT, AccessPaused);
