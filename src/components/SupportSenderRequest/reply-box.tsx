'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import Notice from '../Notice';
import TimedOutSentence from '../SupportRequests/timed-out-sentence';
import SupportReplyShell from '../SupportRequests/reply-shell';
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
    <SupportReplyShell
      body={body}
      onBody={setBody}
      onSubmit={(event) => void submit(event)}
      busy={busy}
      shut={shut}
      failure={failure}
      label="Your Reply"
      placeholder="Write a reply"
      submitLabel="Reply"
      busyLabel="Replying"
      above={
        timedOut && (
          <Notice kind="warn" quiet>
            <TimedOutSentence cannot="You cannot reply" until={timedOut.until} />
          </Notice>
        )
      }
    />
  );
};

export default SupportSenderReplyBox;
