import { Fragment, createElement as h } from 'react';
import {
  Action,
  EmailLayout,
  LinkOnlyNote,
  Paragraph,
  actionVerb,
  defineMessage,
} from './parts/layout';
import { supportTitle } from './parts/support-title';
import type { SupportResolvedProps } from './types';

// Names the request and carries none of the thread.

const titleOf = (requestSubject: string): string =>
  supportTitle('Your support request is resolved', requestSubject);

export function SupportResolved({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
  signedOut = false,
  viewLink = false,
}: SupportResolvedProps) {
  const title = titleOf(requestSubject);
  return h(
    EmailLayout,
    { preview: 'Your support request is resolved.', heading: title, origin },
    signedOut && viewLink
      ? h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            `We have marked your request as resolved. A reply from you reopens it, and it closes by itself after seven days without one. To read it or reply, ${actionVerb(part)}.`,
          ),
          h(Action, { href: url, label: 'Open Your Support Request', part }),
          h(LinkOnlyNote),
        )
      : signedOut
        ? h(
            Fragment,
            null,
            h(Paragraph, null, `If you still need help, ${actionVerb(part)} to write to us again.`),
            h(Action, { href: url, label: 'Write to Us Again', part }),
          )
        : h(
            Fragment,
            null,
            h(
              Paragraph,
              null,
              `A reply from you reopens it, and it closes by itself after seven days without one. To open the request, ${actionVerb(part)}.`,
            ),
            h(Action, { href: url, label: 'Open the Request', part }),
          ),
  );
}

export const supportResolvedMessage = defineMessage<SupportResolvedProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportResolved,
);
