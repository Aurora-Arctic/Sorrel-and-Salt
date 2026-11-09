'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import { PlainTextField } from '../Field/plain-text-field';
import { MESSAGE_MAX_LENGTH } from '../../modules/support/validation/limits';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import { useSupportAction } from '../SupportRequests/use-support-action';
import type { SupportSenderReplyBoxProps } from './types';

// While they are timed out the box and the button are shut; the service refuses the message too.

const SendDocument = graphql(`
  mutation SendSupportMessage($requestId: ID!, $body: String!) {
    sendSupportMessage(requestId: $requestId, body: $body) {
      id
    }
  }
`);

const SupportSenderReplyBox = ({
  requestId,
  timedOut,
}: SupportSenderReplyBoxProps): ReactElement => {
  const [body, setBody] = useState('');
  const { busy, failure, run } = useSupportAction('body');
  const discard = useDiscardGuard(body.trim() !== '');
  const tooLong = body.trim().length > MESSAGE_MAX_LENGTH;
  const shut = timedOut !== null;

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
      {timedOut && (
        <Notice kind="warn" quiet>
          {timedOut.until ? (
            <>
              You cannot reply until <LocalTime at={timedOut.until} long />.
            </>
          ) : (
            'You cannot reply: you are timed out with no end date.'
          )}
        </Notice>
      )}
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <PlainTextField
        name="body"
        label="Your Reply"
        multiline
        rows={4}
        placeholder="Write a reply"
        limit={MESSAGE_MAX_LENGTH}
        disabled={shut || busy}
        value={body}
        error={failure.field?.message}
        onChange={setBody}
      />
      <div className="support-detail__actions">
        <BusyButton
          type="submit"
          className="btn btn--solid"
          disabled={shut || body.trim() === '' || tooLong || busy}
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
