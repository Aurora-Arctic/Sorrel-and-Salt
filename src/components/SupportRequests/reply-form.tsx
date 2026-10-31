'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { useSupportAction } from './use-support-action';

// Reply on a request: the sender is mailed that a reply is waiting and reads it on /account/support.
// Reply stays off until there is something to say.

const ReplyDocument = graphql(`
  mutation ReplyToSupportRequest($requestId: ID!, $body: String!) {
    replyToSupportRequest(requestId: $requestId, body: $body) {
      id
    }
  }
`);

const ReplyForm = ({ requestId }: { requestId: string }): ReactElement => {
  const [body, setBody] = useState('');
  const { busy, failure, run } = useSupportAction('body');
  const discard = useDiscardGuard(body.trim() !== '');
  const { aria, ...field } = fieldDescription({ id: useId(), error: failure.field?.message });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      await run(
        () => graphqlRequest(ReplyDocument, { requestId, body: body.trim() }),
        'Reply sent.',
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
      <FieldShell label="Your Reply" {...field}>
        <textarea
          id={field.controlId}
          className="textarea"
          rows={4}
          placeholder="Write a reply"
          {...aria}
          value={body}
          disabled={busy}
          onChange={(event) => setBody(event.target.value)}
        />
      </FieldShell>
      <div className="form__actions">
        <BusyButton
          type="submit"
          className="btn btn--solid"
          disabled={body.trim() === '' || busy}
          busy={busy}
          busyLabel="Replying"
        >
          Reply
        </BusyButton>
      </div>
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
};

export default ReplyForm;
