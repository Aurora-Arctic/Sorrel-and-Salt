import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { pauseEnd } from './parts/pause-end';
import type { AccessPausedProps } from './types';

const SUBJECT = 'Your Access Was Paused';

const PREVIEW = 'An admin paused your access to Sorrel & Salt.';

// Never the keeper's note. Links to the support page, the one page a paused account can still reach.
function AccessPaused({
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
      `A site keeper paused your access to Sorrel & Salt. ${pauseEnd(until)} You have been signed out everywhere.`,
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

export const accessPausedMessage = defineMessage<AccessPausedProps>(SUBJECT, AccessPaused);
