'use client';

import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { longMinuteInZone } from '../../lib/utc';
import BusyButton from '../BusyButton';
import { CollapsibleSection } from '../CollapsibleSection';
import DateField from '../DateField';
import { today } from '../DateField/day';
import { FieldShell, fieldDescription } from '../Field';
import LocalTime from '../LocalTime';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import ConfirmedAction from '../UserList/confirmed-action';
import { DayRange, LocalDay } from './day-range';
import type { SupportTimeoutEntry } from './types';
import { useSupportAction } from './use-support-action';

// An admin's time-out of a sender: barred from the support form until an end, or until lifted. One panel
// serves the request dialog and the user modal, keyed by the user, so a repeat sender is seen as one.

const TimeOutDocument = graphql(`
  mutation TimeOutSupportSender($userId: ID!, $until: DateTime!, $note: String) {
    timeOutSupportSender(userId: $userId, until: $until, note: $note) {
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

const NOTE_HINT = 'Seen by staff only.';

type Span = 'day' | 'week' | 'month' | 'date';

const SPANS: readonly { value: Span; label: string }[] = [
  { value: 'day', label: '1 Day' },
  { value: 'week', label: '1 Week' },
  { value: 'month', label: '1 Month' },
  { value: 'date', label: 'Until a Date' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant a time-out of this span ends: counted from `now`, or the end of the picked day in the admin's own zone. */
function endOf(span: Span, day: string, now: Date): Date | undefined {
  if (span === 'day') return new Date(now.getTime() + DAY_MS);
  if (span === 'week') return new Date(now.getTime() + 7 * DAY_MS);
  if (span === 'month') {
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return end;
  }
  if (!day) return undefined;
  const end = new Date(`${day}T23:59:59.999`);
  return Number.isNaN(end.getTime()) ? undefined : end;
}

/** Whether a time-out still bars the sender. */
const isActive = (timeout: SupportTimeoutEntry, now: number): boolean =>
  timeout.liftedAt === null && timeout.until.getTime() > now;

const LiftButton = ({ timeout }: { timeout: SupportTimeoutEntry }): ReactElement => {
  const { busy, failure, run } = useSupportAction();
  return (
    <>
      <BusyButton
        className="btn btn--quiet btn--small"
        busy={busy}
        busyLabel="Lifting"
        onClick={() =>
          void run(() => graphqlRequest(LiftDocument, { id: timeout.id }), 'Time-out lifted.')
        }
      >
        Lift
      </BusyButton>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
    </>
  );
};

/** The time-out that stands: a badge, its end, the note, who set it and when, and Lift. */
const StandingCard = ({ timeout }: { timeout: SupportTimeoutEntry }): ReactElement => (
  <div className="support-detail__timeout">
    <p className="support-detail__timeout-head">
      <span className="badge badge--caution">Timed Out</span>
      <span>
        until <LocalTime at={timeout.until} long />
      </span>
    </p>
    {timeout.note && <p className="support-detail__muted">{timeout.note}</p>}
    <p className="support-detail__muted">
      {timeout.setBy ? `Set by ${timeout.setBy.name}, ` : 'Set '}
      <LocalDay at={timeout.createdAt} />
    </p>
    <LiftButton timeout={timeout} />
  </div>
);

/** Earlier time-outs, each as its dates, a Lifted tag where lifted, and its note beneath. */
const Ledger = ({ timeouts }: { timeouts: SupportTimeoutEntry[] }): ReactElement => (
  <div className="support-detail__ledger">
    <h4 className="support-detail__ledger-title">Earlier</h4>
    <ul className="support-detail__list">
      {timeouts.map((timeout) => (
        <li key={timeout.id}>
          <span className="support-detail__ledger-line">
            <DayRange from={timeout.createdAt} to={timeout.until} />
            {timeout.liftedAt && (
              <span className="support-detail__muted">
                Lifted <LocalDay at={timeout.liftedAt} />
              </span>
            )}
          </span>
          {timeout.note && <span className="support-detail__muted">{timeout.note}</span>}
        </li>
      ))}
    </ul>
  </div>
);

/** The form that sets a time-out: how long, the note, and a confirm before it is sent. */
const TimeoutForm = ({ userId, name }: { userId: string; name: string }): ReactElement => {
  const { refresh } = usePendingNavigation();
  const [span, setSpan] = useState<Span>('day');
  const [day, setDay] = useState('');
  const [note, setNote] = useState('');
  const spanId = useId();
  const dayId = useId();
  const noteId = useId();
  const { aria: spanAria, ...spanField } = fieldDescription({ id: spanId });
  const { aria: dayAria, ...dayField } = fieldDescription({ id: dayId });
  const { aria: noteAria, ...noteField } = fieldDescription({
    id: noteId,
    hint: NOTE_HINT,
  });
  const discard = useDiscardGuard(span !== 'day' || day !== '' || note.trim() !== '');

  // The end is worked out when the question opens or the answer is sent, never during render.
  const endNow = (): Date | undefined => endOf(span, day, new Date());
  const ready = span !== 'date' || (endNow()?.getTime() ?? 0) > Date.now();
  const end = endNow();

  return (
    <div className="form">
      <FieldShell label="For" {...spanField}>
        <select
          id={spanField.controlId}
          className="select"
          {...spanAria}
          value={span}
          onChange={(event) => setSpan(event.target.value as Span)}
        >
          {SPANS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldShell>
      {span === 'date' && (
        <FieldShell label="Until" {...dayField}>
          <DateField
            id={dayField.controlId}
            labelledBy={dayField.labelId}
            value={day}
            min={today()}
            onChange={setDay}
            {...dayAria}
          />
        </FieldShell>
      )}
      <FieldShell label="Note" hint={NOTE_HINT} {...noteField}>
        <input
          id={noteField.controlId}
          className="input"
          type="text"
          autoComplete="off"
          placeholder="Why, for staff"
          {...noteAria}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FieldShell>
      <div className="form__actions">
        <ConfirmedAction
          label="Time Out Sender"
          accessibleName="Time Out Sender"
          confirmLabel="Time Out"
          openClass="btn btn--quiet"
          disabled={!ready}
          title="Time Out Sender"
          question={
            <>
              Time Out <strong>{name}</strong>? They cannot send a support request until{' '}
              {end ? longMinuteInZone(end) : 'then'}. You can lift it sooner.
            </>
          }
          busy="Timing Out"
          confirmClass="btn btn--destructive"
          announcement="Sender timed out."
          inModal
          send={() => {
            const until = endOf(span, day, new Date());
            if (!until) return Promise.reject(new Error('No end chosen'));
            return graphqlRequest(TimeOutDocument, {
              userId,
              until: until.toISOString(),
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
 * A user's time-outs: the one that stands, or the form to set one, and the earlier ones beneath.
 * `timeouts` is newest first.
 */
const TimeoutPanel = ({
  userId,
  name,
  timeouts,
}: {
  userId: string;
  name: string;
  timeouts: SupportTimeoutEntry[];
}): ReactElement => {
  // Read once per render of the panel: a time-out that lapses while it is open shows as past on the next.
  const [now] = useState(() => Date.now());
  const [folded, setFolded] = useState(false);
  const standing = timeouts.find((timeout) => isActive(timeout, now));
  const earlier = timeouts.filter((timeout) => timeout !== standing);

  return (
    <CollapsibleSection
      title="Time-Out"
      summary={
        <span className="support-detail__muted">
          {standing ? (
            <>
              · until <LocalTime at={standing.until} long />
            </>
          ) : (
            '· none'
          )}
        </span>
      }
      fold={{ open: folded, invalid: false, onToggle: () => setFolded((value) => !value) }}
    >
      {standing ? <StandingCard timeout={standing} /> : <TimeoutForm userId={userId} name={name} />}
      {earlier.length > 0 && <Ledger timeouts={earlier} />}
    </CollapsibleSection>
  );
};

export default TimeoutPanel;
