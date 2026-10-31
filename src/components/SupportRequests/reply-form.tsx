'use client';

import { type FormEvent, type ReactElement, type ReactNode, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { FieldShell, RadioGroupField, fieldDescription } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { useSupportAction } from './use-support-action';

// Reply on a request: the sender is mailed that a reply is waiting and reads it on /account/support. A mode beside the box
// turns the same text into an internal note, which only staff read and nobody is mailed; it opens on Reply and the note is
// always chosen. Send stays off until there is something to say; Resolve, when given, sits opposite it.

type Mode = 'reply' | 'note';

const MODES = [
  { value: 'reply', label: 'Reply', description: 'The sender is emailed that a reply is waiting.' },
  { value: 'note', label: 'Internal Note', description: 'Only staff read it. Nobody is emailed.' },
] as const;

const ReplyDocument = graphql(`
  mutation ReplyToSupportRequest($requestId: ID!, $body: String!) {
    replyToSupportRequest(requestId: $requestId, body: $body) {
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
  noteOnly = false,
}: {
  requestId: string;
  resolve?: ReactNode;
  /** The viewer may add an internal note but not reply: no mode choice, and the form is a note form. */
  noteOnly?: boolean;
}): ReactElement => {
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<Mode>(noteOnly ? 'note' : 'reply');
  const note = mode === 'note';
  const { busy, failure, run } = useSupportAction('body');
  const discard = useDiscardGuard(body.trim() !== '');
  const { aria, ...field } = fieldDescription({ id: useId(), error: failure.field?.message });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      await run(
        () =>
          note
            ? graphqlRequest(NoteDocument, { requestId, body: body.trim() })
            : graphqlRequest(ReplyDocument, { requestId, body: body.trim() }),
        note ? 'Note added.' : 'Reply sent.',
      )
    ) {
      setBody('');
    }
  }

  return (
    <form
      className="form support-detail__reply"
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      {!noteOnly && (
        <RadioGroupField
          legend="Send As"
          name="mode"
          layout="segmented"
          options={MODES}
          value={mode}
          disabled={busy}
          onChange={setMode}
        />
      )}
      <FieldShell label={note ? 'Your Note' : 'Your Reply'} {...field}>
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
          value={body}
          disabled={busy}
          onChange={(event) => setBody(event.target.value)}
        />
      </FieldShell>
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
    </form>
  );
};

export default ReplyForm;
