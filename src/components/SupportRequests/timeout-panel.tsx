'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import type { SupportRequestDetailEntry, SupportTimeoutEntry } from './types';
import { useSupportAction } from './use-support-action';

// An admin's time-out of the sender: barred from the support form until a given end, or until lifted.
// The sender's earlier time-outs are listed beside, so a repeat sender is seen as one.

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
        onClick={() => void run(() => graphqlRequest(LiftDocument, { id: timeout.id }))}
      >
        Lift
      </BusyButton>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
    </>
  );
};

const TimeoutPanel = ({ request }: { request: SupportRequestDetailEntry }): ReactElement | null => {
  const [until, setUntil] = useState('');
  const [note, setNote] = useState('');
  // Read once per render of the panel: a time-out that lapses while it is open shows as past on the next.
  const [now] = useState(() => Date.now());
  const { busy, failure, run } = useSupportAction('until');
  const untilId = useId();
  const noteId = useId();
  const { aria: untilAria, ...untilField } = fieldDescription({
    id: untilId,
    error: failure.field?.message,
  });
  const { aria: noteAria, ...noteField } = fieldDescription({ id: noteId });
  const sender = request.sender;
  if (!sender) return null;

  const end = until ? new Date(until) : undefined;
  const future = end !== undefined && !Number.isNaN(end.getTime()) && end.getTime() > now;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!end || !sender) return;
    const sent = await run(() =>
      graphqlRequest(TimeOutDocument, {
        userId: sender.id,
        until: end.toISOString(),
        note: note.trim() || undefined,
      }),
    );
    if (sent) {
      setUntil('');
      setNote('');
    }
  }

  return (
    <section className="support-detail__timeouts" aria-label="Time-Outs">
      <h3>Time-Outs for {sender.name}</h3>
      {request.timeouts.length === 0 ? (
        <p>No time-outs yet.</p>
      ) : (
        <ul className="support-detail__list">
          {request.timeouts.map((timeout) => (
            <li key={timeout.id}>
              {isActive(timeout, now) ? 'Until ' : 'Ended '}
              <LocalTime at={timeout.liftedAt ?? timeout.until} long />
              {timeout.liftedAt && ' (lifted)'}
              {timeout.note && <> — {timeout.note}</>}
              {isActive(timeout, now) && <LiftButton timeout={timeout} />}
            </li>
          ))}
        </ul>
      )}
      <form className="form" noValidate onSubmit={(event) => void submit(event)}>
        {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
        <FieldShell label="Time Out Until" {...untilField}>
          <input
            id={untilField.controlId}
            className="input"
            type="datetime-local"
            {...untilAria}
            value={until}
            disabled={busy}
            onChange={(event) => setUntil(event.target.value)}
          />
        </FieldShell>
        <FieldShell label="Time-Out Note" {...noteField}>
          <input
            id={noteField.controlId}
            className="input"
            type="text"
            autoComplete="off"
            placeholder="Add a note"
            {...noteAria}
            value={note}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
          />
        </FieldShell>
        <div className="form__actions">
          <BusyButton
            type="submit"
            className="btn btn--solid"
            disabled={!future || busy}
            busy={busy}
            busyLabel="Timing Out"
          >
            Time Out
          </BusyButton>
        </div>
      </form>
    </section>
  );
};

export default TimeoutPanel;
