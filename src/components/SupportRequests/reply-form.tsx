'use client';

import { type FormEvent, type ReactElement, type ReactNode, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { ChoiceChip } from '../FacetPanel/choice-chip';
import { FieldShell, SwitchField, fieldDescription } from '../Field';
import { utcMinute } from '../../lib/utc';
import { ConfirmQuestion, DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { useSupportAction } from './use-support-action';

// Reply on a request: the sender is mailed that a reply is waiting and reads it on /account/support. A mode beside the box
// turns the same text into an internal note, which only staff read and nobody is mailed; it opens on Internal Note, so a
// reply is always chosen. Send stays off until there is something to say; Resolve, when given, sits opposite it.
// A reply to a timed-out sender asks first, since they cannot answer it until the time-out ends.

type Mode = 'reply' | 'note';

const MODES = [
  {
    value: 'note',
    label: 'Internal Note',
    display: <span className="support-detail__internal">Internal Note</span>,
  },
  { value: 'reply', label: 'Reply' },
] as const;

const ReplyDocument = graphql(`
  mutation ReplyToSupportRequest($requestId: ID!, $body: String!, $waitingOnSender: Boolean) {
    replyToSupportRequest(requestId: $requestId, body: $body, waitingOnSender: $waitingOnSender) {
      id
    }
  }
`);

const NoteDocument = graphql(`
  mutation AddSupportInternalNote($requestId: ID!, $body: String!) {
    addSupportInternalNote(requestId: $requestId, body: $body) {
      id
    }
  }
`);

const ReplyForm = ({
  requestId,
  resolve,
  canWait = false,
  senderTimedOutUntil,
  noteOnly = false,
}: {
  requestId: string;
  /** The request is open, so the reply may be marked waiting on the sender. */
  canWait?: boolean;
  /** When the sender's standing time-out ends; the form says they cannot answer until then. */
  senderTimedOutUntil?: Date;
  resolve?: ReactNode;
  /** The viewer may add an internal note but not reply: no mode choice, and the form is a note form. */
  noteOnly?: boolean;
}): ReactElement => {
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<Mode>('note');
  const [waiting, setWaiting] = useState(false);
  const [asking, setAsking] = useState(false);
  const note = mode === 'note';
  const { busy, failure, run } = useSupportAction('body');
  const discard = useDiscardGuard(body.trim() !== '');
  const { aria, ...field } = fieldDescription({ id: useId(), error: failure.field?.message });

  async function send() {
    if (
      await run(
        () =>
          note
            ? graphqlRequest(NoteDocument, { requestId, body: body.trim() })
            : graphqlRequest(ReplyDocument, {
                requestId,
                body: body.trim(),
                waitingOnSender: canWait && waiting,
              }),
        note ? 'Note added.' : 'Reply sent.',
      )
    ) {
      setBody('');
      setWaiting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note && senderTimedOutUntil) setAsking(true);
    else void send();
  }

  return (
    <form className="form support-detail__reply" noValidate onSubmit={submit}>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      {!noteOnly && (
        <ChoiceChip
          legend="Send As"
          name="mode"
          options={MODES}
          value={mode}
          disabled={busy}
          hint="A reply emails the sender that one is waiting. An internal note is read only by staff and emails nobody."
          onChange={setMode}
        />
      )}
      <FieldShell label={note ? 'Your Note' : 'Your Reply'} required {...field}>
        <textarea
          id={field.controlId}
          className="textarea"
          rows={4}
          placeholder={
            note
              ? 'Write a note for staff.'
              : 'Write a reply. The sender is emailed that one is waiting.'
          }
          {...aria}
          aria-required
          value={body}
          disabled={busy}
          onChange={(event) => setBody(event.target.value)}
        />
      </FieldShell>
      {!note && canWait && (
        <SwitchField
          label="Waiting on Sender"
          name="waitingOnSender"
          value="1"
          checked={waiting}
          busy={busy}
          hint="Marks the request as waiting for the sender's answer."
          onChange={setWaiting}
        />
      )}
      {!note && senderTimedOutUntil && (
        <Notice kind="caution" quiet>
          The sender cannot answer until {utcMinute(senderTimedOutUntil)}.
        </Notice>
      )}
      <div className="support-detail__actions">
        <BusyButton
          type="submit"
          className="btn btn--solid"
          disabled={body.trim() === '' || busy}
          busy={busy}
          busyLabel={note ? 'Adding' : 'Replying'}
        >
          {note ? 'Add Note' : 'Reply'}
        </BusyButton>
        {resolve}
      </div>
      {discard.asking && <DiscardQuestion guard={discard} />}
      {asking && senderTimedOutUntil && (
        <ConfirmQuestion
          question="Reply to a sender who is timed out?"
          details={`They cannot answer until ${utcMinute(senderTimedOutUntil)}.`}
          tone="solid"
          confirmLabel="Send Reply"
          busyLabel="Sending"
          busy={busy}
          onConfirm={async () => {
            await send();
            setAsking(false);
          }}
          onKeep={() => setAsking(false)}
        />
      )}
    </form>
  );
};

export default ReplyForm;
