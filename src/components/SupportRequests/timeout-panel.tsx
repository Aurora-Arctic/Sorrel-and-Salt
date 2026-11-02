'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { longMinuteInZone } from '../../lib/utc';
import { CollapsibleSection } from '../CollapsibleSection';
import IconTip from '../IconTip';
import { HistoryIcon } from '../IconTip/icons';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import ConfirmedAction from '../UserList/confirmed-action';
import {
  Ledger,
  PauseFields,
  Until,
  endOf,
  pauseReady,
  stands,
} from '../UserDetail/access-pause-parts';
import type { PauseSpan } from '../UserDetail/types';
import { LocalDay } from './day-range';
import type { SupportTimeoutEntry } from './types';
import './timeout-panel.scss';

// An admin's time-out of a sender: barred from the support form until an end, or with no end date until lifted. One panel
// serves the request dialog and the user modal, keyed by the user, so a repeat sender is seen as one.

const TimeOutDocument = graphql(`
  mutation TimeOutSupportSender($userId: ID!, $until: DateTime, $note: String!, $message: String) {
    timeOutSupportSender(userId: $userId, until: $until, note: $note, message: $message) {
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

const NOTE_HINT = 'Seen by staff only, up to 500 characters.';

const LiftButton = ({
  timeout,
  name,
}: {
  timeout: SupportTimeoutEntry;
  name: string;
}): ReactElement => (
  <ConfirmedAction
    label="Lift"
    accessibleName="Lift"
    confirmLabel="Lift Time-Out"
    openClass="btn btn--quiet btn--small"
    title="Lift the Time-Out?"
    question={
      <>
        <strong>{name}</strong> will be able to send support requests again once you confirm.
      </>
    }
    busy="Lifting"
    confirmClass="btn btn--destructive"
    announcement="Time-out lifted."
    inModal
    send={() => graphqlRequest(LiftDocument, { id: timeout.id })}
  />
);

/** The time-out that stands: a badge, its end, the note, who set it and when, and Lift. */
const StandingCard = ({
  timeout,
  name,
}: {
  timeout: SupportTimeoutEntry;
  name: string;
}): ReactElement => (
  <div className="timeout-panel__card">
    <p className="timeout-panel__head">
      <span className="badge badge--caution">Timed Out</span>
      <span>
        <Until until={timeout.until} />
      </span>
    </p>
    <p className="timeout-panel__muted">{timeout.note}</p>
    <p className="timeout-panel__muted">
      {timeout.setBy ? `Set by ${timeout.setBy.name}, ` : 'Set '}
      <LocalDay at={timeout.createdAt} />
    </p>
    <LiftButton timeout={timeout} name={name} />
  </div>
);

/** The form that sets a time-out: how long, the note, and a confirm before it is sent. */
const TimeoutForm = ({ userId, name }: { userId: string; name: string }): ReactElement => {
  const { refresh } = usePendingNavigation();
  const [span, setSpan] = useState<PauseSpan>('day');
  const [day, setDay] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const discard = useDiscardGuard(
    span !== 'day' || day !== '' || note.trim() !== '' || message.trim() !== '',
  );

  // The end is worked out when the question opens or the answer is sent, never kept in state.
  const end = endOf(span, day, new Date());
  const ready = pauseReady(span, day) && note.trim() !== '';

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
        notePlaceholder="Why"
        noteRequired
        message={message}
        onMessage={setMessage}
        messageLabel="Message to User"
        messagePlaceholder="For them"
      />
      <div className="form__actions">
        <ConfirmedAction
          label="Time Out Sender"
          accessibleName="Time Out Sender"
          confirmLabel="Time Out"
          openClass="btn btn--quiet"
          disabled={!ready}
          title={`Time Out ${name}?`}
          question={
            end
              ? `They cannot send a support request until ${longMinuteInZone(end)}. You can lift it sooner.`
              : 'They cannot send a support request until you lift the time-out.'
          }
          busy="Timing Out"
          confirmClass="btn btn--destructive"
          announcement="Sender timed out."
          inModal
          send={() => {
            const until = endOf(span, day, new Date());
            if (until === undefined) return Promise.reject(new Error('No end chosen'));
            return graphqlRequest(TimeOutDocument, {
              userId,
              until: until?.toISOString() ?? null,
              note: note.trim(),
              message: message.trim() || null,
            });
          }}
          onSent={() => {
            setSpan('day');
            setDay('');
            setNote('');
            setMessage('');
            refresh();
          }}
        />
      </div>
      {discard.asking && <DiscardQuestion guard={discard} />}
    </div>
  );
};

/**
 * A user's time-outs: the one that stands, or the form to set one, and the earlier ones beneath, or
 * with `earlierHref` a history icon by the heading linking to where they are listed.
 * `timeouts` is newest first.
 */
const TimeoutPanel = ({
  userId,
  name,
  timeouts,
  earlierHref,
}: {
  userId: string;
  name: string;
  timeouts: SupportTimeoutEntry[];
  earlierHref?: Route;
}): ReactElement => {
  // Read once per render of the panel: a time-out that lapses while it is open shows as past on the next.
  const [now] = useState(() => Date.now());
  const [folded, setFolded] = useState(false);
  const standing = timeouts.find((timeout) => stands(timeout, now));
  const earlier = timeouts.filter((timeout) => timeout !== standing);

  return (
    <div className="timeout-panel">
      <CollapsibleSection
        title="Time-Out"
        summary={
          <span className="timeout-panel__summary">
            {standing && <span className="badge badge--caution">Timed Out</span>}
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
        info={
          earlier.length > 0 && earlierHref ? (
            <IconTip tip="Earlier Time-Outs">
              <Link className="timeout-panel__icon" href={earlierHref}>
                <HistoryIcon />
                <span className="visually-hidden">Earlier Time-Outs</span>
              </Link>
            </IconTip>
          ) : undefined
        }
        fold={{ open: folded, invalid: false, onToggle: () => setFolded((value) => !value) }}
      >
        {standing ? (
          <StandingCard timeout={standing} name={name} />
        ) : (
          <TimeoutForm userId={userId} name={name} />
        )}
        {earlier.length > 0 && !earlierHref && (
          <Ledger pauses={earlier} title="Earlier Time-Outs" />
        )}
      </CollapsibleSection>
    </div>
  );
};

export default TimeoutPanel;
