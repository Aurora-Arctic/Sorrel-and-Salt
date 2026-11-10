'use client';

import { type FormEvent, type ReactElement, type ReactNode, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { ChoiceChip } from '../FacetPanel/choice-chip';
import { SwitchField } from '../Field';
import { ConfirmQuestion } from '../Modal';
import Until from '../LocalTime/until';
import Notice from '../Notice';
import SupportReplyShell from './reply-shell';
import { useSupportAction } from './use-support-action';

// Reply on a request, or an internal note nobody is mailed; it opens on Internal Note so a reply is always chosen. A
// reply to a timed-out sender asks first, since they cannot answer until the time-out ends.

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

const cannotAnswer = (until: Date | null): ReactNode => (
  <Until until={until} noEnd="while timed out with no end date" />
);

const ReplyForm = ({
  requestId,
  resolve,
  canWait = false,
  senderTimedOut,
  noteOnly = false,
}: {
  requestId: string;
  /** The request is open, so the reply may be marked waiting on the sender. */
  canWait?: boolean;
  /** The sender's standing time-out; the form says they cannot answer until it ends, or that it has no end date. */
  senderTimedOut?: { until: Date | null };
  resolve?: ReactNode;
  noteOnly?: boolean;
}): ReactElement => {
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<Mode>('note');
  const [waiting, setWaiting] = useState(false);
  const [asking, setAsking] = useState(false);
  const note = mode === 'note';
  const { busy, failure, run } = useSupportAction('body');

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
    if (!note && senderTimedOut) setAsking(true);
    else void send();
  }

  return (
    <SupportReplyShell
      body={body}
      onBody={setBody}
      onSubmit={submit}
      busy={busy}
      failure={failure}
      label={note ? 'Your Note' : 'Your Reply'}
      required
      placeholder={
        note ? 'Write a note for staff' : 'Write a reply. The sender is emailed that one is waiting'
      }
      submitLabel={note ? 'Add Note' : 'Reply'}
      busyLabel={note ? 'Adding' : 'Replying'}
      above={
        !noteOnly && (
          <ChoiceChip
            legend="Send As"
            name="mode"
            options={MODES}
            value={mode}
            disabled={busy}
            hint="A reply emails the sender that one is waiting. An internal note is read only by staff and emails nobody."
            onChange={setMode}
          />
        )
      }
      below={
        <>
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
          {!note && senderTimedOut && (
            <Notice kind="warn" quiet>
              The sender cannot answer {cannotAnswer(senderTimedOut.until)}.
            </Notice>
          )}
        </>
      }
      actions={resolve}
      questions={
        asking &&
        senderTimedOut && (
          <ConfirmQuestion
            question="Reply to a sender who is timed out?"
            details={<>They cannot answer {cannotAnswer(senderTimedOut.until)}.</>}
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
        )
      }
    />
  );
};

export default ReplyForm;
