'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { useFormSend } from '../../lib/use-form-send';
import { BotTrapField } from '../SupportForm/bot-trap-field';
import SupportReplyShell from '../SupportRequests/reply-shell';
import type { SupportViewReplyFormProps } from './types';

// Sends `replyToSupportRequestByViewToken`, which needs no session: the token is the proof.

const ReplyByViewTokenDocument = graphql(`
  mutation ReplyToSupportRequestByViewToken($token: String!, $body: String!, $website: String) {
    replyToSupportRequestByViewToken(token: $token, body: $body, website: $website)
  }
`);

const SupportViewReplyForm = ({ token, onSent }: SupportViewReplyFormProps): ReactElement => {
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState('');
  const { sending, failure, send } = useFormSend(['body']);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sent = await send(() =>
      graphqlRequest(ReplyByViewTokenDocument, {
        token,
        body: body.trim(),
        ...(website !== '' && { website }),
      }),
    );
    if (!sent) return;
    setBody('');
    onSent();
  }

  return (
    <SupportReplyShell
      body={body}
      onBody={setBody}
      onSubmit={(event) => void submit(event)}
      busy={sending}
      failure={failure}
      label="Your Reply"
      placeholder="Write a reply"
      submitLabel="Reply"
      busyLabel="Sending"
      below={<BotTrapField value={website} onChange={setWebsite} />}
    />
  );
};

export default SupportViewReplyForm;
