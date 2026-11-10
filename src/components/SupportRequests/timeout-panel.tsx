'use client';

import type { Route } from 'next';
import { type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { longMinuteInZone } from '../../lib/utc';
import { stands } from '../UserDetail/access-pause-parts';
import PausePanel from '../UserDetail/pause-panel';
import type { PausePanelCopy } from '../UserDetail/types';
import type { SupportTimeoutEntry } from './types';

// A keeper's time-out of a sender: barred from the support form until an end, or with no end date until lifted. One panel
// serves the request dialog and the user modal, keyed by the user, so a repeat sender is seen as one.

const TimeOutDocument = graphql(`
  mutation TimeOutSupportSender($userId: ID!, $until: DateTime, $note: String!, $message: String!) {
    timeOutSupportSender(userId: $userId, until: $until, note: $note, message: $message) {
      id
    }
  }
`);

const TimeOutSignedOutDocument = graphql(`
  mutation TimeOutSignedOutSender(
    $requestId: ID!
    $until: DateTime
    $note: String!
    $message: String!
  ) {
    timeOutSignedOutSender(requestId: $requestId, until: $until, note: $note, message: $message) {
      id
    }
  }
`);

const LiftDocument = graphql(`
  mutation LiftSupportTimeout($id: ID!) {
    liftSupportTimeout(id: $id) {
      id
    }
  }
`);

const copyFor = (name: string): PausePanelCopy => ({
  noteHint: 'Seen by staff only.',
  notePlaceholder: 'Why',
  messageLabel: 'Message to User',
  messagePlaceholder: 'For them',
  pauseQuestion: (end) =>
    end
      ? `They cannot send a support request until ${longMinuteInZone(end)}. You can lift it sooner.`
      : 'They cannot send a support request until you lift the time-out.',
  liftQuestion: () => (
    <>
      <strong>{name}</strong> will be able to send support requests again once you confirm.
    </>
  ),
  paused: 'Sender timed out.',
  lifted: 'Time-out lifted.',
  badge: 'Timed Out',
  pauseLabel: 'Time Out Sender',
  pauseConfirm: 'Time Out',
  pauseTitle: (who) => `Time Out ${who}?`,
  pauseBusy: 'Timing Out',
  liftLabel: 'Lift',
  liftConfirm: 'Lift Time-Out',
  liftTitle: 'Lift the Time-Out?',
  earlierTitle: 'Earlier Time-Outs',
});

type TimeoutTarget = { userId: string } | { requestId: string };

const TimeoutPanel = ({
  target,
  name,
  timeouts,
  earlierHref,
}: {
  target: TimeoutTarget;
  name: string;
  timeouts: SupportTimeoutEntry[];
  earlierHref?: Route;
}): ReactElement => {
  // Read once per render of the panel: a time-out that lapses while it is open shows as past
  // on the next.
  const [now] = useState(() => Date.now());
  const standing = timeouts.find((timeout) => stands(timeout, now));
  const earlier = timeouts.filter((timeout) => timeout !== standing);

  return (
    <PausePanel
      title="Time-Out"
      name={name}
      standing={standing}
      earlier={earlier}
      copy={copyFor(name)}
      noteRequired
      earlierHref={earlierHref}
      pause={(until, note, message) => {
        const fields = {
          until: until?.toISOString() ?? null,
          note: note ?? '',
          message: message ?? '',
        };
        return 'requestId' in target
          ? graphqlRequest(TimeOutSignedOutDocument, { requestId: target.requestId, ...fields })
          : graphqlRequest(TimeOutDocument, { userId: target.userId, ...fields });
      }}
      lift={() =>
        standing ? graphqlRequest(LiftDocument, { id: standing.id }) : Promise.resolve()
      }
    />
  );
};

export default TimeoutPanel;
