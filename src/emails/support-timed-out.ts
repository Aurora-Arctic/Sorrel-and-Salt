import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, defineMessage } from './parts/layout';
import { pauseEnd } from './parts/pause-end';
import type { SupportTimedOutProps } from './types';

const SUBJECT = 'You Were Timed Out of Support';

const PREVIEW = 'An admin timed your account out of sending support requests.';

// Never the keeper's note.
function SupportTimedOut({
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
      `A site keeper set a support time-out on your Sorrel & Salt account. ${pauseEnd(until)}`,
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

export const supportTimedOutMessage = defineMessage<SupportTimedOutProps>(SUBJECT, SupportTimedOut);
