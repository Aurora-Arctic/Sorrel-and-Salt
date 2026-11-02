'use client';

import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { longMinuteInZone } from '../../lib/utc';
import { CollapsibleSection } from '../CollapsibleSection';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import { LocalDay } from '../SupportRequests/day-range';
import ConfirmedAction from '../UserList/confirmed-action';
import { Ledger, PauseFields, Until, endOf, pauseReady, stands } from './access-pause-parts';
import type { AccessPauseEntry, PauseSpan } from './types';
import '../SupportRequests/timeout-panel.scss';

// An admin's pause on a user's access to the site: no sign-in by any method until an end, or with no end date, until
// lifted (claude-docs/components/user-detail.md, "Site Access"). Laid out on the support time-out panel's classes, so
// the two sections of the user modal read alike.

const PauseDocument = graphql(`
  mutation PauseUserAccess($userId: ID!, $until: DateTime, $note: String) {
    pauseUserAccess(userId: $userId, until: $until, note: $note) {
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

const NOTE_HINT = 'Seen by staff only, up to 500 characters.';

/** The pause that stands: a badge, its end, the note, who set it and when, and Lift Pause. */
const StandingCard = ({
  pause,
  userId,
  name,
}: {
  pause: AccessPauseEntry;
  userId: string;
  name: string;
}): ReactElement => (
  <div className="timeout-panel__card">
    <p className="timeout-panel__head">
      <span className="badge badge--caution">Paused</span>
      <span>
        <Until until={pause.until} />
      </span>
    </p>
    {pause.note && <p className="timeout-panel__muted">{pause.note}</p>}
    <p className="timeout-panel__muted">
      {pause.setBy ? `Set by ${pause.setBy.name}, ` : 'Set '}
      <LocalDay at={pause.createdAt} />
    </p>
    <ConfirmedAction
      label="Lift Pause"
      accessibleName="Lift Pause"
      confirmLabel="Lift"
      openClass="btn btn--quiet btn--small"
      title="Lift the Pause?"
      question={
        <>
          <strong>{name}</strong> will be able to sign in again once you confirm.
        </>
      }
      busy="Lifting"
      confirmClass="btn btn--destructive"
      announcement="Pause lifted."
      inModal
      send={() => graphqlRequest(LiftDocument, { userId })}
    />
  </div>
);

/** The form that sets a pause: how long, the note, and a confirm before it is sent. */
const PauseForm = ({ userId, name }: { userId: string; name: string }): ReactElement => {
  const { refresh } = usePendingNavigation();
  const [span, setSpan] = useState<PauseSpan>('day');
  const [day, setDay] = useState('');
  const [note, setNote] = useState('');
  const discard = useDiscardGuard(span !== 'day' || day !== '' || note.trim() !== '');

  // The end is worked out when the question opens or the answer is sent, never kept in state.
  const end = endOf(span, day, new Date());
  const ready = pauseReady(span, day);

  return (
    <div className="form">
      <PauseFields
        span={span}
        onSpan={setSpan}
        day={day}
        onDay={setDay}
        note={note}
        onNote={setNote}
        noteHint={NOTE_HINT}
        notePlaceholder="Why, for staff"
      />
      <div className="form__actions">
        <ConfirmedAction
          label="Pause Access"
          accessibleName="Pause Access"
          confirmLabel="Pause"
          openClass="btn btn--quiet"
          disabled={!ready}
          title={`Pause Access for ${name}?`}
          question={
            end
              ? `They cannot sign in until ${longMinuteInZone(end)}, and are signed out now. You can lift it sooner.`
              : 'They cannot sign in until you lift the pause, and are signed out now.'
          }
          busy="Pausing"
          confirmClass="btn btn--destructive"
          announcement="Access paused."
          inModal
          send={() => {
            const until = endOf(span, day, new Date());
            if (until === undefined) return Promise.reject(new Error('No end chosen'));
            return graphqlRequest(PauseDocument, {
              userId,
              until: until?.toISOString() ?? null,
              note: note.trim() || undefined,
            });
          }}
          onSent={() => {
            setSpan('day');
            setDay('');
            setNote('');
            refresh();
          }}
        />
      </div>
      {discard.asking && <DiscardQuestion guard={discard} />}
    </div>
  );
};

/**
 * A user's access pauses: the one that stands, or the form to set one, and the earlier ones beneath. `pauses` is newest
 * first.
 */
const AccessPausePanel = ({
  userId,
  name,
  pauses,
}: {
  userId: string;
  name: string;
  pauses: AccessPauseEntry[];
}): ReactElement => {
  // Read once per render of the panel: a pause that runs out while it is open shows as past on the next.
  const [now] = useState(() => Date.now());
  const [folded, setFolded] = useState(false);
  const standing = pauses.find((pause) => stands(pause, now));
  const earlier = pauses.filter((pause) => pause !== standing);

  return (
    <div className="timeout-panel">
      <CollapsibleSection
        title="Site Access"
        summary={
          <span className="timeout-panel__summary">
            {standing && <span className="badge badge--caution">Paused</span>}
            <span className="timeout-panel__muted">
              {standing ? (
                <>
                  · <Until until={standing.until} />
                </>
              ) : (
                '· none'
              )}
            </span>
          </span>
        }
        fold={{ open: folded, invalid: false, onToggle: () => setFolded((value) => !value) }}
      >
        {standing ? (
          <StandingCard pause={standing} userId={userId} name={name} />
        ) : (
          <PauseForm userId={userId} name={name} />
        )}
        {earlier.length > 0 && <Ledger pauses={earlier} />}
      </CollapsibleSection>
    </div>
  );
};

export default AccessPausePanel;
