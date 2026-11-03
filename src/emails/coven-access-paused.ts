import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, defineMessage } from './parts/layout';
import { pauseEnd } from './parts/pause-end';
import type { CovenAccessPausedProps } from './types';

const subjectOf = ({ covenName }: { covenName: string }): string =>
  `Your Access to ${covenName} Was Paused`;

// Sent when a coven steward pauses a member. It names the coven, states the end and the message to the member when one was written, never the steward's note, and links
// to the support page. The member keeps their seat; the pause only stops them reaching the coven.
export function CovenAccessPaused({
  url,
  covenName,
  until,
  message,
  origin = new URL(url).origin,
  part,
}: CovenAccessPausedProps) {
  return h(
    EmailLayout,
    {
      preview: `A steward paused your access to ${covenName}.`,
      heading: subjectOf({ covenName }),
      origin,
    },
    h(
      Paragraph,
      null,
      `A steward of the coven ${covenName} paused your access to it. ${pauseEnd(until)} You keep your seat in the coven, and the rest of Sorrel & Salt works as before.`,
    ),
    message ? h(Paragraph, null, message) : null,
    h(Action, { href: url, label: 'Open the Support Page', part }),
  );
}

/** The notice of a coven access pause for `to`, rendered to the html and plain text `send` takes. */
export const covenAccessPausedMessage = defineMessage<CovenAccessPausedProps>(
  subjectOf,
  CovenAccessPaused,
);
