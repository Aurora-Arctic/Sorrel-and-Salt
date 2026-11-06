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
import type { SupportClosingSoonProps } from './types';

// Sent to a request's sender before a resolved request closes, on its fifth day or as soon after as the job runs. It names the
// request, says how long is left and carries none of the thread.

const HOUR_MS = 60 * 60 * 1000;

/** How long is left, in words: hours under a day, whole days from one up, each to the nearest. */
export function timeLeft(ms: number): string {
  const hours = Math.round(ms / HOUR_MS);
  if (hours < 1) return 'less than an hour';
  if (hours < 24) return hours === 1 ? '1 hour' : `${hours} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

const titleOf = (requestSubject: string): string =>
  supportTitle('Your support request closes soon', requestSubject);

export function SupportClosingSoon({
  url,
  origin = new URL(url).origin,
  part,
  requestSubject,
  signedOut = false,
  viewLink = false,
  timeLeftMs,
}: SupportClosingSoonProps) {
  const title = titleOf(requestSubject);
  const left = timeLeft(timeLeftMs);
  return h(
    EmailLayout,
    { preview: 'Your support request closes soon.', heading: title, origin },
    signedOut && viewLink
      ? h(
          Fragment,
          null,
          h(
            Paragraph,
            null,
            `Your request closes in ${left}. A reply from you before then keeps it open. To reply, ${actionVerb(part)}.`,
          ),
          h(Action, { href: url, label: 'Open Your Request', part }),
          h(LinkOnlyNote),
        )
      : signedOut
        ? h(
            Fragment,
            null,
            h(
              Paragraph,
              null,
              `It closes in ${left}. If you still need help, ${actionVerb(part)} to write to us again.`,
            ),
            h(Action, { href: url, label: 'Write to Us Again', part }),
          )
        : h(
            Fragment,
            null,
            h(
              Paragraph,
              null,
              `It closes in ${left}, and a reply from you before then keeps it open. To open the request, ${actionVerb(part)}.`,
            ),
            h(Action, { href: url, label: 'Open the Request', part }),
          ),
  );
}

/** The closing-soon notice for `to`, rendered to the html and plain text `send` takes. */
export const supportClosingSoonMessage = defineMessage<SupportClosingSoonProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportClosingSoon,
);
