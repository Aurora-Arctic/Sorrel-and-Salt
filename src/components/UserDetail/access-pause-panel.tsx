'use client';

import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { longMinuteInZone } from '../../lib/utc';
import { CollapsibleSection } from '../CollapsibleSection';
import DateField from '../DateField';
import { today } from '../DateField/day';
import { FieldShell, fieldDescription } from '../Field';
import LocalTime from '../LocalTime';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import { LocalDay } from '../SupportRequests/day-range';
import ConfirmedAction from '../UserList/confirmed-action';
import type { AccessPauseEntry } from './types';
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

type Span = 'day' | 'week' | 'month' | 'date' | 'none';

const SPANS: readonly { value: Span; label: string }[] = [
  { value: 'day', label: '1 Day' },
  { value: 'week', label: '1 Week' },
  { value: 'month', label: '1 Month' },
  { value: 'date', label: 'Until a Date' },
  { value: 'none', label: 'No End Date' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant a pause of this span ends: counted from `now`, the end of the picked day in the admin's own zone, or none. */
function endOf(span: Span, day: string, now: Date): Date | null | undefined {
  if (span === 'none') return null;
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

/** Whether a pause still stands: not lifted, and with no end or an end still ahead. */
const stands = (pause: AccessPauseEntry, now: number): boolean =>
  pause.liftedAt === null && (pause.until === null || pause.until.getTime() > now);

/** A pause's end as words: the end in the viewer's zone, or that it has none. */
const Until = ({ pause }: { pause: AccessPauseEntry }): ReactElement =>
  pause.until ? (
    <>
      until <LocalTime at={pause.until} long />
    </>
  ) : (
    <>with no end date</>
  );

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
        <Until pause={pause} />
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

/** Earlier pauses, each as when it was set, its end, who set it and, where lifted, who lifted it and when. */
const Ledger = ({ pauses }: { pauses: AccessPauseEntry[] }): ReactElement => (
  <div className="timeout-panel__ledger">
    <h4 className="timeout-panel__ledger-title">Earlier Pauses</h4>
    <ul className="timeout-panel__list" aria-label="Earlier Pauses">
      {pauses.map((pause) => (
        <li key={pause.id}>
          <span className="timeout-panel__ledger-line">
            <span className="timeout-panel__range">
              <LocalDay at={pause.createdAt} />{' '}
              {pause.until ? (
                <>
                  – <LocalDay at={pause.until} />
                </>
              ) : (
                '· No End Date'
              )}
            </span>
            {pause.liftedAt && (
              <span className="badge badge--muted">
                {'Lifted '}
                <LocalDay at={pause.liftedAt} year={false} />
              </span>
            )}
          </span>
          {pause.note && <span className="timeout-panel__muted">{pause.note}</span>}
          <span className="timeout-panel__muted">
            {pause.setBy ? `Set by ${pause.setBy.name}` : 'Set'}
            {pause.liftedAt && ` · Lifted by ${pause.liftedBy?.name ?? 'a removed account'}`}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

/** The form that sets a pause: how long, the note, and a confirm before it is sent. */
const PauseForm = ({ userId, name }: { userId: string; name: string }): ReactElement => {
  const { refresh } = usePendingNavigation();
  const [span, setSpan] = useState<Span>('day');
  const [day, setDay] = useState('');
  const [note, setNote] = useState('');
  const spanId = useId();
  const dayId = useId();
  const noteId = useId();
  const { aria: spanAria, ...spanField } = fieldDescription({ id: spanId });
  const { aria: dayAria, ...dayField } = fieldDescription({ id: dayId });
  const { aria: noteAria, ...noteField } = fieldDescription({ id: noteId, hint: NOTE_HINT });
  const discard = useDiscardGuard(span !== 'day' || day !== '' || note.trim() !== '');

  // The end is worked out when the question opens or the answer is sent, never kept in state.
  const end = endOf(span, day, new Date());
  const ready = end === null || (end?.getTime() ?? 0) > Date.now();

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
          maxLength={500}
          {...noteAria}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FieldShell>
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
                  · <Until pause={standing} />
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
