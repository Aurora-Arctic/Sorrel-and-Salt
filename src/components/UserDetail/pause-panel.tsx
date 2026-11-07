'use client';

import { type ReactElement, useState } from 'react';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { CollapsibleSection } from '../CollapsibleSection';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import { LocalDay } from '../SupportRequests/day-range';
import ConfirmedAction from '../UserList/confirmed-action';
import { Ledger, PauseFields, Until, endOf, pauseReady } from './access-pause-parts';
import type { PausePanelProps, PauseSpan, StandingPause } from './types';
import '../SupportRequests/timeout-panel.scss';

// A pause on someone's access, inside a modal: the one that stands with Lift Pause, or the form that sets one, and the
// earlier ones beneath. The user modal's Site Access and the member modal's Coven Access are both this, each with its
// own words and its own writes (claude-docs/components/user-detail.md, "Contracts").

const refusal = (error: unknown) => readGraphqlFailure(error).alert ?? GENERIC_FAILURE;

const StandingCard = ({
  pause,
  copy,
  lift,
  onChanged,
}: { pause: StandingPause } & Pick<PausePanelProps, 'copy' | 'lift' | 'onChanged'>) => {
  const { refresh } = usePendingNavigation();
  return (
    <div className="timeout-panel__card">
      <p className="timeout-panel__head">
        <span className="badge badge--caution">Paused</span>
        <span>
          <Until until={pause.until} />
        </span>
      </p>
      {pause.note && <p className="timeout-panel__muted">{pause.note}</p>}
      {/* Only once it is known: the member modal knows the end before it has read the rest. */}
      {pause.createdAt && (
        <p className="timeout-panel__muted">
          {pause.setBy ? `Set by ${pause.setBy.name}, ` : 'Set '}
          <LocalDay at={pause.createdAt} />
        </p>
      )}
      <ConfirmedAction
        label="Lift Pause"
        accessibleName="Lift Pause"
        confirmLabel="Lift"
        openClass="btn btn--quiet btn--small"
        title="Lift the Pause?"
        question={copy.liftQuestion(pause.until)}
        busy="Lifting"
        confirmClass="btn btn--destructive"
        announcement={copy.lifted}
        inModal
        refusal={refusal}
        send={lift}
        onSent={() => {
          onChanged?.();
          refresh();
        }}
      />
    </div>
  );
};

const PauseForm = ({
  name,
  copy,
  noteRequired = false,
  pause,
  onChanged,
}: Pick<
  PausePanelProps,
  'name' | 'copy' | 'noteRequired' | 'pause' | 'onChanged'
>): ReactElement => {
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
  const ready =
    pauseReady(span, day) && (!noteRequired || (note.trim() !== '' && message.trim() !== ''));

  return (
    <div className="form">
      <PauseFields
        span={span}
        onSpan={setSpan}
        day={day}
        onDay={setDay}
        note={note}
        onNote={setNote}
        noteRequired={noteRequired}
        noteHint={copy.noteHint}
        notePlaceholder={copy.notePlaceholder}
        message={message}
        onMessage={setMessage}
        messageLabel={copy.messageLabel}
        messagePlaceholder={copy.messagePlaceholder}
      />
      <div className="form__actions">
        <ConfirmedAction
          label="Pause Access"
          accessibleName="Pause Access"
          confirmLabel="Pause"
          openClass="btn btn--quiet"
          disabled={!ready}
          title={`Pause Access for ${name}?`}
          question={copy.pauseQuestion(end ?? null)}
          busy="Pausing"
          confirmClass="btn btn--destructive"
          announcement={copy.paused}
          inModal
          refusal={refusal}
          send={() => {
            const until = endOf(span, day, new Date());
            if (until === undefined) return Promise.reject(new Error('No end chosen'));
            return pause(until, note.trim() || undefined, message.trim() || null);
          }}
          onSent={() => {
            setSpan('day');
            setDay('');
            setNote('');
            setMessage('');
            onChanged?.();
            refresh();
          }}
        />
      </div>
      {discard.asking && <DiscardQuestion guard={discard} />}
    </div>
  );
};

const PausePanel = ({
  title,
  name,
  standing,
  earlier,
  copy,
  noteRequired,
  pause,
  lift,
  onChanged,
}: PausePanelProps): ReactElement => {
  const [folded, setFolded] = useState(false);

  return (
    <div className="timeout-panel">
      <CollapsibleSection
        title={title}
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
          <StandingCard pause={standing} copy={copy} lift={lift} onChanged={onChanged} />
        ) : (
          <PauseForm
            name={name}
            copy={copy}
            noteRequired={noteRequired}
            pause={pause}
            onChanged={onChanged}
          />
        )}
        {earlier.length > 0 && <Ledger pauses={earlier} />}
      </CollapsibleSection>
    </div>
  );
};

export default PausePanel;
