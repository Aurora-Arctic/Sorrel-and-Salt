import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { pauseEnd } from './parts/pause-end';
import type { AccessPausedProps } from './types';

const SUBJECT = 'Your Access Was Paused';

const PREVIEW = 'An admin paused your access to Sorrel & Salt.';

// Sent when an admin pauses a user's site access. It states the end and the message written to the user when there is one, never the admin's note, and links to the support page, the one
// page a paused account can still reach after signing in.
export function AccessPaused({
  url,
  until,
  message,
  origin = new URL(url).origin,
  part,
}: AccessPausedProps) {
  return h(
    EmailLayout,
    { preview: PREVIEW, heading: SUBJECT, origin },
    h(
      Paragraph,
      null,
      `A site admin paused your access to Sorrel & Salt. ${pauseEnd(until)} You have been signed out everywhere.`,
    ),
    message ? h(Paragraph, null, message) : null,
    h(
      Paragraph,
      null,
      `You can still sign in to reach the support page, where you can write to us about the pause. To open it, ${actionVerb(part)}.`,
    ),
    h(Action, { href: url, label: 'Open the Support Page', part }),
  );
}

/** The notice of a site access pause for `to`, rendered to the html and plain text `send` takes. */
export const accessPausedMessage = defineMessage<AccessPausedProps>(SUBJECT, AccessPaused);
