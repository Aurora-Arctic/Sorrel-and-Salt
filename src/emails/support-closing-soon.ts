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
import { plural } from '@/lib/text';

// Names the request and carries none of the thread.

const HOUR_MS = 60 * 60 * 1000;

export function timeLeft(ms: number): string {
  const hours = Math.round(ms / HOUR_MS);
  if (hours < 1) return 'less than an hour';
  if (hours < 24) return `${hours} ${plural(hours, 'hour', 'hours')}`;
  const days = Math.round(hours / 24);
  return `${days} ${plural(days, 'day', 'days')}`;
}

const titleOf = (requestSubject: string): string =>
  supportTitle('Your support request closes soon', requestSubject);

function SupportClosingSoon({
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
          h(Action, { href: url, label: 'Open Your Support Request', part }),
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

export const supportClosingSoonMessage = defineMessage<SupportClosingSoonProps>(
  ({ requestSubject }) => titleOf(requestSubject),
  SupportClosingSoon,
);
