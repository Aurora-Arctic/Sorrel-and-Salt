'use client';

import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { longMinuteInZone } from '../../lib/utc';
import { stands } from './access-pause-parts';
import PausePanel from './pause-panel';
import type { AccessPauseEntry, PausePanelCopy } from './types';

// A keeper's pause on a user's access to the site: nothing but support until an end, or with no end date, until lifted,
// with a note saying why (claude-docs/components/user-detail.md, "Contracts"). Laid out on the support time-out panel's classes, so
// the two sections of the user modal read alike.

const PauseDocument = graphql(`
  mutation PauseUserAccess($userId: ID!, $until: DateTime, $note: String!, $message: String!) {
    pauseUserAccess(userId: $userId, until: $until, note: $note, message: $message) {
      id
    }
  }
`);

const LiftDocument = graphql(`
  mutation LiftUserAccessPause($userId: ID!) {
    liftUserAccessPause(userId: $userId) {
      id
    }
  }
`);

const copyFor = (name: string): PausePanelCopy => ({
  noteHint: 'Seen by staff only, up to 500 characters.',
  notePlaceholder: 'Why, for staff',
  messageLabel: 'Message to User',
  messagePlaceholder: 'For them',
  pauseQuestion: (end) =>
    end
      ? `They can reach only Support until ${longMinuteInZone(end)}, and are signed out now. You can lift it sooner.`
      : 'They can reach only Support until you lift the pause, and are signed out now.',
  liftQuestion: () => (
    <>
      <strong>{name}</strong> will reach the whole site again once you confirm.
    </>
  ),
  paused: 'Access paused.',
  lifted: 'Pause lifted.',
});

const AccessPausePanel = ({
  userId,
  name,
  pauses,
}: {
  userId: string;
  name: string;
  pauses: AccessPauseEntry[];
}): ReactElement => {
  // Read once when the panel mounts: a pause that runs out while it is open shows as past on
  // its next mount.
  const [now] = useState(() => Date.now());
  const standing = pauses.find((pause) => stands(pause, now));
  return (
    <PausePanel
      title="Site Access"
      name={name}
      standing={standing}
      earlier={pauses.filter((pause) => pause !== standing)}
      copy={copyFor(name)}
      noteRequired
      // Pause Access is held until the note has text, so the empty string is never sent.
      pause={(until, note, message) =>
        graphqlRequest(PauseDocument, {
          userId,
          until: until?.toISOString() ?? null,
          note: note ?? '',
          message: message ?? '',
        })
      }
      lift={() => graphqlRequest(LiftDocument, { userId })}
    />
  );
};

export default AccessPausePanel;
