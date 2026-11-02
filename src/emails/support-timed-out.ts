import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, defineMessage } from './parts/layout';
import { pauseEnd } from './parts/pause-end';
import type { SupportTimedOutProps } from './types';

const SUBJECT = 'You Were Timed Out of Support';

const PREVIEW = 'An admin timed your account out of sending support requests.';

// Sent when an admin sets a support time-out. It states the end, the message written to the user when there is one, and what the
// time-out stops, and never the admin's note. It links to the support page, where the user's past requests and the time-out notice stay readable.
export function SupportTimedOut({
  url,
  until,
  message,
  origin = new URL(url).origin,
  part,
}: SupportTimedOutProps) {
  return h(
    EmailLayout,
    { preview: PREVIEW, heading: SUBJECT, origin },
    h(
      Paragraph,
      null,
      `A site admin set a support time-out on your Sorrel & Salt account. ${pauseEnd(until)}`,
    ),
    message ? h(Paragraph, null, message) : null,
    h(
      Paragraph,
      null,
      'Until it ends, no support request can be sent from your account. Your earlier requests and their replies stay on your support page.',
    ),
    h(Action, { href: url, label: 'Open Your Support Page', part }),
  );
}

/** The notice of a support time-out for `to`, rendered to the html and plain text `send` takes. */
export const supportTimedOutMessage = defineMessage<SupportTimedOutProps>(SUBJECT, SupportTimedOut);
