import { Action, EmailLayout, Paragraph, defineMessage } from './parts/layout';
import { pauseEnd } from './parts/pause-end';
import type { CovenAccessPausedProps } from './types';

const subjectOf = ({ covenName }: { covenName: string }): string =>
  `Your Access to ${covenName} Was Paused`;

// Sent when a coven owner pauses a member. It names the coven, states the end and the owner's note when they wrote one, and links
// to the support page. The member keeps their seat; the pause only stops them reaching the coven.
export function CovenAccessPaused({
  url,
  covenName,
  until,
  note,
  origin = new URL(url).origin,
  part,
}: CovenAccessPausedProps) {
  return (
    <EmailLayout
      preview={`An owner paused your access to ${covenName}.`}
      heading={subjectOf({ covenName })}
      origin={origin}
    >
      <Paragraph>
        {`An owner of the coven ${covenName} paused your access to it. ${pauseEnd(until)} You keep your seat in the coven, and the rest of Sorrel & Salt works as before.`}
      </Paragraph>
      {note ? <Paragraph>{`The owner's note: ${note}`}</Paragraph> : null}
      <Action href={url} label="Open the Support Page" part={part} />
    </EmailLayout>
  );
}

/** The notice of a coven access pause for `to`, rendered to the html and plain text `send` takes. */
export const covenAccessPausedMessage = defineMessage<CovenAccessPausedProps>(
  subjectOf,
  CovenAccessPaused,
);
