'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { utcMinute } from '../../lib/utc';
import BusyButton from '../BusyButton';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import { FieldShell, fieldDescription } from '../Field';
import Notice from '../Notice';
import { useSupportAction } from '../SupportRequests/use-support-action';
import type { SupportSenderReplyBoxProps } from './types';

// The sender's answer on their own request, sent through /api/graphql. While they are timed out the box and the button are
// shut and a notice above them says when it ends; the service refuses the message too.

const SendDocument = graphql(`
  mutation SendSupportMessage($requestId: ID!, $body: String!) {
    sendSupportMessage(requestId: $requestId, body: $body) {
      id
    }
  }
`);

const SupportSenderReplyBox = ({
  requestId,
  timedOutUntil,
}: SupportSenderReplyBoxProps): ReactElement => {
  const [body, setBody] = useState('');
  const { busy, failure, run } = useSupportAction('body');
  const discard = useDiscardGuard(body.trim() !== '');
  const { aria, ...field } = fieldDescription({ id: useId(), error: failure.field?.message });
  const shut = timedOutUntil !== null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      await run(() => graphqlRequest(SendDocument, { requestId, body: body.trim() }), 'Reply sent.')
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
      {shut && (
        <Notice kind="caution" quiet>
          You cannot reply until {utcMinute(timedOutUntil)}.
        </Notice>
      )}
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <FieldShell label="Your Reply" {...field}>
        <textarea
          id={field.controlId}
          className="textarea"
          rows={4}
          placeholder="Write a reply."
          {...aria}
          value={body}
          disabled={shut || busy}
          onChange={(event) => setBody(event.target.value)}
        />
      </FieldShell>
      <div className="support-detail__actions">
        <BusyButton
          type="submit"
          className="btn btn--solid"
          disabled={shut || body.trim() === '' || busy}
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

export default SupportSenderReplyBox;
